import torch
import torch.nn as nn
from torchvision import models

class CustomResNet50(nn.Module):
    def __init__(self):
        super(CustomResNet50, self).__init__()
        self.backbone = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1)
        self.backbone.fc = nn.Identity()
        self.rotation_head = nn.Sequential(
            nn.Linear(2048, 256),
            nn.BatchNorm1d(256),
            nn.LeakyReLU(0.1),
            nn.Dropout(0.5),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.SiLU(),
            nn.Dropout(0.5),
            nn.Linear(128, 1)
        )

    def forward(self, x):
        features = self.backbone(x)
        rotate_pred = self.rotation_head(features)
        return rotate_pred

class ResNetEncoder(nn.Module):
    def __init__(self, model):
        super(ResNetEncoder, self).__init__()
        self.encoder = nn.Sequential(*list(model.backbone.children())[:-2])

    def forward(self, x):
        return self.encoder(x)

class Decoder(nn.Module):
    def __init__(self):
        super(Decoder, self).__init__()
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
            nn.Conv2d(64, 1, kernel_size=1)
        )

    def forward(self, x):
        return self.decoder(x)

class AutoEncoder(nn.Module):
    def __init__(self, base_model, device="cuda"):
        super(AutoEncoder, self).__init__()
        self.encoder = ResNetEncoder(base_model).to(device)
        self.decoder = Decoder().to(device)

    def forward(self, x):
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded

def build_unet_model(model_path: str, device: str = "cuda") -> nn.Module:
    """
    Instantiates CustomResNet50 + AutoEncoder, loads model_path weights, and returns model in eval mode.
    """
    base_model = CustomResNet50().to(device)
    unet_model = AutoEncoder(base_model, device=device).to(device)
    unet_model.load_state_dict(torch.load(model_path, map_location=device))
    unet_model.eval()
    return unet_model
