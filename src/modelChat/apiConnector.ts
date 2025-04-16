import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import { z, ZodObject } from "zod";

import {
    BaseMessage,
    HumanMessage,
    AIMessage,
    ToolMessage,
    SystemMessage,
  } from "@langchain/core/messages";

const sysPrompt = "You are an expert tile-based map designer. The user will ask for you do to things and you are to always" +
    "respond correctly to any of their requests";

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
tools.push(addTool);
toolsByName[addTool.name] = addTool;


// this is the llm to call that has the tools
let llmWithTools : any= llm.bindTools(tools);
export async function initilizeLLM(chatMessageHistory: BaseMessage[]): Promise<void> {
    // this is the system message that initializes the model
    const systemMessage = new SystemMessage(sysPrompt);
    chatMessageHistory.push(systemMessage);
    // this is the system message that initializes the tools
    // const toolSystemMessage = new SystemMessage("You have access to the following tools: " + JSON.stringify(tools));
    // chatMessageHistory.push(toolSystemMessage);
    console.log("Tools initialized: ", tools.length);
}

export async function getChatResponse(chatMessageHistory: BaseMessage[]): Promise<string> {
    let response = await llmWithTools.invoke(chatMessageHistory);
      chatMessageHistory.push(response);
    for (const toolCall of response.tool_calls) {
        const selectedTool = toolsByName[toolCall.name];
        // const result = await selectedTool.invoke(toolCall);
        const result = await selectedTool.invoke(toolCall.args); // Pass toolCall.args
        // console.log(result);
        console.log(`Tool called ${toolCall.name} with result: ${result.content}`);
        chatMessageHistory.push( new ToolMessage({ name: toolCall.name, content: result, tool_call_id: toolCall.id }) );
    }
    console.log("Tool calls: ", response.tool_calls.length);
    if (response.tool_calls.length > 0) {
        
        console.log("A");
        console.log(chatMessageHistory)
        response = await llmWithTools.invoke(chatMessageHistory);
    }
    console.log("B");
    console.log(response);
    return response.content ?? "Error communicating with model :(";
}

