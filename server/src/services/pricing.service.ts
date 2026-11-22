import { prisma } from '../db/prisma.js';

export interface PriceBreakdown {
  photoCount: number;
  unitPriceCents: number;
  baseTotalCents: number;
  discountCents: number;
  subtotalCents: number;
  tipAmountCents: number;
  totalCents: number;
  appliedPackName: string | null;
  savingsCents: number;
  verifiedPhotos: Array<{
    id: string;
    originalFilename: string;
    storageKeyThumbnail: string;
    eventId: string;
  }>;
}

export class PricingService {
  /**
   * Retrieves current base individual photo price in cents from database settings
   */
  async getBaseUnitPriceCents(): Promise<number> {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'BASE_PHOTO_PRICE_CENTS' }
    });
    if (setting && !isNaN(parseInt(setting.value, 10))) {
      return parseInt(setting.value, 10);
    }
    return 149; // Default 1.49 €
  }

  /**
   * Verifies photo availability and calculates the best commercial price strictly on server
   */
  async calculateQuote(photoIds: string[], tipCents: number = 0): Promise<PriceBreakdown> {
    const uniqueIds = Array.from(new Set(photoIds));

    if (uniqueIds.length === 0) {
      const unitPrice = await this.getBaseUnitPriceCents();
      return {
        photoCount: 0,
        unitPriceCents: unitPrice,
        baseTotalCents: 0,
        discountCents: 0,
        subtotalCents: 0,
        tipAmountCents: 0,
        totalCents: 0,
        appliedPackName: null,
        savingsCents: 0,
        verifiedPhotos: []
      };
    }

    // 1. Fetch and verify photos from database
    const photos = await prisma.photo.findMany({
      where: {
        id: { in: uniqueIds },
        isPublished: true,
        isCommercial: true
      },
      select: {
        id: true,
        originalFilename: true,
        storageKeyThumbnail: true,
        eventId: true
      }
    });

    if (photos.length !== uniqueIds.length) {
      throw new Error('Una o más fotografías seleccionadas no están disponibles para venta.');
    }

    const count = photos.length;
    const unitPriceCents = await this.getBaseUnitPriceCents();
    const baseTotalCents = count * unitPriceCents;

    // 2. Fetch active packs ordered by photo count
    const activePacks = await prisma.pack.findMany({
      where: { isActive: true },
      orderBy: { photoCount: 'desc' }
    });

    // 3. Optimal pricing algorithm (dynamic programming over combinations of packs + single unit prices)
    // dp[i] = minimum cost in cents for i photos
    // packChoice[i] = which pack was used to reach i photos (or 'UNIT')
    const dp: number[] = new Array(count + 1).fill(Infinity);
    const packChoice: (string | null)[] = new Array(count + 1).fill(null);

    dp[0] = 0;

    for (let i = 1; i <= count; i++) {
      // Option A: Single photo added to dp[i-1]
      dp[i] = dp[i - 1] + unitPriceCents;

      // Option B: Check all packs that can cover part of the selection
      for (const pack of activePacks) {
        if (i >= pack.photoCount) {
          const costWithPack = dp[i - pack.photoCount] + pack.priceCents;
          if (costWithPack < dp[i]) {
            dp[i] = costWithPack;
            packChoice[i] = pack.name;
          }
        }
      }
    }

    const subtotalCents = dp[count];
    const discountCents = Math.max(0, baseTotalCents - subtotalCents);
    const validatedTip = Math.max(0, Math.floor(tipCents || 0));
    const totalCents = subtotalCents + validatedTip;

    return {
      photoCount: count,
      unitPriceCents,
      baseTotalCents,
      discountCents,
      subtotalCents,
      tipAmountCents: validatedTip,
      totalCents,
      appliedPackName: packChoice[count],
      savingsCents: discountCents,
      verifiedPhotos: photos
    };
  }
}

export const pricingService = new PricingService();
