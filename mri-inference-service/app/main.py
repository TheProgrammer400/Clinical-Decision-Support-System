import asyncio
import hmac
import io
import logging
import time
import warnings
from contextlib import asynccontextmanager
from typing import List, Optional

import numpy as np
import torch
from fastapi import FastAPI, File, Header, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from PIL import Image
from starlette.concurrency import run_in_threadpool

from app.config import settings
from app.inference import InferenceError, VisualizationError, generate_visualizations, pil_image_to_base64_data_uri, run_inference
from app.metadata import MetadataExtractionError, generate_metadata
from app.model.unet import ModelLoadError, build_segmentation_model
from app.schemas import ImageAnalysisResult, MriFindings, MultiImageResponse, Visualizations

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("mri-inference-service")

# Decompression-bomb protection: Pillow raises instead of warning above this size.
Image.MAX_IMAGE_PIXELS = settings.MAX_IMAGE_PIXELS
warnings.simplefilter("error", Image.DecompressionBombWarning)

ALLOWED_FORMATS = {"PNG", "JPEG", "WEBP"}


class InvalidImageError(ValueError):
    """Input problems that are safe to report back to the caller verbatim."""


def select_device() -> str:
    if torch.cuda.is_available():
        logger.info("CUDA detected: using GPU '%s'", torch.cuda.get_device_name(0))
        return "cuda"
    if settings.ALLOW_CPU_FALLBACK:
        logger.warning("CUDA unavailable; CPU fallback enabled by ALLOW_CPU_FALLBACK=true (development only).")
        return "cpu"
    raise RuntimeError("CUDA is unavailable and ALLOW_CPU_FALLBACK is false; refusing to start.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.model = None
    app.state.device = None
    app.state.model_version = settings.MODEL_VERSION
    app.state.semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_INFERENCE)
    app.state.load_error = None

    device = select_device()
    try:
        app.state.model = build_segmentation_model(settings.MODEL_PATH, device=device)
        app.state.device = device
        logger.info("Model loaded from '%s' (version %s) on %s", settings.MODEL_PATH, settings.MODEL_VERSION, device)
    except ModelLoadError as exc:
        # Fail fast: a service without a model must not report itself ready.
        logger.error("%s", exc)
        raise
    yield
    logger.info("Shutting down MRI inference service")


app = FastAPI(title="CDSS MRI Segmentation Inference Service", version="1.3.0", lifespan=lifespan)


@app.get("/health")
def get_liveness():
    return {"status": "ok", "service": "mri-inference-service"}


@app.get("/health/ready")
def get_readiness():
    model = getattr(app.state, "model", None)
    device = getattr(app.state, "device", None)
    cuda_available = torch.cuda.is_available()
    ready = model is not None and (cuda_available or settings.ALLOW_CPU_FALLBACK)
    if not ready:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready", "cuda_available": cuda_available, "model_loaded": model is not None},
        )
    return {
        "status": "ready",
        "cuda_available": cuda_available,
        "device": str(device),
        "gpu_name": torch.cuda.get_device_name(0) if cuda_available else None,
        "model_loaded": True,
        "model_version": app.state.model_version,
    }


def check_token(token: Optional[str]) -> None:
    expected = settings.INFERENCE_TOKEN
    if expected and not (token and hmac.compare_digest(token.encode(), expected.encode())):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid inference token")


async def read_limited(upload: UploadFile) -> bytes:
    data = await upload.read(settings.MAX_FILE_BYTES + 1)
    if len(data) > settings.MAX_FILE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail="File exceeds the maximum allowed size")
    return data


