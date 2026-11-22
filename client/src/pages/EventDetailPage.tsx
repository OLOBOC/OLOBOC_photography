import React, { useState, useEffect, useCallback } from 'react';
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
  const [coverLoaded, setCoverLoaded] = useState(false);

  const { isSelected, togglePhoto, showToast } = useCart();

  useEffect(() => {
    setLoading(true);
    setCoverLoaded(false);
    api
      .getEventDetail(slug)
      .then((data) => setEvent(data))
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

  if (loading) {
    return (
      <div className="page-pad">
        <div className="event-loading">
          <span className="font-mono" style={{ color: 'var(--ac)' }}>CARGANDO GALERÍA</span>
          <div className="loading-bar" />
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

  const filteredPhotos = filterBib.trim()
    ? event.photos.filter((p) => p.bibs.some((b) => b === filterBib.trim()))
    : event.photos;

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

      {/* ─── Gallery Section ─── */}
      <div className="page-pad" style={{ paddingTop: '40px' }}>

        {/* Bib Filter */}
        {event.photos.length > 0 && (
          <div className="bib-filter-bar">
            <span className="font-mono bib-filter-label">BUSCAR POR DORSAL EN ESTE EVENTO:</span>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                <button onClick={() => setFilterBib('')} className="btn btn-sm">
                  LIMPIAR ✕
                </button>
              )}
            </div>
            {filterBib && (
              <span className="font-mono" style={{ fontSize: '11px', color: 'var(--mut)' }}>
                {filteredPhotos.length} resultado{filteredPhotos.length !== 1 ? 's' : ''} para dorsal #{filterBib}
              </span>
            )}
          </div>
        )}

        {/* Photos Grid / Empty States */}
        {filteredPhotos.length === 0 ? (
          <div className="gallery-empty">
            {filterBib ? (
              <>
                <span style={{ fontSize: '48px' }}>🔍</span>
                <h3 className="font-display" style={{ fontSize: '36px', margin: '12px 0 8px' }}>
                  Dorsal #{filterBib} no encontrado
                </h3>
                <p style={{ color: 'var(--mut)' }}>
                  No hay fotografías con ese dorsal en este evento.<br />
                  Prueba con otro número o{' '}
                  <button
                    onClick={() => setFilterBib('')}
                    style={{ color: 'var(--ac)', textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    explora todas las fotos
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
              {filteredPhotos.length} FOTOGRAFÍA{filteredPhotos.length !== 1 ? 'S' : ''}
              {filterBib ? ` CON DORSAL #${filterBib}` : ' EN ESTE EVENTO'}
            </div>

            <div className="photo-masonry">
              {filteredPhotos.map((p, i) => {
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
            <div className="gallery-cta font-mono">
              <span>¿Encuentras tu coche? Añade las fotos a tu selección y compra sin registro.</span>
              <span style={{ color: 'var(--mut)' }}>Descarga inmediata en alta resolución · Sin marca de agua</span>
            </div>
          </>
        )}
      </div>

      {/* Photo Viewer Modal */}
      {viewerIndex !== null && (
        <PhotoViewer
          photos={filteredPhotos}
          initialIndex={viewerIndex}
          eventName={event.name}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
};
