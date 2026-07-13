from transformers import CLIPProcessor, CLIPModel
import torch
from PIL import Image
import io
from typing import List, Tuple
import logging

logger = logging.getLogger(__name__)

# Instrument templates for CLIP analysis
INSTRUMENT_TEMPLATES = {
    "piano": [
        "a photo of a grand piano",
        "a photo of an upright piano",
        "a photo of an electric piano",
        "a photo of a keyboard"
    ],
    "guitar": [
        "a photo of an acoustic guitar",
        "a photo of an electric guitar",
        "a photo of a classical guitar",
        "a photo of a bass guitar"
    ],
    "drums": [
        "a photo of a drum kit",
        "a photo of a snare drum",
        "a photo of a bass drum",
        "a photo of electronic drums"
    ],
    "violin": [
        "a photo of a violin",
        "a photo of a viola",
        "a photo of a cello",
        "a photo of a double bass"
    ],
    "flute": [
        "a photo of a flute",
        "a photo of a recorder",
        "a photo of a saxophone",
        "a photo of a clarinet"
    ]
}

class ClipAnalyzer:
    def __init__(self, device: str = None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.processor = None
        self._load_model()

    def _load_model(self):
        """Load the CLIP model."""
        try:
            self.model = CLIPModel.from_pretrained("openai/clip-vit-base-patch16")
            self.processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch16")
            self.model.to(self.device)
            self.model.eval()
            logger.info("CLIP model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load CLIP model: {e}")
            self.model = None
            self.processor = None

    def analyze_variant(self, image_bytes: bytes, instrument_type: str) -> Tuple[str, float]:
        """
        Analyze instrument variant using CLIP.
        Returns: (variant_label, confidence)
        """
        if self.model is None or self.processor is None:
            raise RuntimeError("CLIP model not loaded")

        try:
            # Preprocess image
            image = Image.open(io.BytesIO(image_bytes)).convert('RGB')

            # Get templates for the detected instrument type
            templates = INSTRUMENT_TEMPLATES.get(instrument_type, ["a photo of an instrument"])

            # Process inputs
            inputs = self.processor(
                text=templates,
                images=image,
                return_tensors="pt",
                padding=True
            ).to(self.device)

            # Inference
            with torch.no_grad():
                outputs = self.model(**inputs)
                logits_per_image = outputs.logits_per_image  # shape: (1, num_templates)
                probs = logits_per_image.softmax(dim=1)  # get probabilities

            # Get best match
            best_idx = torch.argmax(probs[0]).item()
            best_template = templates[best_idx]
            confidence = probs[0][best_idx].item()

            # Extract variant from template
            variant = best_template.replace("a photo of an ", "").replace("a photo of a ", "")

            return variant, confidence

        except Exception as e:
            logger.error(f"CLIP variant analysis failed: {e}")
            raise

# Global analyzer instance
_clip_analyzer_instance = None

def get_clip_analyzer() -> ClipAnalyzer:
    """Get or create the global CLIP analyzer instance."""
    global _clip_analyzer_instance
    if _clip_analyzer_instance is None:
        _clip_analyzer_instance = ClipAnalyzer()
    return _clip_analyzer_instance

def analyze_instrument_variant(image_bytes: bytes, instrument_type: str) -> dict:
    """Convenience function for variant analysis."""
    analyzer = get_clip_analyzer()
    variant, confidence = analyzer.analyze_variant(image_bytes, instrument_type)

    return {
        "variant": variant,
        "confidence": confidence
    }