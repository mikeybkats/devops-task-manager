import { getConfig } from "../config/env";
import { WorkItem } from "../types";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const config = getConfig();

export async function getAIResponse(
  userInput: string,
  project: string,
  tasks: WorkItem[],
) {
  const prompt = `
You are an assistant for managing DevOps tasks.
User's project: ${project}
User says: "${userInput}"
User's tasks: ${tasks}

The user is trying to create, update or delete a work item. The user may want to add a new task as a child of an existing task.

The response should be a JSON object with the following format:

{ "action": "create" | "update" | "delete", etc.  workItem: WorkItemSchema }

The work item should be in the following format:

{
  id: number;
  ref: number;
  fields: {
    "System.Title": string;
    "System.State": string;
    "System.WorkItemType": string; // epic, feature, user story, task, etc.
    "System.Parent": number | null; // this is the id of the parent work item
    "System.AssignedTo": "email@example.com";
  };
}

if the user does not provide an email address for System.AssignedTo then default to the first azure user from .env file users: ${config.azureUsers}.
`;

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
    return JSON.parse(text);
  } catch {
    return { action: "none", message: "Sorry, I didn't understand." };
  }
}
