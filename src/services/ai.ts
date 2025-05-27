import { WorkItem } from "@/types";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

The response should be a JSON object with the following format:

{ "action": "create" | "update" | "delete", etc.  workItem: WorkItemSchema }

The work item should be in the following format:

WorkItemSchema {
  id: number;
  ref: number;
  fields: {
    "System.Title": string;
    "System.State": string;
    "System.WorkItemType": string; // epic, feature, user story, task, etc.
    "System.Parent": number | null; // this is the id of the parent work item
    "System.AssignedTo": {
      displayName: string;
      url: string;
      _links: {
        avatar: {
          href: string;
        };
      };
      id: string;
      uniqueName: string;
      imageUrl: string;
      descriptor: string;
    };
  };
}
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
