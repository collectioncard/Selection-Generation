import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

import {
    BaseMessage,
    ToolMessage,
    SystemMessage,
  } from "@langchain/core/messages";

const sysPrompt = "You are an expert tile-based map designer. The user will ask for you do to things and you are to always" +
    "respond correctly to any of their requests" +
    "When calling a tool, if the user does not specify a value, use a default value, or infer the value.";

const apiKey: string = import.meta.env.VITE_LLM_API_KEY;
const modelName: string = import.meta.env.VITE_LLM_MODEL_NAME;

// this is the base model, use llmWithTools to call the model with tools
const llm = new ChatGoogleGenerativeAI({
  model: modelName,
  temperature: 0,
  maxRetries: 2,
  apiKey: apiKey
});
// this stores the references to the tool functions with their schemas
let tools : any = [];
// this stores backwards references to the tool functions from their names
let toolsByName : any = {};

// this is the llm to call that has the tools
// it needs to be rebound after all tools are in the list.
let llmWithTools : any= llm.bindTools(tools);


// AddTool is a tool that serves as an example of how to add a tool to the model
const addTool = tool(
    async ({ a, b }) => {
      console.log("ADDING A AND B");
      return `${a + b}`;
    },
    {
      name: "add",
      schema: z.object({
        a: z.number(),
        b: z.number(),
      }),
      description: "Adds a and b.",
    }
  );
// once the tool is created, it is added to the tools array and the toolsByName object
registerTool(addTool);


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
  console.log("Tools initialized: ", tools.length);
}

export async function getChatResponse(chatMessageHistory: BaseMessage[]): Promise<string> {
  let response = await llmWithTools.invoke(chatMessageHistory);
    chatMessageHistory.push(response);
  for (const toolCall of response.tool_calls) {
    const selectedTool = toolsByName[toolCall.name];
    const result = await selectedTool.invoke(toolCall.args);
    console.log(`Tool called ${toolCall.name} with result: ${result.content}`);
    chatMessageHistory.push( new ToolMessage({ name: toolCall.name, content: result, tool_call_id: toolCall.id }) );
  }
  if (response.tool_calls.length > 0) {
    response = await llmWithTools.invoke(chatMessageHistory);
  }
  return response.content ?? "Error communicating with model :(";
}

