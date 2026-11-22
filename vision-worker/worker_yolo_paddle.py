"""
OLOBOC_ MOTORSPORT PHOTOGRAPHY PLATFORM
Python Vision AI Worker — YOLOv8 Vehicle Detection + PaddleOCR Bib Recognition
Developed by Nortcode (https://www.nortcode.es)

Usage:
  pip install fastapi uvicorn ultralytics paddleocr pillow python-multipart
  python worker_yolo_paddle.py
  (Runs on http://localhost:8000)

Configuration in OLOBOC_ server/.env:
  VISION_SERVICE_URL=http://localhost:8000
"""

import io
import os
import base64
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from PIL import Image

try:
  from ultralytics import YOLO
except ImportError:
  YOLO = None

try:
  from paddleocr import PaddleOCR
except ImportError:
  PaddleOCR = None

app = FastAPI(
    title="OLOBOC_ Motorsport Vision AI Worker",
    version="2.0.0",
    description="High-performance motorsport vehicle detector and race bib number OCR"
)

# Initialize models (CPU or CUDA GPU)
vehicle_model = None
ocr_engine = None

@app.on_event("startup")
def load_models():
    global vehicle_model, ocr_engine
    print("[Vision Worker] Loading YOLOv8 vehicle detection model...")
    if YOLO:
        # Uses nano model for rapid real-time inference (COCO class 2 = car, class 7 = truck, class 3 = motorcycle)
        vehicle_model = YOLO("yolov8n.pt")
        print("[Vision Worker] YOLOv8 model loaded.")
    else:
        print("[Vision Worker] ultralytics not installed. Vehicle detection falling back to aspect ratio heuristics.")

    print("[Vision Worker] Loading PaddleOCR engine...")
    if PaddleOCR:
        ocr_engine = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
        print("[Vision Worker] PaddleOCR engine ready.")
    else:
        print("[Vision Worker] PaddleOCR not installed.")

class BoundingBox(BaseModel):
    x: int
    y: int
    w: int
    h: int

class BibCandidate(BaseModel):
    bibNumber: string = ""
    confidence: float
    bbox: BoundingBox
    cropBase64: Optional[str] = None
    detectedBy: str = "YOLO_PADDLEOCR"

class DetectionResponse(BaseModel):
    success: bool
    vehiclesFound: int
    candidates: List[dict]

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "models": {
            "yolo": vehicle_model is not None,
            "paddleocr": ocr_engine is not None
        }
    }

@app.post("/detect-vehicle-bibs")
async def detect_vehicle_bibs(file: UploadFile = File(...)):
    """
    Detects motorsport vehicles in the image, extracts door/bonnet ROIs,
    and recognizes race bib numbers (1-999).
    """
    try:
        contents = await file.read()
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
        width, height = pil_image.size
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")

    vehicles = []

    # 1. Detect vehicles using YOLOv8
    if vehicle_model:
        results = vehicle_model(pil_image, conf=0.35, classes=[2, 3, 7]) # car, motorcycle, truck
        for r in results:
            for box in r.boxes:
                xyxy = box.xyxy[0].tolist()
                x0, y0, x1, y1 = int(xyxy[0]), int(xyxy[1]), int(xyxy[2]), int(xyxy[3])
                vehicles.append({
                    "x": max(0, x0),
                    "y": max(0, y0),
                    "w": min(width - x0, x1 - x0),
                    "h": min(height - y0, y1 - y0),
                    "conf": float(box.conf[0])
                })

    # If no YOLO vehicle detected, fallback to center/full crop
    if not vehicles:
        vehicles.append({
            "x": int(width * 0.1),
            "y": int(height * 0.15),
            "w": int(width * 0.8),
            "h": int(height * 0.7),
            "conf": 0.5
        })

    candidates = []
    excluded_numbers = {"2024", "2025", "2026", "1920", "1080", "1600", "2000", "0"}

    # 2. Extract vehicle ROIs and run OCR
    for v in vehicles:
        try:
            # Crop vehicle area
            v_crop = pil_image.crop((v["x"], v["y"], v["x"] + v["w"], v["y"] + v["h"]))
            
            # Convert to bytes for PaddleOCR
            crop_bytes_io = io.BytesIO()
            v_crop.save(crop_bytes_io, format="JPEG", quality=90)
            crop_bytes = crop_bytes_io.getvalue()

            if ocr_engine:
                ocr_res = ocr_engine.ocr(crop_bytes, cls=True)
                if ocr_res and ocr_res[0]:
                    for line in ocr_res[0]:
                        poly = line[0] # [[x0,y0], [x1,y1], [x2,y2], [x3,y3]]
                        text, conf = line[1]
                        
                        digits = "".join([c for c in text if c.isdigit()])
                        clean_bib = digits.lstrip("0")

                        if clean_bib and 1 <= len(clean_bib) <= 3 and clean_bib not in excluded_numbers:
                            # Compute absolute bounding box
                            bx0 = min([p[0] for p in poly])
                            by0 = min([p[1] for p in poly])
                            bx1 = max([p[0] for p in poly])
                            by1 = max([p[1] for p in poly])

                            abs_x = int(v["x"] + bx0)
                            abs_y = int(v["y"] + by0)
                            abs_w = int(bx1 - bx0)
                            abs_h = int(by1 - by0)

                            # Generate base64 thumbnail of the bib crop
                            try:
                                bib_crop = pil_image.crop((
                                    max(0, abs_x - 10),
                                    max(0, abs_y - 10),
                                    min(width, abs_x + abs_w + 10),
                                    min(height, abs_y + abs_h + 10)
                                ))
                                thumb_io = io.BytesIO()
                                bib_crop.resize((160, 100)).save(thumb_io, format="JPEG", quality=80)
                                crop_base64 = "data:image/jpeg;base64," + base64.b64encode(thumb_io.getvalue()).decode("utf-8")
                            except:
                                crop_base64 = None

                            candidates.append({
                                "bibNumber": clean_bib,
                                "confidence": round(float(conf), 2),
                                "bbox": {"x": abs_x, "y": abs_y, "w": abs_w, "h": abs_h},
                                "cropBase64": crop_base64,
                                "detectedBy": "YOLO_PADDLEOCR"
                            })
        except Exception as err:
            print(f"[Vision Worker] ROI error: {err}")

    return {
        "success": True,
        "vehiclesFound": len(vehicles),
        "candidates": candidates
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
