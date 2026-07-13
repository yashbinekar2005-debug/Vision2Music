"use client";

import { AlertCircle, AudioLines, Camera, Loader2, Upload } from "lucide-react";
import type { AudioRecognitionResult, ImageRecognitionResult, Instrument } from "@/lib/types";
import { INSTRUMENT_LABELS, PLAYABLE_INSTRUMENTS, isPlayableInstrument } from "@/lib/types";

type Props = {
  mode: "image" | "audio";
  setMode: (mode: "image" | "audio") => void;
  imageResult: ImageRecognitionResult | null;
  audioResult: AudioRecognitionResult | null;
  loading: boolean;
  error: string | null;
  selectedInstrument: Instrument;
  onImageUpload: (file: File) => void;
  onAudioUpload: (file: File) => void;
  onOverride: (instrument: Instrument) => void;
  recognizing?: boolean;
  groqConfigured?: boolean;
  onOpenKeySetup?: () => void;
};

export function RecognitionPanel({
  mode,
  setMode,
  imageResult,
  audioResult,
  loading,
  error,
  selectedInstrument,
  onImageUpload,
  onAudioUpload,
  onOverride,
  recognizing = false,
  groqConfigured = false,
  onOpenKeySetup
}: Props) {
  const inputId = mode === "image" ? "image-upload" : "audio-upload";

  return (
    <section className="rounded-lg border border-ink/10 bg-white/80 p-4 shadow-panel backdrop-blur">
      <div className="mb-4 grid grid-cols-2 rounded-lg border border-ink/10 bg-paper p-1">
        <button
          type="button"
          onClick={() => setMode("image")}
          className={`flex h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold ${
            mode === "image" ? "bg-ink text-paper" : "text-ink/70 hover:text-ink"
          }`}
        >
          <Camera size={17} />
          Image
        </button>
        <button
          type="button"
          onClick={() => setMode("audio")}
          className={`flex h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold ${
            mode === "audio" ? "bg-ink text-paper" : "text-ink/70 hover:text-ink"
          }`}
        >
          <AudioLines size={17} />
          Audio
        </button>
      </div>

      <label
        htmlFor={inputId}
        className="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-ink/20 bg-paper/80 px-4 text-center transition hover:border-slateblue hover:bg-white"
      >
        <span className="grid h-14 w-14 place-items-center rounded-lg bg-slateblue text-white">
          {recognizing ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
        </span>
        <span className="text-lg font-bold">{mode === "image" ? "Upload instrument image" : "Upload instrument audio"}</span>
        <span className="max-w-xs text-sm leading-6 text-ink/65">
          {mode === "image"
            ? groqConfigured
              ? "Uses Groq Llama 3.2 Vision for fast, accurate instrument recognition."
              : "Uses local ResNet-50 model. Add a Groq API key for better accuracy."
            : groqConfigured
              ? "Uses Groq Whisper to transcribe and identify instruments from audio."
              : "Uses legacy SVC audio model through the FastAPI backend."}
        </span>
      </label>
      <input
        id={inputId}
        type="file"
        className="sr-only"
        accept={mode === "image" ? "image/png,image/jpeg,image/webp" : "audio/*"}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          if (mode === "image") onImageUpload(file);
          else onAudioUpload(file);
          event.currentTarget.value = "";
        }}
      />

      <div className="mt-5 rounded-lg border border-ink/10 bg-paper p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-bold">
            Recognition
            {!groqConfigured && onOpenKeySetup && (
              <button
                onClick={onOpenKeySetup}
                className="ml-2 rounded-md border border-ink/15 px-2 py-0.5 text-xs font-bold text-ink/50 hover:bg-ink/5"
              >
                Add API Key
              </button>
            )}
          </h3>
          <select
            value={selectedInstrument}
            onChange={(event) => onOverride(event.target.value as Instrument)}
            className="h-10 rounded-md border border-ink/15 bg-white px-3 text-sm"
          >
            {PLAYABLE_INSTRUMENTS.map((instrument) => (
              <option key={instrument} value={instrument}>
                {INSTRUMENT_LABELS[instrument]}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-3 flex gap-2 rounded-md border border-lacquer/30 bg-lacquer/10 p-3 text-sm text-lacquer">
            <AlertCircle className="mt-0.5 shrink-0" size={16} />
            <span>{error}</span>
          </div>
        )}

        {mode === "image" && imageResult && (
          <div className="space-y-3">
            <ResultLine label="Detected" value={INSTRUMENT_LABELS[imageResult.instrument]} detail={`${Math.round(imageResult.confidence * 100)}%`} />
            <div className="space-y-2">
              {imageResult.topMatches.slice(0, 5).map((match) => (
                <Meter key={match.label} label={match.label} value={match.score} />
              ))}
            </div>
          </div>
        )}

        {mode === "audio" && audioResult && (
          <div className="space-y-3">
            <ResultLine
              label="Legacy result"
              value={audioResult.instrument}
              detail={isPlayableInstrument(audioResult.instrument) ? "playable" : "override needed"}
            />
            <p className="text-sm leading-6 text-ink/65">
              {audioResult.notes ??
                "This model is limited to short single-note audio and may not cover every playable instrument."}
            </p>
          </div>
        )}

        {!imageResult && !audioResult && !error && (
          <p className="text-sm leading-6 text-ink/60">Upload a file to identify an instrument, or choose one manually.</p>
        )}
      </div>
    </section>
  );
}

function ResultLine({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-white p-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-ink/45">{label}</p>
        <p className="text-lg font-bold capitalize">{value}</p>
      </div>
      <span className="rounded-md bg-mint/35 px-3 py-1 text-sm font-bold text-ink">{detail}</span>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-bold uppercase text-ink/55">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-brass" style={{ width: `${Math.max(3, value * 100)}%` }} />
      </div>
    </div>
  );
}