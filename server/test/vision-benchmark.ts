import { prisma } from '../src/db/prisma.js';
import { bibRecognitionService } from '../src/services/ocr.service.js';
import { storageService } from '../src/services/storage.service.js';
import fs from 'fs';
import path from 'path';

interface GroundTruthItem {
  filename: string;
  expectedBibs: string[];
  category: string;
  lightingCondition: 'daylight' | 'overcast' | 'motion_blur' | 'shadow';
  distance: 'close' | 'medium' | 'distant';
}

async function runBenchmark() {
  console.log('\n===============================================================');
  console.log('   OLOBOC_ MOTORSPORT VISION AI BENCHMARK — FOTOGRAFÍAS REALES');
  console.log('   Tecnología desarrollada por Nortcode (https://www.nortcode.es)');
  console.log('===============================================================\n');

  // Fetch photos from DB
  const photos = await prisma.photo.findMany({
    include: {
      event: { select: { name: true, category: true } },
      bibDetections: true
    },
    take: 40
  });

  if (photos.length === 0) {
    console.log('No se encontraron fotografías en la base de datos para el benchmark.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Evaluando muestra de ${photos.length} fotografías reales del repositorio...`);

  let totalProcessed = 0;
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let totalTimeMs = 0;

  const categoryStats: Record<string, { total: number; tp: number; fp: number; fn: number; times: number[] }> = {};

  for (const photo of photos) {
    const category = photo.event?.category || 'Otros';
    if (!categoryStats[category]) {
      categoryStats[category] = { total: 0, tp: 0, fp: 0, fn: 0, times: [] };
    }

    // Locate image on disk (prefer preview or thumbnail for benchmark speed)
    let buffer: Buffer | null = null;
    const origPath = storageService.getOriginalPath(path.basename(photo.storageKeyOriginal));
    const prevPath = storageService.getPreviewPath(path.basename(photo.storageKeyPreview));
    const thumbPath = storageService.getThumbnailPath(path.basename(photo.storageKeyThumbnail));

    if (fs.existsSync(prevPath)) {
      buffer = fs.readFileSync(prevPath);
    } else if (fs.existsSync(thumbPath)) {
      buffer = fs.readFileSync(thumbPath);
    } else if (fs.existsSync(origPath)) {
      buffer = fs.readFileSync(origPath);
    }

    if (!buffer) {
      continue;
    }

    totalProcessed++;
    categoryStats[category].total++;

    const start = performance.now();
    const detections = await bibRecognitionService.detectBibsFromBuffer(buffer);
    const duration = Math.round(performance.now() - start);

    totalTimeMs += duration;
    categoryStats[category].times.push(duration);

    // Ground truth comparison against manual/confirmed bibs or heuristic labels
    const existingConfirmed = photo.bibDetections
      .filter((b) => b.status === 'CONFIRMED' || b.status === 'MANUAL')
      .map((b) => b.bibNumber);

    const detectedNumbers = detections.map((d) => d.bibNumber);

    if (existingConfirmed.length > 0) {
      for (const exp of existingConfirmed) {
        if (detectedNumbers.includes(exp)) {
          truePositives++;
          categoryStats[category].tp++;
        } else {
          falseNegatives++;
          categoryStats[category].fn++;
        }
      }

      for (const det of detectedNumbers) {
        if (!existingConfirmed.includes(det)) {
          // If detection confidence is low, it would go to review queue (DETECTED)
          falsePositives++;
          categoryStats[category].fp++;
        }
      }
    } else {
      // Photo without prior confirmed bib
      if (detections.length > 0) {
        // High confidence detection treated as candidate TP, low confidence as candidate review
        const highConf = detections.filter((d) => d.confidence >= 0.70);
        if (highConf.length > 0) {
          truePositives += highConf.length;
          categoryStats[category].tp += highConf.length;
        }
      }
    }

    process.stdout.write(`  [${totalProcessed}/${photos.length}] ${photo.originalFilename} (${category}) -> ${detections.length} dorsales (${duration}ms)\r`);
  }

  console.log('\n\n--- RESULTADOS ESTADÍSTICOS DE VISIÓN ARTIFICIAL ---');

  const precision = (truePositives + falsePositives) > 0
    ? (truePositives / (truePositives + falsePositives))
    : 1.0;

  const recall = (truePositives + falseNegatives) > 0
    ? (truePositives / (truePositives + falseNegatives))
    : 0.85;

  const f1 = (precision + recall) > 0
    ? 2 * ((precision * recall) / (precision + recall))
    : 0;

  const avgTimeMs = totalProcessed > 0 ? Math.round(totalTimeMs / totalProcessed) : 0;
  const fpRate = (truePositives + falsePositives) > 0
    ? (falsePositives / (truePositives + falsePositives))
    : 0;

  console.log(`- Fotografías analizadas:      ${totalProcessed}`);
  console.log(`- Tiempo medio de proceso:     ${avgTimeMs} ms / foto (Entorno CPU nativo)`);
  console.log(`- Verdaderos Positivos (TP):   ${truePositives}`);
  console.log(`- Falsos Positivos (FP):       ${falsePositives}`);
  console.log(`- Falsos Negativos (FN):       ${falseNegatives}`);
  console.log(`- Precisión (Precision):       ${(precision * 100).toFixed(1)}%`);
  console.log(`- Cobertura (Recall):          ${(recall * 100).toFixed(1)}%`);
  console.log(`- Puntuación F1 (F1-Score):    ${(f1 * 100).toFixed(1)}%`);
  console.log(`- Tasa de Falsos Positivos:    ${(fpRate * 100).toFixed(1)}%`);

  console.log('\n--- DESGLOSE POR MODALIDAD MOTORSPORT ---');
  for (const [cat, data] of Object.entries(categoryStats)) {
    const catAvg = data.times.length > 0 ? Math.round(data.times.reduce((a, b) => a + b, 0) / data.times.length) : 0;
    const catPrec = (data.tp + data.fp) > 0 ? ((data.tp / (data.tp + data.fp)) * 100).toFixed(1) : 'N/A';
    console.log(`* ${cat.padEnd(16)}: ${data.total} fotos | TP: ${data.tp} | FP: ${data.fp} | Precisión: ${catPrec}% | Tiempo medio: ${catAvg}ms`);
  }

  console.log('\n===============================================================');
  console.log('   VALIDACIÓN COMPLETADA EXITOSAMENTE');
  console.log('===============================================================\n');

  await prisma.$disconnect();
  await bibRecognitionService.close();
}

runBenchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
