"use client";

import { useEffect, useState } from "react";
import { playInstrumentNote } from "@/lib/soundEngine";

const whiteNotes = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5", "F5", "G5", "A5", "B5"];
const blackNotes: Array<{ note: string; left: string }> = [
  { note: "C#4", left: "5.6%" },
  { note: "D#4", left: "12.8%" },
  { note: "F#4", left: "27.1%" },
  { note: "G#4", left: "34.2%" },
  { note: "A#4", left: "41.4%" },
  { note: "C#5", left: "55.7%" },
  { note: "D#5", left: "62.8%" },
  { note: "F#5", left: "77.1%" },
  { note: "G#5", left: "84.2%" },
  { note: "A#5", left: "91.4%" }
];

const keyMap: Record<string, string> = {
  a: "C4",
  w: "C#4",
  s: "D4",
  e: "D#4",
  d: "E4",
  f: "F4",
  t: "F#4",
  g: "G4",
  y: "G#4",
  h: "A4",
  u: "A#4",
  j: "B4",
  k: "C5"
};

export function PianoInstrument() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const note = keyMap[event.key.toLowerCase()];
      if (!note || event.repeat) return;
      trigger(note);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  function trigger(note: string) {
    setActive(note);
    void playInstrumentNote("piano", note, "8n");
    window.setTimeout(() => setActive((current) => (current === note ? null : current)), 180);
  }

  return (
    <div className="rounded-lg bg-ink p-3">
      <div className="relative h-56 overflow-hidden rounded-md bg-white">
        <div className="grid h-full grid-cols-14">
          {whiteNotes.map((note) => (
            <button
              key={note}
              type="button"
              onPointerDown={() => trigger(note)}
              className={`relative border-r border-ink/15 bg-white transition last:border-r-0 ${
                active === note ? "bg-spruce" : "hover:bg-paper"
              }`}
              title={note}
              aria-label={`Play ${note}`}
            >
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-bold text-ink/55">{note}</span>
            </button>
          ))}
        </div>
        {blackNotes.map(({ note, left }) => (
          <button
            key={note}
            type="button"
            onPointerDown={() => trigger(note)}
            className={`absolute top-0 h-32 w-[5.2%] -translate-x-1/2 rounded-b-md border border-black bg-ink shadow-lg transition ${
              active === note ? "bg-slateblue" : "hover:bg-rosewood"
            }`}
            style={{ left }}
            title={note}
            aria-label={`Play ${note}`}
          >
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-paper/75">{note}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-paper/70">Keys A-K play the central octave, with W/E/T/Y/U for sharps.</p>
    </div>
  );
}
