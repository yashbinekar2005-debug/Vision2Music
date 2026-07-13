#!/usr/bin/env python3
"""
Initialize the EfficientNet-B2 model with ImageNet weights.
For production, these should be fine-tuned on instrument dataset.
"""

import os
import torch
import torchvision.models as models
from pathlib import Path
import json

# Paths
BACKEND_DIR = Path(__file__).resolve().parent
WEIGHTS_DIR = BACKEND_DIR / "weights"
CLASS_NAMES_PATH = BACKEND_DIR / "data" / "class_names.json"
WEIGHTS_PATH = WEIGHTS_DIR / "efficientnet_b2_ft.pt"

# Ensure directories exist
WEIGHTS_DIR.mkdir(exist_ok=True)

# Load class names
with open(CLASS_NAMES_PATH, 'r') as f:
    CLASS_NAMES = json.load(f)

print(f"Class names: {CLASS_NAMES}")
print(f"Number of classes: {len(CLASS_NAMES)}")

# Load EfficientNet-B2 with ImageNet weights
print("Loading EfficientNet-B2 with ImageNet weights...")
model = models.efficientnet_b2(weights=models.EfficientNet_B2_Weights.IMAGENET1K_V1)

# Replace classifier for our 5 classes
num_features = model.classifier[1].in_features
model.classifier[1] = torch.nn.Linear(num_features, len(CLASS_NAMES))

# Initialize the new classifier layer with Xavier initialization
torch.nn.init.xavier_uniform_(model.classifier[1].weight)
torch.nn.init.zeros_(model.classifier[1].bias)

# Save the model
print(f"Saving model to {WEIGHTS_PATH}...")
torch.save(model.state_dict(), WEIGHTS_PATH)

print("Model initialized successfully!")
print("Note: This uses ImageNet weights with a random classifier layer.")
print("For accurate instrument classification, you need to fine-tune the model")
print("on a dataset of instrument images using the training script.")