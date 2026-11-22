import { prisma } from './prisma.js';
import { imageService } from '../services/image.service.js';
import { bibRecognitionService } from '../services/ocr.service.js';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

async function generateMotorsportSvg(carColor: string, bib: string, eventTitle: string, w = 1200, h = 800) {
  return `
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0b0d10" />
          <stop offset="50%" stop-color="#14181f" />
          <stop offset="100%" stop-color="#08090b" />
        </linearGradient>
        <linearGradient id="road" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#1b1e24" />
          <stop offset="50%" stop-color="#2a2e36" />
          <stop offset="100%" stop-color="#1b1e24" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="15" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- Background & Sky -->
      <rect width="${w}" height="${h}" fill="url(#bg)" />

      <!-- Mountain/Terrain Horizon -->
      <polygon points="0,${h * 0.65} ${w * 0.25},${h * 0.45} ${w * 0.55},${h * 0.55} ${w * 0.8},${h * 0.4} ${w},${h * 0.65} ${w},${h} 0,${h}" fill="#0d1015" />

      <!-- Asphalt Road Track with motion perspective -->
      <polygon points="${w * 0.15},${h} ${w * 0.4},${h * 0.6} ${w * 0.6},${h * 0.6} ${w * 0.85},${h}" fill="url(#road)" />

      <!-- Apex Kerb Stripes -->
      <polygon points="${w * 0.12},${h} ${w * 0.16},${h} ${w * 0.41},${h * 0.6} ${w * 0.39},${h * 0.6}" fill="#e8431f" opacity="0.8" />
      <polygon points="${w * 0.84},${h} ${w * 0.88},${h} ${w * 0.61},${h * 0.6} ${w * 0.59},${h * 0.6}" fill="#f1ede6" opacity="0.8" />

      <!-- Headlight Beam / Speed Blur -->
      <ellipse cx="${w * 0.5}" cy="${h * 0.72}" rx="${w * 0.35}" ry="${h * 0.1}" fill="${carColor}" opacity="0.18" filter="url(#glow)" />

      <!-- Rally Car Silhouette Body -->
      <g transform="translate(${w * 0.28}, ${h * 0.52})">
        <!-- Shadow -->
        <ellipse cx="260" cy="180" rx="280" ry="32" fill="#000000" opacity="0.7" />

        <!-- Chassis & Cockpit -->
        <path d="M 40,150 L 80,100 L 160,50 L 320,50 L 420,95 L 480,130 L 480,165 L 30,165 Z" fill="${carColor}" />
        <path d="M 170,55 L 310,55 L 390,95 L 120,95 Z" fill="#111317" opacity="0.85" />

        <!-- Spoiler Wing -->
        <rect x="25" y="65" width="25" height="40" fill="#000" />
        <rect x="10" y="60" width="70" height="10" fill="#000" />

        <!-- Wheels with Brake Disc Glow -->
        <circle cx="110" cy="165" r="42" fill="#111" stroke="#333" stroke-width="8" />
        <circle cx="110" cy="165" r="22" fill="#e8431f" opacity="0.4" filter="url(#glow)" />
        <circle cx="410" cy="165" r="42" fill="#111" stroke="#333" stroke-width="8" />
        <circle cx="410" cy="165" r="22" fill="#e8431f" opacity="0.4" filter="url(#glow)" />

        <!-- Racing Door Number Plate (White with Black Number) -->
        <rect x="230" y="100" width="75" height="48" rx="4" fill="#ffffff" stroke="#111" stroke-width="2" />
        <text x="267" y="137" font-family="Arial, sans-serif" font-weight="900" font-size="34" text-anchor="middle" fill="#000000">${bib}</text>
      </g>

      <!-- Event Title Watermark / HUD Overlay -->
      <text x="40" y="${h - 40}" font-family="monospace" font-size="14" font-weight="600" fill="#8b9096" letter-spacing="2">
        OLOBOC_ // ${eventTitle.toUpperCase()} // #DORSAL ${bib}
      </text>
    </svg>
  `;
}

async function seedPhotos() {
  console.log('--- Seeding Initial Photos with OCR Bib Association ---');
  const events = await prisma.event.findMany({ where: { status: 'PUBLISHED' } });

  const sampleCars = [
    { bib: '7', color: '#e8431f', name: 'Audi Sport Quattro S1' },
    { bib: '12', color: '#3b82f6', name: 'Subaru Impreza WRC' },
    { bib: '23', color: '#10b981', name: 'Mitsubishi Lancer Evo IX' },
    { bib: '44', color: '#f59e0b', name: 'Ford Sierra RS Cosworth' },
    { bib: '5', color: '#ec4899', name: 'BMW M3 E30 Rally' }
  ];

  for (const ev of events.slice(0, 4)) {
    console.log(`Processing photos for event: ${ev.name}`);

    for (let i = 0; i < sampleCars.length; i++) {
      const car = sampleCars[i];
      const svg = await generateMotorsportSvg(car.color, car.bib, ev.name);
      const buffer = await sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer();

      const fileId = uuidv4();
      const filename = `${ev.slug}-${car.bib}-${i + 1}.jpg`;

      // 1. Process variants (watermark, preview, thumb)
      const variants = await imageService.processUpload(buffer, filename, fileId, 'OLOBOC_');

      // 2. Create Photo Record in DB
      const photo = await prisma.photo.create({
        data: {
          id: fileId,
          eventId: ev.id,
          originalFilename: `${car.name} (#${car.bib})`,
          storageKeyOriginal: variants.storageKeyOriginal,
          storageKeyWatermarked: variants.storageKeyWatermarked,
          storageKeyPreview: variants.storageKeyPreview,
          storageKeyThumbnail: variants.storageKeyThumbnail,
          mimeType: 'image/jpeg',
          sizeBytes: variants.sizeBytes,
          width: variants.width,
          height: variants.height,
          isCover: i === 0, // Set first photo as cover
          isPublished: true,
          isCommercial: true
        }
      });

      // 3. Associate OCR detection
      await prisma.bibDetection.create({
        data: {
          photoId: photo.id,
          bibNumber: car.bib,
          confidence: 0.95,
          status: 'CONFIRMED',
          detectedBy: 'TESSERACT_OCR'
        }
      });

      // If it's cover photo, update event coverPhotoId
      if (i === 0) {
        await prisma.event.update({
          where: { id: ev.id },
          data: { coverPhotoId: photo.id }
        });
      }

      console.log(`  ✓ Created photo: ${filename} with dorsal #${car.bib}`);
    }
  }

  console.log('--- Photo Seeding Completed ---');
}

seedPhotos()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
