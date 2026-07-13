"use client";

import { useState } from "react";
import { playInstrumentNote } from "@/lib/soundEngine";

const strings = [
  { label: "G", note: "G3" },
  { label: "D", note: "D4" },
  { label: "A", note: "A4" },
  { label: "E", note: "E5" }
];

export function ViolinInstrument() {
  const [bend, setBend] = useState(0);

  function shifted(note: string) {
    const semitone = Math.round(bend / 25);
    if (semitone === 0) return note;
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const match = note.match(/^([A-G]#?)(\d)$/);
    if (!match) return note;
    const midi = noteNames.indexOf(match[1]) + (Number(match[2]) + 1) * 12 + semitone;
    return `${noteNames[(midi + 120) % 12]}${Math.floor(midi / 12) - 1}`;
  }

  return (
    <div className="rounded-lg bg-lacquer p-4 text-paper">
      <div className="mx-auto max-w-xl rounded-[50%] border border-paper/20 bg-rosewood p-6 shadow-inner">
        <div className="grid grid-cols-4 gap-3">
          {strings.map((string) => (
            <button
              key={string.label}
              type="button"
              onPointerDown={() => void playInstrumentNote("violin", shifted(string.note), "4n")}
              className="flex h-52 flex-col items-center justify-between rounded-full border border-paper/20 bg-ink/20 px-3 py-5 transition hover:bg-brass/35"
              aria-label={`Play violin ${string.label} string`}
            >
              <span className="h-full w-1 rounded-full bg-paper/75" />
              <span className="text-lg font-bold">{string.label}</span>
            </button>
          ))}
        </div>
      </div>
      <label className="mt-5 block text-sm font-bold">
        Pitch bend
        <input
          type="range"
          min="-50"
          max="50"
          value={bend}
          onChange={(event) => setBend(Number(event.target.value))}
          className="mt-2 w-full accent-brass"
        />
      </label>
    </div>
  );
}
