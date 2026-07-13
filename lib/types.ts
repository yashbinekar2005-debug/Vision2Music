export type Instrument = "piano" | "guitar" | "drums" | "violin" | "flute";

export type RecognitionMatch = {
  label: string;
  score: number;
};

export type ImageRecognitionResult = {
  instrument: Instrument;
  confidence: number;
  topMatches: RecognitionMatch[];
};

export type AudioRecognitionResult = {
  instrument: string;
  confidence: number | null;
  source: "legacy-svc";
  supportedPlayable: boolean;
  notes?: string;
};

export const PLAYABLE_INSTRUMENTS: Instrument[] = ["piano", "guitar", "drums", "violin", "flute"];

export const INSTRUMENT_LABELS: Record<Instrument, string> = {
  piano: "Piano",
  guitar: "Guitar",
  drums: "Drums",
  violin: "Violin",
  flute: "Flute"
};

export function isPlayableInstrument(value: string): value is Instrument {
  return PLAYABLE_INSTRUMENTS.includes(value.toLowerCase() as Instrument);
}
