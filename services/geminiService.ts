import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';
import { Place } from "../types";


export interface AIResponse {
    text: string;
    places?: Place[];
}

let chat: Chat | null = null;
let keyChecked = false;
let keyExists = false;

const initializeChat = () => {
  if (chat) return true;

  if (!keyChecked) {
    keyExists = !!process.env.API_KEY;
    keyChecked = true;
    if (!keyExists) {
      console.error("Google AI API key is not configured. Please set the API_KEY environment variable.");
    }
  }

  if (!keyExists) {
    return false;
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            tools: [{googleSearch: {}}],
        }
    });
    return true;
  } catch (error) {
    console.error("Error initializing GoogleGenAI:", error);
    chat = null; // Ensure chat is null on failure
    return false;
  }
};

export const sendMessageToAI = async (message: string): Promise<AIResponse> => {
    if (!chat) {
        const initialized = initializeChat();
        if (!initialized) {
            return { text: "I am currently unable to connect. The Google AI API key seems to be missing. Please ensure it is configured correctly as an environment variable." };
        }
    }

    try {
        // This is safe because if chat is null, we try to initialize and return if it fails.
        const response: GenerateContentResponse = await chat!.sendMessage({ message });

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const places: Place[] | undefined = groundingChunks
            ?.map((chunk: any) => ({
                uri: chunk.web.uri,
                title: chunk.web.title,
            }))
            .filter((place: Place) => place.uri && place.title);

        return {
            text: response.text,
            places: places,
        };
    } catch (error) {
        console.error("Error sending message to AI:", error);
        // Reset chat instance on error to allow for re-initialization on next message.
        chat = null;
        return { text: "I'm sorry, I encountered an error while processing your request. It may be due to an invalid API key or a network issue. Please try again later."};
    }
};