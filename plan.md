# InstrumentVision Full Web App Plan

## Summary
Build the project from the README as a working full web app: polished instrument-focused UI, image recognition with a zero-shot Hugging Face model, audio recognition using the provided legacy SVC model, and playable virtual instruments for piano, guitar, drums, violin, and flute.

Use separate **Image** and **Audio** tabs. Image recognition drives the main README v1 instrument flow. Audio recognition is included with clear caveats because the provided model is old and may only reliably expose four legacy labels.

Sources checked: [Transformers.js pipelines](https://huggingface.co/docs/transformers.js/api/pipelines), [Xenova/clip-vit-base-patch32](https://huggingface.co/Xenova/clip-vit-base-patch32).

## Key Changes
- Scaffold a Next.js + TypeScript frontend with Tailwind and Tone.js.
- Add Hugging Face Transformers.js image recognition using:
  - task: `zero-shot-image-classification`
  - model: `Xenova/clip-vit-base-patch32`
  - labels: `piano`, `guitar`, `drums`, `violin`, `flute`
- Add a small Python/FastAPI backend for audio uploads using the provided `last_svc.model`.
- Modernize the legacy audio code:
  - replace Python 2 print/input syntax
  - replace `sklearn.externals.joblib` with `joblib`
  - extract MFCC features with `librosa`
  - map known labels to cello/clarinet/flute/violin/piano where load-time evidence permits
- If the SVC model cannot prove all labels, show “legacy audio model result” with confidence/unsupported messaging instead of failing the app.

## UI And Behavior
- First screen is the usable app, not a marketing landing page.
- Use a refined instrument-workbench layout with strong visual instrument design:
  - image/audio upload area
  - recognition result panel
  - confidence/top matches
  - manual instrument override
  - playable instrument surface
- Build five playable instrument components:
  - Piano: responsive keyboard with mouse and computer-key input
  - Guitar: fretboard grid with strings/frets and click-to-play notes
  - Drums: pad grid with keyboard number shortcuts
  - Violin: string controls plus pitch slider
  - Flute: tone-hole style controls with note mapping
- Sounds use the chosen hybrid approach:
  - Tone.js samples where available, especially piano
  - high-quality Tone.js synth fallback for instruments without local sample assets
  - clear code structure so real samples can later replace fallbacks.

## Interfaces
- Frontend image recognizer:
  - input: browser image file
  - output: `{ instrument, confidence, topMatches }`
- Backend audio endpoint:
  - `POST /api/audio-classify`
  - request: multipart `file`
  - response: `{ instrument, confidence: null, source: "legacy-svc", supportedPlayable: boolean, notes?: string }`
- Shared frontend instrument type:
  - `piano | guitar | drums | violin | flute`
- Audio-only labels outside the playable v1 set, such as cello or clarinet, should display results but route users to manual override for playable instruments.

## Test Plan
- Verify app builds with `npm.cmd run build`.
- Verify image upload works for all five candidate labels with mocked or live Transformers.js inference.
- Verify audio upload endpoint handles valid audio, invalid files, and model-load failure gracefully.
- Verify every playable instrument renders on desktop and mobile widths without text overlap.
- Verify click and keyboard input triggers sound after browser audio unlock.
- Verify manual override always allows entering the playable UI even when recognition is low confidence or unsupported.

## Assumptions
- No manual model training will be added.
- The zero-shot image model will run client-side through Transformers.js and download/cache from Hugging Face.
- The provided SVC audio model is included as-is, with compatibility fixes around it rather than retraining it.
- Python may need to be installed or the broken `.venv` recreated during implementation.
- Because no audio sample pack is currently present, hybrid Tone.js samples/synthesis is the first-build default.
