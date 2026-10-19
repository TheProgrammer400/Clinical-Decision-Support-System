import base64
import io
from typing import Tuple

import numpy as np
import torch
from PIL import Image
from scipy import ndimage
from torchvision import transforms

# The network operates on fixed-size inputs. Measurements are therefore pixel counts at this
# resolution, not physical sizes.
ANALYSIS_RESOLUTION = 128


class InferenceError(Exception):
    """Raised when preprocessing or the model forward pass fails."""


class VisualizationError(Exception):
    """Raised when rendering the mask or overlay fails."""


transform = transforms.Compose(
    [
        transforms.Resize((ANALYSIS_RESOLUTION, ANALYSIS_RESOLUTION)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),
    ]
)


def run_inference(image: Image.Image, model, device: str, min_component_size: int = 50) -> np.ndarray:
    """Preprocess -> forward pass -> threshold -> remove small components.

    Returns a binary uint8 mask of shape (ANALYSIS_RESOLUTION, ANALYSIS_RESOLUTION).
    """
    try:
        input_tensor = transform(image.convert("RGB")).unsqueeze(0).to(device)
        with torch.no_grad():
            output = model(input_tensor)
    except Exception as exc:  # noqa: BLE001
        raise InferenceError(f"Model forward pass failed: {exc}") from exc

    if output.shape[-2:] != (ANALYSIS_RESOLUTION, ANALYSIS_RESOLUTION):
        raise InferenceError(f"Unexpected model output shape {tuple(output.shape)}")
    if not torch.isfinite(output).all():
        raise InferenceError("Model produced non-finite values")

    mask = (torch.sigmoid(output) > 0.5).squeeze().cpu().numpy().astype(np.uint8)

    labels, num_components = ndimage.label(mask)
    if num_components == 0:
        return mask
    sizes = ndimage.sum(mask, labels, index=range(1, num_components + 1))
    keep = np.isin(labels, [i + 1 for i, size in enumerate(sizes) if size >= min_component_size])
    return keep.astype(np.uint8)


def generate_visualizations(original: Image.Image, mask: np.ndarray, alpha: float = 0.5) -> Tuple[bytes, bytes]:
    """Returns PNG bytes for (binary mask, red overlay on the resized original)."""
    try:
        original_array = np.array(original.convert("RGB").resize((ANALYSIS_RESOLUTION, ANALYSIS_RESOLUTION)))

        mask_buf = io.BytesIO()
        Image.fromarray((mask * 255).astype(np.uint8)).save(mask_buf, format="PNG")

        overlay_array = original_array.copy()
        region = mask == 1
        overlay_array[region] = ((1 - alpha) * overlay_array[region] + alpha * np.array([255, 0, 0])).astype(np.uint8)
        overlay_buf = io.BytesIO()
        Image.fromarray(overlay_array).save(overlay_buf, format="PNG")

        return mask_buf.getvalue(), overlay_buf.getvalue()
    except Exception as exc:  # noqa: BLE001
        raise VisualizationError(f"Visualization rendering failed: {exc}") from exc


def pil_image_to_base64_data_uri(png_bytes: bytes) -> str:
    return "data:image/png;base64," + base64.b64encode(png_bytes).decode("ascii")
