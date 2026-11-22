import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import { prisma } from '../db/prisma.js';

export interface BibCandidate {
  bibNumber: string;
  confidence: number;
  bboxX: number;
  bboxY: number;
  bboxW: number;
  bboxH: number;
  detectedBy: string;
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
      console.log('[OCR] Initializing Tesseract.js Worker with digit whitelist...');
      const worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789',
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
   * Preprocess motorsport photo for dorsal detection:
   * 1. Original/Grayscale buffer
   * 2. High-contrast normalization & threshold
   * 3. Multiple image enhancements to catch numbers on light/dark door backgrounds
   */
  private async prepareImageVariants(imageBuffer: Buffer): Promise<Buffer[]> {
    // 1. Clean grayscale standard
    const b1 = await sharp(imageBuffer)
      .resize({ width: 1200, fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .toBuffer();

    // 2. Grayscale with normalize and sharpen
    const b2 = await sharp(imageBuffer)
      .resize({ width: 1200, fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .normalize()
      .sharpen()
      .toBuffer();

    return [b1, b2];
  }

  /**
   * Run real OCR recognition on image buffer
   */
  async detectBibsFromBuffer(imageBuffer: Buffer): Promise<BibCandidate[]> {
    const worker = await this.getWorker();
    const variants = await this.prepareImageVariants(imageBuffer);
    const candidatesMap = new Map<string, BibCandidate>();

    const currentYear = new Date().getFullYear();
    const excludedNumbers = new Set([
      String(currentYear),
      String(currentYear - 1),
      String(currentYear - 2),
      String(currentYear + 1),
      '1920', '1080', '1600', '1200', '2000', '3000', '4000'
    ]);

    for (const buf of variants) {
      try {
        const ret = await worker.recognize(buf);
        const data = ret.data as any;
        const words = data.words || [];

        // Check individual words
        for (const w of words) {
          const rawText = (w.text || '').trim();
          const cleanDigits = rawText.replace(/[^0-9]/g, '');

          if (!cleanDigits || cleanDigits.length < 1 || cleanDigits.length > 3) {
            continue;
          }

          const normalizedBib = cleanDigits.replace(/^0+/, '') || '0';
          if (excludedNumbers.has(normalizedBib)) continue;

          const confidence = (w.confidence || 0) / 100;
          if (confidence < 0.40) continue;

          const bbox = w.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 };
          const candidate: BibCandidate = {
            bibNumber: normalizedBib,
            confidence: Math.round(confidence * 100) / 100,
            bboxX: bbox.x0 || 0,
            bboxY: bbox.y0 || 0,
            bboxW: Math.max(0, (bbox.x1 || 0) - (bbox.x0 || 0)),
            bboxH: Math.max(0, (bbox.y1 || 0) - (bbox.y0 || 0)),
            detectedBy: 'TESSERACT_OCR'
          };

          const existing = candidatesMap.get(normalizedBib);
          if (!existing || existing.confidence < candidate.confidence) {
            candidatesMap.set(normalizedBib, candidate);
          }
        }

        // If words yielded nothing but full text has clean digits (e.g. single number in image)
        if (candidatesMap.size === 0 && data.text) {
          const textDigits = (data.text || '').replace(/[^0-9]/g, '').trim();
          if (textDigits && textDigits.length >= 1 && textDigits.length <= 3) {
            const normalizedBib = textDigits.replace(/^0+/, '') || '0';
            if (!excludedNumbers.has(normalizedBib)) {
              const confidence = (data.confidence || 70) / 100;
              candidatesMap.set(normalizedBib, {
                bibNumber: normalizedBib,
                confidence: Math.round(confidence * 100) / 100,
                bboxX: 0,
                bboxY: 0,
                bboxW: 100,
                bboxH: 100,
                detectedBy: 'TESSERACT_OCR'
              });
            }
          }
        }
      } catch (err) {
        console.error('[OCR] Error during variant recognition:', err);
      }
    }

    return Array.from(candidatesMap.values());
  }

  /**
   * Processes a photo and persists detections in database
   */
  async processAndSavePhotoBibs(photoId: string, imageBuffer: Buffer) {
    try {
      console.log(`[OCR] Starting bib detection for photo: ${photoId}`);
      const candidates = await this.detectBibsFromBuffer(imageBuffer);

      if (candidates.length === 0) {
        console.log(`[OCR] No dorsal detected with sufficient confidence in photo: ${photoId}`);
        return [];
      }

      const results = [];
      for (const cand of candidates) {
        // High confidence (>= 0.75) vs moderate confidence requiring review
        const status = cand.confidence >= 0.75 ? 'CONFIRMED' : 'DETECTED';

        const record = await prisma.bibDetection.create({
          data: {
            photoId,
            bibNumber: cand.bibNumber,
            confidence: cand.confidence,
            bboxX: cand.bboxX,
            bboxY: cand.bboxY,
            bboxW: cand.bboxW,
            bboxH: cand.bboxH,
            status,
            detectedBy: cand.detectedBy
          }
        });
        results.push(record);
        console.log(`[OCR] Associated dorsal #${cand.bibNumber} (conf: ${cand.confidence}, status: ${status}) to photo: ${photoId}`);
      }

      return results;
    } catch (err) {
      console.error(`[OCR] Failed processing bibs for photo ${photoId}:`, err);
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
