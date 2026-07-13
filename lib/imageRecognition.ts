"use client";

import type { ImageRecognitionResult, RecognitionMatch } from "@/lib/types";

const LABELS = ["piano", "guitar", "drums", "violin", "flute"];

let worker: Worker | null = null;
let initPromise: Promise<void> | null = null;
let onProgress: ((pct: number, text: string) => void) | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL("./classifier.worker.ts", import.meta.url),
      { type: "module" },
    );
  }
  return worker;
}

async function ensureInitialized(): Promise<void> {
  if (initPromise) return initPromise;
  const w = getWorker();
  initPromise = new Promise((resolve, reject) => {
    const handle = (e: MessageEvent) => {
      if (e.data.status === "ready" || e.data.status === "loading") {
        w.removeEventListener("message", handle);
        resolve();
      }
      if (e.data.status === "error") {
        w.removeEventListener("message", handle);
        reject(new Error(e.data.error || "Model failed to load"));
      }
    };
    w.addEventListener("message", handle);
  });
  return initPromise;
}

function classifyImage(
  imageBuffer: ArrayBuffer,
  mimeType: string,
): Promise<RecognitionMatch[]> {
  const w = getWorker();

  return new Promise((resolve, reject) => {
    const handleMessage = (e: MessageEvent) => {
      const data = e.data;
      if (data.status === "progress") {
        onProgress?.(data.progress, data.text);
        return;
      }
      if (data.status === "loading") {
        onProgress?.(0, "Starting download...");
        return;
      }
      if (data.status === "ready") {
        onProgress?.(100, "Model ready");
        return;
      }
      if (data.status === "complete") {
        w.removeEventListener("message", handleMessage);
        resolve(data.results);
      }
      if (data.status === "error") {
        w.removeEventListener("message", handleMessage);
        reject(new Error(data.error || "Classification failed"));
      }
    };
    w.addEventListener("message", handleMessage);
    w.postMessage({ type: "classify", imageBuffer, mimeType }, [imageBuffer]);

    setTimeout(() => {
      w.removeEventListener("message", handleMessage);
      reject(new Error("Classification timed out"));
    }, 120000);
  });
}

export function setProgressCallback(cb: (pct: number, text: string) => void) {
  onProgress = cb;
}

export function warmUpModel(): Promise<void> {
  return ensureInitialized();
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
      canvas.toBlob((b) => resolve(b!), file.type, 0.8);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for resize"));
    };
    img.src = url;
  });
}

export async function recognizeInstrumentFromImage(
  file: File,
): Promise<ImageRecognitionResult> {
  const resized = await resizeImage(file, 800);
  const arrayBuffer = await resized.arrayBuffer();
  const topMatches = await classifyImage(arrayBuffer, resized.type);

  const best = topMatches[0];
  const instrument = LABELS.includes(best.label) ? best.label : "piano";
  const confidence = best.score;

  return { instrument: instrument as any, confidence, topMatches };
}

export async function analyzeInstrumentFromImage(_file: File): Promise<any> {
  return {
    type: "unknown",
    variant: "standard",
    strings: null,
    octave_range: [2, 5],
    notes: ["C", "D", "E", "F", "G", "A", "B"],
    tuning: null,
    pads: null,
  };
}
