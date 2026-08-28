from typing import List, Optional
from pydantic import BaseModel, Field

class MriFindings(BaseModel):
    tumor_pixels: int = Field(..., description="Number of positive tumor mask pixels")
    brain_pixels: int = Field(..., description="Total visible brain tissue pixels")
    area_percent: float = Field(..., description="Tumor area percentage relative to brain tissue")
    visual_width_span_percent: float = Field(..., description="Estimated visual width span percentage")

class Visualizations(BaseModel):
    segmented_mask: str = Field(..., description="Base64-encoded PNG string of binary mask")
    tumor_overlay: str = Field(..., description="Base64-encoded PNG string of tumor overlay image")

class ImageAnalysisResult(BaseModel):
    image_name: str
    status: str  # "completed" | "failed"
    findings: Optional[MriFindings] = None
    visualizations: Optional[Visualizations] = None
    model_version: str
    processing_time_ms: int
    error_message: Optional[str] = None

class MultiImageResponse(BaseModel):
    data: List[ImageAnalysisResult]
    total_images: int
    model_version: str
