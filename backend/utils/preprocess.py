import torch
import torchvision.transforms as transforms
from PIL import Image
import io
import numpy as np

def preprocess_image(image_bytes: bytes) -> torch.Tensor:
    """Preprocess image for EfficientNet-B2 classification."""
    # Define transforms matching ImageNet preprocessing
    transform = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])

    # Open image from bytes
    image = Image.open(io.BytesIO(image_bytes)).convert('RGB')

    # Apply transforms
    tensor = transform(image).unsqueeze(0)  # Add batch dimension
    return tensor

def preprocess_for_clip(image_bytes: bytes) -> Image.Image:
    """Preprocess image for CLIP model."""
    image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    return image

def extract_audio_features(audio_bytes: bytes, filename: str) -> np.ndarray:
    """Extract MFCC features from audio (legacy compatibility)."""
    import librosa
    import tempfile

    suffix = '.' + filename.split('.')[-1] if '.' in filename else '.wav'
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