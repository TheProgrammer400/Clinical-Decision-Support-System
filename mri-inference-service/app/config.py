from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Service configuration, read from environment variables (and an optional .env file)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", protected_namespaces=())

    MODEL_PATH: str = "models/unet.pth"
    MODEL_VERSION: str = "unet_v1.2.0"
    MAX_CONCURRENT_INFERENCE: int = 1
    # Development only: allow the service to run without a CUDA GPU.
    ALLOW_CPU_FALLBACK: bool = False
    # Seconds a request may wait for an inference slot before being rejected with 503.
    INFERENCE_TIMEOUT_SECONDS: int = 20
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Input limits
    MAX_FILES_PER_REQUEST: int = 10
    MAX_FILE_BYTES: int = 20 * 1024 * 1024
    MAX_IMAGE_PIXELS: int = 40_000_000
    MIN_IMAGE_SIDE: int = 32

    # When set, every /predict request must send this value in the X-Inference-Token header.
    INFERENCE_TOKEN: Optional[str] = None


settings = Settings()
