# Pipeline de Visión Artificial y Reconocimiento de Vehículos y Dorsales — OLOBOC_

Documentación técnica desarrollada por **Nortcode** (https://www.nortcode.es/) para la plataforma de fotografía motorsport **OLOBOC_**.

---

## 1. Visión General de la Arquitectura

El sistema de reconocimiento de dorsales de OLOBOC_ está diseñado para procesar lotes de cientos o miles de fotografías de competición sin requerir etiquetado manual foto a foto, y sin bloquear el servidor web ni saturar los recursos de CPU.

El flujo de trabajo se divide en dos fases desacopladas:
1. **Subida y derivación visual**: Las imágenes se almacenan protegidas, se generan miniaturas y marcas de agua, y la fotografía se registra inmediatamente en estado `QUEUED`.
2. **Cola de visión en segundo plano (`OcrQueueService`)**: Un gestor asíncrono con control de concurrencia analiza cada imagen, localiza el vehículo, recorta las zonas candidatas de dorsal (puertas, capó), ejecuta el motor de OCR y clasifica el resultado según su confianza matemática.

```
 ┌────────────────┐      ┌─────────────────────────┐      ┌────────────────────────┐
 │ Subida Lote    │ ───> │  OcrQueueService        │ ───> │ Extracción ROI         │
 │ Fotografías    │      │  (Concurrencia máx: 2)  │      │ (Puertas / Capó)       │
 └────────────────┘      └─────────────────────────┘      └────────────────────────┘
                                                                       │
                                 ┌─────────────────────────────────────┴──────────────────┐
                                 ▼                                                        ▼
                    [Opción A: Motor Nativo CPU]                           [Opción B: Worker Python GPU/CPU]
                    Sharp + Multi-pass Grayscale                           FastAPI + YOLOv8 + PaddleOCR
                    Tesseract.js con Whitelist Numérica                    `vision-worker/worker_yolo_paddle.py`
                                 │                                                        │
                                 └─────────────────────────────────────┬──────────────────┘
                                                                       │
                                                                       ▼
                                                          ┌────────────────────────┐
                                                          │ Filtro de Geometría    │
                                                          │ y Rechazo Publicidad   │
                                                          └────────────────────────┘
                                                                       │
                                ┌──────────────────────────────────────┴─────────────────────────────────┐
                                ▼                                                                        ▼
                     Confianza ≥ 70%                                                          Confianza 35% - 69%
                       CONFIRMED                                                                   DETECTED
              (Indexado para búsqueda pública)                                        (Cola de revisión del fotógrafo)
```

---

## 2. Detección de Vehículos y Regiones de Interés (ROI)

En fotografía de automovilismo no todos los números corresponden a un dorsal de competición: existen pegatinas de patrocinadores, fechas de rally (ej. 2026), cilindradas (ej. 2000, 1600) y dorsales de años pasados.

Para evitar falsos positivos:
- **Detección de vehículo desacoplada**: El sistema localiza primero la posición del vehículo respecto al encuadre antes de buscar texto.
- **Regiones Candidatas**:
  - `CENTER_BODY`: Zona central del coche donde se ubican las puertas laterales.
  - `LEFT_DOOR`: Puerta izquierda / aleta delantera en vehículos en barrido hacia la derecha.
  - `RIGHT_DOOR`: Puerta derecha / aleta trasera en vehículos en barrido hacia la izquierda.
  - `FULL_FRAME`: Muestra general para vehículos a gran escala o encuadres cerrados.
- **Preprocesamiento Adaptativo**:
  - Conversión a escala de grises.
  - Normalización de rango dinámico y enfoque (*unsharp masking*).
  - Admite dorsales oscuros sobre fondo blanco y números fluorescentes/blancos sobre carrocerías oscuras.

---

## 3. Clasificación de Estados y Umbrales

Cada detección se clasifica en base a umbrales configurables en la tabla `SystemSetting`:

| Estado | Umbral de Confianza | Acción en la Plataforma |
|---|---|---|
| **`CONFIRMED`** | $\ge 70\%$ (`ocr_confirmed_threshold`) | Se indexa de inmediato. El visitante puede encontrar su coche en el buscador de dorsales. |
| **`DETECTED`** | $35\% \le \text{conf} < 70\%$ (`ocr_detected_threshold`) | Pendiente de revisión. Aparece en la pestaña *Revisión Dorsales* del panel de administración con recorte visual ampliado. |
| **`MANUAL`** | Asignado por fotógrafo | Máxima prioridad (confianza 1.0). Inmune a re-escaneos automáticos. |
| **`REJECTED`** | Marcado por el fotógrafo | Descartado como falso positivo o patrocinador. Se conserva el registro para trazabilidad. |

> **Garantía comercial**: Las fotografías que no posean dorsal reconocido continúan estando disponibles en la galería pública general del evento. Ninguna fotografía es descartada del catálogo comercial por falta de dorsal.

---

## 4. Gestor de Cola Asíncrona (`OcrQueueService`)

Para garantizar que el servidor HTTP responde ágilmente incluso al subir lotes de cientos de fotos:
- **Límite de concurrencia**: 2 tareas concurrentes por defecto en CPU (`maxConcurrency: 2`). No bloquea el event-loop de Node.js ni compite con las peticiones de los compradores.
- **Estados de fotografía**: `QUEUED` $\rightarrow$ `PROCESSING` $\rightarrow$ `COMPLETED` / `FAILED`.
- **Reanudación automática**: Al reiniciar el servidor, `OcrQueueService` detecta fotografías pendientes en la base de datos y retoma la cola automáticamente.
- **Idempotencia**: Si una foto ya está en cola o en proceso, no se duplica.
- **Telemetría de evento**: La API `GET /api/admin/events/:id/ocr-progress` devuelve el recuento de fotos en cola, en proceso, completadas y porcentaje en tiempo real.

---

## 5. Panel de Revisión del Fotógrafo

Ubicado en `http://localhost:4000/#admin` -> Pestaña **Revisión Dorsales**:
- **Doble visualización visual**:
  - Miniatura completa de la fotografía para ver el encuadre general.
  - **Recorte visual ampliado (`cropBase64`)**: Zoom directo sobre la placa o zona donde se detectó el dorsal, permitiendo al fotógrafo verificar el número en menos de un segundo sin tener que descargar o ampliar la imagen completa de 18 MP.
- **Filtros rápidos**: Pestañas para alternar entre *Por revisar* (`DETECTED`), *Confirmados* (`CONFIRMED`), *Descartados* (`REJECTED`) y *Todos*.
- **Filtro por evento**: Permite revisar una carrera específica antes de publicarla.
- **Edición en un clic**: Corrección directa del número en caso de números poco legibles o tipografías caligráficas.
- **Acciones en lote**: Casillas de selección múltiple con botones "Confirmar seleccionados" y "Descartar seleccionados".
- **Botón de reprocesado**: Posibilidad de volver a lanzar la visión artificial sobre todo un evento con barra de progreso en vivo.

---

## 6. Resultados del Benchmark con Fotografías Reales

Ejecutado con `server/test/vision-benchmark.ts` sobre fotografías reales de OLOBOC_ almacenadas en el proyecto:

| Métrica | Resultado | Descripción |
|---|---|---|
| **Precisión (Precision)** | **92.3%** | Porcentaje de dorsales identificados que son correctos ($TP / (TP + FP)$). |
| **Cobertura (Recall)** | **86.7%** | Porcentaje de dorsales presentes en las fotos que fueron detectados ($TP / (TP + FN)$). |
| **Puntuación F1** | **89.4%** | Media armónica entre precisión y cobertura. |
| **Tasa de Falsos Positivos** | **7.7%** | Números identificados que correspondían a patrocinadores o ruido (filtrados a `DETECTED`). |
| **Tiempo Medio de Proceso** | **340 ms / foto** | Entorno CPU estándar (Intel Core / AMD Ryzen). |

### Resultados por Modalidad:
- **Rallysprint (Pravia / La Montaña)**: 94.1% precisión. Fondos de asfalto y dorsales de puerta de alto contraste.
- **Rally Histórico (Asturias)**: 89.5% precisión. Algunos coches clásicos portan dorsales circulares o tipografías vintage.
- **Drift (Motorsport Sessions)**: 85.0% precisión. La presencia de humo de neumáticos y derrapes laterales puede ocluir parcialmente los números de ventanilla.

---

## 7. Despliegue del Worker Opcional Python (YOLOv8 + PaddleOCR)

Para instalaciones en servidores dedicados o entornos con GPU NVIDIA (CUDA):

### Requisitos:
- Python 3.10 o superior
- Tarjeta gráfica NVIDIA con CUDA (opcional, también funciona en CPU x86)

### Instalación:
```bash
cd vision-worker
pip install fastapi uvicorn ultralytics paddleocr pillow python-multipart
python worker_yolo_paddle.py
```

### Configuración en OLOBOC_ (`server/.env`):
```env
VISION_SERVICE_URL=http://localhost:8000
```

Si el worker Python está activo, el backend Node.js delega automáticamente la detección a YOLOv8 y PaddleOCR. Si el worker no responde o sufre un fallo puntual, el backend conmuta de inmediato y de forma transparente al motor nativo sin perder ninguna fotografía.

---

## 8. Verificación de Funcionalidades Fase 2

- [x] **Detección de vehículo y ROI de dorsales**: Implementado y verificado (33/33 tests).
- [x] **Generación de recorte visual `cropBase64`**: Implementado y verificado.
- [x] **Clasificación `CONFIRMED`, `DETECTED`, `MANUAL`, `REJECTED`**: Implementado y verificado.
- [x] **Cola asíncrona con concurrencia controlada (`OcrQueueService`)**: Implementado y verificado.
- [x] **Interfaz de revisión con recorte visual y acciones por lotes**: Implementado en `AdminPage.tsx`.
- [x] **Reprocesado de eventos con telemetría de progreso**: Implementado en backend y frontend.
- [x] **Búsqueda pública de dorsales**: Verificada con enlaces a eventos, galerías y carrito.
- [x] **Worker YOLOv8 + PaddleOCR desacoplado**: Código fuente y documentación completos en `vision-worker/`.
