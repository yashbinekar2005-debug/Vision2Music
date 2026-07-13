"use client";

import { useState } from "react";
import { playInstrumentNote } from "@/lib/soundEngine";

const notes = ["C5", "D5", "E5", "F5", "G5", "A5", "B5", "C6"];

export function FluteInstrument() {
  const [closed, setClosed] = useState(3);
  const note = notes[Math.max(0, Math.min(notes.length - 1, 7 - closed))];

  return (
    <div className="rounded-lg bg-mint p-4">
      <div className="relative mx-auto flex min-h-28 max-w-3xl items-center rounded-full border border-ink/15 bg-gradient-to-r from-slateblue via-paper to-brass px-6 shadow-inner">
        <div className="h-16 w-20 rounded-l-full border-r border-ink/20 bg-ink/20" />
        <div className="grid flex-1 grid-cols-8 gap-2 px-4">
          {notes.map((holeNote, index) => {
            const isClosed = index < closed;
            return (
              <button
                key={holeNote}
                type="button"
                onPointerDown={() => {
                  setClosed(index + 1);
                  void playInstrumentNote("flute", holeNote, "8n");
                }}
                className={`aspect-square rounded-full border-2 transition ${
                  isClosed ? "border-ink bg-ink" : "border-ink/35 bg-paper"
                } hover:scale-105`}
                title={holeNote}
                aria-label={`Set flute fingering ${holeNote}`}
              />
            );
          })}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-md bg-paper/80 p-3">
        <span className="text-sm font-bold text-ink/60">Current note</span>
        <button
          type="button"
          onClick={() => void playInstrumentNote("flute", note, "4n")}
          className="rounded-md bg-ink px-4 py-2 font-bold text-paper"
        >
          {note}
        </button>
      </div>
    </div>
  );
}
