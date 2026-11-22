import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { EventDetail, PhotoItem } from '../types';
import { useCart } from '../context/CartContext';
import { PhotoViewer } from '../components/PhotoViewer';

interface EventDetailPageProps {
  slug: string;
  onNavigate: (route: string) => void;
}

export const EventDetailPage: React.FC<EventDetailPageProps> = ({ slug, onNavigate }) => {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [filterBib, setFilterBib] = useState('');

  const { isSelected, togglePhoto, showToast } = useCart();

  useEffect(() => {
    setLoading(true);
    api
      .getEventDetail(slug)
      .then((data) => setEvent(data))
      .catch((err) => setError(err.message || 'Error cargando el evento'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="page-pad">
        <p className="font-mono">Cargando galería de evento…</p>
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

  const handleShare = async () => {
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
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`Galería completa de ${event.name} en OLOBOC_ Motorsport: ${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  };

  return (
    <div className="page-pad">
      {/* Cover Header */}
      <div
        style={{
          position: 'relative',
          minHeight: '440px',
          background: 'var(--bg2)',
          border: '1px solid var(--line)',
          marginBottom: '36px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '36px 28px'
        }}
      >
        {event.coverPhoto && (
          <img
            src={event.coverPhoto.previewUrl}
            alt={event.name}
            style={{ position: 'absolute', inset: 0, opacity: 0.5, filter: 'brightness(0.7)' }}
          />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 30%, #08090B)' }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <span className="font-mono" style={{ color: 'var(--ac)' }}>
            {event.location.toUpperCase()} · TEMPORADA {event.season}
          </span>
          <h1 className="font-display" style={{ fontSize: 'clamp(52px, 9vw, 110px)', margin: '8px 0 14px' }}>
            {event.name}
          </h1>
          <p style={{ maxWidth: '700px', fontSize: '16px', color: 'var(--ink)', marginBottom: '18px' }}>
            {event.description}
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={handleShare} className="btn btn-sm btn-primary">
              COMPARTIR EVENTO
            </button>
            <button onClick={handleWhatsApp} className="btn btn-sm btn-outline">
              WHATSAPP
            </button>
            <button onClick={() => onNavigate('archive')} className="btn btn-sm">
              ← VOLVER AL ARCHIVO
            </button>
          </div>
        </div>
      </div>

      {/* Event Metadata Bar */}
      <div
        style={{
          display: 'flex',
          gap: '30px',
          flexWrap: 'wrap',
          padding: '16px 0',
          borderBlock: '1px solid var(--line)',
          marginBottom: '30px'
        }}
        className="font-mono"
      >
        <div>
          Fecha: <strong style={{ color: 'var(--ink)' }}>{new Date(event.date).toLocaleDateString('es-ES')}</strong>
        </div>
        <div>
          Categoría: <strong style={{ color: 'var(--ink)' }}>{event.category}</strong>
        </div>
        <div>
          Fotografías: <strong style={{ color: 'var(--ink)' }}>{event.photos.length}</strong>
        </div>
        <div>
          Fotógrafo: <strong style={{ color: 'var(--ink)' }}>OLOBOC_</strong>
        </div>
      </div>

      {/* Filter by Bib inside event */}
      {event.photos.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <span className="font-mono">Filtrar por dorsal en este evento:</span>
          <input
            type="number"
            placeholder="Dorsal (ej. 12)"
            style={{ maxWidth: '180px', padding: '8px 12px', fontSize: '13px' }}
            value={filterBib}
            onChange={(e) => setFilterBib(e.target.value)}
          />
          {filterBib && (
            <button onClick={() => setFilterBib('')} className="btn btn-sm">
              LIMPIAR
            </button>
          )}
        </div>
      )}

      {/* Masonry Gallery */}
      {filteredPhotos.length === 0 ? (
        <p className="font-mono" style={{ padding: '40px 0', color: 'var(--mut)' }}>
          {filterBib ? `No hay fotografías con el dorsal #${filterBib} en este evento.` : 'Aún no se han publicado fotografías para este evento.'}
        </p>
      ) : (
        <div className="photo-masonry">
          {filteredPhotos.map((p, i) => {
            const inCart = isSelected(p.id);
            return (
              <div
                key={p.id}
                className="photo-card"
                onClick={() => setViewerIndex(i)}
                style={{
                  outline: inCart ? '2px solid var(--ac)' : 'none'
                }}
              >
                <img src={p.thumbnailUrl} alt={p.filename} loading="lazy" />

                {/* Quick add / in-cart badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    zIndex: 5
                  }}
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
                    className={`btn btn-sm ${inCart ? 'btn-primary' : ''}`}
                    style={{
                      padding: '4px 8px',
                      background: inCart ? 'var(--ac)' : 'rgba(0,0,0,0.7)',
                      borderColor: inCart ? 'var(--ac)' : 'var(--line)',
                      fontSize: '10px'
                    }}
                  >
                    {inCart ? '✓ SELECCIONADA' : '+ AÑADIR'}
                  </button>
                </div>

                <div className="card-info">
                  {p.bibs && p.bibs.length > 0 ? `Dorsal #${p.bibs.join(', #')}` : p.filename}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
