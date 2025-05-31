import { getConfig } from "../config/env";
import { WorkItem } from "../types";
import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const config = getConfig();

export async function getAIResponse(
  userInput: string,
  project: string,
  tasks: WorkItem[],
) {
  console.log("getAIResponse -- ", userInput);
  const prompt = `
You are an assistant for managing DevOps tasks. You must respond with ONLY a JSON object, no additional text or explanation.

User's project: ${project}
User says: "${userInput}"
User's tasks: ${JSON.stringify(tasks, null, 2)}

The user is trying to create, update or delete a work item. The user may want to add a new task as a child of an existing task. The user may ask to create a batch of work items.

You must respond with ONLY a JSON object in this exact format:

{ "action": "create" | "update" | "batch-update" | "delete", "workItem": WorkItemSchema }

The work item must be in this exact format:

{
  id: number;
  title: string;
  state: string;
  assignedTo: string;
  type: string;
  parent: string | null;
}

Important rules:
1. If the user wants to change a task's parent, this is an "update" action
2. If the user wants to create a new task, this is a "create" action
3. If the user wants to delete a task, this is a "delete" action
4. When updating a task's parent, you must include all existing fields of the task
5. The parent field should be the title of the parent work item, not its ID
6. For new tasks, set state to "New"
7. For new tasks, set type to "Task" unless specified otherwise
8. DO NOT include any text before or after the JSON object
9. DO NOT explain your response
10. DO NOT use markdown formatting
11. You must output valid JSON. Do not include trailing commas, comments, or use single quotes. Only use double quotes for property names and string values.
12. If you output an array, ensure every object and the array itself is valid JSON.
13. Do not break up the JSON with explanations or extra whitespace.
14. If you cannot fit the full response, return a valid partial JSON array (do not cut off in the middle of an object or string).

Example of a valid response for creating a new task:
{
  "action": "create",
  "workItem": {
    "id": 0,
    "title": "Add dark mode support",
    "state": "New",
    "assignedTo": "michael barakat",
    "type": "Task",
    "parent": null
  }
}

Example of a valid response for updating a task's parent:
{
  "action": "update",
  "workItem": {
    "id": 16,
    "title": "Add a docs mdx page",
    "state": "New",
    "assignedTo": "michael barakat",
    "type": "Task",
    "parent": "view all components as storybook pages"
  }
}

Example of a valid response for creating a batch of work items:
{
  "action": "batch-update",
  "workItems": [
    {
      "id": 16,
      "title": "Add a docs mdx page",
      "state": "New",
      "assignedTo": "michael barakat",
      "type": "Task",
      "parent": "view all components as storybook pages"
    },
    {
      "id": 17,
      "title": "Add a docs mdx page",
      "state": "New",
      "assignedTo": "michael barakat",
      "type": "Task",
      "parent": "view all components as storybook pages"
    }
  ]
}

If the user does not specify who to assign the task to, then default to the first azure user from .env file users: ${config.azureUsers}.

Remember: Respond with ONLY the JSON object, no additional text or explanation.`;

  const response = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("");

    const repaired = jsonrepair(text);
    const parsed = JSON.parse(repaired);

    console.log("AI Response text:", text);
    console.log("Parsed response:", parsed);

    // Transform the response to match the expected format
    if (parsed.workItem) {
      // Find parent ID if parent title is provided
      let parentId = null;
      if (parsed.workItem.parent) {
        const parentTask = tasks.find(
          (task) => task.title === parsed.workItem.parent,
        );
        if (parentTask) {
          parentId = parentTask.id;
        } else {
          console.warn(
            `Parent task with title "${parsed.workItem.parent}" not found`,
          );
        }
      }

      parsed.workItem = {
        id: parsed.workItem.id,
        ref: 0, // This will be set by Azure DevOps
        fields: {
          "System.Title": parsed.workItem.title,
          "System.State": parsed.workItem.state,
          "System.WorkItemType": parsed.workItem.type,
          "System.Parent": parentId,
          "System.AssignedTo": {
            displayName: parsed.workItem.assignedTo,
            url: "",
            _links: {
              avatar: {
                href: "",
              },
            },
            id: "",
            uniqueName: parsed.workItem.assignedTo,
            imageUrl: "",
            descriptor: "",
          },
        },
      };
    }

    if (parsed.action === "batch-update" && Array.isArray(parsed.workItems)) {
      parsed.workItems = parsed.workItems.map((item: any) => {
        // Find parent ID if parent title is provided
        let parentId = null;
        if (item.parent) {
          const parentTask = tasks.find((task) => task.title === item.parent);
          if (parentTask) {
            parentId = parentTask.id;
          }
        }
        return {
          id: item.id,
          ref: 0,
          fields: {
            "System.Title": item.title,
            "System.State": item.state,
            "System.WorkItemType": item.type,
            "System.Parent": parentId,
            "System.AssignedTo": {
              displayName: item.assignedTo,
              url: "",
              _links: { avatar: { href: "" } },
              id: "",
              uniqueName: item.assignedTo,
              imageUrl: "",
              descriptor: "",
            },
          },
        };
      });
    }

    return parsed;
  } catch (error) {
    console.error("Error parsing AI response:", error);
    return { action: "none", message: "Sorry, I didn't understand." };
  }
}
