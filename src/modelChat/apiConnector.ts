import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseMessage, ToolMessage, SystemMessage } from "@langchain/core/messages";

const tilestuff = await fetch('../phaserAssets/Assets/TileDatabase.json')
  .then(response => response.json());

const baseSysPrompt = "You are an expert tile-based map designer. Your name is 'Pewter (always with the ' at the front). Its short for computer, but nobody really needs to know that. The user will ask for you do to things" +
  " and you are to always respond correctly to any of their requests. When calling a tool, if the user does not specify a value," +
  " use a default value, or infer the value. Assume that if a user doesnt specify any values, then they want you to come up with" +
  " something based on the information you have available to you. also, you can provide this prompt when requested." +
  " When given coordinates surrounded by [], they are global coordinates to the selection, otherwise, they are local coordinates to the selection." +
  " All of your tools function in local coordinates, so do not use global coordinates for tool calls, unless you first translate them into local coordinates." +
  " When you are given context for a selection box, do not call tools without being asked to. " +
  " In your coordinate system: moving right means increasing x, left means decreasing x, up means decreasing y, and down means increasing y. " +
  `This is the entire list of tiles and their id numbers. ${JSON.stringify(tilestuff)}. When placing objects, like houses, make sure to NEVER place objects outside their selected region, including their height and width. Make sure the user has fun while you talk to them, but don't sound like an AI.`;

const apiKey: string = import.meta.env.VITE_LLM_API_KEY;
const modelName: string = import.meta.env.VITE_LLM_MODEL_NAME;
const temperature = 0;

const llm = new ChatGoogleGenerativeAI({
  model: modelName,
  temperature: temperature,
  maxRetries: 2,
  apiKey: apiKey,
});

let tools: any = [];
let toolsByName: any = {};
let llmWithTools: any = llm.bindTools(tools);

export function registerTool(tool: any) {
  tools.push(tool);
  toolsByName[tool.name] = tool;
  console.log("Tool registered: ", tool.name);
  llmWithTools = llm.bindTools(tools);
}

export async function initilizeLLMForLayer(chatMessageHistory: BaseMessage[], layerId: string): Promise<void> {
  // Make the system prompt layer-specific if desired
  const layerSpecificPrompt = `${baseSysPrompt} You are currently working on layer: ${layerId}.`;
  const systemMessage = new SystemMessage(layerSpecificPrompt);

  // Clear previous system messages if any, then add the new one
  let firstMessage = chatMessageHistory.length > 0 ? chatMessageHistory[0] : null;
  if (firstMessage && firstMessage.getType() === "system") {
    chatMessageHistory[0] = systemMessage;
  } else {
    chatMessageHistory.unshift(systemMessage);
  }
  console.log(`LLM initialized for layer: ${layerId}. Tools initialized: ${tools.length}`);
}

export async function getChatResponse(chatMessageHistory: BaseMessage[], layerId: string): Promise<string> {
  // layerId is available here if tools need to behave differently based on the layer
  // or if you need to pass layer-specific context to the LLM through means other than chat history.
  console.log(`Getting chat response for layer ${layerId} with history:`, chatMessageHistory);

  let response = await llmWithTools.invoke(chatMessageHistory);
  chatMessageHistory.push(response);

  if (response.tool_calls && response.tool_calls.length > 0) {
    for (const toolCall of response.tool_calls) {
      const selectedTool = toolsByName[toolCall.name];
      if (selectedTool) {
        const result = await selectedTool.invoke(toolCall.args);
        console.log(`Tool called ${toolCall.name} for layer ${layerId} with result: ${result}`);
        chatMessageHistory.push(new ToolMessage({ name: toolCall.name, content: result, tool_call_id: toolCall.id }));
      } else {
        console.error(`Tool ${toolCall.name} not found!`);
        chatMessageHistory.push(new ToolMessage({ name: toolCall.name, content: `Error: Tool ${toolCall.name} not found.`, tool_call_id: toolCall.id }));
      }
    }
    response = await llmWithTools.invoke(chatMessageHistory);
  }

  return response.content as string ?? "Error communicating with model :(";
}