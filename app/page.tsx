"use client";

import { useState, useEffect } from "react";
import { AudioLines, Camera, Sparkles } from "lucide-react";
import { InstrumentStage } from "@/components/InstrumentStage";
import { RecognitionPanel } from "@/components/RecognitionPanel";
import { recognizeInstrumentFromAudio } from "@/lib/audioApi";
import {
  recognizeInstrumentFromImage,
  analyzeInstrumentFromImage,
  warmUpModel,
  setProgressCallback,
} from "@/lib/imageRecognition";
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

  useEffect(() => {
    setProgressCallback((pct, text) => setModelProgress({ pct, text }));
    warmUpModel().catch(() => {}); // warm up silently
  }, []);

  useEffect(() => {
    if (recognizing && mode === "image" && imageResult && imageResult.confidence >= 0.7) {
      analyzeImageWithTimeout();
    }
  }, [imageResult, recognizing, mode]);

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
      setError(err instanceof Error ? err.message : "Audio recognition failed. Start the FastAPI backend and try again.");
    } finally {
      setLoading(false);
    }
  }

  const handleInstrumentSelect = (instrument: Instrument) => {
    setSelectedInstrument(instrument);
  };

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-ink/15 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-ink px-3 py-1 text-sm font-bold text-paper">
              <Sparkles size={15} />
              ResNet-50 image recognition (~7 MB q4) plus legacy audio model
            </div>
            <h1 className="text-4xl font-black leading-tight sm:text-5xl">InstrumentVision</h1>
            <p className="mt-2 max-w-2xl text-base leading-7 text-ink/70">
              Upload an instrument photo or short audio clip, then play the detected instrument directly in the browser.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <StatusChip icon={<Camera size={16} />} label="Image" value="ResNet-50 (~7 MB q4)" />
            <StatusChip icon={<AudioLines size={16} />} label="Audio" value="Legacy SVC" />
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
                  {!selectedInstrument && (
                    <br />
                  )}
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
