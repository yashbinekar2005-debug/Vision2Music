# InstrumentVision

Upload an instrument photo or short audio clip, then play the detected instrument directly in the browser.

**Image recognition** runs entirely client-side via a ResNet-50 web worker, with an optional Groq API upgrade (`qwen/qwen3.6-27b` vision) for higher accuracy. **Audio recognition** uses Groq Whisper (`whisper-large-v3-turbo`) when an API key is configured, otherwise falls back to a legacy FastAPI backend. Built with Next.js 14 and Tone.js.

## Supported Instruments

Piano, Guitar, Drums, Violin, Flute — each with a custom playable interface.

## Quick Start

### Prerequisites

- Node.js 18+

### Frontend (standalone — image recognition works without a backend)

```powershell
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

### Backend (optional — only needed for audio without Groq)

```powershell
cd backend
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## Groq API Key (Recommended)

Get a free key at [console.groq.com](https://console.groq.com) and enter it in the app to unlock:
- **Image recognition** via `qwen/qwen3.6-27b` vision (more accurate than ResNet-50)
- **Audio transcription** via `whisper-large-v3-turbo`

Without a key, image recognition falls back to the local ResNet-50 web worker, and audio recognition requires the FastAPI backend at port 8001.

## Architecture

```
app/page.tsx              Main page with recognition + instrument UI
components/
  ApiKeySetup.tsx         Groq API key modal with validation
  InstrumentStage.tsx     Playable instrument wrapper (switches between instruments)
  RecognitionPanel.tsx    Upload area + recognition results
  instruments/
    PianoInstrument.tsx   Piano keyboard (mouse + keyboard input)
    GuitarInstrument.tsx  Fretboard grid
    DrumsInstrument.tsx   Drum pad grid
    ViolinInstrument.tsx  String controls + pitch bend
    FluteInstrument.tsx   Tone-hole controls
lib/
  groqApi.ts              Groq API client (vision + Whisper)
  classifier.worker.ts    ResNet-50 web worker (fallback image recognition)
  imageRecognition.ts     Routes to Groq or web worker based on key presence
  audioApi.ts             Groq Whisper or legacy backend fallback
  soundEngine.ts          Tone.js sampler/synth setup
  types.ts                Shared TypeScript types
backend/
  main.py                 FastAPI server (port 8001, legacy audio support)
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_GROQ_API_KEY` | — | Groq API key (can also be set in-app via the key setup modal) |
| `NEXT_PUBLIC_AUDIO_API_URL` | `http://localhost:8001/api/audio-classify` | Backend URL for legacy audio classification |
| `NEXT_PUBLIC_IMAGE_API_URL` | `http://localhost:8001` | Backend URL (legacy — image recognition is client-side) |

## Sound Engine

Uses **Tone.js** with:
- **Piano**: Salamander Grand Piano samples (loaded from Tone.js CDN)
- **Guitar**: PluckSynth synthesis
- **Violin**: FMSynth synthesis
- **Flute**: AMSynth synthesis
- **Drums**: MembraneSynth + NoiseSynth + MetalSynth

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Tone.js, Lucide React
- **Image Recognition**: Groq API (Qwen 3.6 27B vision) or client-side ResNet-50 (Transformers.js)
- **Audio Recognition**: Groq Whisper API or legacy FastAPI backend
- **Backend** (optional): FastAPI, Uvicorn

## Project Status

- [x] Client-side image recognition (ResNet-50 web worker)
- [x] Groq API integration (vision + Whisper, optional)
- [x] Five playable instruments
- [x] Groq API key setup modal with validation
- [ ] Audio model file (not included — must be provided separately for legacy backend)
