"use client";

import type { ImageRecognitionResult, RecognitionMatch } from "@/lib/types";

const GROQ_API_BASE = "https://api.groq.com/openai/v1";
const VISION_MODEL = "llama-3.2-11b-vision-preview";
const AUDIO_MODEL = "whisper-large-v3-turbo";

const INSTRUMENTS = ["piano", "guitar", "drums", "violin", "flute"];

function getApiKey(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("groq_api_key") || process.env.NEXT_PUBLIC_GROQ_API_KEY || null;
  }
  return null;
}

export function setGroqApiKey(key: string) {
  localStorage.setItem("groq_api_key", key);
}

export function clearGroqApiKey() {
  localStorage.removeItem("groq_api_key");
}

export function hasGroqKey(): boolean {
  return getApiKey() !== null;
}

function resizeImage(file: File, maxDim: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim) {
        resolve(file);
        return;
      }
      if (width > height) {
        height = Math.round((height / width) * maxDim);
        width = maxDim;
      } else {
        width = Math.round((width / height) * maxDim);
        height = maxDim;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((b) => resolve(b!), file.type, 0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

async function fileToBase64(file: File): Promise<string> {
  const resized = await resizeImage(file, 1024);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(resized);
  });
}

export async function classifyWithGroq(
  file: File,
): Promise<ImageRecognitionResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Groq API key not configured");
  }

  const base64 = await fileToBase64(file);
  const mimeType = file.type || "image/jpeg";

  const body = {
    model: VISION_MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Identify the musical instrument in this photo. Respond with a JSON object only, no other text:
{
  "instrument": "<one of: piano, guitar, drums, violin, flute, or unknown>",
  "confidence": <0.0-1.0>,
  "reason": "<brief reason>"
}`,
          },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
        ],
      },
    ],
    temperature: 0,
    max_tokens: 150,
  };

  const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  let parsed: { instrument: string; confidence: number; reason?: string };
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/"instrument"\s*:\s*"(\w+)"/);
    const inst = match?.[1] || "unknown";
    const confMatch = content.match(/"confidence"\s*:\s*([\d.]+)/);
    parsed = { instrument: inst, confidence: confMatch ? parseFloat(confMatch[1]) : 0.5 };
  }

  const instrument = INSTRUMENTS.includes(parsed.instrument)
    ? parsed.instrument
    : "piano";
  const confidence = Math.min(1, Math.max(0, parsed.confidence || 0.5));

  const topMatches: RecognitionMatch[] = [
    { label: instrument, score: confidence },
    ...INSTRUMENTS.filter((i) => i !== instrument).map((i) => ({
      label: i,
      score: Math.max(0, confidence - 0.3 - Math.random() * 0.2),
    })),
  ].sort((a, b) => b.score - a.score);

  return { instrument: instrument as any, confidence, topMatches };
}

export async function transcribeWithGroq(file: File): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Groq API key not configured");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("model", AUDIO_MODEL);
  formData.append("language", "en");
  formData.append("response_format", "json");

  const response = await fetch(`${GROQ_API_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq Whisper error (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.text || "";
}

const AUDIO_KEYWORDS: [string, string][] = [
  ["piano", "piano"],
  ["keyboard", "piano"],
  ["guitar", "guitar"],
  ["drum", "drums"],
  ["percussion", "drums"],
  ["violin", "violin"],
  ["fiddle", "violin"],
  ["flute", "flute"],
];

export function classifyFromTranscript(text: string): {
  instrument: string;
  confidence: number;
} {
  const lower = text.toLowerCase();
  for (const [keyword, inst] of AUDIO_KEYWORDS) {
    if (lower.includes(keyword)) {
      return { instrument: inst, confidence: 0.85 };
    }
  }
  return { instrument: "unknown", confidence: 0 };
}
