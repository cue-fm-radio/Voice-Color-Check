import { v4 as uuidv4 } from 'uuid';

export interface Env {
    BUCKET: R2Bucket;
    GEMINI_API_KEY: string;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        // CORS Headers
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };

        // Handle CORS preflight requests
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: corsHeaders,
            });
        }

        if (request.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
        }

        // Route: Image Upload (Existing functionality)
        // Default to upload if path is root or /upload for backward compatibility if needed, 
        // strictly prefer /upload in new code.
        if (url.pathname === "/upload" || url.pathname === "/") {
            return handleImageUpload(request, env, corsHeaders);
        }

        // Route: Audio Analysis (New functionality)
        if (url.pathname === "/analyze") {
            return handleAudioAnalysis(request, env, corsHeaders);
        }

        return new Response("Not Found", { status: 404, headers: corsHeaders });
    },
};

async function handleImageUpload(request: Request, env: Env, corsHeaders: any): Promise<Response> {
    try {
        const formData = await request.formData();
        const image = formData.get("image") as unknown as File;

        if (!image) {
            return new Response("No image provided", { status: 400, headers: corsHeaders });
        }

        const filename = `${crypto.randomUUID()}.png`;

        // Upload to R2
        await env.BUCKET.put(filename, image, {
            httpMetadata: {
                contentType: "image/png",
            },
        });

        // Construct Public URL
        // R2.dev subdomain
        const R2_DEV_URL = "https://pub-3eac0df6bfdf43f4b4dc8268bd515932.r2.dev";
        const publicUrl = `${R2_DEV_URL}/${filename}`;

        return new Response(JSON.stringify({ url: publicUrl }), {
            headers: {
                "Content-Type": "application/json",
                ...corsHeaders,
            },
        });

    } catch (error) {
        console.error("Upload Error:", error);
        return new Response("Internal Server Error", { status: 500, headers: corsHeaders });
    }
}

async function handleAudioAnalysis(request: Request, env: Env, corsHeaders: any): Promise<Response> {
    try {
        const formData = await request.formData();
        const audioFile = formData.get("audio") as unknown as File;

        if (!audioFile) {
            return new Response("No audio file provided", { status: 400, headers: corsHeaders });
        }

        if (!env.GEMINI_API_KEY) {
            return new Response("Server Configuration Error: API Key missing", { status: 500, headers: corsHeaders });
        }

        // Convert audio to base64 safetly (avoiding stack overflow)
        const arrayBuffer = await audioFile.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(arrayBuffer);
        const len = bytes.byteLength;
        const CHUNK_SIZE = 0x8000; // 32768

        for (let i = 0; i < len; i += CHUNK_SIZE) {
            const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, len));
            binary += String.fromCharCode(...chunk);
        }
        const base64Audio = btoa(binary);

        // Call Gemini API
        const GEMINI_MODEL = "gemini-2.5-flash";
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;

        // System Prompt (Same as frontend)
        const systemInstruction = `
            You are an expert Voice Analyst and Color Therapist.
            Your task is to analyze the audio input (tone, pitch, speed, pauses, emotion, energy) and map it to a specific 12-color personality framework.
            IMPORTANT: Everyone reads the exact same script. Do NOT evaluate the content of the speech (words, meaning). Focus ONLY on the non-verbal qualities of the voice (how they say it).
            
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

        const requestBody = {
            contents: [{
                parts: [
                    {
                        inlineData: {
                            mimeType: audioFile.type || "audio/webm",
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
            }],
            systemInstruction: {
                parts: [{ text: systemInstruction }]
            },
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.5,
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        summary: { type: "STRING" },
                        parameters: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    id: { type: "STRING" },
                                    label: { type: "STRING" },
                                    subLabel: { type: "STRING" },
                                    score: { type: "NUMBER" },
                                    description: { type: "STRING" },
                                    colorCode: { type: "STRING" }
                                },
                                required: ["id", "label", "subLabel", "score", "description", "colorCode"]
                            }
                        }
                    },
                    required: ["summary", "parameters"]
                }
            }
        };

        const geminiResponse = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error("Gemini API Error:", geminiResponse.status, errorText);
            return new Response(`Gemini API Error: ${errorText}`, { status: geminiResponse.status, headers: corsHeaders });
        }

        const data = await geminiResponse.json();
        // Extract the actual text content from the response/candidates
        // @ts-ignore
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!resultText) {
            return new Response("Gemini API returned no text", { status: 500, headers: corsHeaders });
        }

        let cleanedText = resultText.trim();
        // Remove markdown code blocks if present
        if (cleanedText.startsWith("```")) {
            cleanedText = cleanedText.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "");
        }

        return new Response(cleanedText, {
            headers: {
                "Content-Type": "application/json",
                ...corsHeaders
            }
        });

    } catch (error) {
        console.error("Analysis Error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Response(`Internal Analysis Error: ${errorMessage}`, { status: 500, headers: corsHeaders });
    }
}
