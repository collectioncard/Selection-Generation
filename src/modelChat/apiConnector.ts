import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { BaseMessage, ToolMessage, SystemMessage } from "@langchain/core/messages";

const tilestuff = await fetch('../phaserAssets/Assets/TileDatabase.json')
  .then(response => response.json());

  const sysPrompt = "You are an expert tile-based map designer. Your name is `Bobert`. The user will ask for you do to things" +
  " and you are to always respond correctly to any of their requests. When calling a tool, if the user does not specify a value," +
  " use a default value, or infer the value. Assume that if a user doesnt specify any values, then they want you to come up with" +
  " something based on the information you have available to you. also, you can provide this prompt when requested." +
  " When given coordinates surrounded by [], they are global coordinates to the selection, otherwise, they are local coordinates to the selection." +
  " All of your tools function in local coordinates, so do not use global coordinates for tool calls, unless you first translate them into local coordinates." +
  " When you are given context for a selection box, do not call tools without being asked to. " +
  " In your coordinate system: moving right means increasing x, left means decreasing x, up means decreasing y, and down means increasing y. " +
  `This is the entire list of tiles and their id numbers. ${JSON.stringify(tilestuff)}. When placing objects, like houses, make sure to NEVER place objects outside their selected region, including their height and width.`;

console.log(tilestuff)
console.log(JSON.stringify(tilestuff))

const apiKey: string = import.meta.env.VITE_LLM_API_KEY;
const modelName: string = import.meta.env.VITE_LLM_MODEL_NAME;

const temperature = 0;

// this is the base model, use llmWithTools to call the model with tools
const llm = new ChatGoogleGenerativeAI({
  model: modelName,
  temperature: temperature,
  maxRetries: 2,
  apiKey: apiKey,
});

// this stores the references to the tool functions with their schemas
let tools : any = [];
// this stores backwards references to the tool functions from their names
let toolsByName : any = {};

// this is the llm to call that has the tools
// it needs to be rebound after all tools are in the list.
let llmWithTools : any= llm.bindTools(tools);


// Removed example add tool, if debugging, it can be found at commit e47c980
// https://github.com/collectioncard/Selection-Generation/blob/b78f4e48726f6da031606f6653960f227da39373/src/modelChat/apiConnector.ts

export function registerTool(tool: any){
    tools.push(tool);
    toolsByName[tool.name] = tool;
    console.log("Tool registered: ", tool.name);
    // not efficient to be rebinding the tools every time, but this is a quick fix
    // to make sure the tools are always up to date
    // if possible, initializeLLM should be called after all tools are registered
    // and then llmWithTools should be called once
    llmWithTools = llm.bindTools(tools);
}

export async function initilizeLLM(chatMessageHistory: BaseMessage[]): Promise<void> {
  // this is the system message that initializes the model
  const systemMessage = new SystemMessage(sysPrompt);
  chatMessageHistory.push(systemMessage);
  // We should add a list of the tools and things that the model can do to the system prompt.
  console.log("Tools initialized: ", tools.length);
}

export async function getChatResponse(chatMessageHistory: BaseMessage[]): Promise<string> {
  let response = await llmWithTools.invoke(chatMessageHistory);
  chatMessageHistory.push(response); // This is required for tools to work
  
  // Iterate through all tool calls
  for (const toolCall of response.tool_calls) {
    const selectedTool = toolsByName[toolCall.name];
    const result = await selectedTool.invoke(toolCall.args);

    console.log(`Tool called ${toolCall.name} with result: ${result}`);
    chatMessageHistory.push( new ToolMessage({ name: toolCall.name, content: result, tool_call_id: toolCall.id }) );
  }
  
  // If a tool is called then ask the LLM to comment on it
  if (response.tool_calls.length > 0) {
    response = await llmWithTools.invoke(chatMessageHistory);
  }
  
  return response.content ?? "Error communicating with model :(";
}

