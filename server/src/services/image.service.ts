import sharp from 'sharp';
import { storageService } from './storage.service.js';
import { config } from '../config.js';

export interface ProcessedPhotoVariants {
  width: number;
  height: number;
  mimeType: string;
  sizeBytes: number;
  originalFilename: string;
  storageKeyOriginal: string;
  storageKeyWatermarked: string;
  storageKeyPreview: string;
  storageKeyThumbnail: string;
}

export class ImageService {
  /**
   * Generates a repeating diagonal SVG watermark overlay matching the OLOBOC_ brand
   */
  private generateWatermarkSvg(width: number, height: number, text: string = 'OLOBOC_'): Buffer {
    const spacingX = Math.max(220, Math.floor(width / 4));
    const spacingY = Math.max(160, Math.floor(height / 4));
    const opacity = config.watermark.opacity;
    const angle = config.watermark.angle;

    let textNodes = '';
    for (let y = -spacingY; y <= height + spacingY * 2; y += spacingY) {
      for (let x = -spacingX; x <= width + spacingX * 2; x += spacingX) {
        textNodes += `<text x="${x}" y="${y}" transform="rotate(${angle} ${x} ${y})" font-family="monospace, sans-serif" font-weight="900" font-size="34" letter-spacing="4" fill="#ffffff" fill-opacity="${opacity}" text-anchor="middle">${text}</text>`;
      }
    }

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <style>
          text { user-select: none; }
        </style>
        ${textNodes}
      </svg>
    `;

    return Buffer.from(svg);
  }

  /**
   * Processes an uploaded motorsport photo:
   * 1. Extracts metadata
   * 2. Saves pristine original privately
   * 3. Creates watermarked preview (1600px max)
   * 4. Creates crisp thumbnail (450px max)
   */
  async processUpload(
    fileBuffer: Buffer,
    originalName: string,
    fileId: string,
    watermarkText?: string
  ): Promise<ProcessedPhotoVariants> {
    const image = sharp(fileBuffer);
    const metadata = await image.metadata();

    const width = metadata.width || 1920;
    const height = metadata.height || 1080;
    const mimeType = metadata.format ? `image/${metadata.format}` : 'image/jpeg';
    const sizeBytes = fileBuffer.length;

    const originalKey = `${fileId}-original.jpg`;
    const watermarkedKey = `${fileId}-watermarked.jpg`;
    const previewKey = `${fileId}-preview.webp`;
    const thumbnailKey = `${fileId}-thumb.webp`;

    // 1. Save original securely
    await storageService.saveOriginal(originalKey, fileBuffer);

    // 2. Generate Watermark Overlay
    const watermarkSvg = this.generateWatermarkSvg(width, height, watermarkText || config.watermark.text);

    // 3. Full-res watermarked derivative
    const watermarkedBuffer = await sharp(fileBuffer)
      .composite([{ input: watermarkSvg, blend: 'over' }])
      .jpeg({ quality: 86 })
      .toBuffer();

    const watermarkedPath = storageService.getWatermarkedPath(watermarkedKey);
    await sharp(watermarkedBuffer).toFile(watermarkedPath);

    // 4. Preview variant (max 1600px width/height, WebP optimized)
    let previewW = width;
    let previewH = height;
    if (width > 1600 || height > 1600) {
      if (width >= height) {
        previewW = 1600;
        previewH = Math.round((height / width) * 1600);
      } else {
        previewH = 1600;
        previewW = Math.round((width / height) * 1600);
      }
    }

    const previewWatermark = this.generateWatermarkSvg(
      previewW,
      previewH,
      watermarkText || config.watermark.text
    );

    const previewPath = storageService.getPreviewPath(previewKey);
    await sharp(fileBuffer)
      .resize(previewW, previewH)
      .composite([{ input: previewWatermark, blend: 'over' }])
      .webp({ quality: 82 })
      .toFile(previewPath);

    // 5. Thumbnail variant (max 450px width, WebP)
    const thumbnailPath = storageService.getThumbnailPath(thumbnailKey);
    await sharp(fileBuffer)
      .resize({ width: 450, height: 450, fit: 'cover' })
      .webp({ quality: 80 })
      .toFile(thumbnailPath);

    return {
      width,
      height,
      mimeType,
      sizeBytes,
      originalFilename: originalName,
      storageKeyOriginal: originalKey,
      storageKeyWatermarked: watermarkedKey,
      storageKeyPreview: previewKey,
      storageKeyThumbnail: thumbnailKey,
    };
  }
}

export const imageService = new ImageService();
