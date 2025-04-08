import {ChatMessage} from "./modelChatTypes.ts";
import {streamChatResponse} from "./apiConnector.ts";

const chatHistoryList: Element = document.querySelector('#chat-history')!;
const chatInputField: HTMLInputElement = document.querySelector('#llm-chat-input')!;
const chatSubmitButton: HTMLButtonElement = document.querySelector('#llm-chat-submit')!;

const chatHistory: ChatMessage[] = [];

document.querySelector('#llm-chat-form')!.addEventListener('submit', async function (event) {
    event.preventDefault();

    const userInputField: HTMLInputElement = document.querySelector('#llm-chat-input')!;
    const userMessage = userInputField.value.trim();
    if (!userMessage) return;
    userInputField.value = '';

    addChatMessage({role: "user", content: userMessage});

    document.dispatchEvent(new CustomEvent("chatResponseStart"));
    let botResponseEntry: string;
    
    try {
        botResponseEntry = await streamChatResponse(chatHistory);
        addChatMessage({
            role: "assistant",
            content: botResponseEntry
        });
    }catch (exception){
        addChatMessage({
            role: "assistant",
            content: "Error communicating with llm API."
        });
    } finally {
        document.dispatchEvent(new CustomEvent("chatResponseEnd"));
    }
    
});

export function addChatMessage(chatMessage: ChatMessage): HTMLLIElement {
    //Add message to history
    chatHistory.push(chatMessage);
    
    //display user message in chat box
    const messageItem = document.createElement('li');
    messageItem.innerHTML = `<strong>${chatMessage.role.toUpperCase()}:</strong> ${chatMessage.content}`;
    messageItem.style.marginBottom = '10px';
    chatHistoryList.appendChild(messageItem);
    return messageItem;
}

//Detect if something modified the chat box and scroll to the bottom
const observer = new MutationObserver(() => {
    chatHistoryList.scrollTop = chatHistoryList.scrollHeight;
});

observer.observe(chatHistoryList, { childList: true, subtree: true, attributes: true, characterData: true });

// don't allow users to send messages while the bot is responding
document.addEventListener('chatResponseStart', () => {
    chatInputField.disabled = true;
    chatSubmitButton.disabled = true;
    chatInputField.value = "Thinking..."
});

document.addEventListener('chatResponseEnd', () => {
    chatInputField.disabled = false;
    chatSubmitButton.disabled = false;
    chatInputField.value = '';
    chatInputField.focus();
});

