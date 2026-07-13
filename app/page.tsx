"use client";

import { useState, useEffect } from "react";
import { AudioLines, Camera, Sparkles, Settings2, KeyRound } from "lucide-react";
import { InstrumentStage } from "@/components/InstrumentStage";
import { RecognitionPanel } from "@/components/RecognitionPanel";
import { recognizeInstrumentFromAudio } from "@/lib/audioApi";
import {
  recognizeInstrumentFromImage,
  analyzeInstrumentFromImage,
  warmUpModel,
  setProgressCallback,
} from "@/lib/imageRecognition";
import { setGroqApiKey, hasGroqKey } from "@/lib/groqApi";
import type { AudioRecognitionResult, ImageRecognitionResult, Instrument } from "@/lib/types";
import { INSTRUMENT_LABELS, isPlayableInstrument } from "@/lib/types";

export default function Home() {
  const [mode, setMode] = useState<"image" | "audio">("image");
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [imageResult, setImageResult] = useState<ImageRecognitionResult | null>(null);
  const [audioResult, setAudioResult] = useState<AudioRecognitionResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [modelProgress, setModelProgress] = useState<{ pct: number; text: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [groqConfigured, setGroqConfigured] = useState(false);

  useEffect(() => {
    setGroqConfigured(hasGroqKey());
  }, []);

  useEffect(() => {
    setProgressCallback((pct, text) => setModelProgress({ pct, text }));
    if (!hasGroqKey()) {
      warmUpModel().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (recognizing && mode === "image" && imageResult && imageResult.confidence >= 0.7) {
      analyzeImageWithTimeout();
    }
  }, [imageResult, recognizing, mode]);

  function handleSaveKey() {
    const trimmed = apiKey.trim();
    if (trimmed) {
      setGroqApiKey(trimmed);
      setGroqConfigured(true);
      setShowSettings(false);
    }
  }

  function handleClearKey() {
    setApiKey("");
    setGroqApiKey("");
    setGroqConfigured(false);
  }

  async function analyzeImageWithTimeout() {
    try {
      const analysisPromise = analyzeInstrumentFromImage(
        new File([""], "placeholder")
      );

      const result = await analysisPromise;
      setAnalysisResult(result);
    } catch (err) {
      console.warn("Image analysis failed:", err);
    } finally {
      setRecognizing(false);
    }
  }

  async function onImageUpload(file: File) {
    setMode("image");
    setLoading(true);
    setRecognizing(true);
    setError(null);
    setImageResult(null);
    setAudioResult(null);
    setAnalysisResult(null);
    setSelectedInstrument(null);

    try {
      const result = await recognizeInstrumentFromImage(file);
      setImageResult(result);

      if (result.confidence >= 0.6) {
        setSelectedInstrument(result.instrument);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image recognition failed.");
    } finally {
      setLoading(false);
    }
  }

  async function onAudioUpload(file: File) {
    setMode("audio");
    setLoading(true);
    setError(null);
    setImageResult(null);
    setAudioResult(null);
    setAnalysisResult(null);
    setSelectedInstrument(null);

    try {
      const result = await recognizeInstrumentFromAudio(file);
      setAudioResult(result);

      if (isPlayableInstrument(result.instrument)) {
        setSelectedInstrument(result.instrument as Instrument);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audio recognition failed. Add a Groq API key or start the backend.");
    } finally {
      setLoading(false);
    }
  }

  const handleInstrumentSelect = (instrument: Instrument) => {
    setSelectedInstrument(instrument);
  };

  const imageSource = groqConfigured ? "Groq Llama Vision" : "ResNet-50 (~7 MB q4)";
  const audioSource = groqConfigured ? "Groq Whisper" : "Legacy SVC";

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-ink/15 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-ink px-3 py-1 text-sm font-bold text-paper">
              <Sparkles size={15} />
              {groqConfigured
                ? "Groq API-powered instrument recognition"
                : "ResNet-50 local model (add Groq API key for better accuracy)"}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="ml-2 rounded-md bg-paper/20 p-1 hover:bg-paper/30"
                title="Settings"
              >
                <Settings2 size={14} />
              </button>
            </div>
            <h1 className="text-4xl font-black leading-tight sm:text-5xl">InstrumentVision</h1>
            <p className="mt-2 max-w-2xl text-base leading-7 text-ink/70">
              Upload an instrument photo or short audio clip, then play the detected instrument directly in the browser.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <StatusChip icon={<Camera size={16} />} label="Image" value={imageSource} />
            <StatusChip icon={<AudioLines size={16} />} label="Audio" value={audioSource} />
          </div>
        </header>

        {showSettings && (
          <div className="mb-6 rounded-lg border border-ink/15 bg-white/80 p-4">
            <div className="flex items-center gap-3">
              <KeyRound size={18} className="text-ink/50" />
              <span className="text-sm font-bold text-ink/70">Groq API Key</span>
            </div>
            <p className="mb-3 mt-1 text-xs text-ink/50">
              Get a free key at console.groq.com. Uses Llama-3.2-11b-Vision for image and Whisper for audio.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={groqConfigured ? "Key is set (enter new to replace)" : "gsk_..."}
                className="flex-1 rounded-md border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-ink/50"
              />
              <button
                onClick={handleSaveKey}
                disabled={!apiKey.trim()}
                className="rounded-md bg-ink px-4 py-2 text-sm font-bold text-paper hover:bg-ink/80 disabled:opacity-40"
              >
                Save
              </button>
              {groqConfigured && (
                <button
                  onClick={handleClearKey}
                  className="rounded-md border border-ink/20 px-4 py-2 text-sm font-bold text-ink/60 hover:bg-ink/5"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[390px_minmax(0,1fr)]">
          <RecognitionPanel
            mode={mode}
            setMode={setMode}
            imageResult={imageResult}
            audioResult={audioResult}
            loading={loading}
            error={error}
            selectedInstrument={selectedInstrument || "piano"}
            onImageUpload={onImageUpload}
            onAudioUpload={onAudioUpload}
            onOverride={handleInstrumentSelect}
            recognizing={recognizing}
          />

          <div className="min-w-0">
            {selectedInstrument ? (
              <InstrumentStage
                instrument={selectedInstrument}
                onInstrumentChange={handleInstrumentSelect}
              />
            ) : (
              <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
                {!loading && !error && !modelProgress ? (
                  <>
                    <div className="mb-4">
                      <span className="grid h-12 w-12 place-items-center rounded-lg border border-ink/20 bg-paper text-ink/50">
                        <Camera size={20} />
                      </span>
                    </div>
                    <p className="text-base text-ink/60">
                      Upload an image or audio clip to recognize an instrument,
                      then the playable interface will appear here.
                    </p>
                    {!groqConfigured && (
                      <button
                        onClick={() => setShowSettings(true)}
                        className="mt-4 rounded-md border border-ink/20 px-4 py-2 text-sm font-bold text-ink/60 hover:bg-ink/5"
                      >
                        <KeyRound size={14} className="mr-1.5 inline" />
                        Add Groq API Key for better accuracy
                      </button>
                    )}
                  </>
                ) : modelProgress && modelProgress.pct < 100 ? (
                  <div className="w-full max-w-xs">
                    <p className="mb-2 text-sm text-ink/60">{modelProgress.text}</p>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
                      <div
                        className="h-full rounded-full bg-ink transition-all duration-300"
                        style={{ width: `${modelProgress.pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-ink/40">{modelProgress.pct}%</p>
                  </div>
                ) : (
                  <div className="animate-spin h-12 w-12 border-2 border-ink rounded-full border-t-transparent"></div>
                )}
              </div>
            )}

            {analysisResult && (
              <div className="mt-4 rounded-lg border border-ink/10 bg-white/70 p-4 text-sm leading-6 text-ink/65">
                <strong className="text-ink">Analysis:</strong> {JSON.stringify(analysisResult, null, 2)}
              </div>
            )}

            <div className="mt-4 rounded-lg border border-ink/10 bg-white/70 p-4 text-sm leading-6 text-ink/65">
              {selectedInstrument ? (
                <>
                  Current playable selection: <strong className="text-ink">{INSTRUMENT_LABELS[selectedInstrument]}</strong>.
                </>
              ) : (
                <p className="text-ink/60">
                  No instrument selected yet. Upload a file to recognize an instrument,
                  or select one manually below.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatusChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white/75 p-3">
      <div className="mb-1 flex items-center gap-2 text-ink/55">
        {icon}
        <span className="font-bold">{label}</span>
      </div>
      <div className="font-black text-ink">{value}</div>
    </div>
  );
}
