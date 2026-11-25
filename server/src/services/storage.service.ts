import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { config } from '../config.js';

class StorageService {
  private baseDir: string;
  private s3Client: S3Client | null = null;
  private isS3: boolean = false;

  constructor() {
    this.baseDir = config.uploadDir;
    this.ensureLocalDirectories();

    if (config.storageDriver === 's3' && config.s3.isConfigured) {
      try {
        this.s3Client = new S3Client({
          region: config.s3.region,
          endpoint: config.s3.endpoint || undefined, // For Cloudflare R2 or MinIO
          credentials: {
            accessKeyId: config.s3.accessKeyId,
            secretAccessKey: config.s3.secretAccessKey
          },
          forcePathStyle: !!config.s3.endpoint
        });
        this.isS3 = true;
        console.log(`[Storage] Cloud storage driver active (S3 / R2 Bucket: ${config.s3.bucket})`);
      } catch (err: any) {
        console.warn(`[Storage] Failed to initialize S3 client. Falling back to local storage:`, err.message);
        this.isS3 = false;
      }
    } else {
      this.isS3 = false;
    }
  }

  private ensureLocalDirectories() {
    const dirs = ['originals', 'watermarked', 'previews', 'thumbnails'];
    for (const d of dirs) {
      const fullPath = path.join(this.baseDir, d);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }
  }

  getOriginalPath(filename: string): string {
    return path.join(this.baseDir, 'originals', path.basename(filename));
  }

  getWatermarkedPath(filename: string): string {
    return path.join(this.baseDir, 'watermarked', path.basename(filename));
  }

  getPreviewPath(filename: string): string {
    return path.join(this.baseDir, 'previews', path.basename(filename));
  }

  getThumbnailPath(filename: string): string {
    return path.join(this.baseDir, 'thumbnails', path.basename(filename));
  }

  async saveOriginal(filename: string, buffer: Buffer): Promise<string> {
    const cleanFilename = path.basename(filename);
    const localPath = this.getOriginalPath(cleanFilename);
    await fs.promises.writeFile(localPath, buffer);

    if (this.isS3 && this.s3Client) {
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: config.s3.bucket,
            Key: `originals/${cleanFilename}`,
            Body: buffer,
            ContentType: 'image/jpeg',
            ServerSideEncryption: 'AES256'
          })
        );
      } catch (err: any) {
        console.error(`[Storage S3] Failed to upload original ${cleanFilename} to S3:`, err.message);
      }
    }

    return cleanFilename;
  }

  async readOriginal(filename: string): Promise<Buffer> {
    const cleanFilename = path.basename(filename);
    const localPath = this.getOriginalPath(cleanFilename);

    if (fs.existsSync(localPath)) {
      return await fs.promises.readFile(localPath);
    }

    // Fallback to S3 if local cache missing
    if (this.isS3 && this.s3Client) {
      const resp = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: config.s3.bucket,
          Key: `originals/${cleanFilename}`
        })
      );
      const stream = resp.Body as Readable;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const fullBuf = Buffer.concat(chunks);
      // Cache locally
      await fs.promises.writeFile(localPath, fullBuf).catch(() => {});
      return fullBuf;
    }

    throw new Error(`Archivo original ${cleanFilename} no disponible en almacenamiento`);
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
      filenames.thumbnail ? this.getThumbnailPath(filenames.thumbnail) : null
    ];

    for (const k of keys) {
      if (k && fs.existsSync(k)) {
        try {
          await fs.promises.unlink(k);
        } catch (e) {
          console.error(`[Storage] Failed to delete local file ${k}:`, e);
        }
      }
    }

    if (this.isS3 && this.s3Client) {
      const s3Keys: string[] = [
        `originals/${path.basename(filenames.original)}`,
        filenames.watermarked ? `watermarked/${path.basename(filenames.watermarked)}` : null,
        filenames.preview ? `previews/${path.basename(filenames.preview)}` : null,
        filenames.thumbnail ? `thumbnails/${path.basename(filenames.thumbnail)}` : null
      ].filter(Boolean) as string[];

      try {
        await this.s3Client.send(
          new DeleteObjectsCommand({
            Bucket: config.s3.bucket,
            Delete: { Objects: s3Keys.map((Key) => ({ Key })) }
          })
        );
      } catch (err: any) {
        console.error('[Storage S3] Failed to delete objects from S3 bucket:', err.message);
      }
    }
  }

  isCloudConfigured(): boolean {
    return this.isS3;
  }
}

export const storageService = new StorageService();
