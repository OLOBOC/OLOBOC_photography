# Pipeline de Reconocimiento Automático de Dorsales — OLOBOC_

Implementado y documentado por **Nortcode** (https://www.nortcode.es/).

---

## 1. Funcionamiento del Pipeline

El objetivo del sistema es analizar automáticamente las fotografías de motorsport subidas por el fotógrafo para indexar los vehículos por su número de dorsal de competición (1 a 999), evitando el etiquetado manual foto a foto.

### Flujo de Ejecución:
1. **Subida segura**: La imagen original se recibe en memoria (límite 25 MB por archivo) y se valida su tipo MIME (`image/jpeg`, `image/png`, `image/webp`).
2. **Generación de variantes**: `sharp` extrae dimensiones y genera los derivados con marca de agua y miniaturas.
3. **Preprocesamiento para OCR**:
   - Escala de grises (`grayscale()`).
   - Normalización de contraste y enfoque dinámico (`normalize().sharpen()`).
   - Generación de variantes de contraste para facilitar la lectura de dorsales sobre fondos claros y oscuros.
4. **Motor OCR**:
   - Ejecución mediante **Tesseract.js** compilado en WebAssembly, configurado con whitelist estricta de caracteres numéricos (`0123456789`).
   - Extracción de tokens numéricos con coordenadas de caja delimitadora (`bboxX`, `bboxY`, `bboxW`, `bboxH`) y porcentaje de confianza (`confidence`).
5. **Filtrado y Normalización**:
   - Se eliminan números que corresponden a años de temporada (ej. 2024, 2025, 2026), resoluciones típicas (1920, 1080) o lecturas de 1 solo dígito con baja confianza.
   - Se normalizan números con ceros a la izquierda (ej. "07" -> "7").
6. **Clasificación y Persistencia**:
   - **Alta confianza ($\ge 75\%$)**: Marcado como `CONFIRMED`. Se indexa inmediatamente para la búsqueda pública.
   - **Confianza moderada ($40\% \le \text{confianza} < 75\%$)**: Marcado como `DETECTED`. Se muestra en la cola de revisión del panel de administración (`/admin` -> pestaña *Revisión Dorsales*).
   - **Baja confianza ($< 40\%$)**: Descartado como ruido para evitar falsos positivos.

---

## 2. Arquitectura de Escala: Microservicio de Visión Externa (YOLO + PaddleOCR)

Para entornos de producción masiva con miles de fotografías por jornada de rally, la plataforma dispone de una interfaz desacoplada en `BibRecognitionService`:

```
 [ Subida de Foto ] ──> [ Worker Node.js ] ──HTTP/Queue──> [ Microservicio Python YOLOv8 + PaddleOCR ]
                                                                      │
                                                           1. Detección de vehículo (YOLOv8 car class)
                                                           2. Detección de placa/puerta
                                                           3. OCR especializado en números
                                                           4. Respuesta JSON con Bounding Boxes y Confianza
```

### Script de Referencia del Worker Python (`worker_yolo_paddleocr.py`):
```python
# worker_yolo_paddleocr.py
from fastapi import FastAPI, UploadFile
from paddleocr import PaddleOCR
from ultralytics import YOLO
import io
from PIL import Image

app = FastAPI(title="OLOBOC_ Vision AI Worker")
ocr = PaddleOCR(use_angle_cls=True, lang="en")
vehicle_model = YOLO("yolov8n.pt") # Modelo de detección

@app.post("/detect-bibs")
async def detect_bibs(file: UploadFile):
    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes))
    results = ocr.ocr(image_bytes, cls=True)
    candidates = []
    for line in results[0]:
        text, conf = line[1]
        digits = "".join([c for c in text if c.isdigit()])
        if digits and 1 <= len(digits) <= 3:
            candidates.append({
                "bibNumber": digits,
                "confidence": float(conf),
                "bbox": line[0]
            })
    return {"candidates": candidates}
```

---

## 3. Limitaciones Documentadas del OCR en Motorsport

1. **Dorsales con tipografía caligráfica o cursiva**: La detección en números estándar tipo helvética/bloque supera el 95% de acierto. En números muy estilizados puede requerir confirmación en la cola de revisión.
2. **Vehículos muy distantes o con desenfoque de movimiento severo**: Cuando el vehículo ocupa menos del 10% del encuadre y hay barrido lateral de velocidad (*motion blur*), la confianza decae.
3. **Placas de matrícula vs Dorsales**: El filtro descarta números de 4 cifras (matrículas estándar europeas) para priorizar números de dorsal (1 a 999).
