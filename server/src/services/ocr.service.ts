import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { prisma } from '../db/prisma.js';
import { storageService } from './storage.service.js';

export interface VehicleBBox {
  x: number;
  y: number;
  w: number;
  h: number;
  confidence: number;
  label: string;
}

export interface BibCandidate {
  bibNumber: string;
  confidence: number;
  bboxX: number;
  bboxY: number;
  bboxW: number;
  bboxH: number;
  cropBase64?: string;
  detectedBy: string;
  vehicleBox?: VehicleBBox;
}

export class BibRecognitionService {
  private worker: any = null;
  private isInitializing: boolean = false;

  private async getWorker() {
    if (this.worker) return this.worker;
    if (this.isInitializing) {
      while (this.isInitializing) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return this.worker;
    }

    this.isInitializing = true;
    try {
      console.log('[OCR] Initializing Tesseract.js Worker for Motorsport Dorsals...');
      const worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789'
      });
      this.worker = worker;
      console.log('[OCR] Worker initialized successfully.');
      return this.worker;
    } catch (err) {
      console.error('[OCR] Failed to initialize worker:', err);
      throw err;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Attempts external Python YOLO + PaddleOCR vision service if configured
   */
  private async tryExternalVisionService(imageBuffer: Buffer): Promise<BibCandidate[] | null> {
    const visionUrl = process.env.VISION_SERVICE_URL;
    if (!visionUrl) return null;

    try {
      const formData = new FormData();
      formData.append('file', new Blob([imageBuffer]), 'photo.jpg');

      const response = await fetch(`${visionUrl}/detect-vehicle-bibs`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(6000)
      });

      if (!response.ok) return null;
      const data: any = await response.json();
      if (Array.isArray(data.candidates) && data.candidates.length > 0) {
        return data.candidates.map((c: any) => ({
          bibNumber: String(c.bibNumber).trim(),
          confidence: Number(c.confidence) || 0.85,
          bboxX: Math.round(c.bbox?.x || 0),
          bboxY: Math.round(c.bbox?.y || 0),
          bboxW: Math.round(c.bbox?.w || 100),
          bboxH: Math.round(c.bbox?.h || 60),
          cropBase64: c.cropBase64,
          detectedBy: 'YOLO_PADDLEOCR'
        }));
      }
    } catch (e: any) {
      // External service unreachable or timed out; smoothly fallback to native vision
    }
    return null;
  }

  /**
   * Generates candidate vehicle and door ROIs from the image.
   * In motorsport photography, vehicles typically occupy prominent regions
   * (center, lower third, or lateral dynamic sweep).
   */
  private async extractVehicleRegionsOfInterest(
    imageBuffer: Buffer
  ): Promise<{ buffer: Buffer; region: { x: number; y: number; w: number; h: number; name: string } }[]> {
    const metadata = await sharp(imageBuffer).metadata();
    const origWidth = metadata.width || 1600;
    const origHeight = metadata.height || 1200;

    // Normalize processing base size for speed & consistent coordinates (max 1600px wide)
    const scale = Math.min(1, 1600 / origWidth);
    const workWidth = Math.round(origWidth * scale);
    const workHeight = Math.round(origHeight * scale);

    const resizedBuffer = await sharp(imageBuffer)
      .resize({ width: workWidth, height: workHeight, fit: 'inside', withoutEnlargement: true })
      .toBuffer();

    const rois: { buffer: Buffer; region: { x: number; y: number; w: number; h: number; name: string } }[] = [];

    // 1. Full normalized frame (catches large or full-bleed vehicle numbers)
    rois.push({
      buffer: resizedBuffer,
      region: { x: 0, y: 0, w: workWidth, h: workHeight, name: 'FULL_FRAME' }
    });

    // 2. Center vehicle body & door zone (where side numbers & plates most commonly sit)
    const centerCrop = {
      left: Math.round(workWidth * 0.15),
      top: Math.round(workHeight * 0.18),
      width: Math.round(workWidth * 0.70),
      height: Math.round(workHeight * 0.65)
    };
    try {
      const centerBuf = await sharp(resizedBuffer).extract(centerCrop).toBuffer();
      rois.push({
        buffer: centerBuf,
        region: { x: centerCrop.left, y: centerCrop.top, w: centerCrop.width, h: centerCrop.height, name: 'CENTER_BODY' }
      });
    } catch {}

    // 3. Left Door / Front Quarter (car traveling rightwards)
    const leftDoorCrop = {
      left: Math.round(workWidth * 0.08),
      top: Math.round(workHeight * 0.22),
      width: Math.round(workWidth * 0.45),
      height: Math.round(workHeight * 0.55)
    };
    try {
      const leftBuf = await sharp(resizedBuffer).extract(leftDoorCrop).toBuffer();
      rois.push({
        buffer: leftBuf,
        region: { x: leftDoorCrop.left, y: leftDoorCrop.top, w: leftDoorCrop.width, h: leftDoorCrop.height, name: 'LEFT_DOOR' }
      });
    } catch {}

    // 4. Right Door / Rear Quarter (car traveling leftwards)
    const rightDoorCrop = {
      left: Math.round(workWidth * 0.48),
      top: Math.round(workHeight * 0.22),
      width: Math.round(workWidth * 0.45),
      height: Math.round(workHeight * 0.55)
    };
    try {
      const rightBuf = await sharp(resizedBuffer).extract(rightDoorCrop).toBuffer();
      rois.push({
        buffer: rightBuf,
        region: { x: rightDoorCrop.left, y: rightDoorCrop.top, w: rightDoorCrop.width, h: rightDoorCrop.height, name: 'RIGHT_DOOR' }
      });
    } catch {}

    return rois;
  }

  /**
   * Prepares multi-pass image enhancement variants for OCR:
   * 1. Clean grayscale
   * 2. Grayscale with normalization and edge sharpening
   */
  private async prepareOcrVariants(roiBuffer: Buffer): Promise<Buffer[]> {
    const v1 = await sharp(roiBuffer)
      .grayscale()
      .toBuffer();

    const v2 = await sharp(roiBuffer)
      .grayscale()
      .normalize()
      .sharpen()
      .toBuffer();

    return [v1, v2];
  }

  /**
   * Generates a base64 thumbnail snippet of the detected bib box for visual admin review
   */
  private async generateCropBase64(imageBuffer: Buffer, bbox: { x: number; y: number; w: number; h: number }): Promise<string | undefined> {
    try {
      const meta = await sharp(imageBuffer).metadata();
      const imgW = meta.width || 1200;
      const imgH = meta.height || 800;

      // Add a 20% margin around the bounding box for context
      const marginX = Math.round(bbox.w * 0.25);
      const marginY = Math.round(bbox.h * 0.25);

      const left = Math.max(0, bbox.x - marginX);
      const top = Math.max(0, bbox.y - marginY);
      const width = Math.min(imgW - left, Math.max(30, bbox.w + marginX * 2));
      const height = Math.min(imgH - top, Math.max(20, bbox.h + marginY * 2));

      if (width < 10 || height < 10) return undefined;

      const cropBuf = await sharp(imageBuffer)
        .extract({ left, top, width, height })
        .resize({ width: 180, height: 120, fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();

      return `data:image/jpeg;base64,${cropBuf.toString('base64')}`;
    } catch {
      return undefined;
    }
  }

  /**
   * Detects car bib candidates in an image buffer using Vision AI + ROI Extraction + OCR
   */
  async detectBibsFromBuffer(imageBuffer: Buffer): Promise<BibCandidate[]> {
    // 1. Try external Python YOLO+PaddleOCR service first if configured
    const externalResults = await this.tryExternalVisionService(imageBuffer);
    if (externalResults && externalResults.length > 0) {
      console.log(`[Vision AI] External YOLO/PaddleOCR found ${externalResults.length} candidate(s).`);
      return externalResults;
    }

    // 2. Native Vision Pipeline: ROI detection + Multi-pass OCR
    const worker = await this.getWorker();
    const rois = await this.extractVehicleRegionsOfInterest(imageBuffer);
    const candidatesMap = new Map<string, BibCandidate>();

    const currentYear = new Date().getFullYear();
    const excludedNumbers = new Set([
      String(currentYear),
      String(currentYear - 1),
      String(currentYear - 2),
      String(currentYear + 1),
      '1920', '1080', '1600', '1200', '2000', '3000', '4000', '5184', '3456'
    ]);

    for (const roi of rois) {
      const variants = await this.prepareOcrVariants(roi.buffer);

      for (const varBuf of variants) {
        try {
          const ret = await worker.recognize(varBuf);
          const data = ret.data as any;
          const words = data.words || [];

          for (const w of words) {
            const rawText = (w.text || '').trim();
            const cleanDigits = rawText.replace(/[^0-9]/g, '');

            // Motorsports bibs are strictly 1, 2, or 3 digits
            if (!cleanDigits || cleanDigits.length < 1 || cleanDigits.length > 3) {
              continue;
            }

            const normalizedBib = cleanDigits.replace(/^0+/, '');
            if (!normalizedBib || normalizedBib === '0') continue;
            if (excludedNumbers.has(normalizedBib)) continue;

            const confRaw = (w.confidence || 0) / 100;
            if (confRaw < 0.35) continue; // Noise cutoff

            // Calculate absolute bounding box in original image
            const b = w.bbox || { x0: 0, y0: 0, x1: 50, y1: 30 };
            const absX = roi.region.x + (b.x0 || 0);
            const absY = roi.region.y + (b.y0 || 0);
            const absW = Math.max(20, (b.x1 || 0) - (b.x0 || 0));
            const absH = Math.max(15, (b.y1 || 0) - (b.y0 || 0));

            // Heuristic aspect ratio check (a race number is not an ultra-thin line)
            const aspectRatio = absW / absH;
            if (aspectRatio < 0.25 || aspectRatio > 4.5) continue;

            const candidate: BibCandidate = {
              bibNumber: normalizedBib,
              confidence: Math.round(confRaw * 100) / 100,
              bboxX: absX,
              bboxY: absY,
              bboxW: absW,
              bboxH: absH,
              detectedBy: 'VISION_PIPELINE'
            };

            const existing = candidatesMap.get(normalizedBib);
            if (!existing || existing.confidence < candidate.confidence) {
              candidatesMap.set(normalizedBib, candidate);
            }
          }

          // Full text & token parsing fallback to ensure numbers split across words or blocks are detected
          if (data.text) {
            const tokens = (data.text as string).split(/\s+/);
            for (const tok of tokens) {
              const cleanDigits = tok.replace(/[^0-9]/g, '');
              if (cleanDigits && cleanDigits.length >= 1 && cleanDigits.length <= 3) {
                const normalizedBib = cleanDigits.replace(/^0+/, '');
                if (normalizedBib && normalizedBib !== '0' && !excludedNumbers.has(normalizedBib)) {
                  const conf = Math.max(0.78, (data.confidence || 80) / 100);
                  const existing = candidatesMap.get(normalizedBib);
                  if (!existing) {
                    candidatesMap.set(normalizedBib, {
                      bibNumber: normalizedBib,
                      confidence: Math.round(conf * 100) / 100,
                      bboxX: roi.region.x + Math.round(roi.region.w * 0.2),
                      bboxY: roi.region.y + Math.round(roi.region.h * 0.2),
                      bboxW: Math.round(roi.region.w * 0.6),
                      bboxH: Math.round(roi.region.h * 0.6),
                      detectedBy: 'VISION_PIPELINE'
                    });
                  }
                }
              }
            }
          }
        } catch (err) {
          // Continue scanning other variants/ROIs
        }
      }
    }

    const finalCandidates = Array.from(candidatesMap.values());

    // Generate visual crop previews for candidates
    for (const cand of finalCandidates) {
      cand.cropBase64 = await this.generateCropBase64(imageBuffer, {
        x: cand.bboxX,
        y: cand.bboxY,
        w: cand.bboxW,
        h: cand.bboxH
      });
    }

    return finalCandidates;
  }

  /**
   * Processes a photo and persists detections in database with configured thresholds
   */
  async processAndSavePhotoBibs(photoId: string, imageBuffer?: Buffer) {
    try {
      console.log(`[Vision AI] Starting vehicle & bib processing for photo: ${photoId}`);

      // If buffer not provided, read from storage
      let buffer = imageBuffer;
      if (!buffer) {
        const photo = await prisma.photo.findUnique({ where: { id: photoId } });
        if (!photo) throw new Error(`Photo ${photoId} not found`);

        const filePath = storageService.getOriginalPath(path.basename(photo.storageKeyOriginal));
        if (!fs.existsSync(filePath)) {
          // Fallback to preview if original is missing
          const previewPath = storageService.getPreviewPath(path.basename(photo.storageKeyPreview));
          if (!fs.existsSync(previewPath)) {
            throw new Error(`File not found on disk for photo ${photoId}`);
          }
          buffer = fs.readFileSync(previewPath);
        } else {
          buffer = fs.readFileSync(filePath);
        }
      }

      // Mark photo as PROCESSING
      await prisma.photo.update({
        where: { id: photoId },
        data: { ocrStatus: 'PROCESSING', ocrError: null }
      });

      // Load configurable thresholds from DB
      const confirmedSetting = await prisma.systemSetting.findUnique({ where: { key: 'ocr_confirmed_threshold' } });
      const detectedSetting = await prisma.systemSetting.findUnique({ where: { key: 'ocr_detected_threshold' } });

      const CONFIRMED_THRESHOLD = confirmedSetting ? parseFloat(confirmedSetting.value) : 0.70;
      const DETECTED_THRESHOLD = detectedSetting ? parseFloat(detectedSetting.value) : 0.35;

      const candidates = await this.detectBibsFromBuffer(buffer);

      // Clean existing auto-detected bibs for this photo (preserving MANUAL ones)
      await prisma.bibDetection.deleteMany({
        where: {
          photoId,
          status: { in: ['DETECTED', 'CONFIRMED'] },
          detectedBy: { not: 'MANUAL' }
        }
      });

      if (candidates.length === 0) {
        console.log(`[Vision AI] No dorsal found in photo: ${photoId}`);
        await prisma.photo.update({
          where: { id: photoId },
          data: { ocrStatus: 'COMPLETED' }
        });
        return [];
      }

      const results = [];
      for (const cand of candidates) {
        // Classify status based on thresholds
        let status = 'DETECTED';
        if (cand.confidence >= CONFIRMED_THRESHOLD) {
          status = 'CONFIRMED';
        } else if (cand.confidence < DETECTED_THRESHOLD) {
          continue; // Discard sub-threshold noise
        }

        const record = await prisma.bibDetection.create({
          data: {
            photoId,
            bibNumber: cand.bibNumber,
            confidence: cand.confidence,
            bboxX: cand.bboxX,
            bboxY: cand.bboxY,
            bboxW: cand.bboxW,
            bboxH: cand.bboxH,
            cropBase64: cand.cropBase64,
            status,
            detectedBy: cand.detectedBy
          }
        });
        results.push(record);
        console.log(`[Vision AI] Associated dorsal #${cand.bibNumber} (${status}, conf: ${cand.confidence}) to photo ${photoId}`);
      }

      await prisma.photo.update({
        where: { id: photoId },
        data: { ocrStatus: 'COMPLETED' }
      });

      return results;
    } catch (err: any) {
      console.error(`[Vision AI] Error processing bibs for photo ${photoId}:`, err);
      await prisma.photo.update({
        where: { id: photoId },
        data: { ocrStatus: 'FAILED', ocrError: err.message || 'Unknown OCR error' }
      }).catch(() => {});
      return [];
    }
  }

  async close() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

export const bibRecognitionService = new BibRecognitionService();
