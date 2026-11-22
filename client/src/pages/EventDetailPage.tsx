import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../api';
import { EventDetail, PhotoItem } from '../types';
import { useCart } from '../context/CartContext';
import { PhotoViewer } from '../components/PhotoViewer';

interface EventDetailPageProps {
  slug: string;
  onNavigate: (route: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Rally: '#E8431F',
  Rallysprint: '#D4860F',
  Drift: '#1FABE8',
  Circuito: '#1FE843',
  Otros: '#888'
};

export const EventDetailPage: React.FC<EventDetailPageProps> = ({ slug, onNavigate }) => {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [filterBib, setFilterBib] = useState('');
  const [sortOrder, setSortOrder] = useState<'default' | 'bib-asc' | 'bib-desc' | 'name'>('default');
  const [coverLoaded, setCoverLoaded] = useState(false);
  const [packs, setPacks] = useState<any[]>([]);

  const { isSelected, togglePhoto, addPhotos, removePhotos, selectedPhotos, openDrawer, quote, count, showToast } = useCart();

  useEffect(() => {
    setLoading(true);
    setCoverLoaded(false);

    Promise.all([
      api.getEventDetail(slug),
      api.getPacks().catch(() => ({ baseUnitPriceCents: 149, packs: [] }))
    ])
      .then(([eventData, packsData]) => {
        setEvent(eventData);
        setPacks(packsData.packs || []);
      })
      .catch((err) => setError(err.message || 'Error cargando el evento'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleShare = useCallback(async () => {
    if (!event) return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${event.name} — OLOBOC_ Motorsport Photography`,
          text: `Galería fotográfica de ${event.name} (${event.location}). Etiqueta @oloboc_`,
          url
        });
        return;
      } catch (e: any) {
        if (e.name === 'AbortError') return;
      }
    }
    await navigator.clipboard.writeText(url);
    showToast('Enlace de galería copiado al portapapeles');
  }, [event, showToast]);

  const handleWhatsApp = useCallback(() => {
    if (!event) return;
    const text = encodeURIComponent(
      `Galería completa de ${event.name} en OLOBOC_ Motorsport: ${window.location.href}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  }, [event]);

  // Filter and sort photos
  const processedPhotos = useMemo(() => {
    if (!event) return [];
    let list = [...event.photos];

    if (filterBib.trim()) {
      list = list.filter((p) => p.bibs.some((b) => b === filterBib.trim()));
    }

    if (sortOrder === 'bib-asc') {
      list.sort((a, b) => {
        const numA = a.bibs.length > 0 ? parseInt(a.bibs[0], 10) : 9999;
        const numB = b.bibs.length > 0 ? parseInt(b.bibs[0], 10) : 9999;
        return numA - numB;
      });
    } else if (sortOrder === 'bib-desc') {
      list.sort((a, b) => {
        const numA = a.bibs.length > 0 ? parseInt(a.bibs[0], 10) : -1;
        const numB = b.bibs.length > 0 ? parseInt(b.bibs[0], 10) : -1;
        return numB - numA;
      });
    } else if (sortOrder === 'name') {
      list.sort((a, b) => a.filename.localeCompare(b.filename));
    }

    return list;
  }, [event, filterBib, sortOrder]);

  // Selected photos belonging to this event
  const selectedInThisEvent = useMemo(() => {
    if (!event) return [];
    const eventPhotoIds = new Set(event.photos.map((p) => p.id));
    return selectedPhotos.filter((sp) => eventPhotoIds.has(sp.id));
  }, [event, selectedPhotos]);

  const handleSelectAllFiltered = () => {
    if (!event) return;
    const toAdd = processedPhotos.map((p) => ({
      id: p.id,
      filename: p.filename,
      previewUrl: p.previewUrl,
      thumbnailUrl: p.thumbnailUrl,
      eventName: event.name
    }));
    addPhotos(toAdd);
  };

  const handleDeselectAllInEvent = () => {
    if (!event) return;
    const toRemove = event.photos.map((p) => p.id);
    removePhotos(toRemove);
  };

  if (loading) {
    return (
      <div className="page-pad">
        <div className="event-hero" style={{ minHeight: '360px', background: 'var(--bg2)' }}>
          <div className="loading-shimmer" style={{ width: '240px', height: '24px', marginBottom: '16px' }} />
          <div className="loading-shimmer" style={{ width: '480px', height: '60px', marginBottom: '20px' }} />
          <div className="loading-shimmer" style={{ width: '320px', height: '18px' }} />
        </div>
        <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {[1, 2, 3, 4, 5, 6].map((k) => (
            <div key={k} className="loading-shimmer" style={{ aspectRatio: '3/2', border: '1px solid var(--line)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="page-pad">
        <h2 className="font-display" style={{ fontSize: '48px', color: 'var(--danger)' }}>
          Evento no encontrado
        </h2>
        <p style={{ margin: '16px 0' }}>{error || 'El evento solicitado no existe o ha sido retirado.'}</p>
        <button onClick={() => onNavigate('archive')} className="btn btn-primary">
          VOLVER AL ARCHIVO
        </button>
      </div>
    );
  }

  const catColor = CATEGORY_COLORS[event.category] || 'var(--ac)';

  return (
    <div>
      {/* ─── Full-bleed Cinematic Cover ─── */}
      <div className="event-hero">
        {event.coverPhoto && (
          <img
            src={event.coverPhoto.previewUrl}
            alt={event.name}
            className={`event-hero-bg${coverLoaded ? ' loaded' : ''}`}
            onLoad={() => setCoverLoaded(true)}
          />
        )}
        <div className="event-hero-vignette" />
        <div className="event-hero-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <span
              className="font-mono"
              style={{
                background: catColor,
                color: '#fff',
                padding: '3px 10px',
                fontSize: '10px',
                letterSpacing: '0.12em'
              }}
            >
              {event.category.toUpperCase()}
            </span>
            <span className="font-mono" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
              {event.location.toUpperCase()} · TEMPORADA {event.season}
            </span>
          </div>

          <h1 className="font-display event-hero-title">{event.name}</h1>

          {event.description && (
            <p className="event-hero-desc">{event.description}</p>
          )}

          <div className="event-hero-meta font-mono">
            <span>📅 {new Date(event.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            <span>📸 {event.photos.length} fotografías</span>
            <span>👤 OLOBOC_</span>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '20px' }}>
            <button onClick={handleShare} className="btn btn-sm btn-primary">
              COMPARTIR EVENTO
            </button>
            <button onClick={handleWhatsApp} className="btn btn-sm btn-outline">
              WHATSAPP
            </button>
            <button onClick={() => onNavigate('archive')} className="btn btn-sm">
              ← ARCHIVO
            </button>
          </div>
        </div>
      </div>

      {/* ─── Commercial Packs Pricing Banner ─── */}
      <div className="page-pad" style={{ paddingTop: '28px', paddingBottom: '0' }}>
        <div className="packs-banner">
          <div className="font-mono packs-banner-title">
            TARIFAS DIGITALES & DESCUENTO POR PACKS:
          </div>
          <div className="packs-chips-grid">
            <div className={`pack-chip ${count === 1 ? 'active' : ''}`}>
              <span className="pack-name font-mono">1 FOTO</span>
              <span className="pack-price font-display">1,49 €</span>
              <span className="pack-desc font-mono">Alta res</span>
            </div>
            {packs.map((pk) => {
              const isMatch = count >= pk.photoCount;
              return (
                <div key={pk.id} className={`pack-chip ${isMatch ? 'active' : ''}`}>
                  <span className="pack-name font-mono">{pk.name.toUpperCase()}</span>
                  <span className="pack-price font-display">{(pk.priceCents / 100).toFixed(2)} €</span>
                  <span className="pack-desc font-mono">{pk.photoCount} fotos · {(pk.priceCents / pk.photoCount / 100).toFixed(2)}€/u</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Gallery Controls & Filter Bar ─── */}
      <div className="page-pad" style={{ paddingTop: '24px' }}>
        <div className="gallery-toolbar">
          {/* Bib Search Filter */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="font-mono" style={{ fontSize: '11px', color: 'var(--mut)' }}>DORSAL:</span>
            <input
              type="number"
              placeholder="Nº dorsal"
              className="bib-filter-input"
              value={filterBib}
              onChange={(e) => setFilterBib(e.target.value)}
              min="1"
              max="9999"
            />
            {filterBib && (
              <button onClick={() => setFilterBib('')} className="btn btn-sm btn-outline">
                LIMPIAR ✕
              </button>
            )}
          </div>

          {/* Sort Order */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span className="font-mono" style={{ fontSize: '11px', color: 'var(--mut)' }}>ORDEN:</span>
            <select
              value={sortOrder}
              onChange={(e: any) => setSortOrder(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '11px' }}
            >
              <option value="default">Predeterminado</option>
              <option value="bib-asc">Dorsal (menor a mayor)</option>
              <option value="bib-desc">Dorsal (mayor a menor)</option>
              <option value="name">Nombre de archivo</option>
            </select>
          </div>

          {/* Batch Selection Action */}
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
            <button
              onClick={handleSelectAllFiltered}
              className="btn btn-sm btn-outline"
              title="Añadir todas las fotos visibles a tu selección"
            >
              + SELECCIONAR TODAS ({processedPhotos.length})
            </button>
            {selectedInThisEvent.length > 0 && (
              <button
                onClick={handleDeselectAllInEvent}
                className="btn btn-sm"
                style={{ color: 'var(--mut)' }}
              >
                DESELECCIONAR ESTE EVENTO
              </button>
            )}
          </div>
        </div>

        {/* Photos Grid / Empty States */}
        {processedPhotos.length === 0 ? (
          <div className="gallery-empty">
            {filterBib ? (
              <>
                <span style={{ fontSize: '48px' }}>🔍</span>
                <h3 className="font-display" style={{ fontSize: '36px', margin: '12px 0 8px' }}>
                  Dorsal #{filterBib} no encontrado
                </h3>
                <p style={{ color: 'var(--mut)' }}>
                  No se encontraron fotografías con el dorsal #{filterBib} en este evento.<br />
                  Prueba con otro número o{' '}
                  <button
                    onClick={() => setFilterBib('')}
                    style={{ color: 'var(--ac)', textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    explora todas las fotografías
                  </button>.
                </p>
              </>
            ) : (
              <>
                <span style={{ fontSize: '48px' }}>📷</span>
                <h3 className="font-display" style={{ fontSize: '36px', margin: '12px 0 8px' }}>
                  Galería próximamente
                </h3>
                <p style={{ color: 'var(--mut)' }}>
                  Las fotografías de este evento serán publicadas en breve.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="gallery-count font-mono">
              {processedPhotos.length} FOTOGRAFÍA{processedPhotos.length !== 1 ? 'S' : ''}
              {filterBib ? ` CON DORSAL #${filterBib}` : ' EN ESTE EVENTO'}
            </div>

            <div className="photo-masonry">
              {processedPhotos.map((p, i) => {
                const inCart = isSelected(p.id);
                return (
                  <div
                    key={p.id}
                    className={`photo-card${inCart ? ' in-cart' : ''}`}
                    onClick={() => setViewerIndex(i)}
                  >
                    <img src={p.thumbnailUrl} alt={p.filename} loading="lazy" />

                    {/* Add / In-cart overlay */}
                    <div
                      className="photo-card-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePhoto({
                          id: p.id,
                          filename: p.filename,
                          previewUrl: p.previewUrl,
                          thumbnailUrl: p.thumbnailUrl,
                          eventName: event.name
                        });
                      }}
                    >
                      <button
                        className={`btn btn-sm photo-add-btn${inCart ? ' active' : ''}`}
                        title={inCart ? 'Quitar de la selección' : 'Añadir a la selección'}
                      >
                        {inCart ? '✓' : '+'}
                      </button>
                    </div>

                    {/* Bibs badge */}
                    {p.bibs && p.bibs.length > 0 && (
                      <div className="photo-bibs">
                        {p.bibs.slice(0, 3).map((b) => (
                          <span key={b} className="bib-pill">#{b}</span>
                        ))}
                      </div>
                    )}

                    {/* In-cart indicator line */}
                    {inCart && <div className="photo-card-selected-bar" />}
                  </div>
                );
              })}
            </div>

            {/* Footer CTA */}
            <div className="gallery-cta font-mono" style={{ marginBottom: '100px' }}>
              <span>¿Encuentras tu coche? Añade las fotos a tu selección y compra sin registro previo.</span>
              <span style={{ color: 'var(--mut)' }}>Descarga inmediata en máxima resolución · Sin marca de agua digital</span>
            </div>
          </>
        )}
      </div>

      {/* ─── Floating Selection Bottom Bar ─── */}
      {selectedInThisEvent.length > 0 && (
        <div className="floating-selection-bar">
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <span className="font-display" style={{ fontSize: '26px', color: 'var(--ac)' }}>
                {selectedInThisEvent.length}
              </span>
              <span className="font-mono" style={{ fontSize: '11px', color: 'var(--ink)' }}>
                FOTO{selectedInThisEvent.length !== 1 ? 'S' : ''} SELECCIONADA{selectedInThisEvent.length !== 1 ? 'S' : ''}
              </span>
              {quote && (
                <span className="font-mono" style={{ fontSize: '11px', color: 'var(--success)', marginLeft: '12px' }}>
                  Total actual: {(quote.totalCents / 100).toFixed(2)} € {quote.appliedPackName && `(${quote.appliedPackName})`}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={handleDeselectAllInEvent}
                className="btn btn-sm btn-outline"
                style={{ padding: '8px 14px', fontSize: '11px' }}
              >
                LIMPIAR EVENTO
              </button>
              <button
                onClick={openDrawer}
                className="btn btn-sm btn-primary"
                style={{ padding: '8px 20px', fontSize: '11px' }}
              >
                VER SELECCIÓN Y COMPRAR ({count}) →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {viewerIndex !== null && (
        <PhotoViewer
          photos={processedPhotos}
          initialIndex={viewerIndex}
          eventName={event.name}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
};
