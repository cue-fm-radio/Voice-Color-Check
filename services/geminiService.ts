import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, ColorParameter } from "../types";

// Helper to convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:audio/wav;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const analyzeVoiceAudio = async (audioBlob: Blob): Promise<AnalysisResult> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const base64Audio = await blobToBase64(audioBlob);

  const systemInstruction = `
    You are an expert Voice Analyst and Color Therapist.
    Your task is to analyze the audio input (tone, pitch, speed, pauses, emotion, energy) and map it to a specific 12-color personality framework.
    
    The 12 Colors and their definitions are:
    1. Red (レッド): 行動力 (Action) - Energy, passion, movement, speed.
    2. Coral (コーラル): 本能力 (Instinct) - Survival, nurturing, physical needs, warmth.
    3. Orange (オレンジ): 感性 (Sensibility) - Emotion, creativity, enjoyment, gut feelings.
    4. Gold (ゴールド): 意志力 (Willpower) - Confidence, success, leadership, wisdom.
    5. Yellow (イエロー): カリスマ性 (Charisma) - Uniqueness, humor, brightness, intellectual curiosity.
    6. Lime Green (ライムグリーン): 影響力 (Influence) - New beginnings, growth, freshness, hope.
    7. Green (グリーン): 共感力 (Empathy) - Harmony, balance, peace, acceptance of others.
    8. Aqua (アクア): 想像力 (Imagination) - Flow, adaptability, artistic creativity, right brain.
    9. Blue (ブルー): 伝達力 (Communication) - Expression, truth, speech, calm logic.
    10. Navy (ネイビー): 洞察力 (Insight) - Intuition, depth, wisdom, seeing the essence.
    11. Violet (バイオレット): 客観性 (Objectivity) - Healing, spirituality, detachment, high perspective.
    12. Magenta (マゼンダ): 受容力 (Receptivity) - Love, compassion, completeness, care.

    Listen to the voice. 
    - Is it fast and energetic? (Red/Yellow)
    - Is it deep and calm? (Navy/Violet)
    - Is it warm and welcoming? (Orange/Coral/Magenta)
    - Is it clear and articulate? (Blue/Gold)

    Assign a score from 0 to 100 for EACH of the 12 categories based on the voice qualities.
    Provide a general summary of the voice type.
    The description for each parameter should briefly explain why the voice reflects this trait.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING, description: "A warm, encouraging summary of the voice type." },
      parameters: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            label: { type: Type.STRING },
            subLabel: { type: Type.STRING },
            score: { type: Type.NUMBER },
            description: { type: Type.STRING, description: "Short explanation of the score." },
            colorCode: { type: Type.STRING }
          },
          required: ["id", "label", "subLabel", "score", "description", "colorCode"]
        }
      }
    },
    required: ["summary", "parameters"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioBlob.type, // e.g., 'audio/webm' or 'audio/mp4'
              data: base64Audio
            }
          },
          {
            text: `Analyze this voice. Return the result in Japanese. Ensure the output strictly follows the JSON schema.
            The parameters array MUST contain exactly 12 items corresponding to the 12 colors listed below.
            Use these exact labels and approximate hex codes:
            - Red: #EF4444 (レッド - 行動力)
            - Coral: #FB923C (コーラル - 本能力)
            - Orange: #F97316 (オレンジ - 感性)
            - Gold: #EAB308 (ゴールド - 意志力)
            - Yellow: #FACC15 (イエロー - カリスマ性)
            - Lime Green: #84CC16 (ライムグリーン - 影響力)
            - Green: #22C55E (グリーン - 共感力)
            - Aqua: #06B6D4 (アクア - 想像力)
            - Blue: #3B82F6 (ブルー - 伝達力)
            - Navy: #1E3A8A (ネイビー - 洞察力)
            - Violet: #8B5CF6 (バイオレット - 客観性)
            - Magenta: #D946EF (マゼンダ - 受容力)
            `
          }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.5,
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
    } else {
      throw new Error("No response text generated.");
    }
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};