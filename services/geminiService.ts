import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

// We strictly use the API Key from the environment variable as required
// Initialize GoogleGenAI directly with process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Constants for models
export const GEMINI_MODEL = 'gemini-3-pro-preview';

/**
 * Helper to convert file object to base64
 */
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Initialize a chat session
 */
export const createChatSession = (): Chat => {
  return ai.chats.create({
    model: GEMINI_MODEL,
    config: {
      systemInstruction: `You are RoomResQ, an expert professional home organizer and interior design consultant. 
      Your goal is to help users declutter and organize their spaces based on photos they provide.
      
      When analyzing a room:
      1.  Identify the main areas of clutter or disorganization.
      2.  Suggest specific, actionable storage solutions (e.g., "use clear bins for these toys," "install a floating shelf here").
      3.  Provide a "quick win" task they can do in 5 minutes.
      4.  Maintain a motivating, non-judgmental, and helpful tone.
      
      For follow-up questions, continue to provide specific advice referencing the visual context of the original image if applicable.`,
    },
  });
};

/**
 * Send the initial image and prompt to start the analysis/chat
 */
export const analyzeImage = async (chat: Chat, file: File, promptText: string): Promise<string> => {
  const imagePart = await fileToGenerativePart(file);
  
  const response: GenerateContentResponse = await chat.sendMessage({
    message: [
        imagePart,
        { text: promptText }
      ]
  });

  return response.text || "I couldn't generate a response. Please try again.";
};

/**
 * Send a follow-up text message to the chat
 */
export const sendMessage = async (chat: Chat, text: string): Promise<string> => {
  const response: GenerateContentResponse = await chat.sendMessage({
    message: text
  });
  
  return response.text || "I couldn't generate a response. Please try again.";
};