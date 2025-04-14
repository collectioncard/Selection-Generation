import OpenAI from "openai";
import {GoogleGenAI} from '@google/genai'; // https://aistudio.google.com/apikey
import {ChatMessage} from "./modelChatTypes.ts";

const sysPrompt = "You are an expert tile-based map designer. The user will ask for you do to things and you are to always" +
    "respond correctly to any of their requests";

    // not needed for google, but needed for openai
    const modelURL: string = import.meta.env.VITE_LLM_URL || "no";
    // use either your openai api key or your google api key
    const apiKey: string = import.meta.env.VITE_LLM_API_KEY || "no";
    // for gemini, I recommend: 'gemini-2.0-flash'
    const modelName: string = import.meta.env.VITE_LLM_MODEL_NAME || "no";
    // should be set to "openai" or "google";
    const llmProvider: string =  import.meta.env.VITE_LLM_MODEL_TYPE || "no"

    var openai : OpenAI;
    var gemini : GoogleGenAI; 

if (llmProvider === "openai") {
    openai = new OpenAI({
        baseURL: modelURL,
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
});
} else if (llmProvider === "google") {
    // reference: https://github.com/googleapis/js-genai
    gemini = new GoogleGenAI({apiKey: apiKey});
}

export async function getChatResponse(chatMessageHistory: ChatMessage[]): Promise<string> {
    if (llmProvider === "openai") {
        return await getOpenAIResponse(chatMessageHistory);
    } else if (llmProvider === "google") {
        return await getGoogleResponse(chatMessageHistory);
    }
    return "Error: No LLM provider selected";
}

async function getOpenAIResponse(chatMessageHistory: ChatMessage[]): Promise<string> {

    const completion = await openai.chat.completions.create({
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
async function getGoogleResponse(chatMessageHistory: ChatMessage[]): Promise<string> {
    const messages = [
        {
            role: "system",
            content: sysPrompt
        },
        ...chatMessageHistory
    ];
    // Convert messages to a string format for gemini
    const messagesString = messages.map((message) => {
        return `${message.role}: ${message.content}`;
    });

    const response = await gemini.models.generateContent({
        model: modelName,
        contents: messagesString
      });
      console.log(messagesString);
    console.log(response);
    return response.text ?? "Error communicating with model :(";
}