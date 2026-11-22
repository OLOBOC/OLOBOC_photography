import { prisma } from './prisma.js';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';

async function main() {
  console.log('--- Seeding OLOBOC_ Database ---');

  // 1. Initial Admin User
  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: config.adminInitialEmail }
  });

  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(config.adminInitialPassword, salt);

    await prisma.adminUser.create({
      data: {
        email: config.adminInitialEmail,
        passwordHash,
        name: 'OLOBOC_ Administrator',
        role: 'SUPERADMIN'
      }
    });
    console.log(`[Seed] Created admin user: ${config.adminInitialEmail}`);
  } else {
    console.log(`[Seed] Admin user already exists: ${config.adminInitialEmail}`);
  }

  // 2. Default Packs (Configurable via Admin Panel)
  const defaultPacks = [
    { name: 'Pack 3 Fotos', photoCount: 3, priceCents: 349, isFeatured: false, sortOrder: 1 },
    { name: 'Pack 5 Fotos', photoCount: 5, priceCents: 549, isFeatured: true, sortOrder: 2 },
    { name: 'Pack 10 Fotos', photoCount: 10, priceCents: 899, isFeatured: false, sortOrder: 3 },
    { name: 'Pack 20 Fotos', photoCount: 20, priceCents: 1499, isFeatured: false, sortOrder: 4 }
  ];

  for (const pack of defaultPacks) {
    const existing = await prisma.pack.findFirst({ where: { photoCount: pack.photoCount } });
    if (!existing) {
      await prisma.pack.create({ data: pack });
      console.log(`[Seed] Created pack: ${pack.name} (${(pack.priceCents / 100).toFixed(2)} €)`);
    }
  }

  // 3. System Settings
  const settings = [
    { key: 'BASE_PHOTO_PRICE_CENTS', value: '149', description: 'Precio unitario individual de fotografía (céntimos)' },
    { key: 'WATERMARK_TEXT', value: 'OLOBOC_', description: 'Texto de la marca de agua' },
    { key: 'WATERMARK_OPACITY', value: '0.28', description: 'Opacidad de la marca de agua (0.0 a 1.0)' },
    { key: 'INSTAGRAM_URL', value: 'https://www.instagram.com/oloboc_/', description: 'Perfil oficial de Instagram' },
    { key: 'TIKTOK_URL', value: 'https://www.tiktok.com/@oloboc_', description: 'Perfil de TikTok' },
    { key: 'CONTACT_EMAIL', value: 'contacto@oloboc.com', description: 'Email de atención y notificaciones' },
    { key: 'ALLOW_TIPS', value: 'true', description: 'Permite aportación voluntaria de apoyo en checkout' }
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s
    });
  }
  console.log('[Seed] Configured default system settings');

  // 4. Motorsport Events (Preserving and evolving brand heritage)
  const events = [
    {
      slug: 'rallysprint-de-pravia-2026',
      name: 'Rallysprint de Pravia',
      location: 'Pravia, Asturias',
      date: new Date('2026-05-16T09:00:00Z'),
      season: 2026,
      category: 'Rallysprint',
      description: 'Velocidad, curvas cerradas y asfalto técnico en las carreteras del valle del Nalón. Cobertura de las tres mangas oficiales.',
      status: 'PUBLISHED'
    },
    {
      slug: 'rally-de-asturias-historico-2026',
      name: 'Rally de Asturias Histórico',
      location: 'Oviedo, Asturias',
      date: new Date('2026-04-11T08:30:00Z'),
      season: 2026,
      category: 'Rally',
      description: 'Vehículos legendarios compitiendo en tramos míticos de montaña bajo lluvia y niebla asturiana.',
      status: 'PUBLISHED'
    },
    {
      slug: 'rallysprint-de-la-montana-2026',
      name: 'Rallysprint de la Montaña',
      location: 'Cantabria',
      date: new Date('2026-03-07T10:00:00Z'),
      season: 2026,
      category: 'Rallysprint',
      description: 'Trazado vertiginoso en desnivel con horquillas extremas y apoyo masivo del público motor.',
      status: 'PUBLISHED'
    },
    {
      slug: 'driftspain-2025',
      name: 'DriftSpain',
      location: 'Circuito, España',
      date: new Date('2025-10-18T16:00:00Z'),
      season: 2025,
      category: 'Drift',
      description: 'Ángulos imposibles, humo de neumáticos y sesiones nocturnas con iluminación cinematográfica.',
      status: 'PUBLISHED'
    },
    {
      slug: 'trackdays-2025',
      name: 'Trackdays Circuito',
      location: 'Circuito, España',
      date: new Date('2025-08-02T09:00:00Z'),
      season: 2025,
      category: 'Circuito',
      description: 'Sesiones de tandas libres y cronometradas en trazado permanente.',
      status: 'PUBLISHED'
    },
    {
      slug: 'motorsport-sessions-2025',
      name: 'Motorsport Sessions',
      location: 'Gijón, Asturias',
      date: new Date('2025-06-21T21:00:00Z'),
      season: 2025,
      category: 'Otros',
      description: 'Concentración nocturna y sesiones de iluminación editorial en entornos industriales.',
      status: 'PUBLISHED'
    },
    {
      slug: 'rally-de-tierra-2024',
      name: 'Rally de Tierra',
      location: 'Asturias',
      date: new Date('2024-09-14T08:00:00Z'),
      season: 2024,
      category: 'Rally',
      description: 'Polvo, derrapajes y saltos sobre tramos de grava natural.',
      status: 'PUBLISHED'
    },
    {
      slug: 'rallysprint-otono-2026',
      name: 'Rallysprint Otoño',
      location: 'Asturias',
      date: new Date('2026-11-08T09:30:00Z'),
      season: 2026,
      category: 'Rallysprint',
      description: 'Próximo evento programado de la temporada. Pendiente de procesar fotografías.',
      status: 'DRAFT'
    }
  ];

  for (const ev of events) {
    const existing = await prisma.event.findUnique({ where: { slug: ev.slug } });
    if (!existing) {
      await prisma.event.create({ data: ev });
      console.log(`[Seed] Created event: ${ev.name}`);
    }
  }

  console.log('--- Seed Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
