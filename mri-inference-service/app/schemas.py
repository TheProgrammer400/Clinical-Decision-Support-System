from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class MriFindings(BaseModel):
    segmented_pixels: int = Field(..., ge=0, description="Pixels labelled as segmented region")
    foreground_pixels: int = Field(..., ge=0, description="Non-background pixels (intensity threshold)")
    area_percent: float = Field(..., ge=0, le=100, description="segmented / foreground * 100")
    sqrt_area_percent: float = Field(..., ge=0, le=100, description="sqrt(area fraction) * 100; not a width")
    analysis_resolution: int = Field(..., gt=0, description="Side length in pixels of the analysed image")


class Visualizations(BaseModel):
    segmented_mask: str = Field(..., description="PNG data URI of the binary mask")
    tumor_overlay: str = Field(..., description="PNG data URI of the overlay")


class ImageAnalysisResult(BaseModel):
    image_name: str
    status: Literal["completed", "failed"]
    findings: Optional[MriFindings] = None
    visualizations: Optional[Visualizations] = None
    model_version: str
    processing_time_ms: int
    error_message: Optional[str] = None


class MultiImageResponse(BaseModel):
    data: List[ImageAnalysisResult]
    total_images: int
    model_version: str
