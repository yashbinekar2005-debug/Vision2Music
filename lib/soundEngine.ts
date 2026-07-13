"use client";

import type { Instrument } from "@/lib/types";

type ToneModule = typeof import("tone");

let tonePromise: Promise<ToneModule> | null = null;
let samplers = new Map<string, unknown>();

async function getTone() {
  if (!tonePromise) {
    tonePromise = import("tone");
  }
  return tonePromise;
}

export async function unlockAudio() {
  const Tone = await getTone();
  await Tone.start();
}

export async function playInstrumentNote(instrument: Instrument, note: string, duration = "8n") {
  const Tone = await getTone();
  await Tone.start();

  if (instrument === "piano") {
    const sampler = getPianoSampler(Tone);
    sampler.triggerAttackRelease(note, duration);
    return;
  }

  if (instrument === "drums") {
    playDrumVoice(Tone, note);
    return;
  }

  playSynthVoice(Tone, instrument, note, duration);
}

function getPianoSampler(Tone: ToneModule) {
  const key = "piano";
  if (!samplers.has(key)) {
    samplers.set(
      key,
      new Tone.Sampler({
        urls: {
          A0: "A0.mp3",
          C1: "C1.mp3",
          "D#1": "Ds1.mp3",
          "F#1": "Fs1.mp3",
          A1: "A1.mp3",
          C2: "C2.mp3",
          "D#2": "Ds2.mp3",
          "F#2": "Fs2.mp3",
          A2: "A2.mp3",
          C3: "C3.mp3",
          "D#3": "Ds3.mp3",
          "F#3": "Fs3.mp3",
          A3: "A3.mp3",
          C4: "C4.mp3",
          "D#4": "Ds4.mp3",
          "F#4": "Fs4.mp3",
          A4: "A4.mp3",
          C5: "C5.mp3",
          "D#5": "Ds5.mp3",
          "F#5": "Fs5.mp3",
          A5: "A5.mp3",
          C6: "C6.mp3",
          "D#6": "Ds6.mp3",
          "F#6": "Fs6.mp3",
          A6: "A6.mp3",
          C7: "C7.mp3",
          "D#7": "Ds7.mp3",
          "F#7": "Fs7.mp3",
          A7: "A7.mp3",
          C8: "C8.mp3"
        },
        release: 1,
        baseUrl: "https://tonejs.github.io/audio/salamander/"
      }).toDestination()
    );
  }
  return samplers.get(key) as import("tone").Sampler;
}

function playSynthVoice(Tone: ToneModule, instrument: Instrument, note: string, duration: string) {
  const key = `synth-${instrument}`;
  if (!samplers.has(key)) {
    const destination = new Tone.Volume(-8).toDestination();
    const synth =
      instrument === "guitar"
        ? new Tone.PluckSynth({ attackNoise: 0.9, dampening: 4200, resonance: 0.72 }).connect(destination)
        : instrument === "violin"
          ? new Tone.FMSynth({
              harmonicity: 1.6,
              modulationIndex: 4,
              envelope: { attack: 0.08, decay: 0.2, sustain: 0.62, release: 0.8 }
            }).connect(destination)
          : new Tone.AMSynth({
              harmonicity: 1.8,
              envelope: { attack: 0.04, decay: 0.18, sustain: 0.5, release: 0.55 }
            }).connect(destination);
    samplers.set(key, synth);
  }

  const synth = samplers.get(key) as import("tone").Synth;
  synth.triggerAttackRelease(note, duration);
}

function playDrumVoice(Tone: ToneModule, voice: string) {
  const now = Tone.now();
  const output = new Tone.Volume(-7).toDestination();

  if (voice === "kick") {
    const synth = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 7, oscillator: { type: "sine" } }).connect(output);
    synth.triggerAttackRelease("C1", "8n", now);
    return;
  }

  if (voice === "snare" || voice === "clap") {
    const noise = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: voice === "clap" ? 0.18 : 0.12, sustain: 0 }
    }).connect(output);
    noise.triggerAttackRelease("16n", now);
    return;
  }

  if (voice.includes("hat")) {
    const metal = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: voice === "openhat" ? 0.42 : 0.1, release: 0.04 },
      harmonicity: 5.1,
      modulationIndex: 22,
      resonance: 3800
    }).connect(output);
    metal.triggerAttackRelease("16n", now);
    return;
  }

  const synth = new Tone.MembraneSynth({ pitchDecay: 0.02, octaves: 3 }).connect(output);
  const pitch = voice === "tom2" ? "F2" : voice === "ride" ? "B3" : "A2";
  synth.triggerAttackRelease(pitch, "8n", now);
}
