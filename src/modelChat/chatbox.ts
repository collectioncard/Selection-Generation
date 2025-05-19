import { getChatResponse, initilizeLLMForLayer } from "./apiConnector.ts";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";

const chatHistoryList: Element = document.querySelector('#chat-history')!;
const chatInputField: HTMLInputElement = document.querySelector('#llm-chat-input')!;
const chatSubmitButton: HTMLButtonElement = document.querySelector('#llm-chat-submit')!;
const llmChatTitle: HTMLElement | null = document.querySelector('#llm-chat-title');

const allLayerChatHistories: Map<string, BaseMessage[]> = new Map();
let currentLayerId: string | null = null; // This will be set to "Root" initially
let activeChatHistory: BaseMessage[] = [];

// Function to get the current chat layer ID, used by main.ts
export function getCurrentChatLayerId(): string | null {
    return currentLayerId;
}

function updateChatTitle(layerId: string | null) {
    if (llmChatTitle) {
        llmChatTitle.textContent = layerId ? `Chat - ${layerId}` : "Chat - Global"; // More specific for Root/null
    }
}

export async function switchChatContext(layerId: string) {
    console.log(`Switching chat context to: ${layerId}`);
    if (currentLayerId && currentLayerId !== layerId) {
        allLayerChatHistories.set(currentLayerId, [...activeChatHistory]);
    }

    currentLayerId = layerId; // Set currentLayerId
    updateChatTitle(layerId);
    chatHistoryList.innerHTML = '';

    if (allLayerChatHistories.has(layerId)) {
        activeChatHistory = allLayerChatHistories.get(layerId)!;
        activeChatHistory.forEach(msg => displayMessageInUI(msg));
        console.log(`Loaded history for ${layerId}. Messages: ${activeChatHistory.length}`);
    } else {
        console.log(`No history for ${layerId}, initializing new.`);
        activeChatHistory = [];
        await initilizeLLMForLayer(activeChatHistory, layerId); // This will add the system prompt
        allLayerChatHistories.set(layerId, activeChatHistory);
         console.log(`Initialized new history for ${layerId}. Messages: ${activeChatHistory.length}`);
    }
    chatHistoryList.scrollTop = chatHistoryList.scrollHeight;

    if (currentLayerId) {
        chatInputField.disabled = false;
        chatSubmitButton.disabled = false;
        chatInputField.placeholder = `Message ${currentLayerId}...`;
    } else {
        // This state should ideally not be reached if "Root" is the default fallback.
        chatInputField.disabled = true;
        chatSubmitButton.disabled = true;
        chatInputField.placeholder = "Select a layer to chat";
        console.warn("Chat input disabled as currentLayerId is null.");
    }
}

export function handleLayerDeleted(layerId: string) {
    if (allLayerChatHistories.has(layerId)) {
        allLayerChatHistories.delete(layerId);
        if (currentLayerId === layerId) {
            // Fallback to "Root" context if the active layer is deleted
            console.log(`Active layer ${layerId} deleted. Switching to Root context.`);
            switchChatContext("Root");
        }
    }
}

export function handleLayerRenamed(oldLayerId: string, newLayerId: string) {
    if (allLayerChatHistories.has(oldLayerId)) {
        const history = allLayerChatHistories.get(oldLayerId)!;
        allLayerChatHistories.delete(oldLayerId);
        allLayerChatHistories.set(newLayerId, history);
        if (currentLayerId === oldLayerId) {
            // No need to call switchChatContext here, just update the ID and title
            currentLayerId = newLayerId;
            updateChatTitle(newLayerId);
            // The activeChatHistory is already the correct one.
        }
    }
}

document.querySelector('#llm-chat-form')!.addEventListener('submit', async function (event) {
    event.preventDefault();

    if (!currentLayerId) { // This guard should now be fine because "Root" is a valid ID.
        console.error("Submit blocked: currentLayerId is null or undefined.", currentLayerId);
        // Display a more user-friendly message if this somehow happens.
        const tempMsgItem = document.createElement('li');
        tempMsgItem.innerHTML = `<strong>SYSTEM:</strong> Chat not active. Please select a layer or try resetting.`;
        tempMsgItem.style.color = "red";
        chatHistoryList.appendChild(tempMsgItem);
        chatHistoryList.scrollTop = chatHistoryList.scrollHeight;
        return;
    }

    const userInputField: HTMLInputElement = document.querySelector('#llm-chat-input')!;
    var userMessage = userInputField.value.trim();
    if (!userMessage) return;
    userInputField.value = '';

    addChatMessage(new HumanMessage(userMessage)); // This will use the `activeChatHistory`

    document.dispatchEvent(new CustomEvent("chatResponseStart"));
    let botResponseEntry: string;

    try {
        // Pass the activeChatHistory which corresponds to currentLayerId
        botResponseEntry = await getChatResponse(activeChatHistory, currentLayerId);
        addChatMessage(new AIMessage(botResponseEntry));
    } catch (exception) {
        const errorMessage = exception instanceof Error ? exception.message : "Unknown error";
        addChatMessage(new AIMessage("Error: " + errorMessage));
    } finally {
        document.dispatchEvent(new CustomEvent("chatResponseEnd"));
    }
});

