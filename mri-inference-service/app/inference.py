import io
import base64
import torch
import numpy as np
from PIL import Image
from scipy import ndimage
from torchvision import transforms
from typing import Tuple, Dict, Any

class InferenceError(Exception):
    """Custom exception raised during model forward pass / preprocessing."""
    pass

class VisualizationError(Exception):
    """Custom exception raised during visualization rendering."""
    pass

transform = transforms.Compose([
    transforms.Resize((128, 128)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
])

def run_inference(image: Image.Image, model, device: str, min_component_size: int = 50) -> np.ndarray:
    """
    Preprocess PIL Image -> forward pass under torch.no_grad() -> scipy component cleanup -> returns 128x128 binary mask array.
    """
    try:
        rgb_image = image.convert("RGB")
        input_tensor = transform(rgb_image).unsqueeze(0).to(device)

        with torch.no_grad():
            output = model(input_tensor)
            probability_mask = torch.sigmoid(output)
            binary_mask = (probability_mask > 0.5).float()

        mask = binary_mask.squeeze().cpu().numpy().astype(np.uint8)
        
        # Scipy connected components filtering
        labels, num_components = ndimage.label(mask)
        cleaned_mask = np.zeros_like(mask)
        for label in range(1, num_components + 1):
            component = (labels == label)
            if np.sum(component) >= min_component_size:
                cleaned_mask[component] = 1

        return cleaned_mask
    except Exception as e:
        raise InferenceError(f"U-Net model inference execution failed: {str(e)}") from e

def generate_visualizations(original: Image.Image, mask: np.ndarray, alpha: float = 0.5) -> Tuple[bytes, bytes]:
    """
    Generates raw PNG bytes for (segmented_mask_png, tumor_overlay_png).
    """
    try:
        original_resized = original.convert("RGB").resize((128, 128))
        original_array = np.array(original_resized)

        # 1. Segmented Mask PNG
        mask_image = Image.fromarray((mask * 255).astype(np.uint8))
        mask_buf = io.BytesIO()
        mask_image.save(mask_buf, format="PNG")
        mask_bytes = mask_buf.getvalue()

        # 2. Tumor Overlay PNG (red highlight where mask == 1)
        overlay_array = original_array.copy()
        red_mask = (mask == 1)
        overlay_array[red_mask] = (
            (1 - alpha) * overlay_array[red_mask] + alpha * np.array([255, 0, 0])
        ).astype(np.uint8)
        overlay_image = Image.fromarray(overlay_array)
        overlay_buf = io.BytesIO()
        overlay_image.save(overlay_buf, format="PNG")
        overlay_bytes = overlay_buf.getvalue()

        return mask_bytes, overlay_bytes
    except Exception as e:
        raise VisualizationError(f"Visualization rendering failed: {str(e)}") from e

def pil_image_to_base64_data_uri(png_bytes: bytes) -> str:
    """Converts PNG bytes into base64 data URI string."""
    b64_str = base64.b64encode(png_bytes).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"
