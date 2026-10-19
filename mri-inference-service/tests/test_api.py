import asyncio
import io
import time

import numpy as np
import pytest
from PIL import Image

from tests.conftest import png_bytes


def test_readiness_reports_loaded_model(client):
    body = client.get("/health/ready").json()
    assert body["status"] == "ready" and body["model_loaded"] is True and body["device"] == "cpu"


def test_readiness_returns_503_without_model(client):
    from app.main import app

    model = app.state.model
    app.state.model = None
    try:
        res = client.get("/health/ready")
        assert res.status_code == 503
        assert res.json()["status"] == "not_ready"
    finally:
        app.state.model = model


def test_service_refuses_to_start_without_weights(service_settings, monkeypatch, tmp_path):
    from fastapi.testclient import TestClient

    from app.main import app
    from app.model.unet import ModelLoadError

    monkeypatch.setattr(service_settings, "MODEL_PATH", str(tmp_path / "missing.pth"))
    with pytest.raises(ModelLoadError):
        with TestClient(app):
            pass


def test_predict_returns_findings_with_current_names(client):
    res = client.post("/predict", files=[("files", ("a.png", png_bytes(), "image/png"))])
    assert res.status_code == 200
    result = res.json()["data"][0]
    assert result["status"] == "completed"
    assert set(result["findings"]) == {"segmented_pixels", "foreground_pixels", "area_percent", "sqrt_area_percent", "analysis_resolution"}
    assert result["image_name"] == "a.png"


def test_invalid_images_fail_individually_with_safe_messages(client):
    files = [
        ("files", ("ok.png", png_bytes(), "image/png")),
        ("files", ("text.png", b"not an image at all", "image/png")),
        ("files", ("tiny.png", png_bytes(size=(8, 8)), "image/png")),
    ]
    data = client.post("/predict", files=files).json()["data"]
    assert [d["status"] for d in data] == ["completed", "failed", "failed"]
    assert data[1]["error_message"] == "File is not a readable image"
    assert "too small" in data[2]["error_message"]


def test_rejects_unsupported_formats(client):
    buf = io.BytesIO()
    Image.new("RGB", (64, 64)).save(buf, format="BMP")
    data = client.post("/predict", files=[("files", ("x.bmp", buf.getvalue(), "image/bmp"))]).json()["data"]
    assert data[0]["status"] == "failed" and "Unsupported" in data[0]["error_message"]


def test_handles_16bit_greyscale(client):
    buf = io.BytesIO()
    Image.fromarray((np.arange(64 * 64, dtype=np.uint16).reshape(64, 64) * 10).astype(np.uint16)).save(buf, format="PNG")
    data = client.post("/predict", files=[("files", ("deep.png", buf.getvalue(), "image/png"))]).json()["data"]
    assert data[0]["status"] == "completed"


def test_enforces_file_count_and_size_limits(client):
    many = [("files", (f"{i}.png", png_bytes(), "image/png")) for i in range(4)]
    assert client.post("/predict", files=many).status_code == 400
    big = png_bytes() + b"\0" * 300_000
    assert client.post("/predict", files=[("files", ("big.png", big, "image/png"))]).status_code == 413


def test_token_is_required_when_configured(client, service_settings, monkeypatch):
    monkeypatch.setattr(service_settings, "INFERENCE_TOKEN", "a-long-shared-secret")
    files = [("files", ("a.png", png_bytes(), "image/png"))]
    assert client.post("/predict", files=files).status_code == 401
    assert client.post("/predict", files=files, headers={"X-Inference-Token": "wrong"}).status_code == 401
    assert client.post("/predict", files=files, headers={"X-Inference-Token": "a-long-shared-secret"}).status_code == 200


def test_inference_does_not_block_the_event_loop(service_settings, monkeypatch):
    import httpx

    import app.main as main

    def slow_analyze(img, model, device):
        time.sleep(1.5)
        return (
            {"segmented_pixels": 0, "foreground_pixels": 1, "area_percent": 0.0, "sqrt_area_percent": 0.0, "analysis_resolution": 128},
            png_bytes(),
            png_bytes(),
        )

    monkeypatch.setattr(main, "analyze_one", slow_analyze)

    async def scenario():
        async with main.app.router.lifespan_context(main.app):
            transport = httpx.ASGITransport(app=main.app)
            async with httpx.AsyncClient(transport=transport, base_url="http://t") as http:
                predict = asyncio.create_task(http.post("/predict", files=[("files", ("a.png", png_bytes(), "image/png"))]))
                await asyncio.sleep(0.2)
                start = time.perf_counter()
                health = await http.get("/health")
                health_latency = time.perf_counter() - start
                assert (await predict).status_code == 200
                return health.status_code, health_latency

    status, latency = asyncio.run(scenario())
    assert status == 200
    assert latency < 0.5, f"/health took {latency:.2f}s while inference was running"
