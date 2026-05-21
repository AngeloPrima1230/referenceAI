# tests/test_image_processing.py
import pytest
import numpy as np
from PIL import Image
from image_classifier import classify_image, score_image_quality


@pytest.fixture
def flat_depth():
    return np.full((128, 128), 0.5, dtype=np.float32)

@pytest.fixture
def peak_depth():
    Y, X = np.ogrid[:128, :128]
    return np.exp(-((X-64)**2 + (Y-64)**2) / (2*20**2)).astype(np.float32)

@pytest.fixture
def portrait_img():
    arr = np.random.randint(40, 200, (300, 200, 3), dtype=np.uint8)
    arr[75:225, 50:150] = np.random.randint(30, 220, (150, 100, 3), dtype=np.uint8)
    return Image.fromarray(arr)

@pytest.fixture
def tiny_img():
    return Image.fromarray(np.zeros((40, 40, 3), dtype=np.uint8))


class TestClassification:
    def test_returns_dict_with_type(self, portrait_img):
        r = classify_image(portrait_img)
        assert "type" in r
        assert r["type"] in ("portrait","landscape","line_art","object")

    def test_confidence_range(self, portrait_img):
        r = classify_image(portrait_img)
        assert 0.0 <= r["confidence"] <= 1.0

    def test_recommended_settings_present(self, portrait_img):
        r = classify_image(portrait_img)
        s = r["recommended_settings"]
        assert "remove_bg" in s
        assert "model_size" in s
        assert s["model_size"] in ("small","base","large")

    def test_aspect_ratio_computed(self, portrait_img):
        r = classify_image(portrait_img)
        assert "aspect_ratio" in r
        assert r["aspect_ratio"] == round(200/300, 2)

    def test_line_art_detected(self):
        # near-grayscale image with strong edges = line art
        arr = np.zeros((128, 128, 3), dtype=np.uint8)
        for i in range(0, 128, 10):
            arr[i, :] = 255  # horizontal white lines
        img = Image.fromarray(arr)
        r = classify_image(img)
        assert r["type"] == "line_art"


class TestQualityScoring:
    def test_score_range(self, portrait_img):
        r = score_image_quality(portrait_img)
        assert 0.0 <= r["score"] <= 1.0

    def test_quality_label_valid(self, portrait_img):
        r = score_image_quality(portrait_img)
        assert r["quality"] in ("excellent","good","fair","poor")

    def test_tiny_image_scores_poorly(self, tiny_img):
        r = score_image_quality(tiny_img)
        assert r["score"] < 0.5
        assert len(r["warnings"]) >= 1
        assert any("small" in w.lower() for w in r["warnings"])

    def test_dark_image_warning(self):
        dark = Image.fromarray(np.full((200, 200, 3), 10, dtype=np.uint8))
        r = score_image_quality(dark)
        assert any("dark" in w.lower() for w in r["warnings"])

    def test_resolution_in_response(self, portrait_img):
        r = score_image_quality(portrait_img)
        assert r["resolution"] == "200x300"
        assert isinstance(r["sharpness"], float)
        assert isinstance(r["brightness"], float)
