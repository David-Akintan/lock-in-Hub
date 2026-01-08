
import { GoogleGenAI } from "@google/genai";
import { MENTOR_SYSTEM_PROMPT } from "../constants";

const getClient = () => {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey) {
    console.error("VITE_API_KEY is missing from environment variables.");
    return null;
  }
  // Trim whitespace to prevent auth errors (Status 0/403)
  return new GoogleGenAI({ apiKey: apiKey.trim() });
};

// Helper to ensure history is valid for Gemini API
// Rules: 
// 1. No empty text parts.
// 2. Alternating turns (User -> Model -> User).
// 3. History MUST start with 'user' (usually).
// 4. History MUST end with 'model' (because sendMessage adds the next 'user' turn).
const sanitizeHistory = (history: { role: string; parts: { text: string }[] }[]) => {
  if (!history || history.length === 0) return [];

  // 1. Validate and clean raw messages (Deep copy and filtering)
  const validMessages = history.map(h => ({
    role: h.role === 'model' ? 'model' : 'user', // Normalize roles
    text: h.parts?.[0]?.text ? h.parts[0].text.trim() : ''
  })).filter(h => h.text.length > 0); // Remove empty messages entirely

  if (validMessages.length === 0) return [];

  // 2. Merge adjacent messages of the same role
  const merged = [];
  let lastMsg = null;

  for (const msg of validMessages) {
    if (lastMsg && lastMsg.role === msg.role) {
      // Append to previous message text
      lastMsg.parts[0].text += `\n\n${msg.text}`;
    } else {
      // New turn
      lastMsg = {
        role: msg.role,
        parts: [{ text: msg.text }]
      };
      merged.push(lastMsg);
    }
  }

  // 3. Ensure history starts with 'user'
  // Gemini API throws 400 if history starts with 'model'
  while (merged.length > 0 && merged[0].role === 'model') {
    merged.shift();
  }

  // 4. Ensure history ends with 'model'
  // We are about to call `sendMessage` which acts as the next 'user' turn.
  // If the history ends in 'user', it implies a missing model response or a retry.
  // To maintain U-M-U-M-U sequence, we drop the last 'user' from history 
  // so the new message becomes the valid next 'user' turn.
  if (merged.length > 0 && merged[merged.length - 1].role === 'user') {
    merged.pop();
  }

  return merged;
};

export const sendMessageToAI = async (
  message: string,
  history: { role: string; parts: { text: string }[] }[],
  imageBase64?: string
): Promise<string> => {
  const ai = getClient();
  if (!ai) return "Error: API Key not configured.";

  try {
    const model = 'gemini-2.5-flash';

    // CASE 1: Image Analysis (Stateless / Single Turn)
    if (imageBase64) {
      // Robust Base64 extraction
      const base64Data = imageBase64.includes(',')
        ? imageBase64.split(',')[1]
        : imageBase64;

      // Basic mime type detection
      let mimeType = 'image/png';
      if (imageBase64.includes('image/jpeg')) mimeType = 'image/jpeg';
      else if (imageBase64.includes('image/webp')) mimeType = 'image/webp';
      else if (imageBase64.includes('image/heic')) mimeType = 'image/heic';

      const response = await ai.models.generateContent({
        model: model,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: mimeType, data: base64Data } },
              { text: message || "Analyze this image." }
            ]
          }
        ]
      });

      return response.text || "No analysis returned.";
    }

    // CASE 2: Text-only Chat Mode with History
    const cleanHistory = sanitizeHistory(history);

    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: MENTOR_SYSTEM_PROMPT,
      },
      history: cleanHistory
    });

    const result = await chat.sendMessage({ message });

    return result.text || "No response generated.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("400") || error.message?.includes("500")) {
      return "Connection Error: Please try again in a moment.";
    }
    return "Error: Network issue or service unavailable.";
  }
};

export const streamMessageToAI = async (
  message: string,
  history: { role: string; parts: { text: string }[] }[],
  onChunk: (text: string) => void
): Promise<string> => {
  const ai = getClient();
  if (!ai) {
    onChunk("Error: API Key missing.");
    return "Error";
  }

  try {
    const cleanHistory = sanitizeHistory(history);

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: MENTOR_SYSTEM_PROMPT,
      },
      history: cleanHistory
    });

    const result = await chat.sendMessageStream({ message });

    let fullText = "";

    for await (const chunk of result) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onChunk(text);
      }
    }

    return fullText;

  } catch (error: any) {
    console.error("Gemini Stream Error:", error);

    // Provide a user-friendly error message in the stream
    let errorMessage = "\n[Connection Interrupted]";

    const errStr = error.toString();
    if (errStr.includes("status code: 0") || errStr.includes("500")) {
      errorMessage = "\n[Network Error: Check connection or API Key]";
    } else if (errStr.includes("400")) {
      errorMessage = "\n[API Error: Request invalid. Please refresh chat.]";
    } else if (errStr.includes("429")) {
      errorMessage = "\n[Rate Limit: Please wait a moment.]";
    } else if (errStr.includes("503")) {
      errorMessage = "\n[Service Unavailable: The AI is currently overloaded.]";
    }

    onChunk(errorMessage);
    return "Error";
  }
};

export const transcribeAudio = async (audioBase64: string): Promise<string> => {
  const ai = getClient();
  if (!ai) return "Error: API Key missing.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'audio/webm', data: audioBase64 } },
            { text: "Transcribe the speech in this audio exactly as it is spoken. Do not add any introductory or concluding remarks. Just output the text." }
          ]
        }
      ]
    });
    return response.text?.trim() || "";
  } catch (e) {
    console.error("Transcription error", e);
    return "";
  }
};
