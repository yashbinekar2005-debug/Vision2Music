import os
import io
import logging
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Import our models and utilities
from models.classifier import classify_instrument
from models.clip_analyzer import analyze_instrument_variant
from models.gpt_vision import analyze_instrument_full
from utils.preprocess import extract_audio_features
import joblib
import numpy as np

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="InstrumentVision API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load legacy audio model for backward compatibility
ROOT = Path(__file__).resolve().parent
LEGACY_MODEL_PATH = ROOT / "music-instrument-classifier-master" / "last_svc.model"

# Label mapping for legacy model
LABELS = {
    1: "cello",
    2: "clarinet",
    3: "flute",
    4: "violin",
    5: "piano",
}

PLAYABLE = {"piano", "guitar", "drums", "violin", "flute"}

_model: Optional[any] = None
_load_error: Optional[str] = None


def load_legacy_model():
    """Load the legacy audio classification model."""
    global _model, _load_error
    if _model is not None:
        return _model
    if _load_error is not None:
        return None

    try:
        # Install sklearn compatibility modules for legacy model
        import sys
        import types
        from sklearn.svm import _classes
        from sklearn.externals import joblib

        legacy_module = types.ModuleType("sklearn.svm.classes")
        legacy_module.LinearSVC = _classes.LinearSVC
        sys.modules.setdefault("sklearn.svm.classes", legacy_module)

        externals = types.ModuleType("sklearn.externals")
        externals.joblib = joblib
        sys.modules.setdefault("sklearn.externals", externals)
        sys.modules.setdefault("sklearn.externals.joblib", joblib)
        sys.modules.setdefault("sklearn.externals.joblib.numpy_pickle", joblib.numpy_pickle)

        _model = joblib.load(LEGACY_MODEL_PATH)
        logger.info(f"Loaded legacy audio model from {LEGACY_MODEL_PATH}")
        return _model
    except Exception as exc:
        _load_error = str(exc)
        logger.error(f"Failed to load legacy audio model: {exc}")
        return None


def classify_legacy_audio(audio_bytes: bytes, filename: str) -> dict:
    """Classify audio using the legacy SVC model."""
    model = load_legacy_model()
    if model is None:
        return {
            "instrument": "unknown",
            "confidence": None,
            "source": "legacy-svc",
            "supportedPlayable": False,
            "notes": f"Legacy model is unavailable: {_load_error}",
        }

    try:
        # Extract features using the same method as legacy model
        feature = extract_audio_features(audio_bytes, filename).reshape(1, -1)
        prediction = model.predict(feature)[0]
        label = LABELS.get(int(prediction), f"class-{prediction}")

        notes = "Legacy SVC model supports short single-note classical audio. It may not cover guitar or drums."
        if hasattr(model, "classes_"):
            notes += f" Model classes detected: {list(map(int, model.classes_))}."

        return {
            "instrument": label,
            "confidence": None,  # Legacy model doesn't provide probabilities
            "source": "legacy-svc",
            "supportedPlayable": label in PLAYABLE,
            "notes": notes,
        }
    except Exception as exc:
        logger.error(f"Legacy audio classification failed: {exc}")
        return {
            "instrument": "unknown",
            "confidence": None,
            "source": "legacy-svc",
            "supportedPlayable": False,
            "notes": f"Audio processing error: {exc}",
        }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    # Check if we can load the main image classifier
    try:
        from models.classifier import get_classifier
        image_model_status = get_classifier() is not None
    except Exception:
        image_model_status = False

    # Check legacy audio model
    audio_model_status = load_legacy_model() is not None

    return {
        "status": "ok",
        "image_model_loaded": image_model_status,
        "audio_model_loaded": audio_model_status,
        "legacy_audio_model_loaded": audio_model_status,
    }


@app.post("/classify")
async def classify_instrument_endpoint(file: UploadFile = File(...)):
    """
    Step 1: Classify instrument type from image using EfficientNet-B2.
    Returns: {instrument, confidence, top3}
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file.")

    # Read file content
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="The uploaded image file is empty.")

    try:
        # Classify instrument
        result = classify_instrument(image_bytes)
        logger.info(f"Image classification result: {result}")
        return result
    except Exception as exc:
        logger.error(f"Image classification failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Image classification failed: {exc}")


@app.post("/analyze")
async def analyze_instrument_endpoint(file: UploadFile = File(...)):
    """
    Step 2: Analyze instrument in detail using CLIP + GPT-4o Vision.
    Requires prior classification (or can work standalone).
    Returns: Detailed instrument configuration JSON
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file.")

    # Read file content
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="The uploaded image file is empty.")

    try:
        # First, get basic classification to guide CLIP analysis
        basic_result = classify_instrument(image_bytes)
        instrument_type = basic_result["instrument"]

        # Then, get variant analysis using CLIP
        variant_result = analyze_instrument_variant(image_bytes, instrument_type)

        # Finally, get detailed config using GPT-4o Vision
        gpt_result = analyze_instrument_full(image_bytes)

        # Combine results
        combined_result = {
            "type": gpt_result["type"],
            "variant": variant_result["variant"],
            "strings": gpt_result["strings"],
            "octave_range": gpt_result["octave_range"],
            "notes": gpt_result["notes"],
            "tuning": gpt_result["tuning"],
            "pads": gpt_result["pads"],
            "confidence": {
                "classification": basic_result["confidence"],
                "variant": variant_result["confidence"]
            }
        }

        logger.info(f"Instrument analysis result: {combined_result}")
        return combined_result

    except Exception as exc:
        logger.error(f"Instrument analysis failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Instrument analysis failed: {exc}")


@app.post("/api/audio-classify")
async def audio_classify_endpoint(file: UploadFile = File(...)):
    """
    Legacy audio classification endpoint (for backward compatibility).
    Uses the old SVC model with MFCC features.
    """
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Please upload an audio file.")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="The uploaded audio file is empty.")

    try:
        result = classify_legacy_audio(audio_bytes, file.filename or "upload.wav")
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        return {
            "instrument": "unknown",
            "confidence": None,
            "source": "legacy-svc",
            "supportedPlayable": False,
            "notes": f"Legacy audio model could not classify this file: {exc}",
        }


# Optional: Add a combined endpoint that does both image and audio classification
@app.post("/recognize")
async def recognize_instrument(
    file: UploadFile = File(...),
    modality: str = "image"  # or "audio"
):
    """
    Combined recognition endpoint.
    """
    if modality == "image":
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Please upload an image file for image recognition.")
        return await classify_instrument_endpoint(file)
    elif modality == "audio":
        if not file.content_type or not file.content_type.startswith("audio/"):
            raise HTTPException(status_code=400, detail="Please upload an audio file for audio recognition.")
        return await audio_classify_endpoint(file)
    else:
        raise HTTPException(status_code=400, detail="Modality must be 'image' or 'audio'")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)