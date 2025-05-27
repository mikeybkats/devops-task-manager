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
If the user wants to create or update a task, respond with a JSON object like:
{"action": "create", "details": { ... }}
or
{"action": "update", "taskId": "...", "details": { ... }}
If not, respond with {"action": "none", "message": "..."}

Respond with only the updated tasks in JSON format.
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
