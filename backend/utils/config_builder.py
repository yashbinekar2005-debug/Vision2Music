from typing import Dict, Any, Optional

def build_instrument_config(raw_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Build and validate instrument config from GPT-4o Vision output."""
    # Map common variants to standardized ones
    variant_mapping = {
        "acoustic": "acoustic",
        "classical": "classical",
        "electric": "electric",
        "grand": "grand",
        "upright": "upright",
        "bass": "bass",
        "snare": "snare",
        "kick": "kick"
    }

    # Extract and validate fields
    config = {
        "type": raw_analysis.get("type", "piano"),
        "variant": variant_mapping.get(raw_analysis.get("variant", "").lower(), "standard"),
        "strings": raw_analysis.get("strings"),
        "octave_range": raw_analysis.get("octave_range", [2, 5]),
        "notes": raw_analysis.get("notes", ["C", "D", "E", "F", "G", "A", "B"]),
        "tuning": raw_analysis.get("tuning"),
        "pads": raw_analysis.get("pads")
    }

    # Validate instrument type
    valid_types = ["piano", "guitar", "drums", "violin", "flute"]
    if config["type"] not in valid_types:
        config["type"] = "piano"  # fallback

    # Validate strings for string instruments
    if config["type"] in ["guitar", "violin"] and config["strings"] is not None:
        if config["type"] == "guitar" and config["strings"] not in [4, 6, 7, 12]:
            config["strings"] = 6  # default guitar
        elif config["type"] == "violin" and config["strings"] not in [4, 5]:
            config["strings"] = 4  # default violin

    # Validate pads for drums
    if config["type"] == "drums" and config["pads"] is not None:
        if config["pads"] not in [4, 6, 8, 9, 12, 16]:
            config["pads"] = 9  # default drum pad count

    return config