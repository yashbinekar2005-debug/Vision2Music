import openai
import json
import base64
import os
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

# System prompt for GPT-4o Vision
SYSTEM_PROMPT = """
You analyze musical instrument images. Return ONLY valid JSON with this schema:
{
  "type": string,           // piano | guitar | drums | violin | flute
  "variant": string,        // acoustic | electric | classical | upright | etc.
  "strings": int | null,    // number of strings if applicable
  "octave_range": [int,int],// e.g. [2, 7] for piano
  "notes": string[],        // available notes e.g. ["C","D","E","F","G","A","B"]
  "tuning": string | null,  // e.g. "EADGBE" for guitar
  "pads": int | null        // number of drum pads if drums
}
Return only JSON. No markdown. No explanation.
"""

class GPTVisionAnalyzer:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key not provided")
        self.client = openai.OpenAI(api_key=self.api_key)

    def analyze(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Analyze instrument using GPT-4o Vision to get detailed config.
        Returns: Dictionary with instrument configuration
        """
        try:
            # Encode image to base64
            b64_image = base64.b64encode(image_bytes).decode('utf-8')

            # Call GPT-4o Vision
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"}},
                        {"type": "text", "text": "Analyze this instrument."}
                    ]
                }],
                system=SYSTEM_PROMPT,
                max_tokens=300,
                temperature=0.1  # Low temperature for consistent JSON output
            )

            # Parse JSON response
            content = response.choices[0].message.content.strip()
            config = json.loads(content)

            # Validate and set defaults
            validated_config = self._validate_config(config)
            return validated_config

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse GPT-4o Vision JSON response: {content}")
            raise ValueError(f"Invalid JSON response from GPT-4o: {e}")
        except Exception as e:
            logger.error(f"GPT-4o Vision analysis failed: {e}")
            raise

    def _validate_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and set defaults for instrument config."""
        # Ensure required fields exist with defaults
        validated = {
            "type": config.get("type", "piano"),
            "variant": config.get("variant", "standard"),
            "strings": config.get("strings"),
            "octave_range": config.get("octave_range", [2, 5]),
            "notes": config.get("notes", ["C", "D", "E", "F", "G", "A", "B"]),
            "tuning": config.get("tuning"),
            "pads": config.get("pads")
        }

        # Validate type
        valid_types = ["piano", "guitar", "drums", "violin", "flute"]
        if validated["type"] not in valid_types:
            validated["type"] = "piano"

        # Validate strings for string instruments
        if validated["type"] in ["guitar", "violin"] and validated["strings"] is not None:
            if validated["type"] == "guitar" and validated["strings"] not in [4, 6, 7, 12]:
                validated["strings"] = 6
            elif validated["type"] == "violin" and validated["strings"] not in [4, 5]:
                validated["strings"] = 4

        # Validate pads for drums
        if validated["type"] == "drums" and validated["pads"] is not None:
            if validated["pads"] not in [4, 6, 8, 9, 12, 16]:
                validated["pads"] = 9

        return validated

# Global analyzer instance (lazy initialized)
_gpt_vision_analyzer_instance = None

def get_gpt_vision_analyzer() -> GPTVisionAnalyzer:
    """Get or create the global GPT Vision analyzer instance."""
    global _gpt_vision_analyzer_instance
    if _gpt_vision_analyzer_instance is None:
        _gpt_vision_analyzer_instance = GPTVisionAnalyzer()
    return _gpt_vision_analyzer_instance

def analyze_instrument_full(image_bytes: bytes) -> dict:
    """Convenience function for full GPT-4o Vision analysis."""
    analyzer = get_gpt_vision_analyzer()
    return analyzer.analyze(image_bytes)