def decode_image(content: bytes) -> Image.Image:
    if not content:
        raise InvalidImageError("Uploaded image file is empty")
    try:
        with Image.open(io.BytesIO(content)) as probe:
            fmt = probe.format
            probe.verify()
        img = Image.open(io.BytesIO(content))
        img.load()
    except (Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise InvalidImageError("Image dimensions exceed the allowed maximum") from None
    except Exception:
        raise InvalidImageError("File is not a readable image") from None
    if fmt not in ALLOWED_FORMATS:
        raise InvalidImageError("Unsupported image format; use PNG, JPEG or WebP")
    width, height = img.size
    if min(width, height) < settings.MIN_IMAGE_SIDE:
        raise InvalidImageError(f"Image is too small (minimum {settings.MIN_IMAGE_SIDE}px per side)")
    if img.mode not in ("L", "LA", "RGB", "RGBA", "P", "I;16", "I", "F"):
        raise InvalidImageError(f"Unsupported image mode {img.mode}")
    if img.mode in ("I;16", "I", "F"):
        img = to_8bit(img)
    return img


def to_8bit(img: Image.Image) -> Image.Image:
    """Min-max rescales high bit-depth greyscale to 8-bit (the model expects 8-bit RGB input)."""
    arr = np.asarray(img, dtype=np.float32)
    lo, hi = float(arr.min()), float(arr.max())
    scaled = np.zeros_like(arr) if hi <= lo else (arr - lo) * (255.0 / (hi - lo))
    return Image.fromarray(scaled.astype(np.uint8))


def analyze_one(img: Image.Image, model, device: str) -> tuple:
    """CPU/GPU-bound work; always executed in a worker thread."""
    mask = run_inference(img, model, device)
    findings = generate_metadata(mask, img)
    mask_png, overlay_png = generate_visualizations(img, mask)
    return findings, mask_png, overlay_png


@app.post("/predict", response_model=MultiImageResponse)
async def predict_brain_mri(
    files: List[UploadFile] = File(...),
    x_inference_token: Optional[str] = Header(default=None),
):
    check_token(x_inference_token)
    if not files:
        raise HTTPException(status_code=400, detail="No image files provided")
    if len(files) > settings.MAX_FILES_PER_REQUEST:
        raise HTTPException(status_code=400, detail=f"At most {settings.MAX_FILES_PER_REQUEST} files per request")

    model = getattr(app.state, "model", None)
    device = getattr(app.state, "device", None)
    if model is None or device is None:
        raise HTTPException(status_code=503, detail="Model is not initialized")

    contents = [(f.filename or "image", await read_limited(f)) for f in files]

    semaphore: asyncio.Semaphore = app.state.semaphore
    try:
        await asyncio.wait_for(semaphore.acquire(), timeout=settings.INFERENCE_TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        raise HTTPException(status_code=503, detail="Inference queue busy; retry later") from None

    results: List[ImageAnalysisResult] = []
    try:
        for filename, content in contents:
            start = time.perf_counter()
            try:
                img = decode_image(content)
                findings, mask_png, overlay_png = await run_in_threadpool(analyze_one, img, model, device)
                results.append(
                    ImageAnalysisResult(
                        image_name=filename,
                        status="completed",
                        findings=MriFindings(**findings),
                        visualizations=Visualizations(
                            segmented_mask=pil_image_to_base64_data_uri(mask_png),
                            tumor_overlay=pil_image_to_base64_data_uri(overlay_png),
                        ),
                        model_version=app.state.model_version,
                        processing_time_ms=int((time.perf_counter() - start) * 1000),
                    )
                )
            except InvalidImageError as exc:
                results.append(failed(filename, start, str(exc)))
            except (InferenceError, MetadataExtractionError, VisualizationError) as exc:
                logger.error("Processing failed for one image: %s", exc)
                results.append(failed(filename, start, "The image could not be processed by the model"))
            except Exception:  # noqa: BLE001
                logger.exception("Unexpected error while processing an image")
                results.append(failed(filename, start, "Unexpected processing error"))
    finally:
        semaphore.release()

    return MultiImageResponse(data=results, total_images=len(results), model_version=app.state.model_version)


def failed(filename: str, start: float, message: str) -> ImageAnalysisResult:
    return ImageAnalysisResult(
        image_name=filename,
        status="failed",
        model_version=app.state.model_version,
        processing_time_ms=int((time.perf_counter() - start) * 1000),
        error_message=message,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, workers=1)
