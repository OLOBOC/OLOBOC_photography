import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { AdminDashboardData, PackItem } from '../types';
import { useCart } from '../context/CartContext';

interface AdminPageProps {
  onNavigate: (route: string) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onNavigate }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [adminUser, setAdminUser] = useState<any>(null);

  // Login form
  const [loginEmail, setLoginEmail] = useState('admin@oloboc.com');
  const [loginPassword, setLoginPassword] = useState('Admin_Oloboc_2026!');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'events' | 'upload' | 'photos' | 'bibs' | 'orders' | 'settings' | 'packs' | 'takedowns'
  >('dashboard');

  // Data states
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [eventPhotos, setEventPhotos] = useState<any[]>([]);
  const [bibReviewList, setBibReviewList] = useState<any[]>([]);
  const [bibReviewTotal, setBibReviewTotal] = useState<number>(0);
  const [bibFilterStatus, setBibFilterStatus] = useState<string>('DETECTED');
  const [bibFilterEvent, setBibFilterEvent] = useState<string>('all');
  const [selectedBibIds, setSelectedBibIds] = useState<string[]>([]);
  const [editingBibId, setEditingBibId] = useState<string | null>(null);
  const [editingBibValue, setEditingBibValue] = useState<string>('');
  const [ocrProgress, setOcrProgress] = useState<any>(null);
  const [isReprocessing, setIsReprocessing] = useState<boolean>(false);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [orderFilterStatus, setOrderFilterStatus] = useState<string>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any | null>(null);
  const [isRefunding, setIsRefunding] = useState<boolean>(false);
  const [packsList, setPacksList] = useState<PackItem[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [takedownsList, setTakedownsList] = useState<any[]>([]);

  // Modals & form state
  const [eventModal, setEventModal] = useState<{ open: boolean; event?: any }>({ open: false });
  const [eventForm, setEventForm] = useState({ name: '', location: '', date: '', category: 'Rally', description: '', status: 'PUBLISHED' });
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadQueue, setUploadQueue] = useState<
    { id: string; file: File; preview: string; status: 'PENDING' | 'UPLOADING' | 'DONE' | 'ERROR'; error?: string }[]
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Photos management inside event
  const [photosViewMode, setPhotosViewMode] = useState<'grid' | 'list'>('grid');
  const [photosSearchQuery, setPhotosSearchQuery] = useState('');
  const [photosOcrFilter, setPhotosOcrFilter] = useState('ALL');
  const [selectedEventPhotoIds, setSelectedEventPhotoIds] = useState<string[]>([]);

  // Focus Review Mode (consecutive one-by-one with keyboard shortcuts)
  const [focusReviewIndex, setFocusReviewIndex] = useState<number | null>(null);

  const { showToast } = useCart();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setCheckingAuth(true);
      const res = await api.adminMe();
      if (res && res.admin) {
        setIsAuthenticated(true);
        setAdminUser(res.admin);
        loadInitialData();
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      setIsLoggingIn(true);
      const res = await api.adminLogin(loginEmail, loginPassword);
      setIsAuthenticated(true);
      setAdminUser(res.admin);
      showToast('Sesión de administración iniciada');
      loadInitialData();
    } catch (err: any) {
      setLoginError(err.message || 'Credenciales inválidas');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.adminLogout();
      setIsAuthenticated(false);
      setAdminUser(null);
      showToast('Sesión cerrada');
    } catch (e) {
      console.error(e);
    }
  };

  const loadInitialData = async () => {
    try {
      const [dash, evts, packs, sets, bibs, orders, takedowns] = await Promise.all([
        api.getAdminDashboard(),
        api.getAdminEvents(),
        api.getAdminPacks(),
        api.getAdminSettings(),
        api.getAdminBibReview(),
        api.getAdminOrders(),
        api.getAdminTakedowns()
      ]);

      setDashboardData(dash);
      setEventsList(evts.events);
      if (evts.events.length > 0) {
        setSelectedEventId(evts.events[0].id);
        loadEventPhotos(evts.events[0].id);
      }
      setPacksList(packs.packs);
      setSettingsMap(sets.settings);
      setBibReviewList(bibs.detections);
      setOrdersList(orders.orders);
      setTakedownsList(takedowns.takedowns);
    } catch (err) {
      console.error('Error loading admin data:', err);
    }
  };

  const loadEventPhotos = async (eventId: string) => {
    try {
      const res = await api.getAdminEventPhotos(eventId);
      setEventPhotos(res.photos);
    } catch (e) {
      console.error(e);
    }
  };

  // Event actions
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (eventModal.event) {
        await api.updateAdminEvent(eventModal.event.id, eventForm);
        showToast('Evento actualizado');
      } else {
        await api.createAdminEvent(eventForm);
        showToast('Nuevo evento creado');
      }
      setEventModal({ open: false });
      const evts = await api.getAdminEvents();
      setEventsList(evts.events);
    } catch (err: any) {
      alert(err.message || 'Error guardando evento');
    }
  };

  const handleDeleteEvent = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el evento "${name}" y todas sus fotografías?`)) return;
    try {
      await api.deleteAdminEvent(id);
      showToast('Evento eliminado');
      const evts = await api.getAdminEvents();
      setEventsList(evts.events);
    } catch (e: any) {
      alert(e.message || 'Error al eliminar');
    }
  };

  // Upload photos queue handlers
  const handleSelectUploadFiles = (files: File[]) => {
    const newItems = files.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      preview: URL.createObjectURL(file),
      status: 'PENDING' as const
    }));
    setUploadQueue((prev) => [...prev, ...newItems]);
  };

  const handlePhotoUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return alert('Selecciona un evento de destino');
    const pendingItems = uploadQueue.filter((it) => it.status === 'PENDING' || it.status === 'ERROR');
    if (pendingItems.length === 0) return alert('No hay archivos pendientes de subir en la cola');

    setIsUploading(true);
    let completedCount = uploadQueue.filter((it) => it.status === 'DONE').length;
    const totalCount = uploadQueue.length;

    // Process sequentially in safe chunks of 2 files to avoid memory exhaustion
    const CHUNK_SIZE = 2;
    for (let i = 0; i < pendingItems.length; i += CHUNK_SIZE) {
      const chunk = pendingItems.slice(i, i + CHUNK_SIZE);
      const chunkIds = new Set(chunk.map((c) => c.id));

      // Mark chunk as UPLOADING
      setUploadQueue((prev) =>
        prev.map((item) => (chunkIds.has(item.id) ? { ...item, status: 'UPLOADING' } : item))
      );

      try {
        await api.uploadAdminPhotos(
          selectedEventId,
          chunk.map((c) => c.file),
          settingsMap.WATERMARK_TEXT
        );

        completedCount += chunk.length;
        setUploadProgress(Math.round((completedCount / totalCount) * 100));

        setUploadQueue((prev) =>
          prev.map((item) => (chunkIds.has(item.id) ? { ...item, status: 'DONE' } : item))
        );
      } catch (err: any) {
        setUploadQueue((prev) =>
          prev.map((item) =>
            chunkIds.has(item.id) ? { ...item, status: 'ERROR', error: err.message || 'Error en subida' } : item
          )
        );
      }
    }

    setIsUploading(false);
    showToast(`Lote procesado. Fotografías incorporadas al evento.`);
    loadEventPhotos(selectedEventId);
    loadBibReviewList();
  };

  // Batch delete photos
  const handleBatchDeletePhotos = async () => {
    if (selectedEventPhotoIds.length === 0) return;
    if (
      !window.confirm(
        `¿Confirmas la eliminación permanente de ${selectedEventPhotoIds.length} fotografías seleccionadas y todos sus archivos?`
      )
    ) {
      return;
    }
    try {
      await api.batchDeleteAdminPhotos(selectedEventPhotoIds);
      showToast(`${selectedEventPhotoIds.length} fotografías eliminadas`);
      setSelectedEventPhotoIds([]);
      loadEventPhotos(selectedEventId);
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Bib review actions
  const loadBibReviewList = async (status = bibFilterStatus, eventId = bibFilterEvent) => {
    try {
      const res = await api.getAdminBibReview({
        status: status !== 'ALL' ? status : undefined,
        eventId: eventId !== 'all' ? eventId : undefined
      });
      setBibReviewList(res.detections);
      setBibReviewTotal(res.totalCount || res.detections.length);
      setSelectedBibIds([]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmBib = async (detectionId: string, bibNumber?: string) => {
    try {
      await api.confirmAdminBib(detectionId, bibNumber);
      showToast('Dorsal verificado');
      loadBibReviewList();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRejectBib = async (detectionId: string) => {
    try {
      await api.rejectAdminBib(detectionId);
      showToast('Detección marcada como descartada (falso positivo)');
      loadBibReviewList();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteBib = async (detectionId: string) => {
    try {
      await api.deleteAdminBib(detectionId);
      showToast('Detección eliminada');
      setBibReviewList((prev) => prev.filter((d) => d.id !== detectionId));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleBatchConfirm = async () => {
    if (selectedBibIds.length === 0) return;
    try {
      await api.batchConfirmBibs(selectedBibIds);
      showToast(`${selectedBibIds.length} dorsales confirmados`);
      loadBibReviewList();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleBatchReject = async () => {
    if (selectedBibIds.length === 0) return;
    try {
      await api.batchRejectBibs(selectedBibIds);
      showToast(`${selectedBibIds.length} detecciones descartadas`);
      loadBibReviewList();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleReprocessEventOcr = async (eventId: string) => {
    if (!eventId) return;
    try {
      setIsReprocessing(true);
      const res = await api.reprocessEventOcr(eventId, false);
      showToast(res.message);

      const timer = setInterval(async () => {
        try {
          const prog = await api.getEventOcrProgress(eventId);
          setOcrProgress(prog);
          if (!prog.isRunning) {
            clearInterval(timer);
            setIsReprocessing(false);
            showToast('Reconocimiento por visión artificial completado');
            loadBibReviewList();
          }
        } catch {
          clearInterval(timer);
          setIsReprocessing(false);
        }
      }, 1500);
    } catch (e: any) {
      setIsReprocessing(false);
      alert(e.message);
    }
  };

  // Orders management actions
  const loadOrders = async (status = orderFilterStatus, search = orderSearchQuery) => {
    try {
      const res = await api.getAdminOrders({
        status: status !== 'all' ? status : undefined,
        search: search.trim() || undefined
      });
      setOrdersList(res.orders);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRefundOrder = async (orderId: string, orderNumber: string) => {
    const reason = window.prompt(`¿Motivo del reembolso para el pedido ${orderNumber}?`, 'Solicitado por el cliente');
    if (reason === null) return;

    try {
      setIsRefunding(true);
      const res = await api.refundAdminOrder(orderId, reason);
      showToast(`Pedido ${orderNumber} reembolsado correctamente`);
      if (res.stripeRefundId) {
        showToast(`Stripe Refund ID: ${res.stripeRefundId}`);
      }
      setSelectedOrderDetail(null);
      await loadOrders();
    } catch (e: any) {
      alert(`Error al procesar el reembolso: ${e.message}`);
    } finally {
      setIsRefunding(false);
    }
  };

  // Settings action
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateAdminSettings(settingsMap);
      showToast('Ajustes del sistema guardados');
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (checkingAuth) {
    return (
      <div className="page-pad">
        <p className="font-mono">Verificando sesión segura de administrador…</p>
      </div>
    );
  }

  // Login view if unauthenticated
  if (!isAuthenticated) {
    return (
      <div className="page-pad" style={{ maxWidth: '440px', margin: '40px auto 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <span className="font-display" style={{ fontSize: '48px' }}>
            OLOBOC<i>_</i> <span style={{ color: 'var(--ac)' }}>ADMIN</span>
          </span>
          <p className="font-mono" style={{ color: 'var(--mut)', marginTop: '6px' }}>
            Acceso privado · Plataforma por Nortcode
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          style={{
            background: 'var(--bg2)',
            border: '1px solid var(--line)',
            padding: '28px',
            display: 'grid',
            gap: '16px'
          }}
        >
          <div>
            <label className="font-mono" style={{ display: 'block', marginBottom: '6px' }}>
              Email de administrador:
            </label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="font-mono" style={{ display: 'block', marginBottom: '6px' }}>
              Contraseña segura:
            </label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />
          </div>

          {loginError && (
            <div style={{ color: 'var(--danger)', fontSize: '13px' }}>{loginError}</div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="btn btn-primary"
            style={{ marginTop: '8px', padding: '14px' }}
          >
            {isLoggingIn ? 'ACCEDIENDO…' : 'INICIAR SESIÓN'}
          </button>
        </form>

        <p className="font-mono" style={{ textAlign: 'center', fontSize: '10px', marginTop: '16px', color: 'var(--mut)' }}>
          Credenciales de desarrollo: admin@oloboc.com / Admin_Oloboc_2026!
        </p>
      </div>
    );
  }

  // Admin Dashboard Interface
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100vh', background: '#0a0b0d' }}>
      {/* Sidebar Navigation */}
      <aside
        style={{
          borderRight: '1px solid var(--line)',
          background: 'var(--bg2)',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto'
        }}
      >
        <div style={{ padding: '0 8px 20px', borderBottom: '1px solid var(--line)', marginBottom: '10px' }}>
          <span className="font-display" style={{ fontSize: '28px' }}>
            OLOBOC<i>_</i> <span style={{ color: 'var(--ac)', fontSize: '16px' }}>admin</span>
          </span>
          <span className="font-mono" style={{ display: 'block', fontSize: '9px', color: 'var(--mut)', marginTop: '4px' }}>
            {adminUser?.email}
          </span>
        </div>

        {[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'events', label: 'Gestión Eventos' },
          { id: 'upload', label: 'Subir Fotos' },
          { id: 'photos', label: 'Galería & Fotos' },
          { id: 'bibs', label: `Revisión Dorsales (${bibReviewList.length})` },
          { id: 'orders', label: 'Pedidos & Ventas' },
          { id: 'settings', label: 'Ajustes & Precios' },
          { id: 'packs', label: 'Gestión Packs' },
          { id: 'takedowns', label: `Derechos Imagen (${takedownsList.filter(t => t.status === 'PENDING').length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className="font-mono"
            style={{
              textAlign: 'left',
              padding: '12px 14px',
              borderRadius: '2px',
              color: activeTab === tab.id ? '#fff' : 'var(--mut)',
              background: activeTab === tab.id ? 'rgba(232, 67, 31, 0.15)' : 'transparent',
              borderLeft: activeTab === tab.id ? '3px solid var(--ac)' : '3px solid transparent',
              fontSize: '11px',
              transition: 'all 0.15s'
            }}
          >
            {tab.label}
          </button>
        ))}

        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--line)', display: 'grid', gap: '8px' }}>
          <button onClick={() => onNavigate('home')} className="btn btn-sm btn-outline" style={{ width: '100%' }}>
            ← VER WEB PÚBLICA
          </button>
          <button onClick={handleLogout} className="btn btn-sm" style={{ width: '100%', color: 'var(--danger)' }}>
            CERRAR SESIÓN
          </button>
        </div>
      </aside>

      {/* Main Admin Workspace */}
      <main style={{ padding: '36px 40px', overflowY: 'auto' }}>
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && dashboardData && (
          <div>
            <div className="font-mono">Control Panel</div>
            <h1 className="font-display" style={{ fontSize: '56px', margin: '4px 0 24px' }}>
              Dashboard de rendimiento
            </h1>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '32px' }}>
              <div style={{ background: 'var(--bg2)', padding: '20px', border: '1px solid var(--line)' }}>
                <span className="font-mono">Ingresos Pagados</span>
                <span className="font-display" style={{ fontSize: '44px', display: 'block', color: 'var(--ac)', marginTop: '6px' }}>
                  {dashboardData.kpis.grossRevenueFormatted}
                </span>
              </div>
              <div style={{ background: 'var(--bg2)', padding: '20px', border: '1px solid var(--line)' }}>
                <span className="font-mono">Pedidos Pagados</span>
                <span className="font-display" style={{ fontSize: '44px', display: 'block', marginTop: '6px' }}>
                  {dashboardData.kpis.paidOrders} / {dashboardData.kpis.totalOrders}
                </span>
              </div>
              <div style={{ background: 'var(--bg2)', padding: '20px', border: '1px solid var(--line)' }}>
                <span className="font-mono">Fotos Publicadas</span>
                <span className="font-display" style={{ fontSize: '44px', display: 'block', marginTop: '6px' }}>
                  {dashboardData.kpis.publishedPhotos}
                </span>
              </div>
              <div style={{ background: 'var(--bg2)', padding: '20px', border: '1px solid var(--line)' }}>
                <span className="font-mono">Eventos Activos</span>
                <span className="font-display" style={{ fontSize: '44px', display: 'block', marginTop: '6px' }}>
                  {dashboardData.kpis.publishedEvents}
                </span>
              </div>
            </div>

            {/* Photos per season & Activity */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
              <div style={{ background: 'var(--bg2)', padding: '24px', border: '1px solid var(--line)' }}>
                <h3 className="font-display" style={{ fontSize: '28px', marginBottom: '16px' }}>
                  Fotografías por temporada
                </h3>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', height: '140px', paddingTop: '20px' }}>
                  {dashboardData.photosBySeason.map((s) => (
                    <div key={s.year} style={{ flex: 1, textAlign: 'center' }}>
                      <div
                        style={{
                          height: `${Math.max(12, Math.min(100, (s.count / Math.max(1, dashboardData.kpis.totalPhotos)) * 100))}px`,
                          background: 'var(--ac)',
                          margin: '0 auto 8px',
                          width: '40px'
                        }}
                      />
                      <span className="font-mono" style={{ fontSize: '10px' }}>
                        {s.year} ({s.count})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: 'var(--bg2)', padding: '24px', border: '1px solid var(--line)' }}>
                <h3 className="font-display" style={{ fontSize: '28px', marginBottom: '16px' }}>
                  Últimos pedidos registrados
                </h3>
                {dashboardData.recentOrders.length === 0 ? (
                  <p className="font-mono" style={{ color: 'var(--mut)' }}>No hay pedidos registrados todavía.</p>
                ) : (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {dashboardData.recentOrders.map((o) => (
                      <div
                        key={o.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderTop: '1px solid var(--line)'
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '13px' }}>{o.orderNumber}</strong>
                          <span className="font-mono" style={{ display: 'block', fontSize: '9px' }}>
                            {o.customerEmail} · {o._count.items} fotos
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 600, color: 'var(--ac)' }}>
                            {(o.totalAmountCents / 100).toFixed(2)} €
                          </span>
                          <span
                            className={`pill ${o.status === 'PAID' ? 'pill-success' : 'pill-warning'}`}
                            style={{ display: 'block', marginTop: '2px', fontSize: '9px' }}
                          >
                            {o.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EVENTS MANAGEMENT */}
        {activeTab === 'events' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <div className="font-mono">Motorsport Events</div>
                <h1 className="font-display" style={{ fontSize: '56px', margin: 0 }}>
                  Gestión de eventos
                </h1>
              </div>
              <button
                onClick={() => {
                  setEventForm({ name: '', location: '', date: new Date().toISOString().slice(0, 10), category: 'Rally', description: '', status: 'PUBLISHED' });
                  setEventModal({ open: true });
                }}
                className="btn btn-primary"
              >
                + NUEVO EVENTO
              </button>
            </div>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>NOMBRE</th>
                  <th>CATEGORÍA</th>
                  <th>FECHA</th>
                  <th>ESTADO</th>
                  <th>FOTOS</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {eventsList.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <strong>{e.name}</strong>
                      <span className="font-mono" style={{ display: 'block', fontSize: '10px' }}>
                        {e.location}
                      </span>
                    </td>
                    <td><span className="pill">{e.category}</span></td>
                    <td className="font-mono">{new Date(e.date).toLocaleDateString('es-ES')}</td>
                    <td>
                      <span className={`pill ${e.status === 'PUBLISHED' ? 'pill-success' : 'pill-warning'}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="font-mono">{e.photoCount}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => {
                            setEventForm({
                              name: e.name,
                              location: e.location,
                              date: new Date(e.date).toISOString().slice(0, 10),
                              category: e.category,
                              description: e.description,
                              status: e.status
                            });
                            setEventModal({ open: true, event: e });
                          }}
                          className="btn btn-sm btn-outline"
                        >
                          EDITAR
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(e.id, e.name)}
                          className="btn btn-sm"
                          style={{ color: 'var(--danger)' }}
                        >
                          ELIMINAR
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: UPLOAD PHOTOS WITH PROGRESSIVE CHUNKING & PREVIEW */}
        {activeTab === 'upload' && (
          <div>
            <div className="font-mono" style={{ color: 'var(--ac)' }}>PIPELINE DE SUBIDA MASIVA</div>
            <h1 className="font-display" style={{ fontSize: 'clamp(40px, 6vw, 64px)', margin: '4px 0 20px' }}>
              Subida de fotografías
            </h1>

            <div style={{ maxWidth: '880px', display: 'grid', gap: '20px' }}>
              <div>
                <label className="font-mono" style={{ display: 'block', marginBottom: '8px' }}>
                  1. Evento de destino:
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => {
                    setSelectedEventId(e.target.value);
                    loadEventPhotos(e.target.value);
                  }}
                  required
                  style={{ maxWidth: '440px' }}
                >
                  {eventsList.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.category} · {new Date(e.date).toLocaleDateString('es-ES')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-mono" style={{ display: 'block', marginBottom: '8px' }}>
                  2. Arrastra fotografías o selecciona del explorador (JPEG / PNG / WebP):
                </label>
                <div
                  style={{
                    border: '2px dashed var(--line)',
                    padding: '36px 20px',
                    textAlign: 'center',
                    background: 'var(--bg2)',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s'
                  }}
                  onClick={() => document.getElementById('photo-upload-input')?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files) {
                      handleSelectUploadFiles(Array.from(e.dataTransfer.files));
                    }
                  }}
                >
                  <input
                    id="photo-upload-input"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files) {
                        handleSelectUploadFiles(Array.from(e.target.files));
                      }
                    }}
                  />
                  <span style={{ fontSize: '36px' }}>📁</span>
                  <p className="font-display" style={{ fontSize: '26px', margin: '8px 0 4px' }}>
                    Arrastra aquí tus fotos de carrera o pulsa para examinar
                  </p>
                  <p className="font-mono" style={{ fontSize: '10px', color: 'var(--mut)' }}>
                    El servidor procesa en streaming por lotes seguros, genera marcas de agua digitales y encola el OCR automáticamente.
                  </p>
                </div>
              </div>

              {/* Upload Queue Previews */}
              {uploadQueue.length > 0 && (
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--line)', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <span className="font-mono" style={{ color: 'var(--ink)' }}>
                      Cola de subida: {uploadQueue.length} archivo{uploadQueue.length !== 1 ? 's' : ''} ({uploadQueue.filter((it) => it.status === 'DONE').length} completados)
                    </span>
                    {!isUploading && (
                      <button
                        onClick={() => setUploadQueue([])}
                        className="btn btn-sm btn-outline"
                        style={{ padding: '4px 10px', fontSize: '10px' }}
                      >
                        VACIAR COLA ✕
                      </button>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {isUploading && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ height: '8px', background: 'var(--line)', overflow: 'hidden' }}>
                        <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--ac)', transition: 'width 0.3s' }} />
                      </div>
                      <span className="font-mono" style={{ fontSize: '10px', marginTop: '6px', display: 'block', color: 'var(--ac)' }}>
                        Subiendo y procesando lote: {uploadProgress}% completado…
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', maxHeight: '280px', overflowY: 'auto', padding: '6px' }}>
                    {uploadQueue.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          background: 'var(--bg)',
                          border: item.status === 'DONE' ? '1px solid var(--success)' : item.status === 'ERROR' ? '1px solid var(--danger)' : '1px solid var(--line)',
                          padding: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          position: 'relative'
                        }}
                      >
                        <div style={{ aspectRatio: '3/2', overflow: 'hidden', background: '#000' }}>
                          <img src={item.preview} alt={item.file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span className="font-mono" style={{ fontSize: '9px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.file.name}
                        </span>
                        <span
                          className={`pill ${item.status === 'DONE' ? 'pill-success' : item.status === 'ERROR' ? 'pill-danger' : 'pill-warning'}`}
                          style={{ fontSize: '8px', textAlign: 'center', padding: '1px 4px' }}
                        >
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                    <button
                      onClick={handlePhotoUpload}
                      disabled={isUploading || uploadQueue.every((it) => it.status === 'DONE')}
                      className="btn btn-primary"
                      style={{ padding: '12px 24px' }}
                    >
                      {isUploading ? 'PROCESANDO SUBIDA…' : `INICIAR SUBIDA DE ${uploadQueue.filter((it) => it.status !== 'DONE').length} FOTOS →`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PHOTOS MANAGEMENT & BIBS (ENHANCED GRID / LIST & BATCH ACTIONS) */}
        {activeTab === 'photos' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div>
                <div className="font-mono" style={{ color: 'var(--ac)' }}>GESTIÓN DEL ARCHIVO</div>
                <h1 className="font-display" style={{ fontSize: 'clamp(40px, 6vw, 64px)', margin: 0 }}>
                  Fotografías del evento
                </h1>
              </div>

              <select
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  loadEventPhotos(e.target.value);
                }}
                style={{ maxWidth: '300px' }}
              >
                {eventsList.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>

            {/* Filter, Search & View Mode Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'var(--bg2)', padding: '12px 16px', border: '1px solid var(--line)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Buscar por nombre de archivo…"
                  value={photosSearchQuery}
                  onChange={(e) => setPhotosSearchQuery(e.target.value)}
                  style={{ width: '220px', padding: '6px 12px', fontSize: '11px' }}
                />

                <select
                  value={photosOcrFilter}
                  onChange={(e) => setPhotosOcrFilter(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '11px' }}
                >
                  <option value="ALL">Todos los estados OCR</option>
                  <option value="COMPLETED">OCR Completado</option>
                  <option value="QUEUED">En cola OCR</option>
                  <option value="FAILED">Error OCR</option>
                </select>

                <div className="view-toggle">
                  <button
                    className={`view-toggle-btn${photosViewMode === 'grid' ? ' active' : ''}`}
                    onClick={() => setPhotosViewMode('grid')}
                    title="Vista Cuadrícula"
                  >
                    ⊞
                  </button>
                  <button
                    className={`view-toggle-btn${photosViewMode === 'list' ? ' active' : ''}`}
                    onClick={() => setPhotosViewMode('list')}
                    title="Vista Lista"
                  >
                    ☰
                  </button>
                </div>
              </div>

              {/* Batch Delete Actions */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={() => {
                    if (selectedEventPhotoIds.length === eventPhotos.length) {
                      setSelectedEventPhotoIds([]);
                    } else {
                      setSelectedEventPhotoIds(eventPhotos.map((p) => p.id));
                    }
                  }}
                  className="btn btn-sm btn-outline"
                  style={{ padding: '6px 10px', fontSize: '10px' }}
                >
                  {selectedEventPhotoIds.length === eventPhotos.length ? 'DESELECCIONAR TODAS' : 'SELECCIONAR TODAS'}
                </button>

                {selectedEventPhotoIds.length > 0 && (
                  <button
                    onClick={handleBatchDeletePhotos}
                    className="btn btn-sm"
                    style={{ background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff', padding: '6px 14px', fontSize: '10px' }}
                  >
                    ELIMINAR SELECCIONADAS ({selectedEventPhotoIds.length}) ✕
                  </button>
                )}
              </div>
            </div>

            {/* Photos Display */}
            {(() => {
              const filtered = eventPhotos.filter((p) => {
                if (photosSearchQuery.trim() && !p.filename.toLowerCase().includes(photosSearchQuery.toLowerCase())) {
                  return false;
                }
                if (photosOcrFilter !== 'ALL' && p.ocrStatus !== photosOcrFilter) {
                  return false;
                }
                return true;
              });

              if (filtered.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg2)', border: '1px solid var(--line)' }}>
                    <p className="font-mono" style={{ color: 'var(--mut)' }}>
                      No se encontraron fotografías con los filtros aplicados.
                    </p>
                  </div>
                );
              }

              if (photosViewMode === 'list') {
                return (
                  <table className="admin-table" style={{ background: 'var(--bg2)' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>SEL</th>
                        <th style={{ width: '80px' }}>VISTA</th>
                        <th>NOMBRE DE ARCHIVO</th>
                        <th>DORSALES</th>
                        <th>ESTADO OCR</th>
                        <th>ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p) => {
                        const isChecked = selectedEventPhotoIds.includes(p.id);
                        return (
                          <tr key={p.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedEventPhotoIds((prev) => [...prev, p.id]);
                                  else setSelectedEventPhotoIds((prev) => prev.filter((id) => id !== p.id));
                                }}
                              />
                            </td>
                            <td>
                              <div style={{ width: '60px', height: '40px', overflow: 'hidden' }}>
                                <img src={p.thumbnailUrl} alt={p.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            </td>
                            <td>
                              <strong>{p.filename}</strong>
                              {p.isCover && <span className="pill pill-warning" style={{ marginLeft: '8px', fontSize: '8px' }}>PORTADA</span>}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {p.bibDetections?.map((b: any) => (
                                  <span key={b.id} className="pill pill-warning" style={{ fontSize: '9px' }}>#{b.bibNumber}</span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <span className="font-mono" style={{ fontSize: '10px' }}>{p.ocrStatus || 'COMPLETED'}</span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {!p.isCover && (
                                  <button
                                    onClick={async () => {
                                      await api.setAdminPhotoCover(p.id);
                                      loadEventPhotos(selectedEventId);
                                      showToast('Foto establecida como portada');
                                    }}
                                    className="btn btn-sm btn-outline"
                                    style={{ padding: '4px 8px', fontSize: '9px' }}
                                  >
                                    PORTADA
                                  </button>
                                )}
                                <button
                                  onClick={async () => {
                                    const bib = window.prompt('Introduce el dorsal para esta fotografía:');
                                    if (bib) {
                                      await api.addAdminBib(p.id, bib);
                                      loadEventPhotos(selectedEventId);
                                      showToast(`Dorsal #${bib} añadido`);
                                    }
                                  }}
                                  className="btn btn-sm btn-outline"
                                  style={{ padding: '4px 8px', fontSize: '9px' }}
                                >
                                  + DORSAL
                                </button>
                                <button
                                  onClick={async () => {
                                    if (window.confirm(`¿Eliminar la foto ${p.filename}?`)) {
                                      await api.deleteAdminPhoto(p.id);
                                      loadEventPhotos(selectedEventId);
                                      showToast('Foto eliminada');
                                    }
                                  }}
                                  className="btn btn-sm"
                                  style={{ color: 'var(--danger)', padding: '4px 8px', fontSize: '9px' }}
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              }

              // Grid view
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
                  {filtered.map((p) => {
                    const isChecked = selectedEventPhotoIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        style={{
                          background: 'var(--bg2)',
                          border: isChecked ? '2px solid var(--ac)' : p.isCover ? '2px solid var(--success)' : '1px solid var(--line)',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        <div style={{ aspectRatio: '3/2', overflow: 'hidden', position: 'relative' }}>
                          <img src={p.thumbnailUrl} alt={p.filename} />
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedEventPhotoIds((prev) => [...prev, p.id]);
                              else setSelectedEventPhotoIds((prev) => prev.filter((id) => id !== p.id));
                            }}
                            style={{ position: 'absolute', top: '8px', left: '8px', width: '18px', height: '18px', zIndex: 5, cursor: 'pointer' }}
                          />
                          {p.isCover && (
                            <span
                              className="font-mono"
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                background: 'var(--success)',
                                color: '#000',
                                fontWeight: 700,
                                padding: '2px 6px',
                                fontSize: '8px'
                              }}
                            >
                              PORTADA
                            </span>
                          )}
                        </div>

                        <div style={{ padding: '10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <p style={{ fontSize: '11px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.filename}
                          </p>

                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', margin: '6px 0' }}>
                            {p.bibDetections?.map((b: any) => (
                              <span key={b.id} className="pill pill-warning" style={{ fontSize: '8px' }}>
                                #{b.bibNumber}
                              </span>
                            ))}
                          </div>

                          <div style={{ display: 'flex', gap: '4px', marginTop: 'auto', paddingTop: '8px' }}>
                            {!p.isCover && (
                              <button
                                onClick={async () => {
                                  await api.setAdminPhotoCover(p.id);
                                  loadEventPhotos(selectedEventId);
                                  showToast('Foto establecida como portada');
                                }}
                                className="btn btn-sm btn-outline"
                                style={{ flex: 1, padding: '4px', fontSize: '9px' }}
                              >
                                PORTADA
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                const bib = window.prompt('Introduce el dorsal:');
                                if (bib) {
                                  await api.addAdminBib(p.id, bib);
                                  loadEventPhotos(selectedEventId);
                                  showToast(`Dorsal #${bib} asociado`);
                                }
                              }}
                              className="btn btn-sm btn-outline"
                              style={{ flex: 1, padding: '4px', fontSize: '9px' }}
                            >
                              + DORSAL
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm('¿Eliminar fotografía?')) {
                                  await api.deleteAdminPhoto(p.id);
                                  loadEventPhotos(selectedEventId);
                                  showToast('Foto eliminada');
                                }
                              }}
                              className="btn btn-sm"
                              style={{ color: 'var(--danger)', padding: '4px 8px', fontSize: '9px' }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 5: OCR & VISION AI BIB REVIEWS */}
        {activeTab === 'bibs' && (
          <div>
            <div className="font-mono" style={{ color: 'var(--ac)', letterSpacing: '0.14em' }}>
              VISIÓN ARTIFICIAL & RECONOCIMIENTO DE VEHÍCULOS
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', margin: '4px 0 24px' }}>
              <div>
                <h1 className="font-display" style={{ fontSize: 'clamp(40px, 6vw, 64px)', margin: 0 }}>
                  Revisión de dorsales
                </h1>
                <p className="font-mono" style={{ color: 'var(--mut)', marginTop: '4px' }}>
                  Total en este filtro: {bibReviewList.length} detecciones {bibReviewTotal > 0 && `(de ${bibReviewTotal})`}
                </p>
              </div>

              {/* Event Reprocess & Consecutive Review Actions */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  style={{ maxWidth: '240px' }}
                >
                  {eventsList.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleReprocessEventOcr(selectedEventId)}
                  disabled={isReprocessing || !selectedEventId}
                  className="btn btn-sm btn-outline"
                  title="Ejecutar motor de visión artificial en todas las fotos del evento"
                >
                  {isReprocessing ? 'PROCESANDO COLA…' : '⚡ REPROCESAR EVENTO'}
                </button>
                {bibReviewList.length > 0 && (
                  <button
                    onClick={() => setFocusReviewIndex(0)}
                    className="btn btn-sm btn-primary"
                    title="Revisar uno por uno con atajos de teclado"
                  >
                    ▶ REVISIÓN RÁPIDA ({bibReviewList.length})
                  </button>
                )}
              </div>
            </div>

            {/* Reprocessing live progress banner */}
            {ocrProgress && ocrProgress.isRunning && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--ac)', padding: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="font-mono" style={{ color: 'var(--ac)', fontWeight: 600 }}>
                    PROCESANDO RECONOCIMIENTO EN COLA ASÍNCRONA ({ocrProgress.progressPercent}%)
                  </span>
                  <span className="font-mono">
                    Completadas: {ocrProgress.completed} / {ocrProgress.total} · Dorsales hallados: {ocrProgress.bibsCount}
                  </span>
                </div>
                <div style={{ height: '6px', background: 'var(--line)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      background: 'var(--ac)',
                      width: `${ocrProgress.progressPercent}%`,
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Filter Tabs & Event Selector */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px', borderBottom: '1px solid var(--line)', paddingBottom: '14px' }}>
              <div className="chips-row" style={{ margin: 0 }}>
                {[
                  { id: 'DETECTED', label: 'Por revisar' },
                  { id: 'CONFIRMED', label: 'Confirmados' },
                  { id: 'REJECTED', label: 'Descartados' },
                  { id: 'ALL', label: 'Todos' }
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => {
                      setBibFilterStatus(st.id);
                      loadBibReviewList(st.id, bibFilterEvent);
                    }}
                    className={`chip${bibFilterStatus === st.id ? ' active' : ''}`}
                    style={{ padding: '6px 14px', fontSize: '10px' }}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span className="font-mono" style={{ fontSize: '10px' }}>EVENTO:</span>
                <select
                  value={bibFilterEvent}
                  onChange={(e) => {
                    setBibFilterEvent(e.target.value);
                    loadBibReviewList(bibFilterStatus, e.target.value);
                  }}
                  style={{ minWidth: '180px', padding: '6px 10px', fontSize: '11px' }}
                >
                  <option value="all">Todos los eventos</option>
                  {eventsList.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Batch Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg2)', padding: '10px 16px', border: '1px solid var(--line)', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  id="select-all-bibs"
                  checked={bibReviewList.length > 0 && selectedBibIds.length === bibReviewList.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedBibIds(bibReviewList.map((d) => d.id));
                    } else {
                      setSelectedBibIds([]);
                    }
                  }}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="select-all-bibs" className="font-mono" style={{ fontSize: '11px', cursor: 'pointer' }}>
                  {selectedBibIds.length > 0
                    ? `${selectedBibIds.length} seleccionados de ${bibReviewList.length}`
                    : 'Seleccionar todos los mostrados'}
                </label>
              </div>

              {selectedBibIds.length > 0 && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleBatchConfirm} className="btn btn-sm btn-primary" style={{ padding: '6px 14px' }}>
                    CONFIRMAR SELECCIONADOS ({selectedBibIds.length}) ✓
                  </button>
                  <button onClick={handleBatchReject} className="btn btn-sm" style={{ color: 'var(--danger)', padding: '6px 14px' }}>
                    DESCARTAR SELECCIONADOS ({selectedBibIds.length}) ✕
                  </button>
                  <button onClick={() => setSelectedBibIds([])} className="btn btn-sm btn-outline" style={{ padding: '6px 10px' }}>
                    CANCELAR
                  </button>
                </div>
              )}
            </div>

            {/* Review Cards Grid */}
            {bibReviewList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg2)', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '40px' }}>✓</span>
                <p className="font-display" style={{ fontSize: '32px', margin: '12px 0 6px' }}>
                  Bandeja de revisión al día
                </p>
                <p className="font-mono" style={{ color: 'var(--mut)' }}>
                  No hay detecciones con el filtro actual ({bibFilterStatus}).
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
                {bibReviewList.map((d) => {
                  const isChecked = selectedBibIds.includes(d.id);
                  const confPct = Math.round(d.confidence * 100);
                  const confColor = confPct >= 70 ? 'var(--success)' : confPct >= 40 ? '#F2B36B' : 'var(--danger)';
                  const isEditing = editingBibId === d.id;

                  return (
                    <div
                      key={d.id}
                      style={{
                        background: 'var(--bg2)',
                        border: isChecked ? '2px solid var(--ac)' : '1px solid var(--line)',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        position: 'relative'
                      }}
                    >
                      {/* Top Bar: Checkbox + Status Pill */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBibIds((prev) => [...prev, d.id]);
                              } else {
                                setSelectedBibIds((prev) => prev.filter((id) => id !== d.id));
                              }
                            }}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <span className="font-mono" style={{ fontSize: '10px', color: 'var(--mut)' }}>
                            {d.photoFilename || 'FOTO'}
                          </span>
                        </div>
                        <span
                          className={`pill ${d.status === 'CONFIRMED' ? 'pill-success' : d.status === 'REJECTED' ? 'pill-danger' : 'pill-warning'}`}
                          style={{ fontSize: '9px' }}
                        >
                          {d.status}
                        </span>
                      </div>

                      {/* Visual Images: Full Thumbnail + Cropped Bib Region */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px', height: '130px' }}>
                        {/* Overall Photo */}
                        <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', overflow: 'hidden', position: 'relative' }}>
                          <img src={d.thumbnailUrl} alt="Foto completa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <span className="font-mono" style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(0,0,0,0.7)', padding: '1px 5px', fontSize: '8px' }}>
                            ENCUADRE
                          </span>
                        </div>

                        {/* Vehicle / Bib Crop ROI */}
                        <div style={{ background: 'var(--bg)', border: '1px solid var(--ac)', overflow: 'hidden', position: 'relative', display: 'grid', placeItems: 'center' }}>
                          {d.cropBase64 ? (
                            <img src={d.cropBase64} alt="Recorte dorsal" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          ) : (
                            <div style={{ textAlign: 'center', padding: '6px' }}>
                              <img src={d.thumbnailUrl} alt="Recorte dorsal" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(1.3)' }} />
                            </div>
                          )}
                          <span className="font-mono" style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(232, 67, 31, 0.85)', color: '#fff', padding: '1px 5px', fontSize: '8px', fontWeight: 700 }}>
                            ZONA DORSAL
                          </span>
                        </div>
                      </div>

                      {/* Detected Info & Number Edit */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span className="font-mono" style={{ fontSize: '12px' }}>#</span>
                            <input
                              type="number"
                              value={editingBibValue}
                              onChange={(e) => setEditingBibValue(e.target.value)}
                              style={{ width: '80px', padding: '4px 8px', fontSize: '16px', fontWeight: 700 }}
                              autoFocus
                            />
                            <button
                              onClick={() => {
                                if (editingBibValue.trim()) {
                                  handleConfirmBib(d.id, editingBibValue.trim());
                                  setEditingBibId(null);
                                }
                              }}
                              className="btn btn-sm btn-primary"
                              style={{ padding: '4px 8px', fontSize: '10px' }}
                            >
                              OK
                            </button>
                            <button
                              onClick={() => setEditingBibId(null)}
                              className="btn btn-sm btn-outline"
                              style={{ padding: '4px 8px', fontSize: '10px' }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span className="font-display" style={{ fontSize: '36px', color: 'var(--ac)', lineHeight: 1 }}>
                              #{d.bibNumber}
                            </span>
                            <button
                              onClick={() => {
                                setEditingBibId(d.id);
                                setEditingBibValue(d.bibNumber);
                              }}
                              className="font-mono"
                              style={{ fontSize: '10px', color: 'var(--mut)', textDecoration: 'underline' }}
                              title="Corregir número de dorsal"
                            >
                              editar
                            </button>
                          </div>
                        )}

                        <div style={{ textAlign: 'right' }}>
                          <span className="font-mono" style={{ fontSize: '11px', color: confColor, fontWeight: 700, display: 'block' }}>
                            {confPct}% CONFIANZA
                          </span>
                          <span className="font-mono" style={{ fontSize: '9px', color: 'var(--mut)' }}>
                            {d.detectedBy}
                          </span>
                        </div>
                      </div>

                      <div className="font-mono" style={{ fontSize: '10px', color: 'var(--mut)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.eventName}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
                        {d.status !== 'CONFIRMED' && (
                          <button
                            onClick={() => handleConfirmBib(d.id, d.bibNumber)}
                            className="btn btn-sm btn-primary"
                            style={{ flex: 1, padding: '7px 8px', fontSize: '10px' }}
                          >
                            CONFIRMAR ✓
                          </button>
                        )}
                        {d.status !== 'REJECTED' && (
                          <button
                            onClick={() => handleRejectBib(d.id)}
                            className="btn btn-sm btn-outline"
                            style={{ flex: 1, padding: '7px 8px', fontSize: '10px' }}
                            title="Descartar como falso positivo o número de publicidad"
                          >
                            DESCARTAR ✕
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteBib(d.id)}
                          className="btn btn-sm"
                          style={{ color: 'var(--danger)', padding: '7px 8px', fontSize: '10px' }}
                          title="Eliminar registro completamente"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Consecutive Focus Review Mode Modal */}
            {focusReviewIndex !== null && bibReviewList[focusReviewIndex] && (() => {
              const current = bibReviewList[focusReviewIndex];
              const confPct = Math.round(current.confidence * 100);
              const confColor = confPct >= 70 ? 'var(--success)' : confPct >= 40 ? '#F2B36B' : 'var(--danger)';

              const next = () => {
                if (focusReviewIndex + 1 < bibReviewList.length) {
                  setFocusReviewIndex(focusReviewIndex + 1);
                } else {
                  setFocusReviewIndex(null);
                  showToast('Revisión consecutiva completada');
                }
              };

              const confirmCurrent = async (num = current.bibNumber) => {
                await handleConfirmBib(current.id, num);
                next();
              };

              const rejectCurrent = async () => {
                await handleRejectBib(current.id);
                next();
              };

              return (
                <div
                  role="dialog"
                  aria-modal="true"
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 200,
                    background: 'rgba(5, 6, 8, 0.96)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '24px',
                    backdropFilter: 'blur(8px)'
                  }}
                  onKeyDown={(e) => {
                    if (e.target instanceof HTMLInputElement) return;
                    if (e.key === 'Escape') setFocusReviewIndex(null);
                    else if (e.key === 'Enter') confirmCurrent();
                    else if (e.key === 'Delete' || e.key.toLowerCase() === 'r') rejectCurrent();
                    else if (e.key === 'ArrowRight') next();
                  }}
                  tabIndex={0}
                >
                  {/* Top Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '16px' }}>
                    <div>
                      <span className="font-mono" style={{ color: 'var(--ac)', fontSize: '11px', letterSpacing: '0.12em' }}>
                        MODO REVISIÓN RÁPIDA CONSECUTIVA
                      </span>
                      <h2 className="font-display" style={{ fontSize: '32px', margin: '2px 0 0' }}>
                        Detección {focusReviewIndex + 1} de {bibReviewList.length}
                      </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span className="font-mono" style={{ fontSize: '10px', color: 'var(--mut)', alignSelf: 'center', marginRight: '12px' }}>
                        Atajos: [ENTER: Confirmar] [R: Descartar] [→: Saltar] [ESC: Salir]
                      </span>
                      <button onClick={() => setFocusReviewIndex(null)} className="btn btn-sm btn-outline">
                        SALIR (ESC) ✕
                      </button>
                    </div>
                  </div>

                  {/* Main Focus Stage: Side-by-Side Images */}
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', padding: '24px 0', overflow: 'hidden' }}>
                    {/* Full photo */}
                    <div style={{ background: '#000', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <div className="font-mono" style={{ padding: '8px 12px', background: 'var(--bg2)', fontSize: '10px' }}>
                        FOTOGRAFÍA COMPLETA ({current.photoFilename || 'ORIGINAL'})
                      </div>
                      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '10px', overflow: 'hidden' }}>
                        <img src={current.previewUrl} alt="Foto" style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }} />
                      </div>
                    </div>

                    {/* Zoomeed ROI Crop + Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ background: '#000', border: '2px solid var(--ac)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div className="font-mono" style={{ padding: '8px 12px', background: 'rgba(232, 67, 31, 0.2)', color: '#fff', fontSize: '11px', fontWeight: 700 }}>
                          RECORTE DE ALTO CONTRASTE (ZONA DORSAL DETECTADA)
                        </div>
                        <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '16px' }}>
                          {current.cropBase64 ? (
                            <img src={current.cropBase64} alt="Recorte dorsal" style={{ maxWidth: '100%', maxHeight: '40vh', objectFit: 'contain', filter: 'contrast(1.2)' }} />
                          ) : (
                            <img src={current.thumbnailUrl} alt="Recorte dorsal" style={{ maxWidth: '100%', maxHeight: '40vh', objectFit: 'contain' }} />
                          )}
                        </div>
                      </div>

                      {/* Number Control Card */}
                      <div style={{ background: 'var(--bg2)', border: '1px solid var(--line)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <div>
                            <span className="font-mono" style={{ fontSize: '10px', color: 'var(--mut)' }}>DORSAL DETECTADO:</span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                              <span className="font-display" style={{ fontSize: '64px', color: 'var(--ac)', lineHeight: 1 }}>
                                #{current.bibNumber}
                              </span>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <span className="font-mono" style={{ fontSize: '13px', color: confColor, fontWeight: 700, display: 'block' }}>
                              {confPct}% CONFIANZA
                            </span>
                            <span className="font-mono" style={{ fontSize: '10px', color: 'var(--mut)' }}>
                              Motor: {current.detectedBy}
                            </span>
                          </div>
                        </div>

                        {/* Actions in Focus Mode */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: '10px', marginTop: '10px' }}>
                          <button
                            onClick={() => confirmCurrent()}
                            className="btn btn-primary"
                            style={{ padding: '14px', fontSize: '12px' }}
                          >
                            CONFIRMAR (ENTER) ✓
                          </button>
                          <button
                            onClick={() => rejectCurrent()}
                            className="btn btn-outline"
                            style={{ padding: '14px', fontSize: '12px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                          >
                            DESCARTAR (R) ✕
                          </button>
                          <button
                            onClick={() => next()}
                            className="btn btn-outline"
                            style={{ padding: '14px 18px', fontSize: '12px' }}
                            title="Saltar sin cambios"
                          >
                            →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 6: ORDERS & SALES */}
        {activeTab === 'orders' && (
          <div>
            <div className="font-mono" style={{ color: 'var(--ac)' }}>COMMERCE & FULFILLMENT</div>
            <h1 className="font-display" style={{ fontSize: '56px', margin: '4px 0 24px' }}>
              Pedidos y ventas
            </h1>

            {/* Filter toolbar */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { id: 'all', label: 'TODOS' },
                  { id: 'PAID', label: 'PAGADOS' },
                  { id: 'PENDING', label: 'PENDIENTES' },
                  { id: 'REFUNDED', label: 'REEMBOLSADOS' }
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => {
                      setOrderFilterStatus(st.id);
                      loadOrders(st.id, orderSearchQuery);
                    }}
                    className={`btn btn-sm ${orderFilterStatus === st.id ? 'btn-primary' : 'btn-outline'}`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <div style={{ flex: '1 1 240px', minWidth: '200px' }}>
                <input
                  type="text"
                  placeholder="Buscar por nº pedido o email del cliente…"
                  value={orderSearchQuery}
                  onChange={(e) => {
                    setOrderSearchQuery(e.target.value);
                    loadOrders(orderFilterStatus, e.target.value);
                  }}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {ordersList.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', background: 'var(--bg2)', border: '1px solid var(--line)' }}>
                <p className="font-mono" style={{ color: 'var(--mut)' }}>No se encontraron pedidos con los filtros actuales.</p>
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>PEDIDO</th>
                    <th>CLIENTE</th>
                    <th>IMPORTE</th>
                    <th>FOTOS</th>
                    <th>ESTADO</th>
                    <th>EMAIL</th>
                    <th>DESCARGAS</th>
                    <th>FECHA</th>
                    <th>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersList.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <strong>{o.orderNumber}</strong>
                        {o.appliedPackName && (
                          <div className="font-mono" style={{ fontSize: '10px', color: 'var(--ac)' }}>
                            {o.appliedPackName}
                          </div>
                        )}
                      </td>
                      <td>
                        <span>{o.customerEmail}</span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--ac)' }}>
                        {(o.totalAmountCents / 100).toFixed(2)} €
                      </td>
                      <td className="font-mono">{o.items?.length || 0}</td>
                      <td>
                        <span className={`pill ${o.status === 'PAID' ? 'pill-success' : o.status === 'REFUNDED' ? 'pill-danger' : 'pill-warning'}`}>
                          {o.status}
                        </span>
                      </td>
                      <td>
                        {o.confirmationEmailSentAt ? (
                          <span className="font-mono" style={{ fontSize: '11px', color: 'var(--success)' }}>
                            ✓ ENVIADO
                          </span>
                        ) : (
                          <span className="font-mono" style={{ fontSize: '11px', color: 'var(--mut)' }}>
                            -
                          </span>
                        )}
                      </td>
                      <td className="font-mono">{o.downloadCount} / {o.maxDownloads}</td>
                      <td className="font-mono">{new Date(o.createdAt).toLocaleDateString('es-ES')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => setSelectedOrderDetail(o)}
                            className="btn btn-sm btn-outline"
                          >
                            DETALLES
                          </button>
                          {o.status === 'PAID' && (
                            <button
                              onClick={() => handleRefundOrder(o.id, o.orderNumber)}
                              disabled={isRefunding}
                              className="btn btn-sm"
                              style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                            >
                              REEMBOLSAR
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Order Detail Modal */}
            {selectedOrderDetail && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 200,
                  background: 'rgba(0,0,0,0.8)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px'
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) setSelectedOrderDetail(null);
                }}
              >
                <div
                  style={{
                    background: 'var(--bg2)',
                    border: '1px solid var(--line)',
                    width: 'min(640px, 100%)',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    padding: '28px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                      <span className="font-mono" style={{ color: 'var(--ac)', fontSize: '11px' }}>
                        DETALLES DEL PEDIDO
                      </span>
                      <h2 className="font-display" style={{ fontSize: '36px', margin: '4px 0 0' }}>
                        {selectedOrderDetail.orderNumber}
                      </h2>
                    </div>
                    <button onClick={() => setSelectedOrderDetail(null)} className="btn btn-sm btn-outline">
                      ✕
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px', background: 'var(--bg)', padding: '16px', border: '1px solid var(--line)' }}>
                    <div>
                      <span className="font-mono" style={{ fontSize: '11px', color: 'var(--mut)' }}>CLIENTE:</span>
                      <p style={{ fontWeight: 600, fontSize: '14px', marginTop: '2px' }}>{selectedOrderDetail.customerEmail}</p>
                    </div>
                    <div>
                      <span className="font-mono" style={{ fontSize: '11px', color: 'var(--mut)' }}>ESTADO:</span>
                      <p style={{ fontWeight: 600, fontSize: '14px', marginTop: '2px' }}>{selectedOrderDetail.status}</p>
                    </div>
                    <div>
                      <span className="font-mono" style={{ fontSize: '11px', color: 'var(--mut)' }}>TOTAL ABONADO:</span>
                      <p style={{ fontWeight: 600, fontSize: '14px', marginTop: '2px', color: 'var(--ac)' }}>
                        {(selectedOrderDetail.totalAmountCents / 100).toFixed(2)} €
                      </p>
                    </div>
                    <div>
                      <span className="font-mono" style={{ fontSize: '11px', color: 'var(--mut)' }}>DESCARGAS:</span>
                      <p style={{ fontWeight: 600, fontSize: '14px', marginTop: '2px' }}>
                        {selectedOrderDetail.downloadCount} / {selectedOrderDetail.maxDownloads}
                      </p>
                    </div>
                    <div>
                      <span className="font-mono" style={{ fontSize: '11px', color: 'var(--mut)' }}>CONFIRMACIÓN EMAIL:</span>
                      <p style={{ fontWeight: 600, fontSize: '13px', marginTop: '2px' }}>
                        {selectedOrderDetail.confirmationEmailSentAt ? `Enviado ${new Date(selectedOrderDetail.confirmationEmailSentAt).toLocaleTimeString('es-ES')}` : 'No enviado'}
                      </p>
                    </div>
                    <div>
                      <span className="font-mono" style={{ fontSize: '11px', color: 'var(--mut)' }}>TOKEN VIGENTE HASTA:</span>
                      <p style={{ fontWeight: 600, fontSize: '13px', marginTop: '2px' }}>
                        {new Date(selectedOrderDetail.downloadExpiresAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>

                  {selectedOrderDetail.refundedAt && (
                    <div style={{ background: 'rgba(232, 67, 31, 0.1)', border: '1px solid var(--danger)', padding: '12px', marginBottom: '20px' }}>
                      <span className="font-mono" style={{ color: 'var(--danger)', fontSize: '11px' }}>INFORMACIÓN DEL REEMBOLSO:</span>
                      <p style={{ fontSize: '13px', marginTop: '4px' }}>
                        Reembolsado el {new Date(selectedOrderDetail.refundedAt).toLocaleString('es-ES')}. Motivo: {selectedOrderDetail.refundReason || 'Administrativo'}.
                      </p>
                    </div>
                  )}

                  <h3 className="font-display" style={{ fontSize: '22px', marginBottom: '12px' }}>
                    Fotografías ({selectedOrderDetail.items?.length || 0})
                  </h3>
                  <div style={{ display: 'grid', gap: '8px', marginBottom: '24px' }}>
                    {selectedOrderDetail.items?.map((it: any) => (
                      <div key={it.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg)', padding: '8px 12px', border: '1px solid var(--line)' }}>
                        <div style={{ width: '50px', height: '36px', overflow: 'hidden', background: '#000', flexShrink: 0 }}>
                          <img src={`/api/photos/thumb/${it.photo.storageKeyThumbnail}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>{it.photo.originalFilename}</p>
                          <span className="font-mono" style={{ fontSize: '10px', color: 'var(--mut)' }}>ID: {it.photo.id}</span>
                        </div>
                        <span className="font-mono" style={{ fontSize: '12px' }}>
                          {(it.priceCents / 100).toFixed(2)} €
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    {selectedOrderDetail.status === 'PAID' && (
                      <button
                        onClick={() => handleRefundOrder(selectedOrderDetail.id, selectedOrderDetail.orderNumber)}
                        disabled={isRefunding}
                        className="btn btn-sm"
                        style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                      >
                        {isRefunding ? 'PROCESANDO…' : 'REEMBOLSAR PEDIDO'}
                      </button>
                    )}
                    <button onClick={() => setSelectedOrderDetail(null)} className="btn btn-sm btn-outline">
                      CERRAR
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: SETTINGS */}
        {activeTab === 'settings' && (
          <div>
            <div className="font-mono">Platform Configuration</div>
            <h1 className="font-display" style={{ fontSize: '56px', margin: '4px 0 24px' }}>
              Ajustes generales y comerciales
            </h1>

            <form onSubmit={handleSaveSettings} style={{ maxWidth: '640px', display: 'grid', gap: '16px' }}>
              <div>
                <label className="font-mono" style={{ display: 'block', marginBottom: '6px' }}>
                  Precio base por fotografía individual (en céntimos de euro):
                </label>
                <input
                  type="number"
                  value={settingsMap.BASE_PHOTO_PRICE_CENTS || '149'}
                  onChange={(e) => setSettingsMap({ ...settingsMap, BASE_PHOTO_PRICE_CENTS: e.target.value })}
                  required
                />
                <span className="font-mono" style={{ fontSize: '10px' }}>
                  149 céntimos = 1,49 € por foto
                </span>
              </div>

              <div>
                <label className="font-mono" style={{ display: 'block', marginBottom: '6px' }}>
                  Texto de marca de agua repetida:
                </label>
                <input
                  type="text"
                  value={settingsMap.WATERMARK_TEXT || 'OLOBOC_'}
                  onChange={(e) => setSettingsMap({ ...settingsMap, WATERMARK_TEXT: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="font-mono" style={{ display: 'block', marginBottom: '6px' }}>
                  Opacidad de marca de agua (0.0 a 1.0):
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="0.9"
                  value={settingsMap.WATERMARK_OPACITY || '0.28'}
                  onChange={(e) => setSettingsMap({ ...settingsMap, WATERMARK_OPACITY: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="font-mono" style={{ display: 'block', marginBottom: '6px' }}>
                  URL oficial de Instagram:
                </label>
                <input
                  type="url"
                  value={settingsMap.INSTAGRAM_URL || ''}
                  onChange={(e) => setSettingsMap({ ...settingsMap, INSTAGRAM_URL: e.target.value })}
                />
              </div>

              <div>
                <label className="font-mono" style={{ display: 'block', marginBottom: '6px' }}>
                  URL de TikTok:
                </label>
                <input
                  type="url"
                  value={settingsMap.TIKTOK_URL || ''}
                  onChange={(e) => setSettingsMap({ ...settingsMap, TIKTOK_URL: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ justifySelf: 'start', marginTop: '10px' }}>
                GUARDAR AJUSTES
              </button>
            </form>
          </div>
        )}

        {/* TAB 8: PACKS MANAGEMENT */}
        {activeTab === 'packs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <div className="font-mono">Volume Pricing</div>
                <h1 className="font-display" style={{ fontSize: '56px', margin: 0 }}>
                  Packs de fotografías
                </h1>
              </div>
              <button
                onClick={async () => {
                  const name = window.prompt('Nombre del pack (ej. Pack 15 Fotos):');
                  const count = window.prompt('Cantidad de fotos:');
                  const price = window.prompt('Precio en céntimos (ej. 1299 para 12,99 €):');
                  if (name && count && price) {
                    await api.createAdminPack({ name, photoCount: parseInt(count), priceCents: parseInt(price) });
                    showToast('Pack creado');
                    const p = await api.getAdminPacks();
                    setPacksList(p.packs);
                  }
                }}
                className="btn btn-primary"
              >
                + CREAR PACK
              </button>
            </div>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>NOMBRE</th>
                  <th>CANTIDAD</th>
                  <th>PRECIO (€)</th>
                  <th>ESTADO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {packsList.map((pk) => (
                  <tr key={pk.id}>
                    <td><strong>{pk.name}</strong></td>
                    <td className="font-mono">{pk.photoCount} fotos</td>
                    <td style={{ fontWeight: 600, color: 'var(--ac)' }}>
                      {(pk.priceCents / 100).toFixed(2)} €
                    </td>
                    <td>
                      <span className={`pill ${pk.isActive ? 'pill-success' : 'pill-warning'}`}>
                        {pk.isActive ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={async () => {
                            await api.updateAdminPack(pk.id, { isActive: !pk.isActive });
                            const p = await api.getAdminPacks();
                            setPacksList(p.packs);
                          }}
                          className="btn btn-sm btn-outline"
                        >
                          {pk.isActive ? 'DESACTIVAR' : 'ACTIVAR'}
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm('¿Eliminar este pack?')) {
                              await api.deleteAdminPack(pk.id);
                              const p = await api.getAdminPacks();
                              setPacksList(p.packs);
                            }
                          }}
                          className="btn btn-sm"
                          style={{ color: 'var(--danger)' }}
                        >
                          ELIMINAR
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 9: TAKEDOWN / IMAGE RIGHTS REQUESTS */}
        {activeTab === 'takedowns' && (
          <div>
            <div className="font-mono">RGPD & Image Rights</div>
            <h1 className="font-display" style={{ fontSize: '56px', margin: '4px 0 24px' }}>
              Solicitudes de retirada y derechos de imagen
            </h1>

            {takedownsList.length === 0 ? (
              <p className="font-mono" style={{ padding: '30px 0' }}>
                No hay solicitudes de retirada pendientes.
              </p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>SOLICITANTE</th>
                    <th>EMAIL</th>
                    <th>FOTO</th>
                    <th>MOTIVO</th>
                    <th>ESTADO</th>
                    <th>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {takedownsList.map((t) => (
                    <tr key={t.id}>
                      <td><strong>{t.requesterName}</strong></td>
                      <td>{t.requesterEmail}</td>
                      <td>{t.photo?.event?.name || t.photoId}</td>
                      <td style={{ maxWidth: '280px', fontSize: '12px' }}>{t.reason}</td>
                      <td>
                        <span className={`pill ${t.status === 'PENDING' ? 'pill-warning' : t.status === 'ACCEPTED_HIDDEN' ? 'pill-success' : 'pill-danger'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td>
                        {t.status === 'PENDING' && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={async () => {
                                await api.updateAdminTakedown(t.id, { status: 'ACCEPTED_HIDDEN' });
                                showToast('Solicitud aceptada y foto despublicada');
                                const res = await api.getAdminTakedowns();
                                setTakedownsList(res.takedowns);
                              }}
                              className="btn btn-sm btn-primary"
                            >
                              ACEPTAR Y OCULTAR
                            </button>
                            <button
                              onClick={async () => {
                                await api.updateAdminTakedown(t.id, { status: 'REJECTED' });
                                showToast('Solicitud desestimada');
                                const res = await api.getAdminTakedowns();
                                setTakedownsList(res.takedowns);
                              }}
                              className="btn btn-sm btn-outline"
                            >
                              RECHAZAR
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>

      {/* Event Create / Edit Modal */}
      {eventModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 200,
            display: 'grid',
            placeItems: 'center',
            padding: '20px'
          }}
        >
          <form
            onSubmit={handleSaveEvent}
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--line)',
              padding: '30px',
              width: 'min(540px, 100%)',
              display: 'grid',
              gap: '14px'
            }}
          >
            <h3 className="font-display" style={{ fontSize: '32px' }}>
              {eventModal.event ? 'Editar Evento' : 'Nuevo Evento Motorsport'}
            </h3>

            <input
              placeholder="Nombre del evento (ej. Rally de Asturias Histórico)"
              value={eventForm.name}
              onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
              required
            />

            <input
              placeholder="Localización (ej. Pravia, Asturias)"
              value={eventForm.location}
              onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
              required
            />

            <input
              type="date"
              value={eventForm.date}
              onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
              required
            />

            <select
              value={eventForm.category}
              onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
            >
              <option value="Rally">Rally</option>
              <option value="Rallysprint">Rallysprint</option>
              <option value="Drift">Drift</option>
              <option value="Circuito">Circuito</option>
              <option value="Otros">Otros</option>
            </select>

            <textarea
              rows={3}
              placeholder="Descripción o crónica del evento…"
              value={eventForm.description}
              onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
            />

            <select
              value={eventForm.status}
              onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}
            >
              <option value="PUBLISHED">Publicado</option>
              <option value="DRAFT">Borrador</option>
            </select>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="submit" className="btn btn-primary">
                GUARDAR EVENTO
              </button>
              <button
                type="button"
                onClick={() => setEventModal({ open: false })}
                className="btn btn-outline"
              >
                CANCELAR
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
