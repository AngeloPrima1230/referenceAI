# Depth Map Tool — Full Project

AI-powered depth map generator for 3D printing, CNC, and bas-relief carving.

## What it does

Upload any photo → get a 16-bit grayscale depth map PNG and a 3D STL mesh you can
send straight to a CNC machine, 3D printer, or laser engraver.

## Architecture

```
depthmap-project/
  backend/   Python + FastAPI — AI model + image processing
  frontend/  React + Vite + Three.js — browser UI
```

## One-command dev setup

**Terminal 1 — backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Terminal 2 — frontend**
```bash
cd frontend
npm install
npm run dev          # opens http://localhost:5173
```

## Features

| Feature | Status |
|---------|--------|
| 8-bit and 16-bit depth map PNG | ✅ |
| STL mesh with solid base plate | ✅ |
| Normal map PNG | ✅ |
| Batch processing (ZIP output) | ✅ |
| Auto image-type classification | ✅ |
| Image quality scoring + warnings | ✅ |
| Before/after compare slider | ✅ |
| Three.js interactive 3D preview | ✅ |
| Background removal (rembg) | ✅ |
| Small / Base / Large model switch | ✅ |
| Drag-and-drop upload | ✅ |
| Wireframe toggle | ✅ |

## Deploy

| Part | Platform | Cost |
|------|----------|------|
| Backend | Hugging Face Spaces (Docker) | Free CPU / $0.09/hr GPU |
| Frontend | Vercel | Free |

See `backend/README.md` and `frontend/README.md` for detailed steps.
