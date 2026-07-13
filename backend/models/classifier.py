import torch
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import io
from typing import Tuple, List
import logging

logger = logging.getLogger(__name__)

CLASS_NAMES = ["piano", "guitar", "drums", "violin", "flute"]

INSTRUMENT_PROMPTS = [
    "a photo of a piano",
    "a photo of a guitar",
    "a photo of drums",
    "a photo of a violin",
    "a photo of a flute"
]

class InstrumentClassifier:
    def __init__(self, device: str = None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.processor = None
        self._load_model()

    def _load_model(self):
        try:
            self.model = CLIPModel.from_pretrained("openai/clip-vit-base-patch16")
            self.processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch16")
            self.model.to(self.device)
            self.model.eval()
            logger.info("CLIP zero-shot classifier loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load CLIP model: {e}")
            self.model = None

    def predict(self, image_bytes: bytes) -> Tuple[str, float, List[Tuple[str, float]]]:
        if self.model is None or self.processor is None:
            raise RuntimeError("Classifier model not loaded")

        try:
            image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
            inputs = self.processor(
                text=INSTRUMENT_PROMPTS,
                images=image,
                return_tensors="pt",
                padding=True
            ).to(self.device)

            with torch.no_grad():
                outputs = self.model(**inputs)
                logits_per_image = outputs.logits_per_image
                probs = logits_per_image.softmax(dim=1)

            scores = probs[0]
            top3_scores, top3_idx = torch.topk(scores, min(3, len(scores)))
            top3_scores = top3_scores.tolist()
            top3_idx = top3_idx.tolist()

            predicted_idx = torch.argmax(scores).item()
            predicted_label = CLASS_NAMES[predicted_idx]
            confidence = scores[predicted_idx].item()

            top3 = [
                (CLASS_NAMES[idx], score)
                for idx, score in zip(top3_idx, top3_scores)
            ]

            return predicted_label, confidence, top3

        except Exception as e:
            logger.error(f"Prediction failed: {e}")
            raise

_classifier_instance = None

def get_classifier() -> InstrumentClassifier:
    global _classifier_instance
    if _classifier_instance is None:
        _classifier_instance = InstrumentClassifier()
    return _classifier_instance

def classify_instrument(image_bytes: bytes) -> dict:
    classifier = get_classifier()
    instrument, confidence, top3 = classifier.predict(image_bytes)

    return {
        "instrument": instrument,
        "confidence": confidence,
        "topMatches": [
            {"label": label, "score": score}
            for label, score in top3
        ]
    }
