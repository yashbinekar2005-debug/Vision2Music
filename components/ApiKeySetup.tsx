"use client";

import { useState } from "react";
import { KeyRound, X, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  onClear: () => void;
  configured: boolean;
};

export function ApiKeySetup({ open, onClose, onSave, onClear, configured }: Props) {
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "error" | "success"; message: string } | null>(null);

  if (!open) return null;

  async function handleSave() {
    const trimmed = key.trim();
    if (!trimmed) return;

    setSaving(true);
    setStatus(null);

    try {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${trimmed}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      onSave(trimmed);
      setStatus({ type: "success", message: "Key verified and saved" });
      setKey("");
      setTimeout(() => onClose(), 800);
    } catch (err) {
      setStatus({
        type: "error",
        message: `Invalid key: ${err instanceof Error ? err.message : "connection failed"}`,
      });
    } finally {
      setSaving(false);
    }
  }

  function handleClear() {
    onClear();
    setKey("");
    setStatus(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl border border-ink/10 bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-ink text-paper">
              <KeyRound size={20} />
            </span>
            <div>
              <h2 className="text-lg font-black">Groq API Key</h2>
              <p className="text-sm text-ink/50">Required for image &amp; audio recognition</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-ink/5">
            <X size={18} className="text-ink/40" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm leading-6 text-ink/65">
            InstrumentVision uses <strong>Groq&apos;s Llama 4 Scout</strong> for image recognition
            and <strong>Whisper</strong> for audio transcription. Get a free API key at
            {" "}
            <a
              href="https://console.groq.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-ink underline hover:text-ink/70"
            >
              console.groq.com
              <ExternalLink size={12} />
            </a>.
          </p>

          {configured && (
            <div className="flex items-center gap-2 rounded-md bg-mint/20 p-3 text-sm font-bold text-ink">
              <CheckCircle2 size={16} className="text-mint" />
              API key is configured
            </div>
          )}

          {status && (
            <div
              className={`flex items-start gap-2 rounded-md p-3 text-sm ${
                status.type === "error"
                  ? "bg-lacquer/10 text-lacquer"
                  : "bg-mint/20 text-ink"
              }`}
            >
              {status.type === "error" ? (
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-mint" />
              )}
              <span>{status.message}</span>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/50">
              API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setStatus(null);
              }}
              placeholder={configured ? "Enter new key to replace" : "gsk_..."}
              className="w-full rounded-md border border-ink/20 bg-white px-3 py-2.5 text-sm outline-none focus:border-ink/50"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!key.trim() || saving}
              className="flex-1 rounded-md bg-ink py-2.5 text-sm font-bold text-paper hover:bg-ink/80 disabled:opacity-40"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Verifying...
                </span>
              ) : (
                "Save & Verify"
              )}
            </button>
            {configured && (
              <button
                onClick={handleClear}
                className="rounded-md border border-ink/20 px-4 py-2.5 text-sm font-bold text-ink/60 hover:bg-ink/5"
              >
                Remove
              </button>
            )}
          </div>

          <p className="text-xs text-ink/40">
            Your key is stored locally in your browser&apos;s localStorage and is never sent to any server
            other than Groq&apos;s API.
          </p>
        </div>
      </div>
    </div>
  );
}
