import nodemailer from 'nodemailer';
import { prisma } from '../db/prisma.js';
import { config } from '../config.js';

export interface EmailSendResult {
  success: boolean;
  simulated: boolean;
  messageId?: string;
  error?: string;
}

export class MailService {
  private transporter: any = null;

  constructor() {
    if (config.email.isConfigured) {
      try {
        this.transporter = nodemailer.createTransport({
          host: config.email.smtpHost,
          port: config.email.smtpPort,
          secure: config.email.smtpSecure,
          auth: {
            user: config.email.smtpUser,
            pass: config.email.smtpPass
          }
        });
      } catch (err: any) {
        console.warn('[MailService] Failed to initialize SMTP transporter:', err.message);
        this.transporter = null;
      }
    }
  }

  /**
   * Helper to format amounts in euros
   */
  private formatEuro(cents: number): string {
    return `${(cents / 100).toFixed(2)} €`;
  }

  /**
   * Sends transactional Order Confirmation Email with secure download access
   */
  async sendOrderConfirmation(orderId: string): Promise<EmailSendResult> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              photo: {
                include: {
                  event: { select: { name: true, location: true, date: true } }
                }
              }
            }
          }
        }
      });

      if (!order) {
        throw new Error(`Pedido ${orderId} no encontrado`);
      }

      // Idempotency: avoid sending duplicate confirmation emails
      if (order.confirmationEmailSentAt) {
        console.log(`[MailService] Confirmation email for order ${order.orderNumber} already dispatched at ${order.confirmationEmailSentAt.toISOString()}. Skipping.`);
        return { success: true, simulated: false };
      }

      const downloadUrl = `${config.clientUrl}/#order-success?token=${order.downloadToken}`;
      const recoveryUrl = `${config.clientUrl}/#order-lookup`;
      const expiresFormatted = new Date(order.downloadExpiresAt).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const subject = `Tus fotografías de competición: Pedido ${order.orderNumber} — OLOBOC_`;

      const textBody = `
======================================================
OLOBOC_ MOTORSPORT PHOTOGRAPHY — CONFIRMACIÓN DE PEDIDO
======================================================

¡Gracias por tu compra! Tu pedido ${order.orderNumber} ha sido confirmado y procesado correctamente.

RESUMEN DEL PEDIDO:
- Número de pedido: ${order.orderNumber}
- Email: ${order.customerEmail}
- Total abonado: ${this.formatEuro(order.totalAmountCents)}
${order.appliedPackName ? `- Pack comercial: ${order.appliedPackName}` : ''}
${order.tipAmountCents > 0 ? `- Apoyo voluntario: ${this.formatEuro(order.tipAmountCents)}` : ''}
- Fotografías adquiridas: ${order.items.length}

ENLACE DE DESCARGA DIRECTO (ALTA RESOLUCIÓN Y SIN MARCAS DE AGUA):
${downloadUrl}

VIGENCIA DEL ENLACE:
Tus descargas estarán disponibles durante 7 días (hasta el ${expiresFormatted}).
Dispones de un límite de hasta ${order.maxDownloads} descargas autorizadas.

FOTOGRAFÍAS INCLUIDAS:
${order.items.map((it, idx) => `[${idx + 1}] ${it.photo.originalFilename} — Evento: ${it.photo.event.name}`).join('\n')}

CONDICIONES DE LICENCIA:
Licencia digital para uso personal, difusión en perfiles personales o de equipo. Prohibida la reventa comercial.
Etiqueta @oloboc_ en redes sociales.

¿Necesitas recuperar tus compras en el futuro? Accede a:
${recoveryUrl}

Contacto y soporte: ${config.contactForwardEmail}
Desarrollado tecnológicamente por Nortcode (https://www.nortcode.es)
      `.trim();

      const htmlBody = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #08090B; color: #F3EFEA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .container { max-width: 640px; margin: 0 auto; background-color: #101215; border: 1px solid #2A2D35; }
    .header { padding: 32px 30px; background-color: #08090B; border-bottom: 2px solid #E8431F; }
    .logo { font-size: 32px; font-weight: 900; letter-spacing: 2px; color: #F3EFEA; text-decoration: none; }
    .logo span { color: #E8431F; }
    .badge { display: inline-block; padding: 4px 10px; background: rgba(31, 232, 67, 0.15); color: #1FE843; font-family: monospace; font-size: 11px; letter-spacing: 1px; margin-top: 8px; border: 1px solid #1FE843; }
    .content { padding: 32px 30px; }
    h1 { font-size: 26px; margin: 0 0 12px; font-weight: 700; color: #F3EFEA; }
    p { font-size: 15px; line-height: 1.6; color: #A6A4A0; margin: 0 0 16px; }
    .order-box { background-color: #1A1C22; border: 1px solid #2A2D35; padding: 20px; margin: 24px 0; }
    .order-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #2A2D35; font-size: 14px; }
    .order-row:last-child { border-bottom: none; }
    .order-label { color: #888; font-family: monospace; font-size: 12px; }
    .order-value { font-weight: 600; color: #F3EFEA; }
    .cta-btn { display: block; text-align: center; background-color: #E8431F; color: #FFFFFF !important; text-decoration: none; font-weight: 800; font-size: 15px; letter-spacing: 1px; padding: 18px 24px; margin: 30px 0; text-transform: uppercase; }
    .items-list { margin: 20px 0; border: 1px solid #2A2D35; }
    .item-row { padding: 12px 16px; border-bottom: 1px solid #2A2D35; font-size: 13px; }
    .item-row:last-child { border-bottom: none; }
    .footer { padding: 24px 30px; background-color: #08090B; border-top: 1px solid #2A2D35; font-size: 12px; color: #666; text-align: center; }
    .footer a { color: #888; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">OLOBOC<span>_</span></div>
      <div class="badge">● PAGO CONFIRMADO // ENTREGA DIGITAL</div>
    </div>
    <div class="content">
      <h1>¡Gracias por tu compra!</h1>
      <p>Tu pedido <strong>${order.orderNumber}</strong> ha sido confirmado satisfactoriamente. A continuación tienes el acceso directo para descargar tus fotografías en <strong>máxima resolución y sin marcas de agua</strong>.</p>
      
      <div class="order-box">
        <div class="order-row">
          <span class="order-label">NÚMERO DE PEDIDO:</span>
          <span class="order-value">${order.orderNumber}</span>
        </div>
        <div class="order-row">
          <span class="order-label">TOTAL ABONADO:</span>
          <span class="order-value" style="color: #E8431F;">${this.formatEuro(order.totalAmountCents)}</span>
        </div>
        ${order.appliedPackName ? `
        <div class="order-row">
          <span class="order-label">PACK APLICADO:</span>
          <span class="order-value">${order.appliedPackName}</span>
        </div>` : ''}
        <div class="order-row">
          <span class="order-label">FOTOGRAFÍAS:</span>
          <span class="order-value">${order.items.length} archivo(s)</span>
        </div>
        <div class="order-row">
          <span class="order-label">VIGENCIA DESCARGA:</span>
          <span class="order-value">Hasta el ${expiresFormatted} (7 días)</span>
        </div>
      </div>

      <a href="${downloadUrl}" class="cta-btn">DESCARGAR FOTOGRAFÍAS ORIGINALES ⬇</a>

      <p style="font-size: 13px; color: #888;">
        Si el botón no funciona, copia y pega el siguiente enlace seguro en tu navegador:<br>
        <a href="${downloadUrl}" style="color: #E8431F; word-break: break-all;">${downloadUrl}</a>
      </p>

      <h2 style="font-size: 16px; margin: 28px 0 12px; color: #F3EFEA; text-transform: uppercase; letter-spacing: 1px;">Fotografías incluidas en tu pedido:</h2>
      <div class="items-list">
        ${order.items.map((it) => `
          <div class="item-row">
            <strong>${it.photo.originalFilename}</strong><br>
            <span style="color: #888; font-size: 11px; font-family: monospace;">Evento: ${it.photo.event.name} (${it.photo.event.location})</span>
          </div>
        `).join('')}
      </div>

      <div style="background-color: rgba(232, 67, 31, 0.08); border-left: 3px solid #E8431F; padding: 14px; margin-top: 24px; font-size: 12px; color: #C0BEB8;">
        <strong>Condiciones de uso de la licencia:</strong> La compra otorga una licencia de uso personal y difusión en redes sociales personales o de equipo. No se autoriza la reventa a terceros. Menciona <strong>@oloboc_</strong> cuando compartas tus fotografías.
      </div>
    </div>
    <div class="footer">
      <p style="margin-bottom: 8px;">OLOBOC_ Motorsport Photography · Asturias, España</p>
      <p style="margin-bottom: 8px;">Recuperador de pedidos: <a href="${recoveryUrl}">Recuperar compras</a> · Soporte: <a href="mailto:${config.contactForwardEmail}">${config.contactForwardEmail}</a></p>
      <p style="font-size: 10px; color: #444; margin-top: 12px;">Solución tecnológica desarrollada por <a href="https://www.nortcode.es/" target="_blank">Nortcode</a></p>
    </div>
  </div>
</body>
</html>
      `.trim();

      // Dispatch via SMTP if configured, else controlled simulation
      if (this.transporter) {
        const info = await this.transporter.sendMail({
          from: config.email.fromEmail,
          to: order.customerEmail,
          subject,
          text: textBody,
          html: htmlBody
        });

        await prisma.emailLog.create({
          data: {
            orderId: order.id,
            recipient: order.customerEmail,
            subject,
            template: 'ORDER_CONFIRMATION',
            status: 'SENT'
          }
        });

        await prisma.order.update({
          where: { id: order.id },
          data: { confirmationEmailSentAt: new Date() }
        });

        console.log(`[MailService] Sent real SMTP order confirmation to ${order.customerEmail} (msgId: ${info.messageId})`);
        return { success: true, simulated: false, messageId: info.messageId };
      } else {
        // Controlled simulation mode
        await prisma.emailLog.create({
          data: {
            orderId: order.id,
            recipient: order.customerEmail,
            subject,
            template: 'ORDER_CONFIRMATION',
            status: 'SIMULATED'
          }
        });

        await prisma.order.update({
          where: { id: order.id },
          data: { confirmationEmailSentAt: new Date() }
        });

        console.log(`[MailService SIMULATION] Dispatched ORDER_CONFIRMATION to ${order.customerEmail} for order ${order.orderNumber}.`);
        return { success: true, simulated: true };
      }
    } catch (err: any) {
      console.error(`[MailService ERROR] Failed to send order confirmation for order ${orderId}:`, err);
      await prisma.emailLog.create({
        data: {
          orderId,
          recipient: 'unknown',
          subject: 'Error al enviar confirmación de pedido',
          template: 'ORDER_CONFIRMATION',
          status: 'FAILED',
          error: err.message
        }
      }).catch(() => {});
      return { success: false, simulated: false, error: err.message };
    }
  }

  /**
   * Sends transactional Refund Notification Email
   */
  async sendRefundNotice(orderId: string, reason?: string): Promise<EmailSendResult> {
    try {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) throw new Error(`Pedido ${orderId} no encontrado`);

      const subject = `Reembolso procesado: Pedido ${order.orderNumber} — OLOBOC_`;
      const textBody = `
Estimado cliente,

Le informamos de que se ha procesado correctamente el reembolso del pedido ${order.orderNumber} por importe de ${this.formatEuro(order.totalAmountCents)}.

${reason ? `Motivo indicado: ${reason}` : ''}

El importe será reintegrado en el método de pago original en un plazo de 3 a 5 días hábiles conforme a los plazos bancarios de Stripe.
Los enlaces de descarga asociados a este pedido han sido revocados.

Para cualquier duda o consulta, contáctenos en ${config.contactForwardEmail}.

Atentamente,
OLOBOC_ Motorsport Photography
      `.trim();

      if (this.transporter) {
        const info = await this.transporter.sendMail({
          from: config.email.fromEmail,
          to: order.customerEmail,
          subject,
          text: textBody
        });

        await prisma.emailLog.create({
          data: {
            orderId: order.id,
            recipient: order.customerEmail,
            subject,
            template: 'ORDER_REFUNDED',
            status: 'SENT'
          }
        });

        return { success: true, simulated: false, messageId: info.messageId };
      } else {
        await prisma.emailLog.create({
          data: {
            orderId: order.id,
            recipient: order.customerEmail,
            subject,
            template: 'ORDER_REFUNDED',
            status: 'SIMULATED'
          }
        });
        console.log(`[MailService SIMULATION] Dispatched ORDER_REFUNDED to ${order.customerEmail} for order ${order.orderNumber}.`);
        return { success: true, simulated: true };
      }
    } catch (err: any) {
      console.error(`[MailService ERROR] Failed to send refund notice:`, err);
      return { success: false, simulated: false, error: err.message };
    }
  }

  /**
   * Sends internal alert to photographer for new contact messages or takedowns
   */
  async sendContactNotification(params: {
    name: string;
    email: string;
    motive: string;
    message: string;
  }): Promise<EmailSendResult> {
    try {
      const { name, email, motive, message } = params;
      const subject = `[Contacto Web OLOBOC_] ${motive} - De: ${name}`;
      const textBody = `
Nuevo mensaje recibido a través de la web de OLOBOC_:
- Nombre: ${name}
- Email: ${email}
- Motivo: ${motive}

Mensaje:
${message}
      `.trim();

      if (this.transporter) {
        const info = await this.transporter.sendMail({
          from: config.email.fromEmail,
          to: config.contactForwardEmail,
          subject,
          text: textBody
        });
        await prisma.emailLog.create({
          data: {
            recipient: config.contactForwardEmail,
            subject,
            template: 'CONTACT_NOTIFICATION',
            status: 'SENT'
          }
        });
        return { success: true, simulated: false, messageId: info.messageId };
      } else {
        await prisma.emailLog.create({
          data: {
            recipient: config.contactForwardEmail,
            subject,
            template: 'CONTACT_NOTIFICATION',
            status: 'SIMULATED'
          }
        });
        console.log(`[MailService SIMULATION] Dispatched CONTACT_NOTIFICATION for ${name} (${motive}).`);
        return { success: true, simulated: true };
      }
    } catch (err: any) {
      console.error(`[MailService ERROR] Failed to send contact notification:`, err);
      return { success: false, simulated: false, error: err.message };
    }
  }
}

export const mailService = new MailService();
