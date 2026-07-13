"use client";

import { useEffect, useState } from "react";
import { playInstrumentNote } from "@/lib/soundEngine";

const pads = [
  ["kick", "Kick"],
  ["snare", "Snare"],
  ["hihat", "Hat"],
  ["tom1", "Tom 1"],
  ["tom2", "Tom 2"],
  ["crash", "Crash"],
  ["ride", "Ride"],
  ["openhat", "Open Hat"],
  ["clap", "Clap"]
] as const;

export function DrumsInstrument() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const index = Number(event.key) - 1;
      if (index < 0 || index >= pads.length || event.repeat) return;
      trigger(pads[index][0]);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  function trigger(voice: string) {
    setActive(voice);
    void playInstrumentNote("drums", voice, "8n");
    window.setTimeout(() => setActive((current) => (current === voice ? null : current)), 140);
  }

  return (
    <div className="rounded-lg bg-slateblue p-4">
      <div className="grid grid-cols-3 gap-3">
        {pads.map(([voice, label], index) => (
          <button
            key={voice}
            type="button"
            onPointerDown={() => trigger(voice)}
            className={`aspect-square rounded-lg border-2 p-2 text-center font-bold shadow-inner transition ${
              active === voice
                ? "border-paper bg-brass text-ink"
                : "border-paper/25 bg-ink/25 text-paper hover:bg-paper/15"
            }`}
            aria-label={`Play ${label}`}
            title={`${index + 1}: ${label}`}
          >
            <span className="block text-xs opacity-70">{index + 1}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
