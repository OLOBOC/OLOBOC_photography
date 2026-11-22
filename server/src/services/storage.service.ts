import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

class StorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = config.uploadDir;
    this.ensureDirectories();
  }

  private ensureDirectories() {
    const dirs = ['originals', 'watermarked', 'previews', 'thumbnails'];
    for (const d of dirs) {
      const fullPath = path.join(this.baseDir, d);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }
  }

  getOriginalPath(filename: string): string {
    return path.join(this.baseDir, 'originals', filename);
  }

  getWatermarkedPath(filename: string): string {
    return path.join(this.baseDir, 'watermarked', filename);
  }

  getPreviewPath(filename: string): string {
    return path.join(this.baseDir, 'previews', filename);
  }

  getThumbnailPath(filename: string): string {
    return path.join(this.baseDir, 'thumbnails', filename);
  }

  async saveOriginal(filename: string, buffer: Buffer): Promise<string> {
    const filePath = this.getOriginalPath(filename);
    await fs.promises.writeFile(filePath, buffer);
    return filename;
  }

  async readOriginal(filename: string): Promise<Buffer> {
    const filePath = this.getOriginalPath(filename);
    return await fs.promises.readFile(filePath);
  }

  async deletePhotoFiles(filenames: {
    original: string;
    watermarked?: string;
    preview?: string;
    thumbnail?: string;
  }) {
    const keys = [
      this.getOriginalPath(filenames.original),
      filenames.watermarked ? this.getWatermarkedPath(filenames.watermarked) : null,
      filenames.preview ? this.getPreviewPath(filenames.preview) : null,
      filenames.thumbnail ? this.getThumbnailPath(filenames.thumbnail) : null,
    ];

    for (const k of keys) {
      if (k && fs.existsSync(k)) {
        try {
          await fs.promises.unlink(k);
        } catch (e) {
          console.error(`[Storage] Failed to delete file ${k}:`, e);
        }
      }
    }
  }
}

export const storageService = new StorageService();
