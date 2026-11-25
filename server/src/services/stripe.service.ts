import Stripe from 'stripe';
import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { config } from '../config.js';
import { pricingService } from './pricing.service.js';
import { mailService } from './mail.service.js';

export class StripeService {
  private stripe: Stripe | null = null;

  constructor() {
    if (config.stripeSecretKey && config.stripeSecretKey !== 'sk_test_placeholder') {
      this.stripe = new Stripe(config.stripeSecretKey, {
        apiVersion: '2025-02-24.acacia' as any
      });
    }
  }

  private generateOrderNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `OLB-${date}-${rand}`;
  }

  /**
   * Creates a verified pending Order in DB and a Stripe Checkout Session
   */
  async createCheckoutSession(params: {
    photoIds: string[];
    customerEmail: string;
    tipCents?: number;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const { photoIds, customerEmail, tipCents = 0, ipAddress, userAgent } = params;

    // 1. Calculate price strictly on server
    const quote = await pricingService.calculateQuote(photoIds, tipCents);

    if (quote.totalCents <= 0) {
      throw new Error('El importe del pedido no es válido.');
    }

    // 2. Prepare Order Data
    const orderNumber = this.generateOrderNumber();
    const downloadToken = crypto.randomBytes(32).toString('hex');
    const downloadExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // 3. Create Pending Order in Database
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerEmail: customerEmail.trim().toLowerCase(),
        totalAmountCents: quote.totalCents,
        status: 'PENDING',
        downloadToken,
        downloadExpiresAt,
        maxDownloads: Math.max(10, quote.photoCount * 3),
        appliedPackName: quote.appliedPackName,
        tipAmountCents: quote.tipAmountCents,
        ipAddress,
        userAgent,
        items: {
          create: quote.verifiedPhotos.map((p) => ({
            photoId: p.id,
            priceCents: Math.round(quote.subtotalCents / quote.photoCount)
          }))
        }
      }
    });

    // 4. Construct Stripe Checkout Session
    if (!this.stripe) {
      // In development when Stripe keys aren't configured yet, provide local dev checkout simulation
      console.warn('[Stripe] Stripe is running in DEV / SIMULATION mode because real API key is unset.');
      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        downloadToken: order.downloadToken,
        isDevSimulation: true,
        sessionUrl: `${config.clientUrl}/#order-success?token=${downloadToken}&simulated=true`
      };
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: `OLOBOC_ Fotografías Motorsport (${quote.photoCount} foto${quote.photoCount > 1 ? 's' : ''})`,
            description: quote.appliedPackName
              ? `Incluye ${quote.appliedPackName} (Ahorro: ${(quote.savingsCents / 100).toFixed(2)} €). Licencia digital de alta resolución sin marca de agua.`
              : 'Licencia digital de alta resolución sin marca de agua.'
          },
          unit_amount: quote.subtotalCents
        },
        quantity: 1
      }
    ];

    if (quote.tipAmountCents > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Apoyo voluntario a OLOBOC_ Motorsport Photography',
            description: 'Aportación voluntaria para combustible, material y cobertura de eventos de motor.'
          },
          unit_amount: quote.tipAmountCents
        },
        quantity: 1
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: customerEmail,
      client_reference_id: order.id,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        downloadToken: order.downloadToken
      },
      line_items: lineItems,
      mode: 'payment',
      success_url: `${config.clientUrl}/#order-success?token=${downloadToken}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.clientUrl}/#home?cancelled=true`
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id }
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      downloadToken: order.downloadToken,
      sessionUrl: session.url,
      isDevSimulation: false
    };
  }

  /**
   * Processes verified Stripe Webhook event with idempotency
   */
  async handleWebhook(rawBody: Buffer, signature: string) {
    if (!this.stripe) {
      throw new Error('Stripe is not initialized');
    }

    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.stripeWebhookSecret
    );

    // 1. Idempotency Check
    const existing = await prisma.paymentWebhookEvent.findUnique({
      where: { stripeEventId: event.id }
    });

    if (existing) {
      console.log(`[Stripe Webhook] Duplicate event ${event.id} already processed. Skipping.`);
      return { received: true, duplicate: true };
    }

    // 2. Process relevant event types
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.client_reference_id || session.metadata?.orderId;

      if (orderId) {
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (order && order.status !== 'PAID') {
          await prisma.order.update({
            where: { id: orderId },
            data: {
              status: 'PAID',
              stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null
            }
          });
          console.log(`[Stripe Webhook] Order ${order.orderNumber} successfully marked as PAID.`);

          // Asynchronously dispatch transactional confirmation email
          mailService.sendOrderConfirmation(orderId).catch((err) => {
            console.error('[Stripe Webhook] Failed to dispatch order confirmation email:', err);
          });
        }
      }
    } else if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
      if (paymentIntentId) {
        const order = await prisma.order.findFirst({ where: { stripePaymentIntentId: paymentIntentId } });
        if (order && order.status !== 'REFUNDED') {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: 'REFUNDED',
              refundedAt: new Date(),
              downloadExpiresAt: new Date(0)
            }
          });
          console.log(`[Stripe Webhook] Order ${order.orderNumber} marked as REFUNDED.`);
          mailService.sendRefundNotice(order.id, 'Reembolso confirmado por pasarela').catch((err) => {
            console.error('[Stripe Webhook] Failed to dispatch refund notice email:', err);
          });
        }
      }
    }

    // 3. Record processed event
    await prisma.paymentWebhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        payload: JSON.stringify(event)
      }
    });

    return { received: true };
  }

  /**
   * For local testing / development simulation: confirms order as paid
   */
  async simulatePaymentCompletion(downloadToken: string) {
    const order = await prisma.order.findUnique({ where: { downloadToken } });
    if (!order) throw new Error('Pedido no encontrado');

    if (order.status !== 'PAID') {
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAID' }
      });
      console.log(`[Dev Simulation] Order ${order.orderNumber} marked as PAID via dev confirmation.`);

      // Asynchronously dispatch transactional confirmation email
      mailService.sendOrderConfirmation(order.id).catch((err) => {
        console.error('[Dev Simulation] Failed to dispatch order confirmation email:', err);
      });

      return updated;
    }

    return order;
  }

  /**
   * Processes an administrative refund with Stripe API integration & access revocation
   */
  async refundOrder(orderId: string, reason?: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Pedido no encontrado');
    if (order.status === 'REFUNDED') throw new Error('Este pedido ya ha sido reembolsado previamente');
    if (order.status !== 'PAID') throw new Error('Solo se pueden reembolsar pedidos pagados');

    let stripeRefundId: string | null = null;
    if (this.stripe && order.stripePaymentIntentId) {
      try {
        const refund = await this.stripe.refunds.create({
          payment_intent: order.stripePaymentIntentId,
          reason: 'requested_by_customer'
        });
        stripeRefundId = refund.id;
        console.log(`[Stripe] Created real refund ${refund.id} for order ${order.orderNumber}`);
      } catch (err: any) {
        console.error(`[Stripe] Error creating real refund for order ${order.orderNumber}:`, err);
        throw new Error(`Error en pasarela Stripe al reembolsar: ${err.message}`);
      }
    } else {
      console.log(`[Stripe DEV / SIMULATION] Simulated refund for order ${order.orderNumber}`);
    }

    // Atomically update DB state and revoke downloads immediately
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
        refundReason: reason || 'Reembolso administrativo',
        downloadExpiresAt: new Date(0)
      }
    });

    // Dispatch transactional refund email
    mailService.sendRefundNotice(order.id, reason).catch((err) => {
      console.error('[Refund] Failed to dispatch refund notice email:', err);
    });

    return {
      success: true,
      order: updated,
      stripeRefundId,
      isDevSimulation: !this.stripe
    };
  }
}

export const stripeService = new StripeService();
