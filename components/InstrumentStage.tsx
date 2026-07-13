"use client";

import { Drum, Guitar, Music2, Piano, Wind, type LucideIcon } from "lucide-react";
import type { Instrument } from "@/lib/types";
import { INSTRUMENT_LABELS, PLAYABLE_INSTRUMENTS } from "@/lib/types";
import { PianoInstrument } from "@/components/instruments/PianoInstrument";
import { GuitarInstrument } from "@/components/instruments/GuitarInstrument";
import { DrumsInstrument } from "@/components/instruments/DrumsInstrument";
import { ViolinInstrument } from "@/components/instruments/ViolinInstrument";
import { FluteInstrument } from "@/components/instruments/FluteInstrument";

type Props = {
  instrument: Instrument;
  onInstrumentChange: (instrument: Instrument) => void;
};

const icons: Record<Instrument, LucideIcon> = {
  piano: Piano,
  guitar: Guitar,
  drums: Drum,
  violin: Music2,
  flute: Wind
};

export function InstrumentStage({ instrument, onInstrumentChange }: Props) {
  const Icon = icons[instrument];

  return (
    <section className="min-w-0 rounded-lg border border-ink/10 bg-paper/95 shadow-panel">
      <div className="flex flex-col gap-4 border-b border-ink/10 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-ink text-paper">
            <Icon size={22} />
          </span>
          <div>
            <h2 className="text-xl font-bold leading-tight">{INSTRUMENT_LABELS[instrument]}</h2>
            <p className="text-sm text-ink/65">Playable surface</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {PLAYABLE_INSTRUMENTS.map((item) => {
            const ItemIcon = icons[item];
            const active = item === instrument;
            return (
              <button
                key={item}
                type="button"
                aria-label={`Switch to ${INSTRUMENT_LABELS[item]}`}
                title={INSTRUMENT_LABELS[item]}
                onClick={() => onInstrumentChange(item)}
                className={`grid h-10 w-10 place-items-center rounded-md border transition ${
                  active ? "border-ink bg-ink text-paper" : "border-ink/15 bg-white/70 text-ink hover:border-ink/45"
                }`}
              >
                <ItemIcon size={19} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {instrument === "piano" && <PianoInstrument />}
        {instrument === "guitar" && <GuitarInstrument />}
        {instrument === "drums" && <DrumsInstrument />}
        {instrument === "violin" && <ViolinInstrument />}
        {instrument === "flute" && <FluteInstrument />}
      </div>
    </section>
  );
}
