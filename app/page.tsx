"use client";

import { useState, useEffect } from "react";
import { AudioLines, Camera, Sparkles, KeyRound, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { InstrumentStage } from "@/components/InstrumentStage";
import { RecognitionPanel } from "@/components/RecognitionPanel";
import { ApiKeySetup } from "@/components/ApiKeySetup";
import { recognizeInstrumentFromAudio } from "@/lib/audioApi";
import {
  recognizeInstrumentFromImage,
  analyzeInstrumentFromImage,
  warmUpModel,
  setProgressCallback,
} from "@/lib/imageRecognition";
import { setGroqApiKey, hasGroqKey, clearGroqApiKey } from "@/lib/groqApi";
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
  const [showKeySetup, setShowKeySetup] = useState(false);
  const [groqConfigured, setGroqConfigured] = useState(false);
  const [initialCheck, setInitialCheck] = useState(true);

  useEffect(() => {
    const has = hasGroqKey();
    setGroqConfigured(has);
    if (!has) setShowKeySetup(true);
    setInitialCheck(false);
  }, []);

  useEffect(() => {
    setProgressCallback((pct, text) => setModelProgress({ pct, text }));
    if (!hasGroqKey()) warmUpModel().catch(() => {});
  }, []);

  useEffect(() => {
    if (recognizing && mode === "image" && imageResult && imageResult.confidence >= 0.7) {
      analyzeImageWithTimeout();
    }
  }, [imageResult, recognizing, mode]);

  function handleSaveKey(key: string) {
    setGroqApiKey(key);
    setGroqConfigured(true);
  }

  function handleClearKey() {
    clearGroqApiKey();
    setGroqConfigured(false);
    warmUpModel().catch(() => {});
  }

  async function analyzeImageWithTimeout() {
    try {
      const result = await analyzeInstrumentFromImage(new File([""], "placeholder"));
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
      if (result.confidence >= 0.6) setSelectedInstrument(result.instrument);
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
      if (isPlayableInstrument(result.instrument)) setSelectedInstrument(result.instrument as Instrument);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audio recognition failed. Add a Groq API key or start the backend.");
    } finally {
      setLoading(false);
    }
  }

  const imageSource = groqConfigured ? "Groq Llama 4 Scout" : "ResNet-50 (~7 MB q4)";
  const audioSource = groqConfigured ? "Groq Whisper" : "Legacy SVC";

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <ApiKeySetup
        open={showKeySetup && !initialCheck}
        onClose={() => setShowKeySetup(false)}
        onSave={handleSaveKey}
        onClear={handleClearKey}
        configured={groqConfigured}
      />

      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-ink/15 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-ink px-3 py-1 text-sm font-bold text-paper">
              <Sparkles size={15} />
              {groqConfigured
                ? "Groq API-powered instrument recognition"
                : "Local model (add API key to upgrade)"}
            </div>
            <h1 className="text-4xl font-black leading-tight sm:text-5xl">InstrumentVision</h1>
            <p className="mt-2 max-w-2xl text-base leading-7 text-ink/70">
              Upload an instrument photo or short audio clip, then play the detected instrument directly in the browser.
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <StatusChip icon={<Camera size={16} />} label="Image" value={imageSource} />
            <StatusChip icon={<AudioLines size={16} />} label="Audio" value={audioSource} />
          </div>
        </header>

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
            onOverride={(inst) => setSelectedInstrument(inst)}
            recognizing={recognizing}
            groqConfigured={groqConfigured}
            onOpenKeySetup={() => setShowKeySetup(true)}
          />

          <div className="flex min-w-0 flex-col gap-4">
            <ApiKeyCard
              configured={groqConfigured}
              onOpen={() => setShowKeySetup(true)}
            />

            {selectedInstrument ? (
              <InstrumentStage
                instrument={selectedInstrument}
                onInstrumentChange={(inst) => setSelectedInstrument(inst)}
              />
            ) : (
              <div className="min-h-[300px] flex flex-col items-center justify-center rounded-lg border border-ink/10 bg-white/80 p-8 text-center">
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
                  </>
                ) : modelProgress && modelProgress.pct < 100 ? (
                  <div className="w-full max-w-xs">
                    <p className="mb-2 text-sm text-ink/60">{modelProgress.text}</p>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
                      <div className="h-full rounded-full bg-ink transition-all duration-300" style={{ width: `${modelProgress.pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-ink/40">{modelProgress.pct}%</p>
                  </div>
                ) : (
                  <div className="h-12 w-12 animate-spin rounded-full border-2 border-ink border-t-transparent" />
                )}
              </div>
            )}

            {analysisResult && (
              <div className="rounded-lg border border-ink/10 bg-white/70 p-4 text-sm leading-6 text-ink/65">
                <strong className="text-ink">Analysis:</strong> {JSON.stringify(analysisResult, null, 2)}
              </div>
            )}

            <div className="rounded-lg border border-ink/10 bg-white/70 p-4 text-sm leading-6 text-ink/65">
              {selectedInstrument ? (
                <>
                  Current playable selection: <strong className="text-ink">{INSTRUMENT_LABELS[selectedInstrument]}</strong>.
                </>
              ) : (
                <p className="text-ink/60">
                  No instrument selected yet. Upload a file to recognize an instrument, or select one manually in the panel.
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

function ApiKeyCard({ configured, onOpen }: { configured: boolean; onOpen: () => void }) {
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${
      configured
        ? "border-mint/30 bg-gradient-to-br from-white to-mint/5"
        : "border-lacquer/30 bg-gradient-to-br from-white to-lacquer/5"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
            configured ? "bg-mint/20 text-mint" : "bg-lacquer/15 text-lacquer"
          }`}>
            {configured ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          </span>
          <div>
            <p className="text-sm font-black text-ink">Groq API Key</p>
            <p className="mt-0.5 text-xs leading-5 text-ink/55">
              {configured
                ? "Using Llama 4 Scout for images & Whisper for audio."
                : "No key set — using local ResNet-50. Get a free key at console.groq.com."}
            </p>
          </div>
        </div>
        <button
          onClick={onOpen}
          className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-bold transition ${
            configured
              ? "border border-ink/15 text-ink/60 hover:bg-ink/5"
              : "bg-ink text-paper hover:bg-ink/80"
          }`}
        >
          {configured ? "Change" : "Add Key"}
        </button>
      </div>
      {!configured && (
        <a
          href="https://console.groq.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-ink/45 hover:text-ink/70"
        >
          <ExternalLink size={11} />
          Get a free key
        </a>
      )}
    </div>
  );
}
