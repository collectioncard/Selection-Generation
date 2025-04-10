import OpenAI from "openai";
import {ChatMessage} from "./modelChatTypes.ts";

const sysPrompt = "You are an expert tile-based map designer. The user will ask for you do to things and you are to always" +
    "respond correctly to any of their requests";

const modelURL: string = import.meta.env.VITE_LLM_URL;
const apiKey: string = import.meta.env.VITE_LLM_API_KEY;
const modelName: string = import.meta.env.VITE_LLM_MODEL_NAME;

const ai = new OpenAI({
    baseURL: modelURL,
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
});

export async function getChatResponse(chatMessageHistory: ChatMessage[]): Promise<string> {
    const completion = await ai.chat.completions.create({
        model: modelName,
        messages: [
            {
                role: "system",
                content: sysPrompt
            },
            ...chatMessageHistory
        ],
        store: false,
    })
    
    return completion.choices[0].message.content ?? "Error communicating with model :(";
}

