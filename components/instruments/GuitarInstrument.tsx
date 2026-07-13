"use client";

import { playInstrumentNote } from "@/lib/soundEngine";

const strings = [
  { label: "E", base: 64 },
  { label: "B", base: 59 },
  { label: "G", base: 55 },
  { label: "D", base: 50 },
  { label: "A", base: 45 },
  { label: "E", base: 40 }
];
const frets = Array.from({ length: 13 }, (_, index) => index);
const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function GuitarInstrument() {
  function midiToNote(midi: number) {
    return `${noteNames[midi % 12]}${Math.floor(midi / 12) - 1}`;
  }

  return (
    <div className="wood-texture rounded-lg p-4">
      <div className="grid grid-cols-[40px_repeat(13,minmax(38px,1fr))] overflow-x-auto rounded-md border border-paper/30 bg-rosewood/70 p-3 no-scrollbar">
        <div />
        {frets.map((fret) => (
          <div key={fret} className="px-1 text-center text-xs font-bold text-paper/70">
            {fret}
          </div>
        ))}
        {strings.map((string, stringIndex) => (
          <>
            <div key={`${string.label}-${stringIndex}-label`} className="flex h-12 items-center text-sm font-bold text-paper">
              {string.label}
            </div>
            {frets.map((fret) => {
              const note = midiToNote(string.base + fret);
              return (
                <button
                  key={`${stringIndex}-${fret}`}
                  type="button"
                  onPointerDown={() => void playInstrumentNote("guitar", note, "8n")}
                  className="relative h-12 min-w-10 border-l border-brass/70 transition hover:bg-brass/35"
                  title={note}
                  aria-label={`Play guitar ${note}`}
                >
                  <span className="string-line absolute left-0 right-0 top-1/2 h-[2px]" />
                  <span className="absolute left-1/2 top-1/2 grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-paper/35 bg-ink/45 text-[10px] font-bold text-paper">
                    {note.replace(/\d/, "")}
                  </span>
                </button>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}
