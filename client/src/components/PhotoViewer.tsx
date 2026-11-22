import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { PhotoItem } from '../types';

interface PhotoViewerProps {
  photos: PhotoItem[];
  initialIndex: number;
  eventName: string;
  onClose: () => void;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  photos,
  initialIndex,
  eventName,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const { isSelected, togglePhoto, showToast } = useCart();

  const currentPhoto = photos[currentIndex];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, photos.length]);

  if (!currentPhoto) return null;

  const step = (delta: number) => {
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev + delta + photos.length) % photos.length);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${eventName} — OLOBOC_ Motorsport Photography`,
          text: `Fotografía motorsport en ${eventName}. Etiqueta @oloboc_`,
          url
        });
        return;
      } catch (e: any) {
        if (e.name === 'AbortError') return;
      }
    }
    await navigator.clipboard.writeText(url);
    showToast('Enlace copiado al portapapeles');
  };

  const handleWhatsApp = () => {
    const url = window.location.href;
    const text = encodeURIComponent(`Mira esta fotografía de ${eventName} en @oloboc_ ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  };

  const inCart = isSelected(currentPhoto.id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        background: 'rgba(5, 5, 6, 0.95)',
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(6px)'
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid var(--line)',
          background: 'rgba(8, 9, 11, 0.8)'
        }}
      >
        <span className="font-mono">
          {String(currentIndex + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')} · {eventName}
        </span>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() =>
              togglePhoto({
                id: currentPhoto.id,
                filename: currentPhoto.filename,
                previewUrl: currentPhoto.previewUrl,
                thumbnailUrl: currentPhoto.thumbnailUrl,
                eventName
              })
            }
            className={`btn btn-sm ${inCart ? 'btn-primary' : 'btn-outline'}`}
          >
            {inCart ? '✓ EN TU SELECCIÓN' : '+ AÑADIR A SELECCIÓN'}
          </button>
          <button onClick={handleShare} className="btn btn-sm btn-outline">
            COMPARTIR
          </button>
          <button onClick={handleWhatsApp} className="btn btn-sm btn-outline">
            WHATSAPP
          </button>
          <button onClick={onClose} className="btn btn-sm">
            CERRAR ✕
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          padding: '20px'
        }}
      >
        <button
          onClick={() => step(-1)}
          aria-label="Foto anterior"
          style={{
            position: 'absolute',
            left: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid var(--line)',
            padding: '16px 14px',
            fontSize: '20px',
            zIndex: 10
          }}
        >
          ←
        </button>

        <img
          src={currentPhoto.previewUrl}
          alt={currentPhoto.filename}
          onClick={() => setIsZoomed(!isZoomed)}
          style={{
            maxWidth: isZoomed ? 'none' : '94vw',
            maxHeight: isZoomed ? 'none' : '78vh',
            width: isZoomed ? '160%' : 'auto',
            height: isZoomed ? '160%' : 'auto',
            objectFit: 'contain',
            cursor: isZoomed ? 'zoom-out' : 'zoom-in',
            transition: 'transform 0.3s ease'
          }}
        />

        <button
          onClick={() => step(1)}
          aria-label="Foto siguiente"
          style={{
            position: 'absolute',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid var(--line)',
            padding: '16px 14px',
            fontSize: '20px',
            zIndex: 10
          }}
        >
          →
        </button>
      </div>

      {/* Bottom Bar: Bibs & Info */}
      <div
        style={{
          padding: '12px 24px',
          borderTop: '1px solid var(--line)',
          background: 'rgba(8, 9, 11, 0.8)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="font-mono">{currentPhoto.filename}</span>
          {currentPhoto.bibs && currentPhoto.bibs.length > 0 && (
            <div style={{ display: 'flex', gap: '6px' }}>
              {currentPhoto.bibs.map((b) => (
                <span
                  key={b}
                  className="pill pill-warning"
                  style={{ background: 'rgba(232, 67, 31, 0.15)', borderColor: 'var(--ac)', color: '#fff' }}
                >
                  DORSAL #{b}
                </span>
              ))}
            </div>
          )}
        </div>

        <span className="font-mono" style={{ color: 'var(--mut)', fontSize: '10px' }}>
          Muestra con marca de agua digital. La descarga comprada se entrega limpia en máxima resolución.
        </span>
      </div>
    </div>
  );
};
