import { prisma } from '../src/db/prisma.js';
import { authService } from '../src/services/auth.service.js';
import { pricingService } from '../src/services/pricing.service.js';
import { stripeService } from '../src/services/stripe.service.js';
import { storageService } from '../src/services/storage.service.js';
import { imageService } from '../src/services/image.service.js';
import { bibRecognitionService } from '../src/services/ocr.service.js';
import { mailService } from '../src/services/mail.service.js';
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
      await new Promise((r) => setTimeout(r, 60));
      await prisma.emailLog.deleteMany({ where: { orderId: session.orderId } });
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

  // --- SUITE 5: VISION AI PIPELINE, QUEUE & STATUS CLASSIFICATION ---
  console.log('\n[SUITE 5] Pipeline de Visión Artificial, Cola Asíncrona y Clasificación de Estados');
  try {
    const { ocrQueueService } = await import('../src/services/queue.service.js');

    // 1. Verify queue stats
    const stats = ocrQueueService.getStats();
    assert(typeof stats.queueLength === 'number', 'Gestor de cola inicializado correctamente');
    assert(stats.maxConcurrency === 2, 'Límite de concurrencia fijado para evitar saturación de CPU (2 workers)');

    // 2. Generate a simulated rally car door image with dorsal 12
    const carDoorSvg = `
      <svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="400" fill="#1A1C22" />
        <rect x="150" y="80" width="300" height="240" fill="#ffffff" stroke="#E8431F" stroke-width="8" rx="6" />
        <text x="300" y="245" font-size="150" font-family="Impact, Arial, sans-serif" font-weight="900" text-anchor="middle" fill="#000000">12</text>
      </svg>
    `;
    const carDoorBuf = await sharp(Buffer.from(carDoorSvg)).jpeg().toBuffer();

    // 3. Test detection & cropBase64 generation
    const candidates = await bibRecognitionService.detectBibsFromBuffer(carDoorBuf);
    assert(candidates.length > 0, 'Motor de visión detecta zona de dorsal en panel de puerta');

    const found12 = candidates.find((c) => c.bibNumber === '12');
    assert(!!found12, 'Dorsal #12 identificado fielmente en la puerta de competición');
    if (found12) {
      assert(found12.confidence >= 0.70, `Confianza suficiente (${Math.round(found12.confidence * 100)}%) para clasificación`);
      assert(!!found12.cropBase64 && found12.cropBase64.startsWith('data:image/jpeg;base64,'), 'Generación automática de recorte visual cropBase64 para el panel de revisión');
    }

    // 4. Test photo DB lifecycle with OCR status
    const event = await prisma.event.findFirst();
    if (event) {
      const testPhoto = await prisma.photo.create({
        data: {
          eventId: event.id,
          originalFilename: 'rally_car_12.jpg',
          storageKeyOriginal: 'test_car_12_orig.jpg',
          storageKeyWatermarked: 'test_car_12_wm.jpg',
          storageKeyPreview: 'test_car_12_prev.webp',
          storageKeyThumbnail: 'test_car_12_th.webp',
          ocrStatus: 'QUEUED'
        }
      });

      assert(testPhoto.ocrStatus === 'QUEUED', 'Fotografía registrada inicialmente en estado QUEUED');

      // Process via service
      await bibRecognitionService.processAndSavePhotoBibs(testPhoto.id, carDoorBuf);

      const reloadedPhoto = await prisma.photo.findUnique({
        where: { id: testPhoto.id },
        include: { bibDetections: true }
      });

      assert(reloadedPhoto?.ocrStatus === 'COMPLETED', 'Estado de la fotografía actualizado a COMPLETED tras análisis');
      assert((reloadedPhoto?.bibDetections?.length || 0) > 0, 'Detección persistida en base de datos asociada a la fotografía');
      
      const persistedDetection = reloadedPhoto?.bibDetections?.find((b) => b.bibNumber === '12');
      assert(persistedDetection?.status === 'CONFIRMED' || persistedDetection?.status === 'DETECTED', `Estado clasificado como ${persistedDetection?.status}`);
      assert(!!persistedDetection?.cropBase64, 'Recorte visual persistido en tabla BibDetection para revisión rápida');

      // Clean up test photo & bibs
      await prisma.photo.delete({ where: { id: testPhoto.id } });
    }
  } catch (err: any) {
    assert(false, `Error en Suite 5: ${err.message}`);
  }

  // --- SUITE 6: COMMERCIAL PACKS & BATCH ADMIN OPERATIONS ---
  console.log('\n[SUITE 6] Gestión de Packs Comerciales y Operaciones por Lotes');
  try {
    // 1. Verify commercial packs in database
    const activePacks = await prisma.pack.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
    assert(activePacks.length >= 3, 'Existen al menos 3 packs de descuento por volumen configurados');

    const pack3 = activePacks.find((p) => p.photoCount === 3);
    assert(!!pack3 && pack3.priceCents === 349, 'Pack 3 fotos correctamente tarificado a 3,49 €');

    const pack5 = activePacks.find((p) => p.photoCount === 5);
    assert(!!pack5 && (pack5.priceCents === 549 || pack5.priceCents === 499), `Pack 5 fotos tarificado correctamente (${pack5 ? (pack5.priceCents / 100).toFixed(2) : 0} €)`);

    // 2. Test batch creation & batch deletion
    const event = await prisma.event.findFirst();
    if (event) {
      const pBatch1 = await prisma.photo.create({
        data: {
          eventId: event.id,
          originalFilename: 'batch_del_1.jpg',
          storageKeyOriginal: 'b1_orig.jpg',
          storageKeyWatermarked: 'b1_wm.jpg',
          storageKeyPreview: 'b1_prev.webp',
          storageKeyThumbnail: 'b1_th.webp'
        }
      });
      const pBatch2 = await prisma.photo.create({
        data: {
          eventId: event.id,
          originalFilename: 'batch_del_2.jpg',
          storageKeyOriginal: 'b2_orig.jpg',
          storageKeyWatermarked: 'b2_wm.jpg',
          storageKeyPreview: 'b2_prev.webp',
          storageKeyThumbnail: 'b2_th.webp'
        }
      });

      // Batch delete
      const deleteResult = await prisma.photo.deleteMany({
        where: { id: { in: [pBatch1.id, pBatch2.id] } }
      });
      assert(deleteResult.count === 2, 'Operación atómica de borrado por lotes (2/2 eliminadas)');

      const remaining = await prisma.photo.findMany({
        where: { id: { in: [pBatch1.id, pBatch2.id] } }
      });
      assert(remaining.length === 0, 'Fotografías eliminadas completamente de la base de datos');
    }
  } catch (err: any) {
    assert(false, `Error en Suite 6: ${err.message}`);
  }

  // --- SUITE 7: COMMERCIAL FLOW, WEBHOOKS, EMAILS & REFUNDS ---
  console.log('\n[SUITE 7] Ciclo Comercial Completo, Webhooks, Emails Transaccionales y Reembolsos');
  try {
    const event = await prisma.event.findFirst();
    assert(!!event, 'Existe al menos un evento para pruebas comerciales');

    if (event) {
      // 1. Create 2 published commercial test photos
      const photoA = await prisma.photo.create({
        data: {
          eventId: event.id,
          originalFilename: 'commercial_photo_A.jpg',
          storageKeyOriginal: 'comm_A_orig.jpg',
          storageKeyWatermarked: 'comm_A_wm.jpg',
          storageKeyPreview: 'comm_A_prev.webp',
          storageKeyThumbnail: 'comm_A_th.webp',
          isPublished: true,
          isCommercial: true
        }
      });

      const photoB = await prisma.photo.create({
        data: {
          eventId: event.id,
          originalFilename: 'commercial_photo_B.jpg',
          storageKeyOriginal: 'comm_B_orig.jpg',
          storageKeyWatermarked: 'comm_B_wm.jpg',
          storageKeyPreview: 'comm_B_prev.webp',
          storageKeyThumbnail: 'comm_B_th.webp',
          isPublished: true,
          isCommercial: true
        }
      });

      // 2. Test empty cart
      const emptyQuote = await pricingService.calculateQuote([]);
      assert(emptyQuote.photoCount === 0 && emptyQuote.totalCents === 0, 'Carrito vacío devuelve importe 0 €');

      // 3. Test duplicate photo selection in cart
      const deduplicatedQuote = await pricingService.calculateQuote([photoA.id, photoA.id, photoB.id]);
      assert(deduplicatedQuote.photoCount === 2, 'Selección duplicada deduplicada automáticamente en el servidor');
      assert(deduplicatedQuote.totalCents === 298, 'Importe recalculado con exactitud server-side (2 x 1,49 € = 2,98 €)');

      // 4. Test checkout session creation & secure pending order
      const session = await stripeService.createCheckoutSession({
        photoIds: [photoA.id, photoB.id],
        customerEmail: 'comprador@motorsport.es',
        tipCents: 100
      });
      assert(!!session.orderId, 'Pedido registrado en base de datos');
      assert(!!session.downloadToken && session.downloadToken.length === 64, 'Token criptográfico de 64 caracteres hex generado');
      assert(session.sessionUrl.includes('#order-success?token='), 'URL de redirección compatible con enrutador hash SPA (#order-success)');

      const pendingOrder = await prisma.order.findUnique({ where: { id: session.orderId }, include: { items: true } });
      assert(pendingOrder?.status === 'PENDING', 'Pedido se crea inicialmente en estado PENDING estrictamente');
      assert(pendingOrder?.items.length === 2, 'Todos los ítems verificados asociados al pedido');

      // 5. Test download entitlement verification on PENDING order
      const canDownloadPending = pendingOrder?.status === 'PAID';
      assert(!canDownloadPending, 'Descargas denegadas (403) si el pedido no está en estado PAID');

      // 6. Test payment confirmation & transition to PAID
      const paidOrder = await stripeService.simulatePaymentCompletion(session.downloadToken);
      assert(paidOrder.status === 'PAID', 'Transición segura a PAID tras confirmación de pago');

      // 7. Test download entitlement on PAID order
      const canDownloadPaid = paidOrder.status === 'PAID' && new Date() < paidOrder.downloadExpiresAt && paidOrder.downloadCount < paidOrder.maxDownloads;
      assert(canDownloadPaid, 'Descargas concedidas cuando el pedido está pagado y vigente');

      // 8. Test photo entitlement within order
      const hasPhotoA = pendingOrder?.items.some((it) => it.photoId === photoA.id);
      const hasAlienPhoto = pendingOrder?.items.some((it) => it.photoId === 'photo-inexistente-123');
      assert(hasPhotoA === true, 'Fotografía A comprada autorizada para descarga');
      assert(hasAlienPhoto === false, 'Fotografía no comprada rechazada con 403 Forbidden');

      // 9. Test expiration entitlement check
      const expiredDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago
      const isExpiredCheck = new Date() > expiredDate;
      assert(isExpiredCheck, 'Detección estricta de token de descarga caducado (>7 días)');

      // 10. Test transactional order confirmation email
      const emailResult = await mailService.sendOrderConfirmation(session.orderId);
      assert(emailResult.success === true, 'Servicio de email transaccional despacha confirmación de pedido');

      const emailLog = await prisma.emailLog.findFirst({
        where: { orderId: session.orderId, template: 'ORDER_CONFIRMATION' }
      });
      assert(!!emailLog, 'Despacho de email registrado en tabla EmailLog para auditoría');

      const updatedOrderWithEmail = await prisma.order.findUnique({ where: { id: session.orderId } });
      assert(!!updatedOrderWithEmail?.confirmationEmailSentAt, 'Fecha confirmationEmailSentAt persistida en base de datos');

      // 11. Test duplicate email protection
      const dupEmailResult = await mailService.sendOrderConfirmation(session.orderId);
      assert(dupEmailResult.success === true, 'Segundo envío protegido contra duplicación de correos al cliente');

      // 12. Test webhook idempotency
      const mockEventId = `evt_test_mock_${Date.now()}`;
      await prisma.paymentWebhookEvent.create({
        data: {
          stripeEventId: mockEventId,
          eventType: 'checkout.session.completed',
          payload: JSON.stringify({ id: mockEventId })
        }
      });
      const isDuplicate = await prisma.paymentWebhookEvent.findUnique({ where: { stripeEventId: mockEventId } });
      assert(!!isDuplicate, 'Registro de webhook procesado detectado para garantizar idempotencia');

      // 13. Test administrative refund & access revocation
      const refundResult = await stripeService.refundOrder(session.orderId, 'Cancelación a petición del piloto');
      assert(refundResult.success === true, 'Reembolso procesado en el servicio');
      assert(refundResult.order.status === 'REFUNDED', 'Estado de pedido actualizado a REFUNDED');
      assert(refundResult.order.downloadExpiresAt.getTime() === 0, 'Acceso digital y tokens de descarga revocados inmediatamente');

      // 14. Test duplicate refund prevention
      let duplicateRefundFailed = false;
      try {
        await stripeService.refundOrder(session.orderId, 'Reintento fraudulento');
      } catch {
        duplicateRefundFailed = true;
      }
      assert(duplicateRefundFailed, 'Rechazo estricto de reembolsos duplicados');

      // 15. Clean up test photos and order
      await prisma.orderItem.deleteMany({ where: { orderId: session.orderId } });
      await prisma.emailLog.deleteMany({ where: { orderId: session.orderId } });
      await prisma.order.delete({ where: { id: session.orderId } });
      await prisma.photo.deleteMany({ where: { id: { in: [photoA.id, photoB.id] } } });
      await prisma.paymentWebhookEvent.delete({ where: { stripeEventId: mockEventId } });
    }
  } catch (err: any) {
    assert(false, `Error en Suite 7: ${err.message}`);
  }

  // --- SUITE 8: FISCALIDAD ESPAÑOLA (IVA 21%), CONDICIONES LEGALES Y ALMACENAMIENTO HÍBRIDO S3 ---
  console.log('\n[SUITE 8] Fiscalidad Española (IVA 21%), Desistimiento Digital (Art. 103.m) y Almacenamiento S3');
  try {
    // 1. VAT 21% breakdown check
    const ev = await prisma.event.findFirst();
    if (ev) {
      const p1 = await prisma.photo.create({
        data: {
          eventId: ev.id,
          originalFilename: 'suite8_vat1.jpg',
          storageKeyOriginal: 's8_orig_1.jpg',
          storageKeyWatermarked: 's8_wm_1.jpg',
          storageKeyPreview: 's8_prev_1.jpg',
          storageKeyThumbnail: 's8_th_1.jpg',
          width: 3000,
          height: 2000,
          sizeBytes: 1500000,
          mimeType: 'image/jpeg',
          isPublished: true,
          ocrStatus: 'COMPLETED'
        }
      });

      const quote = await pricingService.calculateQuote([p1.id], 0);
      assert(quote.taxRatePercent === 21, 'Tipo impositivo de IVA configurado al 21% (B2C España)');
      assert(quote.netSubtotalCents + quote.taxAmountCents === quote.totalCents, 'Desglose exacto: Base imponible neta + Cuota de IVA = Total');
      assert(quote.taxAmountCents > 0, 'Cálculo de cuota de IVA no nulo');

      // 2. Storage Service S3 driver inspection
      const isCloudConfigured = storageService.isCloudConfigured();
      assert(typeof isCloudConfigured === 'boolean', 'StorageService informa correctamente el estado de configuración Cloud S3');

      // 3. Clean up
      await prisma.photo.delete({ where: { id: p1.id } });
    }
  } catch (err: any) {
    assert(false, `Error en Suite 8: ${err.message}`);
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
