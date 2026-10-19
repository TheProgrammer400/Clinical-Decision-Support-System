import numpy as np
import pytest
import torch
from PIL import Image

from app.inference import ANALYSIS_RESOLUTION, InferenceError, generate_visualizations, pil_image_to_base64_data_uri, run_inference
from app.metadata import MetadataExtractionError, generate_metadata
from app.model.unet import ModelLoadError, build_segmentation_model


def test_metadata_counts_and_ratios():
    mask = np.zeros((128, 128), dtype=np.uint8)
    mask[40:60, 40:60] = 1  # 400 pixels
    img = Image.fromarray(np.uint8(np.ones((128, 128, 3)) * 100))
    meta = generate_metadata(mask, img)
    assert meta == {
        "segmented_pixels": 400,
        "foreground_pixels": 16384,
        "area_percent": 2.44,
        "sqrt_area_percent": 15.6,
        "analysis_resolution": ANALYSIS_RESOLUTION,
    }


def test_metadata_preserves_genuine_zero():
    meta = generate_metadata(np.zeros((128, 128), dtype=np.uint8), Image.new("RGB", (128, 128), (50, 50, 50)))
    assert meta["segmented_pixels"] == 0
    assert meta["area_percent"] == 0.0
    assert meta["sqrt_area_percent"] == 0.0


def test_metadata_on_all_background_image_uses_full_area():
    mask = np.zeros((128, 128), dtype=np.uint8)
    mask[0:10, 0:10] = 1
    meta = generate_metadata(mask, Image.new("RGB", (128, 128), (0, 0, 0)))
    assert meta["foreground_pixels"] == 128 * 128
    assert 0 <= meta["area_percent"] <= 100


@pytest.mark.parametrize("bad", [None, np.zeros(10), "mask"])
def test_metadata_rejects_invalid_masks(bad):
    with pytest.raises(MetadataExtractionError):
        generate_metadata(bad)


def test_visualizations_are_png():
    img = Image.fromarray(np.uint8(np.random.default_rng(0).random((128, 128, 3)) * 255))
    mask = np.zeros((128, 128), dtype=np.uint8)
    mask[50:60, 50:60] = 1
    mask_png, overlay_png = generate_visualizations(img, mask)
    assert mask_png.startswith(b"\x89PNG") and overlay_png.startswith(b"\x89PNG")
    assert pil_image_to_base64_data_uri(mask_png).startswith("data:image/png;base64,")


class ConstantModel(torch.nn.Module):
    def __init__(self, value: float, shape=(1, 1, 128, 128)):
        super().__init__()
        self.value, self.shape = value, shape

    def forward(self, x):
        return torch.full(self.shape, self.value)


def test_run_inference_thresholds_and_removes_small_components():
    mask = run_inference(Image.new("RGB", (200, 150)), ConstantModel(5.0), "cpu")
    assert mask.shape == (128, 128) and mask.dtype == np.uint8 and mask.sum() == 128 * 128
    assert run_inference(Image.new("RGB", (64, 64)), ConstantModel(-5.0), "cpu").sum() == 0


def test_run_inference_rejects_bad_model_output():
    with pytest.raises(InferenceError):
        run_inference(Image.new("RGB", (64, 64)), ConstantModel(float("nan")), "cpu")
    with pytest.raises(InferenceError):
        run_inference(Image.new("RGB", (64, 64)), ConstantModel(1.0, shape=(1, 1, 64, 64)), "cpu")


def test_missing_weights_raise_explicit_error(tmp_path):
    with pytest.raises(ModelLoadError, match="not found"):
        build_segmentation_model(str(tmp_path / "missing.pth"), device="cpu")


def test_checkpoints_with_arbitrary_objects_are_refused(tmp_path):
    class Payload:
        def __reduce__(self):
            return (print, ("code executed during unpickling",))

    path = tmp_path / "evil.pth"
    torch.save({"x": Payload()}, path)
    with pytest.raises(ModelLoadError):
        build_segmentation_model(str(path), device="cpu")


def test_weights_load_into_eval_mode(weights_path):
    model = build_segmentation_model(str(weights_path), device="cpu")
    assert not model.training