function displayMessageInUI(chatMessage: BaseMessage): HTMLLIElement {
    const messageItem = document.createElement('li');
    const sender = chatMessage.constructor.name === "HumanMessage" ? "User" : "Pewter";
    // Ensure content is treated as text. For security and to prevent HTML injection.
    const contentText = chatMessage.content && typeof chatMessage.content === 'string' ? chatMessage.content : JSON.stringify(chatMessage.content);
    messageItem.innerHTML = `<strong>${sender}:</strong> `;
    const textNode = document.createTextNode(contentText);
    messageItem.appendChild(textNode);

    messageItem.style.marginBottom = '10px';
    chatHistoryList.appendChild(messageItem);
    return messageItem;
}

export function addChatMessage(chatMessage: BaseMessage): HTMLLIElement | null {
    if (!currentLayerId) {
        // This should be less likely to trigger if "Root" is always initialized
        console.warn("addChatMessage: No active layer (currentLayerId is null). Message not added to history.");
        const errorLi = document.createElement('li');
        errorLi.innerHTML = `<strong>SYSTEM:</strong> Cannot send message. No layer selected. Try selecting 'Root' or another layer.`;
        errorLi.style.marginBottom = '10px';
        errorLi.style.color = 'red';
        chatHistoryList.appendChild(errorLi);
        chatHistoryList.scrollTop = chatHistoryList.scrollHeight;
        return errorLi;
    }
    // `activeChatHistory` is already pointing to the correct history array by switchChatContext
    activeChatHistory.push(chatMessage);
    const messageItem = displayMessageInUI(chatMessage);
    return messageItem;
}

const observer = new MutationObserver(() => {
    chatHistoryList.scrollTop = chatHistoryList.scrollHeight;
});
observer.observe(chatHistoryList, { childList: true });

document.addEventListener('chatResponseStart', () => {
    chatInputField.disabled = true;
    chatSubmitButton.disabled = true;
    chatInputField.placeholder = "Pewter is thinking..."
    chatInputField.value = "";
});

document.addEventListener('chatResponseEnd', () => {
    chatInputField.disabled = false;
    chatSubmitButton.disabled = false;
    if (currentLayerId) { // Ensure placeholder reflects current context
      chatInputField.placeholder = `Message ${currentLayerId}...`;
    } else {
      chatInputField.placeholder = "Select a layer to chat";
    }
    chatInputField.value = '';
    chatInputField.focus();
});

export async function sendSystemMessageToCurrentLayer(message: string): Promise<void> {
    if (!currentLayerId) {
        addChatMessage(new AIMessage("Cannot process system message: No layer selected."));
        return;
    }
    const systemContextMessage = new HumanMessage(`System note for context: ${message}`);

    document.dispatchEvent(new CustomEvent("chatResponseStart"));
    let botResponseEntry: string;
    try {
        const tempHistory = [...activeChatHistory, systemContextMessage];
        botResponseEntry = await getChatResponse(tempHistory, currentLayerId);
        addChatMessage(new AIMessage(botResponseEntry));
    } catch (exception) {
        const errorMessage = exception instanceof Error ? exception.message : "Unknown error";
        addChatMessage(new AIMessage("Error: " + errorMessage));
    } finally {
        document.dispatchEvent(new CustomEvent("chatResponseEnd"));
    }
}

// Initialize with "Root" context explicitly.
// This will be called again from main.ts, but having a default here is safer.
// However, main.ts should be the primary initializer.
// updateChatTitle("Root"); // Initial title before main.ts potentially overrides
// Ensure chat input is initially disabled until context is confirmed.
chatInputField.disabled = true;
chatSubmitButton.disabled = true;
chatInputField.placeholder = "Initializing chat...";