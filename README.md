# InstrumentVision

Upload an instrument photo or short audio clip, then play the detected instrument directly in the browser.

**Image recognition** uses OpenAI CLIP zero-shot classification (no training needed). **Audio recognition** uses a legacy SVC model (note: model file not included). Built with Next.js 14, FastAPI, and Tone.js.

## Supported Instruments

Piano, Guitar, Drums, Violin, Flute — each with a custom playable interface.

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.12+
- Windows (paths use PowerShell conventions)

### Backend

```powershell
cd backend
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```powershell
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

## Architecture

```
app/page.tsx              Main page with recognition + instrument UI
components/
  InstrumentStage.tsx     Playable instrument wrapper (switches between instruments)
  RecognitionPanel.tsx    Upload area + recognition results
  instruments/
    PianoInstrument.tsx   Piano keyboard (mouse + keyboard input)
    GuitarInstrument.tsx  Fretboard grid
    DrumsInstrument.tsx   Drum pad grid
    ViolinInstrument.tsx  String controls + pitch bend
    FluteInstrument.tsx   Tone-hole controls
lib/
  audioApi.ts             Calls /api/audio-classify on the backend
  imageRecognition.ts     Calls /classify on the backend
  soundEngine.ts          Tone.js sampler/synth setup
  types.ts                Shared TypeScript types
backend/
  main.py                 FastAPI server (port 8000)
  models/
    classifier.py         CLIP zero-shot image classification
    clip_analyzer.py      CLIP variant analysis (grand vs upright piano, etc.)
    gpt_vision.py         GPT-4o Vision deep analysis (requires OPENAI_API_KEY)
  utils/
    preprocess.py         Audio MFCC feature extraction (legacy)
    config_builder.py     Instrument config builder
  data/class_names.json   Instrument class labels
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check, model load status |
| `/classify` | POST | Image -> instrument classification (multipart file) |
| `/analyze` | POST | Image -> deep analysis via GPT-4o Vision (requires `OPENAI_API_KEY`) |
| `/api/audio-classify` | POST | Audio -> instrument classification using legacy SVC model |
| `/recognize` | POST | Combined endpoint (image or audio) |

### Classify Response

```json
{
  "instrument": "piano",
  "confidence": 0.92,
  "topMatches": [
    {"label": "piano", "score": 0.92},
    {"label": "guitar", "score": 0.04},
    {"label": "drums", "score": 0.02}
  ]
}
```

## Image Recognition

Uses **CLIP zero-shot classification** (`openai/clip-vit-base-patch16`) running on the FastAPI backend. Matches uploaded images against instrument prompts. No fine-tuning required — works out of the box.

## Audio Recognition

The legacy SVC audio model (`music-instrument-classifier-master/last_svc.model`) is **not included** in this repository. Without it, the `/api/audio-classify` endpoint returns an informative message. To use audio recognition, place the model file at:

```
backend/music-instrument-classifier-master/last_svc.model
```

The model supports: cello, clarinet, flute, violin, piano (legacy labels).

## GPT-4o Vision Analysis (Optional)

Set the `OPENAI_API_KEY` environment variable to enable deep instrument analysis via the `/analyze` endpoint, which returns detailed configuration (variant, strings, octave range, tuning, pads).

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_IMAGE_API_URL` | `http://localhost:8000` | Backend URL for image classification |
| `NEXT_PUBLIC_AUDIO_API_URL` | `http://localhost:8000/api/audio-classify` | Backend URL for audio classification |
| `OPENAI_API_KEY` | — | API key for GPT-4o Vision (optional) |

## Sound Engine

Uses **Tone.js** with:
- **Piano**: Salamander Grand Piano samples (loaded from Tone.js CDN)
- **Guitar**: PluckSynth synthesis
- **Violin**: FMSynth synthesis
- **Flute**: AMSynth synthesis
- **Drums**: MembraneSynth + NoiseSynth + MetalSynth

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Tone.js, Lucide React
- **Backend**: FastAPI, Uvicorn, PyTorch, Transformers, scikit-learn, librosa
- **Recognition**: OpenAI CLIP (zero-shot image classification), legacy SVC (audio)

## Project Status

- [x] Image recognition (CLIP zero-shot)
- [x] Five playable instruments
- [x] Legacy audio endpoint wrapper
- [ ] Audio model file (not included — must be provided separately)
- [ ] GPT-4o Vision analysis (requires API key)
