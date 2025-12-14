import { AnalysisResult } from '../types';

export const analyzeVoiceAudio = async (audioBlob: Blob): Promise<AnalysisResult> => {
  const WORKER_URL = import.meta.env.VITE_WORKER_URL;

  if (!WORKER_URL) {
    throw new Error("Worker URL is not defined");
  }

  const formData = new FormData();
  formData.append("audio", audioBlob);

  try {
    const response = await fetch(`${WORKER_URL}/analyze`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Analysis failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result as AnalysisResult;

  } catch (error) {
    console.error("Error analyzing voice:", error);
    throw error;
  }
};