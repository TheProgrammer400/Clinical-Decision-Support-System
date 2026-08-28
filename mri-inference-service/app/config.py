import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MODEL_PATH: str = os.getenv("MODEL_PATH", "models/unet.pth")
    MODEL_VERSION: str = os.getenv("MODEL_VERSION", "unet_v1.2.0")
    MAX_CONCURRENT_INFERENCE: int = int(os.getenv("MAX_CONCURRENT_INFERENCE", "1"))
    ALLOW_CPU_FALLBACK: bool = os.getenv("ALLOW_CPU_FALLBACK", "false").lower() in ("true", "1", "t")
    INFERENCE_TIMEOUT_SECONDS: int = int(os.getenv("INFERENCE_TIMEOUT_SECONDS", "20"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    class Config:
        env_file = ".env"

settings = Settings()
