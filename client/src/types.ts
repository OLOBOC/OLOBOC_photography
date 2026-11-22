export interface EventCover {
  previewUrl: string;
  thumbnailUrl: string;
}

export interface EventItem {
  id: string;
  slug: string;
  name: string;
  location: string;
  date: string;
  season: number;
  category: string;
  description: string;
  photoCount: number;
  coverPhoto: EventCover | null;
}

export interface PhotoItem {
  id: string;
  filename: string;
  previewUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  isCover: boolean;
  isCommercial: boolean;
  bibs: string[];
}

export interface EventDetail extends EventItem {
  status: string;
  photos: PhotoItem[];
}

export interface BibSearchResult {
  detectionId: string;
  bibNumber: string;
  confidence: number;
  photoId: string;
  previewUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  eventName: string;
  eventSlug: string;
  eventLocation: string;
  eventDate: string;
}

export interface PriceQuote {
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

export interface OrderItemDetail {
  photoId: string;
  filename: string;
  previewUrl: string;
  thumbnailUrl: string;
  eventName: string;
  width: number;
  height: number;
  downloadUrl: string | null;
}

export interface OrderDetails {
  orderNumber: string;
  customerEmail: string;
  status: string;
  isPaid: boolean;
  isExpired: boolean;
  totalAmountCents: number;
  appliedPackName: string | null;
  downloadCount: number;
  maxDownloads: number;
  downloadExpiresAt: string;
  items: OrderItemDetail[];
}

export interface PackItem {
  id: string;
  name: string;
  photoCount: number;
  priceCents: number;
  isFeatured: boolean;
  isActive: boolean;
}

export interface AdminKPIs {
  totalEvents: number;
  publishedEvents: number;
  draftEvents: number;
  totalPhotos: number;
  publishedPhotos: number;
  pendingBibReviews: number;
  totalOrders: number;
  paidOrders: number;
  grossRevenueCents: number;
  grossRevenueFormatted: string;
}

export interface AdminDashboardData {
  kpis: AdminKPIs;
  photosBySeason: Array<{ year: number; count: number }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    details: string | null;
    createdAt: string;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerEmail: string;
    totalAmountCents: number;
    status: string;
    createdAt: string;
    _count: { items: number };
  }>;
}
