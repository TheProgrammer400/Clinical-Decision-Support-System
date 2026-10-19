import io
import sys
from pathlib import Path

import numpy as np
import pytest
import torch
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings  # noqa: E402
from app.model.unet import AutoEncoder, CustomResNet50  # noqa: E402


@pytest.fixture(scope="session")
def weights_path(tmp_path_factory) -> Path:
    """Randomly initialised weights with the production architecture (no real model needed)."""
    torch.manual_seed(0)
    path = tmp_path_factory.mktemp("weights") / "test_model.pth"
    torch.save(AutoEncoder(CustomResNet50()).state_dict(), path)
    return path


@pytest.fixture()
def service_settings(weights_path, monkeypatch):
    monkeypatch.setattr(settings, "MODEL_PATH", str(weights_path))
    monkeypatch.setattr(settings, "ALLOW_CPU_FALLBACK", True)
    monkeypatch.setattr(settings, "INFERENCE_TOKEN", None)
    monkeypatch.setattr(settings, "MAX_FILES_PER_REQUEST", 3)
    monkeypatch.setattr(settings, "MAX_FILE_BYTES", 200_000)
    return settings


@pytest.fixture()
def client(service_settings):
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c


def png_bytes(size=(64, 64), value=100, mode="RGB") -> bytes:
    arr = np.full((size[1], size[0], 3) if mode == "RGB" else (size[1], size[0]), value, dtype=np.uint8)
    buf = io.BytesIO()
    Image.fromarray(arr).save(buf, format="PNG")
    return buf.getvalue()
