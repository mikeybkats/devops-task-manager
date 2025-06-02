import { getConfig } from "../config/env";
import { WorkItem } from "../types";
import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const config = getConfig();

export type AIResponse = {
  action:
    | "create"
    | "update"
    | "delete"
    | "batch-create"
    | "batch-update"
    | "batch-delete"
    | "none";
  workItems: WorkItem[];
};

export async function getAIResponse(
  userInput: string,
  project: string,
  tasks: WorkItem[],
): Promise<AIResponse> {
  const prompt = `
You are an assistant for managing DevOps tasks. You must respond with ONLY a JSON object, no additional text or explanation.

User's project: ${project}
User says: "${userInput}"
User's tasks: ${JSON.stringify(tasks, null, 2)}

The user is trying to create, update or delete a work item. The user may want to add a new task as a child of an existing task. The user may ask to create a batch of work items.

You must respond with ONLY a JSON object in this exact format:

{ "action": "create" | "update" | "batch-update" | "delete" | "batch-create" | "batch-delete" | "none", "workItems": WorkItemSchema[] }

The work item must be in this exact format:

{
  id: number;
  title: string;
  state: string;
  assignedTo: string;
  type: string;
  parent: number | null;
}

Important rules:
- If the user wants to change a task's parent, this is an "update" action
- If the user wants to create a new task, this is a "create" action
- If the user wants to delete a task, this is a "delete" action
- If the user wants to delete multiple tasks, this is a "batch-delete" action
- When updating a task's parent, you must include all existing fields of the task
- The parent field should be the ID of the parent work item, not its title
- The parent id can be obtained from the user's tasks list, you must interpret the user's input to find the parent id.
- For new tasks, set state to "New"
- For new tasks, set type to "Task" unless specified otherwise
- For deletion actions, you only need to include the id and title fields
- When deleting multiple tasks, use "batch-delete" and include all tasks to be deleted in the workItems array
- For duplicate detection:
  - Consider tasks as duplicates if they have semantically similar titles (e.g., "Add dark mode" and "Implement dark mode" are duplicates)
  - Consider tasks as duplicates if they have overlapping key terms with similar meaning (e.g., "Create login page" and "Add login screen" are duplicates)
  - Do not consider tasks as duplicates if they are different types of tasks
  - When deleting duplicates, keep the oldest task (lowest ID) and delete the newer ones
  - If a task's title is unique (no similar titles exist), it should NOT be included in the deletion list
  - If there are no duplicates found, return an empty workItems array with "batch-delete" action
  - Be conservative in duplicate detection - if unsure, do not mark as duplicate
- DO NOT include any text before or after the JSON object
- DO NOT explain your response
- DO NOT use markdown formatting
- You must output valid JSON. Do not include trailing commas, comments, or use single quotes. Only use double quotes for property names and string values.
- If you output an array, ensure every object and the array itself is valid JSON.
- Do not break up the JSON with explanations or extra whitespace.
- If you cannot fit the full response, return a valid partial JSON array (do not cut off in the middle of an object or string).
- If the user asks for multiple tasks, always use "action": "batch-create" and return a "workItems" array.
- Only use the parent ID provided by the user or as found in the user's tasks.
- Do not infer unrelated task types (e.g., storybook) unless explicitly requested.
- If the user asks to create multiple tasks (using words like "all", "every", "each", "for every", "for each", or by listing several items), you must generate a separate task for each relevant item, using your knowledge and context to enumerate them if needed.
- If the user refers to a category (e.g., "all standard HTML form controls", "all microservices", "all environments"), enumerate the items in that category based on your knowledge, even if the user does not list them all explicitly.
- Always use "action": "batch-create" and return a "workItems" array for batch creation.
- Use the parent, assignedTo, and other fields as specified by the user or as appropriate for each task.
- Do not limit the batch to only the items explicitly mentioned by the user if the intent is to cover a whole category.
- When the user mentions a parent task by title (e.g., "parent is the 'Should contain all standard form controls' user story"), you MUST look up that task's ID in the user's tasks list and use that ID as the parent value.
- For batch creation, if a parent is specified, ALL items in the batch should use that parent ID.

Example of a valid response for creating a new task:
{
  "action": "create",
  "workItems": [{
    "id": 0,
    "title": "Add dark mode support",
    "state": "New",
    "assignedTo": "michael barakat",
    "type": "Task",
    "parent": null
  }]
}

Example of a valid response for updating a task's parent:
{
  "action": "update",
  "workItems": [{
    "id": 16,
    "title": "Add a docs mdx page",
    "state": "New",
    "assignedTo": "michael barakat",
    "type": "Task",
    "parent": 11 
  }]
}

Example of a valid response for creating a batch of work items with a parent:
{
  "action": "batch-create",
  "workItems": [
    {
      "id": 0,
      "title": "Text Input - web component",
      "state": "New",
      "assignedTo": "michael barakat",
      "type": "Task",
      "parent": 123  // ID of the parent task found in user's tasks list
    },
    {
      "id": 0,
      "title": "Select - web component",
      "state": "New",
      "assignedTo": "michael barakat",
      "type": "Task",
      "parent": 123  // Same parent ID for all items in batch
    }
  ]
}

Example of a valid response for deleting a task:
{
  "action": "delete",
  "workItems": [{
    "id": 123,
    "title": "Task to delete",
    "state": "",
    "assignedTo": "",
    "type": "",
    "parent": null
  }]
}

Example of a valid response for batch deleting duplicate tasks:
{
  "action": "batch-delete",
  "workItems": [
    {
      "id": 124,
      "title": "Add dark mode support",
      "state": "",
      "assignedTo": "",
      "type": "",
      "parent": null
    },
    {
      "id": 125,
      "title": "Implement dark mode feature",
      "state": "",
      "assignedTo": "",
      "type": "",
      "parent": null
    }
  ]
}

Example of a valid response when no duplicates are found:
{
  "action": "batch-delete",
  "workItems": []
}

If the user does not specify who to assign the task to, then default to the first azure user from .env file users: ${config.azureUsers}.

Remember: Respond with ONLY the JSON object, no additional text or explanation.
`;

  const response = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("");

    const repaired = jsonrepair(text);
    const parsed = JSON.parse(repaired);

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
        if (!item || typeof item !== "object") return;

        const requiredFields = ["id", "title", "state", "type", "assignedTo"];
        for (const field of requiredFields) {
          if (!item[field]) return;
        }

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

    // Add handling for batch-create
    if (parsed.action === "batch-create" && Array.isArray(parsed.workItems)) {
      // First, find the parent task ID if specified in the prompt
      let parentId = null;
      const parentTaskMatch = userInput.match(/parent is the "([^"]+)"/);
      if (parentTaskMatch) {
        const parentTitle = parentTaskMatch[1];
        const parentTask = tasks.find((task) => task.title === parentTitle);
        if (parentTask) {
          parentId = parentTask.id;
        }
      }

      parsed.workItems = parsed.workItems.map((item: any) => {
        if (!item || typeof item !== "object") return;

        return {
          id: 0, // New items get ID 0
          ref: 0,
          fields: {
            "System.Title": item.title,
            "System.State": item.state || "New",
            "System.WorkItemType": "Task", // Always set to "Task" for new items
            "System.Parent": parentId, // Use the parent ID we found
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
    return { action: "none", workItems: [] };
  }
}
