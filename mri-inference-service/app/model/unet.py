"""Segmentation network definition and weight loading.

Architecture (as implemented, and as the published weights expect): a ResNet-50 encoder
(convolutional stages only) followed by a stack of transposed convolutions that upsample the
4x4 feature map back to the 128x128 input size, ending in a 1-channel logit map.

This is an encoder-decoder WITHOUT skip connections. It is not a U-Net, despite the
historical file and version names ("unet.pth", "unet_v1.2.0"), which are kept so existing
weight files continue to load. The class and attribute names below must not change: they
define the state_dict keys.
"""
from pathlib import Path

import torch
import torch.nn as nn
from torchvision import models


class ModelLoadError(RuntimeError):
    """Raised when model weights are missing or incompatible."""


class CustomResNet50(nn.Module):
    def __init__(self):
        super().__init__()
        # weights=None: no ImageNet download at startup; all weights come from MODEL_PATH.
        self.backbone = models.resnet50(weights=None)
        self.backbone.fc = nn.Identity()
        # Head used during the original self-supervised pre-training; unused at inference.
        self.rotation_head = nn.Sequential(
            nn.Linear(2048, 256),
            nn.BatchNorm1d(256),
            nn.LeakyReLU(0.1),
            nn.Dropout(0.5),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.SiLU(),
            nn.Dropout(0.5),
            nn.Linear(128, 1),
        )

    def forward(self, x):
        return self.rotation_head(self.backbone(x))


class ResNetEncoder(nn.Module):
    def __init__(self, model: CustomResNet50):
        super().__init__()
        self.encoder = nn.Sequential(*list(model.backbone.children())[:-2])

    def forward(self, x):
        return self.encoder(x)


class Decoder(nn.Module):
    def __init__(self):
        super().__init__()
        self.decoder = nn.Sequential(
            nn.ConvTranspose2d(2048, 1024, 3, stride=2, padding=1, output_padding=1),
            nn.BatchNorm2d(1024),
            nn.ReLU(inplace=True),
            nn.ConvTranspose2d(1024, 512, 3, stride=2, padding=1, output_padding=1),
            nn.BatchNorm2d(512),
            nn.ReLU(inplace=True),
            nn.ConvTranspose2d(512, 256, 3, stride=2, padding=1, output_padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.ConvTranspose2d(256, 64, 3, stride=2, padding=1, output_padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.ConvTranspose2d(64, 64, kernel_size=2, stride=2),
            nn.Conv2d(64, 1, kernel_size=1),
        )

    def forward(self, x):
        return self.decoder(x)


class AutoEncoder(nn.Module):
    """Encoder-decoder segmentation model (see module docstring)."""

    def __init__(self, base_model: CustomResNet50):
        super().__init__()
        self.encoder = ResNetEncoder(base_model)
        self.decoder = Decoder()

    def forward(self, x):
        return self.decoder(self.encoder(x))


def build_segmentation_model(model_path: str, device: str = "cuda") -> nn.Module:
    """Builds the network, loads weights safely and returns it in eval mode.

    Weights are loaded with ``weights_only=True`` so a malicious checkpoint cannot execute
    code during unpickling.
    """
    path = Path(model_path)
    if not path.is_file():
        raise ModelLoadError(
            f"Model weights not found at '{model_path}'. The weights are not distributed with the "
            "repository; place the trained state_dict file there or set MODEL_PATH."
        )
    model = AutoEncoder(CustomResNet50())
    try:
        state_dict = torch.load(path, map_location=device, weights_only=True)
        model.load_state_dict(state_dict)
    except Exception as exc:  # noqa: BLE001 - re-raised with context
        raise ModelLoadError(f"Model weights at '{model_path}' could not be loaded: {exc}") from exc
    return model.to(device).eval()


# Backwards-compatible name.
build_unet_model = build_segmentation_model
