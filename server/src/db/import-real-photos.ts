import { prisma } from './prisma.js';
import { imageService } from '../services/image.service.js';
import { bibRecognitionService } from '../services/ocr.service.js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface EventFolderMapping {
  slug: string;
  name: string;
  folderPath: string;
  category: string;
  location: string;
  date: string;
  season: number;
  description: string;
  maxPhotos: number;
}

const MAPPINGS: EventFolderMapping[] = [
  {
    slug: 'rallysprint-de-pravia-2026',
    name: 'Rallysprint de Pravia',
    folderPath: 'h:/OLOBOC_FOTOGRAFIA/img/EDITADAS',
    category: 'Rallysprint',
    location: 'Pravia, Asturias',
    date: '2026-05-16',
    season: 2026,
    description: 'Velocidad, curvas cerradas y asfalto técnico en las carreteras del valle del Nalón. Cobertura de las tres mangas oficiales.',
    maxPhotos: 20
  },
  {
    slug: 'rally-de-asturias-historico-2026',
    name: 'Rally de Asturias Histórico',
    folderPath: 'h:/OLOBOC_FOTOGRAFIA/img/editadas copy',
    category: 'Rally',
    location: 'Oviedo, Asturias',
    date: '2026-04-11',
    season: 2026,
    description: 'Vehículos legendarios compitiendo en tramos míticos de montaña bajo lluvia y niebla asturiana.',
    maxPhotos: 25
  },
  {
    slug: 'driftspain-2025',
    name: 'Motorsport Sessions & Drift',
    folderPath: 'h:/OLOBOC_FOTOGRAFIA/img/editadas_',
    category: 'Drift',
    location: 'Circuito, España',
    date: '2025-10-18',
    season: 2025,
    description: 'Ángulos imposibles, humo de neumáticos y sesiones nocturnas con iluminación cinematográfica.',
    maxPhotos: 20
  },
  {
    slug: 'rallysprint-de-la-montana-2026',
    name: 'Rallysprint de la Montaña',
    folderPath: 'h:/OLOBOC_FOTOGRAFIA/img/editadas_ copy',
    category: 'Rallysprint',
    location: 'Cantabria',
    date: '2026-03-07',
    season: 2026,
    description: 'Trazado vertiginoso en desnivel con horquillas extremas y apoyo masivo del público motor.',
    maxPhotos: 20
  }
];

// Helper to extract all jpg files in a folder recursively
function getJpgFiles(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(getJpgFiles(full));
    } else if (item.toLowerCase().endsWith('.jpg') || item.toLowerCase().endsWith('.jpeg')) {
      results.push(full);
    }
  }
  return results;
}

async function importRealPhotos() {
  console.log('====================================================');
  console.log('  IMPORTANDO FOTOGRAFÍAS REALES DE MOTORSPORT OLOBOC_');
  console.log('====================================================\n');

  // Clear previous simulated demo photos from database if any
  const previousSimulated = await prisma.photo.findMany({
    where: {
      originalFilename: { contains: 'Audi Sport Quattro' }
    }
  });
  if (previousSimulated.length > 0) {
    console.log(`Eliminando ${previousSimulated.length} fotos sintéticas previas...`);
    await prisma.bibDetection.deleteMany({
      where: { photoId: { in: previousSimulated.map(p => p.id) } }
    });
    await prisma.photo.deleteMany({
      where: { id: { in: previousSimulated.map(p => p.id) } }
    });
  }

  let totalImported = 0;

  for (const m of MAPPINGS) {
    console.log(`\n--- Procesando evento: ${m.name} ---`);
    console.log(`Carpeta origen: ${m.folderPath}`);

    // Ensure event exists
    let event = await prisma.event.findFirst({
      where: { OR: [{ slug: m.slug }, { name: m.name }] }
    });

    if (!event) {
      event = await prisma.event.create({
        data: {
          slug: m.slug,
          name: m.name,
          location: m.location,
          date: new Date(m.date),
          season: m.season,
          category: m.category,
          description: m.description,
          status: 'PUBLISHED'
        }
      });
    }

    const allFiles = getJpgFiles(m.folderPath);
    console.log(`Encontradas ${allFiles.length} fotografías reales en esta carpeta.`);

    // Take a balanced selection (mix of horizontal & vertical)
    const selectedFiles = allFiles.slice(0, m.maxPhotos);
    let coverPhotoId: string | null = null;

    for (let i = 0; i < selectedFiles.length; i++) {
      const filePath = selectedFiles[i];
      const filename = path.basename(filePath);
      const fileBuffer = fs.readFileSync(filePath);
      const fileId = uuidv4();

      try {
        // Process through Sharp (watermark, preview 1600px, thumb 450px, save original)
        const variants = await imageService.processUpload(
          fileBuffer,
          filename,
          fileId,
          'OLOBOC_'
        );

        const isCover = i === 0;

        const photo = await prisma.photo.create({
          data: {
            id: fileId,
            eventId: event.id,
            originalFilename: filename,
            storageKeyOriginal: variants.storageKeyOriginal,
            storageKeyWatermarked: variants.storageKeyWatermarked,
            storageKeyPreview: variants.storageKeyPreview,
            storageKeyThumbnail: variants.storageKeyThumbnail,
            mimeType: 'image/jpeg',
            sizeBytes: variants.sizeBytes,
            width: variants.width,
            height: variants.height,
            isCover,
            isPublished: true,
            isCommercial: true
          }
        });

        if (isCover) {
          coverPhotoId = photo.id;
        }

        totalImported++;
        process.stdout.write(`  [${i + 1}/${selectedFiles.length}] ${filename} (${variants.width}x${variants.height} px)\r`);
      } catch (err) {
        console.error(`\nError procesando ${filename}:`, err);
      }
    }

    if (coverPhotoId) {
      await prisma.event.update({
        where: { id: event.id },
        data: { coverPhotoId }
      });
    }
    console.log(`\n✓ Evento ${m.name} actualizado con ${selectedFiles.length} fotografías reales.`);
  }

  console.log('\n====================================================');
  console.log(`IMPORTACIÓN COMPLETADA: ${totalImported} FOTOGRAFÍAS REALES PROCESADAS.`);
  console.log('Todas disponen de originales 18MP protegidos, derivados con marca de agua y miniaturas WebP.');
  console.log('====================================================\n');
}

importRealPhotos()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
