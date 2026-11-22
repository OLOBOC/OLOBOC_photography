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
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [packsList, setPacksList] = useState<PackItem[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [takedownsList, setTakedownsList] = useState<any[]>([]);

  // Modals & form state
  const [eventModal, setEventModal] = useState<{ open: boolean; event?: any }>({ open: false });
  const [eventForm, setEventForm] = useState({ name: '', location: '', date: '', category: 'Rally', description: '', status: 'PUBLISHED' });
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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

  // Upload photos action
  const handlePhotoUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return alert('Selecciona un evento');
    if (uploadFiles.length === 0) return alert('Selecciona archivos para subir');

    try {
      setIsUploading(true);
      setUploadProgress(30);
      await api.uploadAdminPhotos(selectedEventId, uploadFiles, settingsMap.WATERMARK_TEXT);
      setUploadProgress(100);
      showToast(`${uploadFiles.length} fotografías subidas y procesadas con marca de agua y OCR`);
      setUploadFiles([]);
      loadEventPhotos(selectedEventId);
      const bibs = await api.getAdminBibReview();
      setBibReviewList(bibs.detections);
    } catch (err: any) {
      alert(err.message || 'Error durante la subida');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Bib review actions
  const handleConfirmBib = async (detectionId: string, bibNumber?: string) => {
    try {
      await api.confirmAdminBib(detectionId, bibNumber);
      showToast('Dorsal verificado');
      const bibs = await api.getAdminBibReview();
      setBibReviewList(bibs.detections);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteBib = async (detectionId: string) => {
    try {
      await api.deleteAdminBib(detectionId);
      showToast('Detección descartada');
      setBibReviewList((prev) => prev.filter((d) => d.id !== detectionId));
    } catch (e: any) {
      alert(e.message);
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

        {/* TAB 3: UPLOAD PHOTOS WITH OCR */}
        {activeTab === 'upload' && (
          <div>
            <div className="font-mono">Processing Pipeline</div>
            <h1 className="font-display" style={{ fontSize: '56px', margin: '4px 0 24px' }}>
              Subida de fotografías por lotes
            </h1>

            <form onSubmit={handlePhotoUpload} style={{ maxWidth: '680px', display: 'grid', gap: '18px' }}>
              <div>
                <label className="font-mono" style={{ display: 'block', marginBottom: '8px' }}>
                  1. Seleccionar evento de destino:
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => {
                    setSelectedEventId(e.target.value);
                    loadEventPhotos(e.target.value);
                  }}
                  required
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
                  2. Seleccionar fotografías (JPEG / PNG / WebP hasta 25 MB):
                </label>
                <div
                  style={{
                    border: '2px dashed var(--line)',
                    padding: '40px 20px',
                    textAlign: 'center',
                    background: 'var(--bg2)',
                    cursor: 'pointer'
                  }}
                  onClick={() => document.getElementById('photo-upload-input')?.click()}
                >
                  <input
                    id="photo-upload-input"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files) {
                        setUploadFiles(Array.from(e.target.files));
                      }
                    }}
                  />
                  <p className="font-display" style={{ fontSize: '28px' }}>
                    {uploadFiles.length > 0
                      ? `${uploadFiles.length} fotografías seleccionadas`
                      : 'Arrastra imágenes aquí o pulsa para seleccionar'}
                  </p>
                  <p className="font-mono" style={{ fontSize: '10px', marginTop: '6px' }}>
                    El servidor aplicará automáticamente marcas de agua diagonales OLOBOC_ y ejecutará el motor OCR de detección de dorsales.
                  </p>
                </div>
              </div>

              {isUploading && (
                <div>
                  <div style={{ height: '6px', background: 'var(--line)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--ac)', transition: 'width 0.3s' }} />
                  </div>
                  <span className="font-mono" style={{ fontSize: '10px', marginTop: '6px', display: 'block' }}>
                    Procesando fotografías y analizando dorsales…
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={isUploading || uploadFiles.length === 0}
                className="btn btn-primary"
                style={{ justifySelf: 'start', minWidth: '220px' }}
              >
                {isUploading ? 'PROCESANDO…' : 'SUBIR Y PROCESAR LOTE →'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: PHOTOS MANAGEMENT & BIBS */}
        {activeTab === 'photos' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div className="font-mono">Gallery Management</div>
                <h1 className="font-display" style={{ fontSize: '56px', margin: 0 }}>
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
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>

            {eventPhotos.length === 0 ? (
              <p className="font-mono" style={{ padding: '40px 0' }}>
                No hay fotografías en este evento todavía. Utiliza la pestaña «Subir Fotos» para añadir contenido.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
                {eventPhotos.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: 'var(--bg2)',
                      border: p.isCover ? '2px solid var(--ac)' : '1px solid var(--line)',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ aspectRatio: '3/2', overflow: 'hidden', position: 'relative' }}>
                      <img src={p.thumbnailUrl} alt={p.filename} />
                      {p.isCover && (
                        <span
                          className="font-mono"
                          style={{
                            position: 'absolute',
                            top: '6px',
                            left: '6px',
                            background: 'var(--ac)',
                            color: '#fff',
                            padding: '2px 6px',
                            fontSize: '9px'
                          }}
                        >
                          PORTADA
                        </span>
                      )}
                    </div>

                    <div style={{ padding: '10px' }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.filename}
                      </p>

                      {/* Associated bibs */}
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', margin: '6px 0' }}>
                        {p.bibDetections?.map((b: any) => (
                          <span key={b.id} className="pill pill-warning" style={{ fontSize: '9px' }}>
                            #{b.bibNumber}
                          </span>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                        {!p.isCover && (
                          <button
                            onClick={async () => {
                              await api.setAdminPhotoCover(p.id);
                              loadEventPhotos(selectedEventId);
                              showToast('Foto establecida como portada');
                            }}
                            className="btn btn-sm btn-outline"
                            style={{ flex: 1, padding: '4px' }}
                          >
                            PORTADA
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            const bib = window.prompt('Introduce el número de dorsal para esta fotografía:');
                            if (bib) {
                              await api.addAdminBib(p.id, bib);
                              loadEventPhotos(selectedEventId);
                              showToast(`Dorsal #${bib} asociado`);
                            }
                          }}
                          className="btn btn-sm btn-outline"
                          style={{ flex: 1, padding: '4px' }}
                        >
                          + DORSAL
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm('¿Eliminar fotografía?')) {
                              await api.deleteAdminPhoto(p.id);
                              loadEventPhotos(selectedEventId);
                              showToast('Fotografía eliminada');
                            }
                          }}
                          className="btn btn-sm"
                          style={{ color: 'var(--danger)', padding: '4px 8px' }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: OCR BIB REVIEWS */}
        {activeTab === 'bibs' && (
          <div>
            <div className="font-mono">OCR Quality Control</div>
            <h1 className="font-display" style={{ fontSize: '56px', margin: '4px 0 24px' }}>
              Revisión de dorsales detectados
            </h1>

            {bibReviewList.length === 0 ? (
              <p className="font-mono" style={{ padding: '30px 0', color: 'var(--success)' }}>
                ✓ No hay detecciones dudosas pendientes de revisión. El pipeline OCR está al día.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                {bibReviewList.map((d) => (
                  <div key={d.id} style={{ background: 'var(--bg2)', border: '1px solid var(--line)', padding: '12px' }}>
                    <div style={{ aspectRatio: '3/2', overflow: 'hidden', marginBottom: '8px' }}>
                      <img src={d.thumbnailUrl} alt="OCR Detection" />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span className="font-display" style={{ fontSize: '28px', color: 'var(--ac)' }}>
                        Dorsal #{d.bibNumber}
                      </span>
                      <span className="font-mono" style={{ fontSize: '10px' }}>
                        Confianza: {Math.round(d.confidence * 100)}%
                      </span>
                    </div>

                    <p className="font-mono" style={{ fontSize: '10px', color: 'var(--mut)', margin: '4px 0 12px' }}>
                      {d.eventName} · Motor: {d.detectedBy}
                    </p>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleConfirmBib(d.id, d.bibNumber)}
                        className="btn btn-sm btn-primary"
                        style={{ flex: 1 }}
                      >
                        CONFIRMAR ✓
                      </button>
                      <button
                        onClick={() => {
                          const n = window.prompt('Corregir número de dorsal:', d.bibNumber);
                          if (n) handleConfirmBib(d.id, n);
                        }}
                        className="btn btn-sm btn-outline"
                      >
                        EDITAR
                      </button>
                      <button
                        onClick={() => handleDeleteBib(d.id)}
                        className="btn btn-sm"
                        style={{ color: 'var(--danger)' }}
                      >
                        DESCARTAR
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: ORDERS & SALES */}
        {activeTab === 'orders' && (
          <div>
            <div className="font-mono">Commerce & Fulfillment</div>
            <h1 className="font-display" style={{ fontSize: '56px', margin: '4px 0 24px' }}>
              Pedidos y ventas
            </h1>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>PEDIDO</th>
                  <th>CLIENTE</th>
                  <th>IMPORTE</th>
                  <th>FOTOS</th>
                  <th>ESTADO</th>
                  <th>DESCARGAS</th>
                  <th>FECHA</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {ordersList.map((o) => (
                  <tr key={o.id}>
                    <td><strong>{o.orderNumber}</strong></td>
                    <td>{o.customerEmail}</td>
                    <td style={{ fontWeight: 600, color: 'var(--ac)' }}>
                      {(o.totalAmountCents / 100).toFixed(2)} €
                    </td>
                    <td className="font-mono">{o.items?.length || 0}</td>
                    <td>
                      <span className={`pill ${o.status === 'PAID' ? 'pill-success' : o.status === 'REFUNDED' ? 'pill-danger' : 'pill-warning'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="font-mono">{o.downloadCount} / {o.maxDownloads}</td>
                    <td className="font-mono">{new Date(o.createdAt).toLocaleDateString('es-ES')}</td>
                    <td>
                      {o.status === 'PAID' && (
                        <button
                          onClick={async () => {
                            if (window.confirm(`¿Reembolsar el pedido ${o.orderNumber} y revocar acceso de descarga?`)) {
                              await api.refundAdminOrder(o.id);
                              showToast('Pedido reembolsado');
                              const ords = await api.getAdminOrders();
                              setOrdersList(ords.orders);
                            }
                          }}
                          className="btn btn-sm"
                          style={{ color: 'var(--danger)' }}
                        >
                          REEMBOLSAR
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
