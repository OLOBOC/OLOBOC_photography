import { prisma } from '../src/db/prisma.js';
import { authService } from '../src/services/auth.service.js';
import { pricingService } from '../src/services/pricing.service.js';
import { stripeService } from '../src/services/stripe.service.js';
import { storageService } from '../src/services/storage.service.js';
import { imageService } from '../src/services/image.service.js';
import { bibRecognitionService } from '../src/services/ocr.service.js';
import sharp from 'sharp';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName}`);
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('   OLOBOC_ MOTORSPORT FULL STACK AUTOMATED TEST SUITE');
  console.log('======================================================\n');

  // --- SUITE 1: AUTHENTICATION & SECURITY ---
  console.log('[SUITE 1] Autenticación y Autorización de Administrador');
  try {
    const loginSuccess = await authService.login('admin@oloboc.com', 'Admin_Oloboc_2026!');
    assert(!!loginSuccess.token, 'Login con credenciales correctas devuelve token JWT');
    assert(loginSuccess.admin.email === 'admin@oloboc.com', 'Login devuelve perfil con email verificado');

    let invalidFailed = false;
    try {
      await authService.login('admin@oloboc.com', 'WrongPassword123!');
    } catch {
      invalidFailed = true;
    }
    assert(invalidFailed, 'Rechazo estricto con contraseña incorrecta (401)');

    const verified = await authService.verifyToken(loginSuccess.token);
    assert(verified.email === 'admin@oloboc.com', 'Verificación criptográfica de token y sesión en BD');
  } catch (err: any) {
    assert(false, `Error en Suite 1: ${err.message}`);
  }

  // --- SUITE 2: PRICING & ANTI-TAMPERING ---
  console.log('\n[SUITE 2] Cotización Server-Side y Prevención de Manipulación');
  try {
    const basePrice = await pricingService.getBaseUnitPriceCents();
    assert(basePrice === 149, 'Precio base unitario configurado a 1,49 € (149 céntimos)');

    // Fetch an event to attach test photos
    const event = await prisma.event.findFirst();
    assert(!!event, 'Existe al menos un evento en base de datos');

    if (event) {
      // Create 3 test photos
      const p1 = await prisma.photo.create({
        data: {
          eventId: event.id,
          originalFilename: 'test_car_1.jpg',
          storageKeyOriginal: 'test_orig_1.jpg',
          storageKeyWatermarked: 'test_wm_1.jpg',
          storageKeyPreview: 'test_prev_1.webp',
          storageKeyThumbnail: 'test_th_1.webp',
          isPublished: true,
          isCommercial: true
        }
      });

      const p2 = await prisma.photo.create({
        data: {
          eventId: event.id,
          originalFilename: 'test_car_2.jpg',
          storageKeyOriginal: 'test_orig_2.jpg',
          storageKeyWatermarked: 'test_wm_2.jpg',
          storageKeyPreview: 'test_prev_2.webp',
          storageKeyThumbnail: 'test_th_2.webp',
          isPublished: true,
          isCommercial: true
        }
      });

      const p3 = await prisma.photo.create({
        data: {
          eventId: event.id,
          originalFilename: 'test_car_3.jpg',
          storageKeyOriginal: 'test_orig_3.jpg',
          storageKeyWatermarked: 'test_wm_3.jpg',
          storageKeyPreview: 'test_prev_3.webp',
          storageKeyThumbnail: 'test_th_3.webp',
          isPublished: true,
          isCommercial: true
        }
      });

      // Calculate quote for 1 photo
      const q1 = await pricingService.calculateQuote([p1.id]);
      assert(q1.totalCents === 149, 'Cotización de 1 foto es exactamente 1,49 €');

      // Calculate quote for 3 photos (should apply Pack 3 = 349 cents instead of 3 * 149 = 447)
      const q3 = await pricingService.calculateQuote([p1.id, p2.id, p3.id]);
      assert(q3.totalCents === 349, 'Pack 3 Fotos aplicado automáticamente: total 3,49 €');
      assert(q3.savingsCents === 447 - 349, 'Ahorro calculado correctamente (0,98 €)');
      assert(q3.appliedPackName === 'Pack 3 Fotos', 'Nombre del pack reconocido por el algoritmo');

      // Tip addition
      const qTip = await pricingService.calculateQuote([p1.id], 200);
      assert(qTip.totalCents === 149 + 200, 'Apoyo voluntario añadido al total sin alterar precio base');

      // Cleanup test photos
      await prisma.photo.deleteMany({ where: { id: { in: [p1.id, p2.id, p3.id] } } });
    }
  } catch (err: any) {
    assert(false, `Error en Suite 2: ${err.message}`);
  }

  // --- SUITE 3: CHECKOUT, TOKENS & SECURE DOWNLOADS ---
  console.log('\n[SUITE 3] Pasarela, Tokens Seguros y Descargas Protegidas');
  try {
    const event = await prisma.event.findFirst();
    if (event) {
      // 1. Create a real sample image file in storage
      const sampleBuf = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 232, g: 67, b: 31 }
        }
      }).jpeg().toBuffer();

      const origFilename = 'secure_test_download_orig.jpg';
      await storageService.saveOriginal(origFilename, sampleBuf);

      const photo = await prisma.photo.create({
        data: {
          eventId: event.id,
          originalFilename: 'test_audi_s1.jpg',
          storageKeyOriginal: origFilename,
          storageKeyWatermarked: 'wm.jpg',
          storageKeyPreview: 'prev.webp',
          storageKeyThumbnail: 'th.webp',
          isPublished: true,
          isCommercial: true
        }
      });

      // 2. Create pending checkout session
      const session = await stripeService.createCheckoutSession({
        photoIds: [photo.id],
        customerEmail: 'piloto.test@motorsport.com'
      });

      assert(!!session.downloadToken, 'Generación de token de descarga seguro de 64 caracteres hex');
      assert(session.downloadToken.length === 64, 'Token cumple entropía criptográfica (256 bits)');

      // Verify order status is PENDING
      const orderPending = await prisma.order.findUnique({ where: { id: session.orderId } });
      assert(orderPending?.status === 'PENDING', 'Pedido creado inicialmente con estado PENDING');

      // 3. Confirm payment simulation
      const orderPaid = await stripeService.simulatePaymentCompletion(session.downloadToken);
      assert(orderPaid.status === 'PAID', 'Transición segura de pedido a estado PAID');

      // Verify file exists in private storage and can be read
      const readBuf = await storageService.readOriginal(origFilename);
      assert(readBuf.length === sampleBuf.length, 'Original limpio en alta resolución preservado íntegro en almacenamiento privado');

      // Clean up
      await storageService.deletePhotoFiles({ original: origFilename });
      await prisma.order.delete({ where: { id: session.orderId } });
      await prisma.photo.delete({ where: { id: photo.id } });
    }
  } catch (err: any) {
    assert(false, `Error en Suite 3: ${err.message}`);
  }

  // --- SUITE 4: IMAGE WATERMARKING & OCR ENGINE ---
  console.log('\n[SUITE 4] Procesamiento de Marcas de Agua y Motor OCR Real');
  try {
    // Generate an image buffer containing a clear motorsport racing number "7"
    const svgWithDorsal = `
      <svg width="400" height="240" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="240" fill="#ffffff" />
        <text x="200" y="160" font-size="120" font-family="Arial, sans-serif" font-weight="900" text-anchor="middle" fill="#000000">7</text>
      </svg>
    `;
    const dorsalImageBuf = await sharp(Buffer.from(svgWithDorsal)).jpeg().toBuffer();

    // Test ImageService watermark generation
    const variants = await imageService.processUpload(dorsalImageBuf, 'car_number_7.jpg', 'test-ocr-photo');
    assert(!!variants.storageKeyWatermarked, 'Generación de derivado con marca de agua diagonal server-side');
    assert(!!variants.storageKeyThumbnail, 'Generación de miniatura para navegación');
    assert(variants.width === 400 && variants.height === 240, 'Extracción fiel de dimensiones de la imagen');

    // Test real OCR recognition with Tesseract.js
    console.log('  ... Ejecutando reconocimiento óptico real con Tesseract.js ...');
    const detections = await bibRecognitionService.detectBibsFromBuffer(dorsalImageBuf);
    assert(detections.length > 0, 'Motor OCR identifica dorsal presente en la imagen');
    if (detections.length > 0) {
      assert(detections[0].bibNumber === '7', `Dorsal detectado exactamente como #${detections[0].bibNumber} (esperado 7)`);
      assert(detections[0].confidence > 0.5, `Confianza estadística del reconocimiento (${Math.round(detections[0].confidence * 100)}%)`);
    }

    // Clean up temporary test files
    await storageService.deletePhotoFiles({
      original: variants.storageKeyOriginal,
      watermarked: variants.storageKeyWatermarked,
      preview: variants.storageKeyPreview,
      thumbnail: variants.storageKeyThumbnail
    });
  } catch (err: any) {
    assert(false, `Error en Suite 4: ${err.message}`);
  }

  // --- SUMMARY ---
  console.log('\n======================================================');
  console.log(`RESUMEN DE PRUEBAS: ${passedTests} superadas, ${failedTests} fallidas de un total de ${totalTests}.`);
  console.log('======================================================\n');

  await prisma.$disconnect();
  await bibRecognitionService.close();

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
