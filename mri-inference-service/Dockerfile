# MRI segmentation inference service.
# The PyPI torch wheels bundle their own CUDA runtime libraries, so a slim Python base image is
# sufficient; GPU access requires the NVIDIA container runtime on the host.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
# Model weights are not in the repository. Mount them at runtime (recommended) or place
# them in models/ before building. The service refuses to start without them.
COPY models/ ./models/

RUN useradd --system --uid 10001 appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
