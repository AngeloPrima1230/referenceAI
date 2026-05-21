# Depth Map Tool – Backend

## Quick start

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Interactive docs → http://localhost:8000/docs

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/`                       | Status |
| GET  | `/health`                 | Health check |
| POST | `/classify`               | Image type + quality score |
| POST | `/generate-depth`         | Depth map PNG (8 or 16-bit) |
| POST | `/generate-stl`           | STL mesh with base plate |
| POST | `/generate-normal-map`    | RGB normal map PNG |
| POST | `/generate-depth-batch`   | Up to 10 images → ZIP |

## Key query parameters (`/generate-depth`)

| Param | Default | Description |
|-------|---------|-------------|
| `remove_bg` | `true` | Background removal via rembg |
| `max_width` | `512` | Resize input (px) |
| `bit_depth` | `16` | 8 or 16 bit PNG |
| `model_size`| `small` | `small` / `base` / `large` |
| `sharpness` | `1.5` | Pre-sharpening (1.0 = off) |
| `contrast`  | `1.2` | Pre-contrast (1.0 = off) |
| `invert`    | `false` | Flip near/far |

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ALLOWED_ORIGINS` | `*` | Comma-separated CORS list |
| `PORT` | `8000` | Listen port |

## Deploy to Hugging Face Spaces

```bash
git init && git add .
git remote add hf https://huggingface.co/spaces/YOUR_NAME/depthmap-api
git push hf main
```
