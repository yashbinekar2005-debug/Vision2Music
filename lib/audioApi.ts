import type { AudioRecognitionResult } from "@/lib/types";

const AUDIO_API_URL = process.env.NEXT_PUBLIC_AUDIO_API_URL ?? "http://localhost:8001/api/audio-classify";

export async function recognizeInstrumentFromAudio(file: File): Promise<AudioRecognitionResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(AUDIO_API_URL, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Audio recognition failed.");
  }

  return response.json() as Promise<AudioRecognitionResult>;
}
