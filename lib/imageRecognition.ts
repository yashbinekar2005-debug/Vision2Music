"use client";

import type { ImageRecognitionResult } from "@/lib/types";

const IMAGE_API_URL = process.env.NEXT_PUBLIC_IMAGE_API_URL ?? "http://localhost:8000/classify";

export async function recognizeInstrumentFromImage(file: File): Promise<ImageRecognitionResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(IMAGE_API_URL, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Image recognition failed.");
  }

  return response.json() as Promise<ImageRecognitionResult>;
}

// For detailed analysis (optional, can be called after recognition)
export async function analyzeInstrumentFromImage(file: File): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${process.env.NEXT_PUBLIC_IMAGE_API_URL ?? "http://localhost:8000"}/analyze`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Instrument analysis failed.");
  }

  return response.json();
}