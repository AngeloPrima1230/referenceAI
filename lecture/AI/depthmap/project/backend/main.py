# main.py  –  Depth Map Tool API
# uvicorn main:app --reload --port 8000

from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Request
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline as hf_pipeline
from PIL import Image, ImageEnhance
from rembg import remove
from stl import mesh as stl_mesh
import numpy as np
import io, os, time, threading, zipfile

# ─── app ──────────────────────────────────────
app = FastAPI(
    title="Depth Map Tool API",
    description="AI-powered depth map and 3D mesh generator",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── request timing ────────────────────────────
@app.middleware("http")
async def add_timing(request: Request, call_next):
    t = time.time()
    resp = await call_next(request)
    resp.headers["X-Process-Time"] = f"{time.time()-t:.3f}s"
    return resp

# ─── model cache ──────────────────────────────
MODEL_NAMES = {
    "small": "depth-anything/Depth-Anything-V2-Small-hf",
    "base":  "depth-anything/Depth-Anything-V2-Base-hf",
    "large": "depth-anything/Depth-Anything-V2-Large-hf",
}
_cache: dict = {}
_lock  = threading.Lock()

def get_model(size: str = "small"):
    if size not in MODEL_NAMES:
        raise ValueError(f"Unknown model '{size}'. Use: small / base / large")
    with _lock:
        if size not in _cache:
            print(f"[startup] loading {size} model …")
            _cache[size] = hf_pipeline("depth-estimation", model=MODEL_NAMES[size])
            print(f"[startup] {size} model ready")
        return _cache[size]

# pre-load small on startup
print("[startup] pre-loading small model …")
get_model("small")
print("[startup] server ready")

# ─── constants ────────────────────────────────
MAX_MB       = 20
ALLOWED_MIME = {"image/jpeg","image/png","image/webp","image/bmp","image/tiff"}

# ─── helpers ──────────────────────────────────
async def load_image(upload: UploadFile, max_width: int):
    if upload.content_type not in ALLOWED_MIME:
        raise HTTPException(400, f"Unsupported type '{upload.content_type}'. Use JPEG/PNG/WebP.")
    data = b""
    async for chunk in upload:
        data += chunk
        if len(data) > MAX_MB * 1024 * 1024:
            raise HTTPException(413, f"File exceeds {MAX_MB} MB limit.")
    try:
        img = Image.open(io.BytesIO(data)); img.verify()
        img = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Could not decode image. File may be corrupted.")
    if img.width < 64 or img.height < 64:
        raise HTTPException(400, "Image too small – minimum 64×64 px.")
    if img.width > max_width:
        img = img.resize((max_width, int(img.height * max_width / img.width)), Image.LANCZOS)
    return data, img


def depth_pipeline(img: Image.Image, *, remove_bg=True,
                   sharpness=1.5, contrast=1.2, model_size="small") -> np.ndarray:
    if remove_bg:
        no_bg = remove(img.convert("RGBA"))
        white = Image.new("RGBA", no_bg.size, (255,255,255,255))
        img   = Image.alpha_composite(white, no_bg).convert("RGB")
    img      = ImageEnhance.Sharpness(img).enhance(sharpness)
    img      = ImageEnhance.Contrast(img).enhance(contrast)
    pipe     = get_model(model_size)
    result   = pipe(img)
    d        = result["predicted_depth"].squeeze().numpy().astype(np.float32)
    lo, hi   = d.min(), d.max()
    return (d - lo) / (hi - lo + 1e-8)


def to_png(norm: np.ndarray, bit_depth: int = 16) -> bytes:
    arr = (norm * 65535).astype(np.uint16) if bit_depth == 16 else (norm * 255).astype(np.uint8)
    buf = io.BytesIO(); Image.fromarray(arr).save(buf, "PNG"); return buf.getvalue()


def build_stl(norm: np.ndarray, depth_scale=2.0, mesh_size=256, base_thickness=1.0) -> bytes:
    """Vectorised heightmap → binary STL with solid base plate."""
    thumb = Image.fromarray((norm*255).astype(np.uint8)).resize((mesh_size,mesh_size), Image.LANCZOS)
    z_top  = np.array(thumb, np.float32) / 255.0 * depth_scale
    z_base = -base_thickness
    h, w   = z_top.shape
    X, Y   = np.meshgrid(np.arange(w), np.arange(h))

    # top surface
    x0=X[:-1,:-1].ravel(); y0=Y[:-1,:-1].ravel(); z00=z_top[:-1,:-1].ravel()
    x1=X[:-1, 1:].ravel();                          z01=z_top[:-1, 1:].ravel()
    x2=X[1:, :-1].ravel(); y2=Y[1:, :-1].ravel();  z10=z_top[1:, :-1].ravel()
    x3=X[1:,  1:].ravel(); y3=Y[1:,  1:].ravel();  z11=z_top[1:,  1:].ravel()
    n = len(x0)
    t1 = np.column_stack([np.column_stack([x0,y0,z00]),np.column_stack([x1,y0,z01]),np.column_stack([x2,y2,z10])]).reshape(n,3,3)
    t2 = np.column_stack([np.column_stack([x1,y0,z01]),np.column_stack([x3,y3,z11]),np.column_stack([x2,y2,z10])]).reshape(n,3,3)
    top = np.empty((2*n,3,3), np.float32); top[0::2]=t1; top[1::2]=t2

    # bottom face
    bot = np.array([[[0,0,z_base],[w-1,0,z_base],[0,h-1,z_base]],
                    [[w-1,0,z_base],[w-1,h-1,z_base],[0,h-1,z_base]]], np.float32)

    # side walls
    sides = []
    for x in range(w-1):
        a,b = z_top[0,x], z_top[0,x+1]
        sides += [[[x,0,z_base],[x+1,0,z_base],[x,0,a]],[[x+1,0,z_base],[x+1,0,b],[x,0,a]]]
        a,b = z_top[h-1,x], z_top[h-1,x+1]
        sides += [[[x,h-1,a],[x+1,h-1,z_base],[x,h-1,z_base]],[[x,h-1,a],[x+1,h-1,b],[x+1,h-1,z_base]]]
    for y in range(h-1):
        a,b = z_top[y,0], z_top[y+1,0]
        sides += [[[0,y,a],[0,y,z_base],[0,y+1,z_base]],[[0,y,a],[0,y+1,z_base],[0,y+1,b]]]
        a,b = z_top[y,w-1], z_top[y+1,w-1]
        sides += [[[w-1,y,z_base],[w-1,y,a],[w-1,y+1,z_base]],[[w-1,y+1,z_base],[w-1,y,a],[w-1,y+1,b]]]

    all_t = np.vstack([top, bot, np.array(sides, np.float32)])
    data = np.zeros(len(all_t), dtype=stl_mesh.Mesh.dtype)
    data["vectors"] = all_t
    m   = stl_mesh.Mesh(data)
    buf = io.BytesIO(); m.save(buf); return buf.getvalue()


def build_normal_map(norm: np.ndarray, strength=5.0) -> bytes:
    dy, dx = np.gradient(norm)
    dx *= strength; dy *= strength
    dz   = np.ones_like(dx)
    mag  = np.sqrt(dx**2 + dy**2 + dz**2)
    r    = ((-dx/mag + 1)/2 * 255).astype(np.uint8)
    g    = ((-dy/mag + 1)/2 * 255).astype(np.uint8)
    b    = ((dz/mag)        * 255).astype(np.uint8)
    buf  = io.BytesIO()
    Image.fromarray(np.stack([r,g,b], axis=2), "RGB").save(buf, "PNG")
    return buf.getvalue()


# ─── endpoints ────────────────────────────────

@app.get("/")
def root():
    return {"status":"running","service":"Depth Map Tool API","version":"1.0.0",
            "docs":"/docs","endpoints":["/classify","/generate-depth","/generate-stl",
                                        "/generate-normal-map","/generate-depth-batch","/health"]}

@app.get("/health")
def health():
    ok = "small" in _cache
    body = {"status":"ok" if ok else "degraded",
            "model_loaded": ok,
            "models_cached": list(_cache.keys())}
    return JSONResponse(body, status_code=200 if ok else 503)


@app.post("/classify")
async def classify(file: UploadFile = File(...)):
    """Detect image type and return recommended generation settings."""
    from image_classifier import classify_image, score_image_quality
    _, img = await load_image(file, 512)
    cls    = classify_image(img)
    qual   = score_image_quality(img)
    return {**cls, "quality": qual}


@app.post("/generate-depth")
async def generate_depth(
    file:       UploadFile = File(...),
    remove_bg:  bool  = Query(True,    description="Remove background with rembg"),
    max_width:  int   = Query(512,     description="Resize width (px)"),
    bit_depth:  int   = Query(16,      description="8 or 16 bit output"),
    model_size: str   = Query("small", description="small | base | large"),
    sharpness:  float = Query(1.5,     description="Pre-sharpening factor"),
    contrast:   float = Query(1.2,     description="Pre-contrast factor"),
    invert:     bool  = Query(False,   description="Invert depth values"),
):
    t = time.time()
    _, img = await load_image(file, max_width)
    norm   = depth_pipeline(img, remove_bg=remove_bg, sharpness=sharpness,
                             contrast=contrast, model_size=model_size)
    if invert: norm = 1.0 - norm
    png = to_png(norm, bit_depth)
    return Response(png, media_type="image/png",
                    headers={"Content-Disposition":"attachment; filename=depth_map.png",
                             "X-Process-Time":f"{time.time()-t:.2f}s",
                             "X-Model":model_size})


@app.post("/generate-stl")
async def generate_stl(
    file:           UploadFile = File(...),
    remove_bg:      bool  = Query(True),
    max_width:      int   = Query(512),
    model_size:     str   = Query("small"),
    depth_scale:    float = Query(2.0,  description="Z-height multiplier"),
    mesh_size:      int   = Query(256,  description="Mesh grid resolution (px)"),
    base_thickness: float = Query(1.0,  description="Solid base plate thickness"),
):
    t = time.time()
    _, img = await load_image(file, max_width)
    norm   = depth_pipeline(img, remove_bg=remove_bg, model_size=model_size)
    stl    = build_stl(norm, depth_scale, mesh_size, base_thickness)
    return Response(stl, media_type="application/octet-stream",
                    headers={"Content-Disposition":"attachment; filename=depth_model.stl",
                             "X-Process-Time":f"{time.time()-t:.2f}s"})


@app.post("/generate-normal-map")
async def generate_normal_map(
    file:      UploadFile = File(...),
    remove_bg: bool  = Query(False),
    max_width: int   = Query(512),
    strength:  float = Query(5.0, description="Normal-map exaggeration strength"),
):
    _, img = await load_image(file, max_width)
    norm   = depth_pipeline(img, remove_bg=remove_bg)
    png    = build_normal_map(norm, strength)
    return Response(png, media_type="image/png",
                    headers={"Content-Disposition":"attachment; filename=normal_map.png"})


@app.post("/generate-depth-batch")
async def generate_depth_batch(
    files:      list[UploadFile] = File(...),
    remove_bg:  bool = Query(True),
    max_width:  int  = Query(512),
    model_size: str  = Query("small"),
):
    if len(files) > 10:
        raise HTTPException(400, "Maximum 10 files per batch request.")
    zuf = io.BytesIO()
    with zipfile.ZipFile(zuf, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in files:
            if not f.content_type.startswith("image/"): continue
            try:
                _, img = await load_image(f, max_width)
                norm   = depth_pipeline(img, remove_bg=remove_bg, model_size=model_size)
                stem   = os.path.splitext(f.filename or "image")[0]
                zf.writestr(f"{stem}_depth.png", to_png(norm, 16))
            except Exception as e:
                print(f"[batch] skip {f.filename}: {e}")
    return Response(zuf.getvalue(), media_type="application/zip",
                    headers={"Content-Disposition":"attachment; filename=depth_maps.zip"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
