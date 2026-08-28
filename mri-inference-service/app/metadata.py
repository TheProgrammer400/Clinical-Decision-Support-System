import os
import sys
import json
import argparse
import numpy as np
from PIL import Image

class MetadataExtractionError(Exception):
    """Custom exception raised when metadata extraction fails."""
    pass

def generate_metadata(mask: np.ndarray, original_img: Image.Image = None) -> dict:
    """
    Given a binary segmentation mask array (128x128) and optional original PIL Image,
    returns quantitative findings: tumor_pixels, brain_pixels, area_percent, visual_width_span_percent.
    No side effects or file I/O.
    """
    try:
        if mask is None or not isinstance(mask, np.ndarray):
            raise MetadataExtractionError("Invalid mask array provided for metadata extraction")

        tumor_pixels = int(np.sum(mask == 1))

        if original_img is not None:
            # Resize image to match mask dimension (128x128)
            img_resized = original_img.convert("RGB").resize((128, 128))
            img_array = np.array(img_resized)
            # Exclude dark background pixels (intensity threshold > 10)
            brain_pixels = int(np.sum(np.any(img_array > 10, axis=-1)))
        else:
            brain_pixels = int(mask.size)

        total_pixels = brain_pixels if brain_pixels > 0 else mask.size
        area_pct = (tumor_pixels / total_pixels) * 100.0
        width_span_pct = np.sqrt(area_pct / 100.0) * 100.0 if area_pct > 0 else 0.0

        return {
            "tumor_pixels": tumor_pixels,
            "brain_pixels": total_pixels,
            "area_percent": round(float(area_pct), 2),
            "visual_width_span_percent": round(float(width_span_pct), 1)
        }
    except Exception as e:
        if isinstance(e, MetadataExtractionError):
            raise e
        raise MetadataExtractionError(f"Failed to generate metadata: {str(e)}") from e

def generate_all_metadata_cli(image_folder: str) -> dict:
    """Developer CLI helper function for directory-based metadata testing."""
    from app.inference import predict_brain_tumor  # lazy import
    results = {}
    if not os.path.exists(image_folder):
        print(f"Directory {image_folder} does not exist.")
        return results

    for fname in os.listdir(image_folder):
        if fname.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            full_path = os.path.join(image_folder, fname)
            try:
                img = Image.open(full_path)
                # Note: CLI testing helper requires loaded model in inference context
                print(f"Processing metadata for CLI test: {fname}")
            except Exception as err:
                print(f"Error processing {fname}: {err}")
    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MRI Metadata Extraction CLI Test")
    parser.add_argument("--image_folder", type=str, default="./imgs", help="Path to image directory")
    args = parser.parse_args()
    print(f"Running metadata CLI test on: {args.image_folder}")
