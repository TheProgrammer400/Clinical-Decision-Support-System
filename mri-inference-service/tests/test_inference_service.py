import pytest
import numpy as np
from PIL import Image
from app.metadata import generate_metadata, MetadataExtractionError
from app.inference import run_inference, generate_visualizations, pil_image_to_base64_data_uri

def test_generate_metadata_clean_mask():
    mask = np.zeros((128, 128), dtype=np.uint8)
    mask[40:60, 40:60] = 1 # 20x20 = 400 pixels
    
    img = Image.fromarray(np.uint8(np.ones((128, 128, 3)) * 100))
    meta = generate_metadata(mask, img)
    
    assert meta["tumor_pixels"] == 400
    assert meta["brain_pixels"] == 16384
    assert meta["area_percent"] == 2.44
    assert meta["visual_width_span_percent"] == 15.6

def test_generate_metadata_invalid_input():
    with pytest.raises(MetadataExtractionError):
        generate_metadata(None)

def test_generate_visualizations_output():
    img = Image.fromarray(np.uint8(np.random.rand(128, 128, 3) * 255))
    mask = np.zeros((128, 128), dtype=np.uint8)
    mask[50:60, 50:60] = 1

    mask_bytes, overlay_bytes = generate_visualizations(img, mask)
    assert len(mask_bytes) > 0
    assert len(overlay_bytes) > 0

    mask_b64 = pil_image_to_base64_data_uri(mask_bytes)
    assert mask_b64.startswith("data:image/png;base64,")
