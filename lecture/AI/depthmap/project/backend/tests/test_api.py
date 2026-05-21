# tests/test_api.py
import pytest
import io
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock


def make_jpg(w=128, h=128) -> bytes:
    arr = np.random.randint(50, 200, (h, w, 3), dtype=np.uint8)
    buf = io.BytesIO()
    Image.fromarray(arr).save(buf, "JPEG")
    buf.seek(0)
    return buf.read()


# Patch the heavy model before importing app
@pytest.fixture(scope="module")
def client():
    fake_depth = np.random.rand(128, 128).astype(np.float32)
    mock_result = MagicMock()
    mock_result.__getitem__.side_effect = lambda k: (
        MagicMock(**{"squeeze.return_value.numpy.return_value": fake_depth})
        if k == "predicted_depth" else None
    )
    with patch("main.get_model", return_value=lambda img: mock_result):
        from main import app
        yield TestClient(app)


class TestRoot:
    def test_get_root(self, client):
        r = client.get("/")
        assert r.status_code == 200
        assert r.json()["status"] == "running"

    def test_health(self, client):
        r = client.get("/health")
        assert r.status_code in (200, 503)
        assert "checks" in r.json()


class TestInputValidation:
    def test_rejects_text_file(self, client):
        r = client.post("/generate-depth",
            files={"file": ("test.txt", b"hello", "text/plain")})
        assert r.status_code == 400

    def test_rejects_too_large(self, client):
        big = b"x" * (21 * 1024 * 1024)
        r   = client.post("/generate-depth",
            files={"file": ("big.jpg", big, "image/jpeg")})
        assert r.status_code == 413

    def test_rejects_missing_file(self, client):
        r = client.post("/generate-depth")
        assert r.status_code == 422

    def test_rejects_tiny_image(self, client):
        arr = np.zeros((20, 20, 3), dtype=np.uint8)
        buf = io.BytesIO(); Image.fromarray(arr).save(buf, "JPEG"); buf.seek(0)
        r   = client.post("/generate-depth",
            files={"file": ("small.jpg", buf.read(), "image/jpeg")})
        assert r.status_code == 400


class TestGenerateDepth:
    def test_returns_png(self, client):
        r = client.post("/generate-depth?remove_bg=false&max_width=128&bit_depth=8",
            files={"file": ("p.jpg", make_jpg(), "image/jpeg")})
        assert r.status_code == 200
        assert r.headers["content-type"] == "image/png"

    def test_returns_valid_image(self, client):
        r = client.post("/generate-depth?remove_bg=false&max_width=128",
            files={"file": ("p.jpg", make_jpg(), "image/jpeg")})
        assert r.status_code == 200
        img = Image.open(io.BytesIO(r.content))
        assert img.mode in ("L", "I", "I;16")

    def test_has_process_time_header(self, client):
        r = client.post("/generate-depth?remove_bg=false&max_width=128",
            files={"file": ("p.jpg", make_jpg(), "image/jpeg")})
        assert "x-process-time" in r.headers
