import { prisma } from '../db/prisma.js';
import { bibRecognitionService } from './ocr.service.js';

export interface QueueJob {
  photoId: string;
  eventId: string;
  buffer?: Buffer;
  retries: number;
  addedAt: Date;
}

export class OcrQueueService {
  private queue: QueueJob[] = [];
  private activeJobs: Set<string> = new Set();
  private maxConcurrency: number = 2; // Controlled CPU-friendly concurrency
  private isPaused: boolean = false;
  private isProcessingLoopActive: boolean = false;

  constructor() {
    this.init();
  }

  private async init() {
    // Resume any photos left in QUEUED or PROCESSING state (e.g. after server restart)
    try {
      const interruptedPhotos = await prisma.photo.findMany({
        where: { ocrStatus: { in: ['QUEUED', 'PROCESSING'] } },
        select: { id: true, eventId: true }
      });

      for (const p of interruptedPhotos) {
        this.enqueue(p.id, p.eventId);
      }

      if (interruptedPhotos.length > 0) {
        console.log(`[Queue] Resumed ${interruptedPhotos.length} interrupted OCR job(s) from database.`);
      }
    } catch (e) {
      console.warn('[Queue] Failed checking interrupted jobs during startup:', e);
    }
  }

  /**
   * Enqueues a single photo for vision processing
   */
  async enqueue(photoId: string, eventId: string, buffer?: Buffer) {
    // Avoid double queueing
    if (this.queue.some((j) => j.photoId === photoId) || this.activeJobs.has(photoId)) {
      return;
    }

    await prisma.photo.update({
      where: { id: photoId },
      data: { ocrStatus: 'QUEUED', ocrError: null }
    }).catch(() => {});

    this.queue.push({
      photoId,
      eventId,
      buffer,
      retries: 0,
      addedAt: new Date()
    });

    this.triggerProcessing();
  }

  /**
   * Enqueues all photos of an event for batch recognition
   */
  async enqueueEvent(eventId: string, forceAll: boolean = false): Promise<{ queuedCount: number }> {
    const where: any = { eventId };
    if (!forceAll) {
      // Only process photos not yet completed or failed
      where.ocrStatus = { in: ['QUEUED', 'FAILED', 'PROCESSING'] };
    }

    const photos = await prisma.photo.findMany({
      where,
      select: { id: true, eventId: true }
    });

    for (const p of photos) {
      await this.enqueue(p.id, p.eventId);
    }

    return { queuedCount: photos.length };
  }

  /**
   * Main processing loop executing with controlled concurrency
   */
  private async triggerProcessing() {
    if (this.isProcessingLoopActive) return;
    this.isProcessingLoopActive = true;

    try {
      while (!this.isPaused && this.queue.length > 0 && this.activeJobs.size < this.maxConcurrency) {
        const job = this.queue.shift();
        if (!job) break;

        this.activeJobs.add(job.photoId);
        this.processJob(job);
      }
    } finally {
      this.isProcessingLoopActive = false;
    }
  }

  private async processJob(job: QueueJob) {
    try {
      await bibRecognitionService.processAndSavePhotoBibs(job.photoId, job.buffer);
    } catch (err: any) {
      console.error(`[Queue] Error processing job for photo ${job.photoId}:`, err);

      if (job.retries < 2) {
        job.retries += 1;
        console.log(`[Queue] Re-queueing photo ${job.photoId} (retry ${job.retries}/2)...`);
        this.queue.push(job);
      } else {
        await prisma.photo.update({
          where: { id: job.photoId },
          data: { ocrStatus: 'FAILED', ocrError: err.message || 'Error processing photo' }
        }).catch(() => {});
      }
    } finally {
      this.activeJobs.delete(job.photoId);
      // Trigger next job in queue
      this.triggerProcessing();
    }
  }

  /**
   * Returns current processing progress for an event
   */
  async getEventProgress(eventId: string) {
    const [total, queued, processing, completed, failed, bibsCount] = await Promise.all([
      prisma.photo.count({ where: { eventId } }),
      prisma.photo.count({ where: { eventId, ocrStatus: 'QUEUED' } }),
      prisma.photo.count({ where: { eventId, ocrStatus: 'PROCESSING' } }),
      prisma.photo.count({ where: { eventId, ocrStatus: 'COMPLETED' } }),
      prisma.photo.count({ where: { eventId, ocrStatus: 'FAILED' } }),
      prisma.bibDetection.count({ where: { photo: { eventId }, status: { in: ['CONFIRMED', 'DETECTED'] } } })
    ]);

    const isRunning = queued > 0 || processing > 0;
    const progressPercent = total > 0 ? Math.round(((completed + failed) / total) * 100) : 100;

    return {
      total,
      queued,
      processing,
      completed,
      failed,
      bibsCount,
      progressPercent,
      isRunning
    };
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
    this.triggerProcessing();
  }

  getStats() {
    return {
      queueLength: this.queue.length,
      activeWorkers: this.activeJobs.size,
      maxConcurrency: this.maxConcurrency,
      isPaused: this.isPaused
    };
  }
}

export const ocrQueueService = new OcrQueueService();
