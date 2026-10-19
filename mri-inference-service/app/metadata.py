"""Quantitative measurements derived from a segmentation mask.

All values are computed on the ANALYSIS_RESOLUTION x ANALYSIS_RESOLUTION resized image. They
are pixel counts and ratios: without pixel-spacing metadata (e.g. from DICOM) they cannot be
converted to physical units, and they have not been clinically validated.
"""
from typing import Optional

import numpy as np
from PIL import Image

from app.inference import ANALYSIS_RESOLUTION

# Pixels with any RGB channel above this value count as foreground (non-background).
FOREGROUND_INTENSITY_THRESHOLD = 10


class MetadataExtractionError(Exception):
    """Raised when measurements cannot be computed."""


def generate_metadata(mask: np.ndarray, original_img: Optional[Image.Image] = None) -> dict:
    """Returns segmented_pixels, foreground_pixels, area_percent and sqrt_area_percent.

    - segmented_pixels: pixels labelled 1 in the mask.
    - foreground_pixels: non-background pixels of the resized original (intensity threshold),
      a rough proxy for imaged tissue; the full image area if no original is given.
    - area_percent: segmented_pixels / foreground_pixels * 100.
    - sqrt_area_percent: sqrt(area fraction) * 100. A unitless size indicator, NOT a width.
    """
    if mask is None or not isinstance(mask, np.ndarray) or mask.ndim != 2:
        raise MetadataExtractionError("Invalid mask array provided for metadata extraction")

    try:
        segmented = int(np.count_nonzero(mask == 1))
        if original_img is not None:
            resized = np.array(original_img.convert("RGB").resize((mask.shape[1], mask.shape[0])))
            foreground = int(np.count_nonzero(np.any(resized > FOREGROUND_INTENSITY_THRESHOLD, axis=-1)))
        else:
            foreground = int(mask.size)
        denominator = foreground if foreground > 0 else int(mask.size)
        fraction = min(segmented / denominator, 1.0)
        return {
            "segmented_pixels": segmented,
            "foreground_pixels": denominator,
            "area_percent": round(fraction * 100.0, 2),
            "sqrt_area_percent": round(float(np.sqrt(fraction)) * 100.0, 1),
            "analysis_resolution": ANALYSIS_RESOLUTION,
        }
    except Exception as exc:  # noqa: BLE001
        raise MetadataExtractionError(f"Failed to generate metadata: {exc}") from exc
