import type { AudioRecognitionResult } from "@/lib/types";
import { transcribeWithGroq, classifyFromTranscript, hasGroqKey } from "@/lib/groqApi";

const AUDIO_API_URL = process.env.NEXT_PUBLIC_AUDIO_API_URL ?? "http://localhost:8001/api/audio-classify";

export async function recognizeInstrumentFromAudio(file: File): Promise<AudioRecognitionResult> {
  if (hasGroqKey()) {
    try {
      const transcript = await transcribeWithGroq(file);
      const { instrument, confidence } = classifyFromTranscript(transcript);
      return {
        instrument,
        confidence,
        source: "legacy-svc",
        supportedPlayable: ["piano", "guitar", "drums", "violin", "flute"].includes(instrument),
        notes: `Transcript: "${transcript.slice(0, 100)}"`,
      };
    } catch {
      // fall through to legacy backend
    }
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(AUDIO_API_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Audio recognition failed.");
  }

  return response.json() as Promise<AudioRecognitionResult>;
}
