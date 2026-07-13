from __future__ import annotations

import io
import sys
import tempfile
import types
from pathlib import Path
from typing import Any

import joblib
import librosa
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = ROOT / "music-instrument-classifier-master" / "last_svc.model"
PLAYABLE = {"piano", "guitar", "drums", "violin", "flute"}
LABELS = {
    1: "cello",
    2: "clarinet",
    3: "flute",
    4: "violin",
    5: "piano",
}

_model: Any | None = None
_load_error: str | None = None


def model_status() -> dict[str, Any]:
    model = _load_model()
    return {
        "source": "legacy-svc",
        "loaded": model is not None,
        "path": str(MODEL_PATH),
        "classes": getattr(model, "classes_", []).tolist() if model is not None and hasattr(model, "classes_") else [],
        "loadError": _load_error,
        "notes": "Original model was created for Python 2 / sklearn 0.18.1 and short single-note audio.",
    }


def classify_audio(audio_bytes: bytes, filename: str) -> dict[str, Any]:
    model = _load_model()
    if model is None:
        return {
            "instrument": "unknown",
            "confidence": None,
            "source": "legacy-svc",
            "supportedPlayable": False,
            "notes": f"Legacy model is unavailable: {_load_error}",
        }

    feature = _extract_feature(audio_bytes, filename).reshape(1, -1)
    prediction = model.predict(feature)[0]
    label = LABELS.get(int(prediction), f"class-{prediction}")

    notes = "Legacy SVC model supports short single-note classical audio. It may not cover guitar or drums."
    if hasattr(model, "classes_"):
        notes += f" Model classes detected: {list(map(int, model.classes_))}."

    return {
        "instrument": label,
        "confidence": None,
        "source": "legacy-svc",
        "supportedPlayable": label in PLAYABLE,
        "notes": notes,
    }


def _load_model():
    global _model, _load_error
    if _model is not None:
        return _model
    if _load_error is not None:
        return None

    try:
        _install_sklearn_compat_modules()
        _model = joblib.load(MODEL_PATH)
        return _model
    except Exception as exc:
        _load_error = str(exc)
        return None


def _install_sklearn_compat_modules() -> None:
    try:
        from sklearn.svm import _classes
    except Exception:
        return

    legacy_module = types.ModuleType("sklearn.svm.classes")
    legacy_module.LinearSVC = _classes.LinearSVC
    sys.modules.setdefault("sklearn.svm.classes", legacy_module)

    externals = types.ModuleType("sklearn.externals")
    externals.joblib = joblib
    sys.modules.setdefault("sklearn.externals", externals)
    sys.modules.setdefault("sklearn.externals.joblib", joblib)
    sys.modules.setdefault("sklearn.externals.joblib.numpy_pickle", joblib.numpy_pickle)


def _extract_feature(audio_bytes: bytes, filename: str) -> np.ndarray:
    suffix = Path(filename).suffix or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
        tmp.write(audio_bytes)
        tmp.flush()
        try:
            music, sample_rate = librosa.load(tmp.name, sr=44100, mono=True)
        except Exception:
            music, sample_rate = librosa.load(io.BytesIO(audio_bytes), sr=44100, mono=True)

    if music.size == 0:
        raise ValueError("The uploaded audio did not contain readable sound.")

    trimmed, _ = librosa.effects.trim(music, top_db=35)
    if trimmed.size == 0:
        trimmed = music

    mfccs = librosa.feature.mfcc(y=trimmed, sr=sample_rate, n_mfcc=20)
    return np.mean(mfccs, axis=1).astype(np.float64)
