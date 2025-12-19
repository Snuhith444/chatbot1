
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Role } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateChatResponse = async (
  messages: Message[],
  onChunk: (text: string) => void
) => {
  try {
    const model = 'gemini-3-flash-preview';
    
    // Map internal message format to Gemini API format
    const contents = messages
      .filter(m => m.role !== Role.SYSTEM)
      .map(m => ({
        role: m.role,
        parts: m.parts || [{ text: m.content }]
      }));

    const responseStream = await ai.models.generateContentStream({
      model,
      contents,
      config: {
        systemInstruction: "You are a world-class AI assistant. You provide concise, accurate, and helpful information. You format your responses using Markdown for clarity, including code blocks where appropriate. Always be polite and professional.",
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
      }
    });

    let fullText = "";
    for await (const chunk of responseStream) {
      const c = chunk as GenerateContentResponse;
      const text = c.text || "";
      fullText += text;
      onChunk(fullText);
    }
    
    return fullText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
