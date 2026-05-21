# image_classifier.py
from PIL import Image
import numpy as np


def classify_image(img: Image.Image) -> dict:
    w, h   = img.size
    arr    = np.array(img.convert("RGB"), np.float32)
    aspect = w / h

    r, g, b  = arr[:,:,0], arr[:,:,1], arr[:,:,2]
    saturation  = float(np.mean(np.abs(r-g)+np.abs(g-b)+np.abs(r-b)))
    gray        = np.array(img.convert("L"), np.float32)
    edge_density= float((np.abs(np.diff(gray,axis=1)).mean() + np.abs(np.diff(gray,axis=0)).mean()) / 2)

    top3      = arr[:h//3,:,:]
    has_sky   = top3.std() < 25 and top3.mean() > 160
    cx, cy    = w//4, h//4
    cvar      = float(arr[cy:3*cy, cx:3*cx, :].std())

    if saturation < 15 and edge_density > 20:
        kind, conf = "line_art", 0.85
        s = {"remove_bg":False,"sharpness":2.0,"contrast":1.8,"model_size":"base","invert_depth":True}
    elif has_sky and aspect >= 1.5:
        kind, conf = "landscape", 0.78
        s = {"remove_bg":False,"sharpness":1.3,"contrast":1.4,"model_size":"small","invert_depth":False}
    elif 0.5 <= aspect <= 0.85 and cvar > 35:
        kind, conf = "portrait", 0.80
        s = {"remove_bg":True,"sharpness":1.5,"contrast":1.2,"model_size":"small","invert_depth":False}
    else:
        kind, conf = "object", 0.60
        s = {"remove_bg":True,"sharpness":1.5,"contrast":1.2,"model_size":"small","invert_depth":False}

    return {"type":kind,"confidence":round(conf,2),"aspect_ratio":round(aspect,2),
            "saturation":round(saturation,2),"edge_density":round(edge_density,2),
            "recommended_settings":s}


def score_image_quality(img: Image.Image) -> dict:
    w, h  = img.size
    arr   = np.array(img.convert("L"), np.float32)
    score = 1.0; warns = []

    if w < 256 or h < 256:
        warns.append("Image is very small (<256 px). Depth quality will be limited."); score -= 0.30
    mb = float(arr.mean())
    if mb < 40:
        warns.append("Image is very dark. The model may miss surface detail."); score -= 0.25
    elif mb > 220:
        warns.append("Image is overexposed. Detail loss may affect depth quality."); score -= 0.15
    sharp = float(np.var(np.diff(arr,axis=1)) + np.var(np.diff(arr,axis=0)))
    if sharp < 100:
        warns.append("Image appears blurry. A sharper photo gives better results."); score -= 0.25
    if float(arr.std()) < 20:
        warns.append("Very low contrast – may produce a flat depth map."); score -= 0.40

    score = round(max(0.0, min(1.0, score)), 2)
    label = "excellent" if score>0.8 else "good" if score>0.6 else "fair" if score>0.4 else "poor"
    return {"score":score,"quality":label,"warnings":warns,
            "resolution":f"{w}x{h}","sharpness":round(sharp,1),"brightness":round(mb,1)}
