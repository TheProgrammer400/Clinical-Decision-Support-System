import io
import time
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import List
from PIL import Image
import torch

from fastapi import FastAPI, File, UploadFile, HTTPException, status
from fastapi.responses import JSONResponse

from app.config import settings
from app.model.unet import build_unet_model
from app.inference import run_inference, generate_visualizations, pil_image_to_base64_data_uri, InferenceError, VisualizationError
from app.metadata import generate_metadata, MetadataExtractionError
from app.schemas import MultiImageResponse, ImageAnalysisResult, MriFindings, Visualizations

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("mri-inference-service")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing MRI U-Net Inference Service...")
    
    cuda_available = torch.cuda.is_available()
    if cuda_available:
        device = "cuda"
        logger.info(f"CUDA detected: Using GPU device '{torch.cuda.get_device_name(0)}'")
    elif settings.ALLOW_CPU_FALLBACK:
        device = "cpu"
        logger.warn("DEV MODE WARNING: CUDA unavailable. CPU fallback enabled via ALLOW_CPU_FALLBACK=true. NOT FOR PRODUCTION USE.")
    else:
        logger.error("CUDA is unavailable and ALLOW_CPU_FALLBACK is false. Refusing to start in production.")
        raise RuntimeError("CUDA required in production; refusing to start service without GPU/CUDA capability.")

    logger.info(f"Loading PyTorch U-Net model from path: '{settings.MODEL_PATH}'...")
    try:
        model = build_unet_model(settings.MODEL_PATH, device=device)
        app.state.model = model
        app.state.device = device
        app.state.model_version = settings.MODEL_VERSION
        app.state.semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_INFERENCE)
        logger.info(f"U-Net Model successfully loaded. Version: {settings.MODEL_VERSION}")
    except Exception as e:
        logger.error(f"Failed to load U-Net model weights: {e}", exc_info=True)
        raise RuntimeError(f"Failed to initialize PyTorch U-Net model: {e}") from e

    yield

    logger.info("Shutting down MRI Inference Service...")

app = FastAPI(
    title="CDSS MRI U-Net Brain Segmentation Inference Service",
    version="1.2.0",
    lifespan=lifespan
)

@app.get("/health")
def get_liveness():
    return {"status": "ok", "service": "mri-inference-service"}

@app.get("/health/ready")
def get_readiness():
    model = getattr(app.state, "model", None)
    device = getattr(app.state, "device", None)
    cuda_available = torch.cuda.is_available()

    is_ready = model is not None and (cuda_available or settings.ALLOW_CPU_FALLBACK)

    if not is_ready:
        return JSONResponse(
            status_code=status.HTTP_533_SERVICE_UNAVAILABLE,
            content={
                "status": "not_ready",
                "cuda_available": cuda_available,
                "model_loaded": model is not None,
                "error": "Model not initialized or CUDA unavailable"
            }
        )

    return {
        "status": "ready",
        "cuda_available": cuda_available,
        "device": str(device),
        "model_loaded": True,
        "model_version": app.state.model_version
    }

@app.post("/predict", response_model=MultiImageResponse)
async def predict_brain_mri(files: List[UploadFile] = File(...)):
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No MRI image files provided in request")

    model = getattr(app.state, "model", None)
    device = getattr(app.state, "device", None)
    semaphore: asyncio.Semaphore = getattr(app.state, "semaphore", None)

    if model is None or device is None:
        raise HTTPException(status_code=503, detail="MRI Inference Service model is not initialized")

    # Acquire GPU semaphore with timeout
    try:
        await asyncio.wait_for(semaphore.acquire(), timeout=settings.INFERENCE_TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        logger.error(f"GPU inference semaphore timeout after {settings.INFERENCE_TIMEOUT_SECONDS}s")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"GPU inference queue busy. Request timed out after {settings.INFERENCE_TIMEOUT_SECONDS}s"
        )

    results: List[ImageAnalysisResult] = []

    try:
        for file in files:
            start_time = time.time()
            filename = file.filename or "mri_image.png"

            try:
                content = await file.read()
                if not content or len(content) == 0:
                    raise ValueError("Uploaded image file is empty")

                # Verify PIL Image opening
                try:
                    img = Image.open(io.BytesIO(content))
                    img.verify()
                    # Reopen image after verify() resets internal pointer
                    img = Image.open(io.BytesIO(content))
                except Exception as img_err:
                    raise ValueError(f"Corrupted or unsupported image file format: {img_err}")

                # 1. Run U-Net Forward Pass on GPU
                mask = run_inference(img, model, device)

                # 2. Extract Quantitative Metadata
                findings_dict = generate_metadata(mask, img)
                findings = MriFindings(**findings_dict)

                # 3. Generate Visualizations (Mask PNG + Overlay PNG)
                mask_png_bytes, overlay_png_bytes = generate_visualizations(img, mask)

                mask_b64 = pil_image_to_base64_data_uri(mask_png_bytes)
                overlay_b64 = pil_image_to_base64_data_uri(overlay_png_bytes)

                visualizations = Visualizations(
                    segmented_mask=mask_b64,
                    tumor_overlay=overlay_b64
                )

                latency_ms = int((time.time() - start_time) * 1000)

                results.append(
                    ImageAnalysisResult(
                        image_name=filename,
                        status="completed",
                        findings=findings,
                        visualizations=visualizations,
                        model_version=app.state.model_version,
                        processing_time_ms=latency_ms
                    )
                )

            except Exception as e:
                logger.error(f"Error processing MRI image '{filename}': {e}", exc_info=True)
                latency_ms = int((time.time() - start_time) * 1000)
                results.append(
                    ImageAnalysisResult(
                        image_name=filename,
                        status="failed",
                        model_version=app.state.model_version,
                        processing_time_ms=latency_ms,
                        error_message=str(e)
                    )
                )
    finally:
        semaphore.release()

    return MultiImageResponse(
        data=results,
        total_images=len(results),
        model_version=app.state.model_version
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, workers=1, reload=False)
