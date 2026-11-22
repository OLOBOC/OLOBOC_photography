import {
  EventItem,
  EventDetail,
  BibSearchResult,
  PriceQuote,
  OrderDetails,
  AdminDashboardData,
  PackItem
} from './types';

const API_BASE = '/api';

async function req<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    credentials: 'include'
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Error ${res.status}: ${res.statusText}`);
  }

  return data as T;
}

export const api = {
  // Public Events
  getEvents: (params?: { category?: string; season?: string; query?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set('category', params.category);
    if (params?.season) q.set('season', params.season);
    if (params?.query) q.set('query', params.query);
    return req<{ events: EventItem[] }>(`/events?${q.toString()}`);
  },

  getEventDetail: (slug: string) => req<EventDetail>(`/events/${slug}`),

  // Bib Search
  searchBib: (bib: string, eventId?: string) => {
    const q = new URLSearchParams({ bib });
    if (eventId) q.set('eventId', eventId);
    return req<{ count: number; bib: string; results: BibSearchResult[] }>(`/photos/search-bib?${q.toString()}`);
  },

  // Checkout & Pricing
  getPacks: () =>
    req<{ baseUnitPriceCents: number; packs: { id: string; name: string; photoCount: number; priceCents: number; isFeatured: boolean }[] }>(
      '/checkout/packs'
    ),

  getQuote: (photoIds: string[], tipCents: number = 0) =>
    req<PriceQuote>('/checkout/quote', {
      method: 'POST',
      body: JSON.stringify({ photoIds, tipCents })
    }),

  createCheckoutSession: (photoIds: string[], customerEmail: string, tipCents: number = 0) =>
    req<{ orderId: string; orderNumber: string; downloadToken: string; sessionUrl: string; isDevSimulation: boolean }>(
      '/checkout/create-session',
      {
        method: 'POST',
        body: JSON.stringify({ photoIds, customerEmail, tipCents })
      }
    ),

  simulatePaymentSuccess: (token: string) =>
    req<{ success: boolean; order: any }>('/checkout/dev-simulate-success', {
      method: 'POST',
      body: JSON.stringify({ token })
    }),

  getOrder: (token: string) => req<OrderDetails>(`/checkout/order/${token}`),

  lookupOrder: (email: string, orderNumber: string) =>
    req<{ success: boolean; downloadToken: string; orderNumber: string; status: string }>(
      '/checkout/lookup',
      {
        method: 'POST',
        body: JSON.stringify({ email, orderNumber })
      }
    ),

  // Contact & Takedowns
  sendContact: (data: { n: string; e: string; r: string; m: string; ok: boolean; web?: string; photoId?: string }) =>
    req<{ success: boolean; message: string }>('/contact', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Auth
  adminLogin: (email: string, password: string) =>
    req<{ success: boolean; token: string; admin: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  adminLogout: () => req<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  adminMe: () => req<{ admin: any }>('/auth/me'),

  // Admin Operations
  getAdminDashboard: () => req<AdminDashboardData>('/admin/dashboard'),

  getAdminEvents: () => req<{ events: any[] }>('/admin/events'),

  createAdminEvent: (data: any) =>
    req('/events', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateAdminEvent: (id: string, data: any) =>
    req(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteAdminEvent: (id: string) => req(`/events/${id}`, { method: 'DELETE' }),

  uploadAdminPhotos: async (eventId: string, files: File[], watermarkText?: string) => {
    const formData = new FormData();
    formData.append('eventId', eventId);
    if (watermarkText) formData.append('watermarkText', watermarkText);
    for (const f of files) {
      formData.append('photos', f);
    }

    const res = await fetch(`${API_BASE}/photos/admin/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Error subiendo fotos');
    return data;
  },

  getAdminEventPhotos: (eventId: string) => req<{ photos: any[] }>(`/admin/events/${eventId}/photos`),

  setAdminPhotoCover: (photoId: string) => req(`/photos/admin/${photoId}/cover`, { method: 'POST' }),

  deleteAdminPhoto: (photoId: string) => req(`/photos/admin/${photoId}`, { method: 'DELETE' }),

  batchDeleteAdminPhotos: (photoIds: string[]) =>
    req<{ success: boolean; count: number; message: string }>('/photos/admin/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ photoIds })
    }),

  addAdminBib: (photoId: string, bibNumber: string) =>
    req(`/photos/admin/${photoId}/bibs`, {
      method: 'POST',
      body: JSON.stringify({ bibNumber })
    }),

  confirmAdminBib: (detectionId: string, bibNumber?: string) =>
    req(`/photos/admin/bibs/${detectionId}/confirm`, {
      method: 'PUT',
      body: JSON.stringify({ bibNumber })
    }),

  rejectAdminBib: (detectionId: string) =>
    req(`/photos/admin/bibs/${detectionId}/reject`, { method: 'PUT' }),

  deleteAdminBib: (detectionId: string) => req(`/photos/admin/bibs/${detectionId}`, { method: 'DELETE' }),

  getAdminBibReview: (params?: { status?: string; eventId?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.eventId) sp.set('eventId', params.eventId);
    if (params?.page) sp.set('page', String(params.page));
    if (params?.limit) sp.set('limit', String(params.limit));
    const qs = sp.toString();
    return req<{ pendingCount: number; totalCount: number; page: number; limit: number; detections: any[] }>(
      `/admin/bib-review${qs ? `?${qs}` : ''}`
    );
  },

  batchConfirmBibs: (detectionIds: string[]) =>
    req<{ success: boolean; count: number }>('/admin/bib-review/batch-confirm', {
      method: 'POST',
      body: JSON.stringify({ detectionIds })
    }),

  batchRejectBibs: (detectionIds: string[]) =>
    req<{ success: boolean; count: number }>('/admin/bib-review/batch-reject', {
      method: 'POST',
      body: JSON.stringify({ detectionIds })
    }),

  reprocessEventOcr: (eventId: string, forceAll: boolean = false) =>
    req<{ success: boolean; message: string; queuedCount: number }>(`/admin/events/${eventId}/reprocess-ocr`, {
      method: 'POST',
      body: JSON.stringify({ forceAll })
    }),

  getEventOcrProgress: (eventId: string) =>
    req<{
      total: number;
      queued: number;
      processing: number;
      completed: number;
      failed: number;
      bibsCount: number;
      progressPercent: number;
      isRunning: boolean;
    }>(`/admin/events/${eventId}/ocr-progress`),

  reprocessPhotoOcr: (photoId: string) =>
    req<{ success: boolean; message: string }>(`/admin/photos/${photoId}/reprocess-ocr`, { method: 'POST' }),

  getAdminOrders: (status?: string) => req<{ orders: any[] }>(`/admin/orders${status ? `?status=${status}` : ''}`),

  refundAdminOrder: (orderId: string) => req(`/admin/orders/${orderId}/refund`, { method: 'POST' }),

  getAdminSettings: () => req<{ settings: Record<string, string> }>('/admin/settings'),

  updateAdminSettings: (settings: Record<string, string>) =>
    req('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings })
    }),

  getAdminPacks: () => req<{ packs: PackItem[] }>('/admin/packs'),

  createAdminPack: (data: any) =>
    req('/admin/packs', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateAdminPack: (id: string, data: any) =>
    req(`/admin/packs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteAdminPack: (id: string) => req(`/admin/packs/${id}`, { method: 'DELETE' }),

  getAdminTakedowns: () => req<{ takedowns: any[] }>('/admin/takedowns'),

  updateAdminTakedown: (id: string, data: any) =>
    req(`/admin/takedowns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
};
