import React, { useState, useEffect, useCallback } from 'react';
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
  const [fadeKey, setFadeKey] = useState(0);
  const { isSelected, togglePhoto, showToast, openDrawer } = useCart();

  const currentPhoto = photos[currentIndex];

  const step = useCallback((delta: number) => {
    setIsZoomed(false);
    setFadeKey((k) => k + 1);
    setCurrentIndex((prev) => (prev + delta + photos.length) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, onClose]);

  // Touch swipe support
  useEffect(() => {
    let touchStartX = 0;
    const handleTouchStart = (e: TouchEvent) => { touchStartX = e.touches[0].clientX; };
    const handleTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    };
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [step]);

  const handleShare = useCallback(async () => {
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
  }, [eventName, showToast]);

  const handleWhatsApp = useCallback(() => {
    const url = window.location.href;
    const text = encodeURIComponent(`Mira esta fotografía de ${eventName} en @oloboc_ ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  }, [eventName]);

  if (!currentPhoto) return null;

  const inCart = isSelected(currentPhoto.id);
  const progress = ((currentIndex + 1) / photos.length) * 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Visor de fotos — ${eventName}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        background: 'rgba(4, 5, 6, 0.97)',
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(8px)'
      }}
    >
      {/* Progress bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'var(--line)', zIndex: 5 }}>
        <div
          style={{
            height: '100%',
            background: 'var(--ac)',
            width: `${progress}%`,
            transition: 'width 0.3s ease'
          }}
        />
      </div>

      {/* Top Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid var(--line)',
          background: 'rgba(8, 9, 11, 0.9)',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        <span className="font-mono" style={{ fontSize: '12px' }}>
          <span style={{ color: 'var(--ac)' }}>{String(currentIndex + 1).padStart(2, '0')}</span>
          <span style={{ color: 'var(--mut)' }}> / {String(photos.length).padStart(2, '0')}</span>
          <span style={{ color: 'var(--mut)' }}> · </span>
          {eventName}
        </span>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              togglePhoto({
                id: currentPhoto.id,
                filename: currentPhoto.filename,
                previewUrl: currentPhoto.previewUrl,
                thumbnailUrl: currentPhoto.thumbnailUrl,
                eventName
              });
              if (!inCart) showToast('Fotografía añadida a tu selección');
            }}
            className={`btn btn-sm ${inCart ? 'btn-primary' : 'btn-outline'}`}
            style={{ minWidth: '160px' }}
          >
            {inCart ? '✓ EN TU SELECCIÓN' : '+ AÑADIR A SELECCIÓN'}
          </button>

          {inCart && (
            <button
              onClick={() => { onClose(); openDrawer(); }}
              className="btn btn-sm btn-outline"
            >
              VER SELECCIÓN →
            </button>
          )}

          <button onClick={handleShare} className="btn btn-sm btn-outline" title="Compartir">
            COMPARTIR
          </button>
          <button onClick={handleWhatsApp} className="btn btn-sm btn-outline" title="Compartir por WhatsApp">
            WA
          </button>
          <button onClick={onClose} className="btn btn-sm">
            ✕
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
          padding: '16px 72px'
        }}
      >
        {/* Prev */}
        <button
          onClick={() => step(-1)}
          aria-label="Foto anterior"
          className="viewer-nav viewer-nav-prev"
        >
          ←
        </button>

        {/* Image with fade */}
        <img
          key={fadeKey}
          src={currentPhoto.previewUrl}
          alt={currentPhoto.filename}
          onClick={() => setIsZoomed(!isZoomed)}
          className="viewer-img viewer-img-fade"
          style={{
            maxWidth: isZoomed ? 'none' : '100%',
            maxHeight: isZoomed ? 'none' : '76vh',
            width: isZoomed ? '150%' : 'auto',
            height: isZoomed ? '150%' : 'auto',
            objectFit: 'contain',
            cursor: isZoomed ? 'zoom-out' : 'zoom-in'
          }}
        />

        {/* Next */}
        <button
          onClick={() => step(1)}
          aria-label="Foto siguiente"
          className="viewer-nav viewer-nav-next"
        >
          →
        </button>

        {/* Swipe hint (mobile only) */}
        <div className="viewer-swipe-hint font-mono">
          ← desliza →
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--line)',
          background: 'rgba(8, 9, 11, 0.9)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span className="font-mono" style={{ fontSize: '11px', color: 'var(--mut)' }}>
            {currentPhoto.filename}
          </span>
          {currentPhoto.bibs && currentPhoto.bibs.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {currentPhoto.bibs.map((b) => (
                <span
                  key={b}
                  className="font-mono"
                  style={{
                    background: 'rgba(232, 67, 31, 0.15)',
                    border: '1px solid var(--ac)',
                    color: '#fff',
                    padding: '2px 8px',
                    fontSize: '10px',
                    letterSpacing: '0.08em'
                  }}
                >
                  DORSAL #{b}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Watermark notice */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(232, 67, 31, 0.08)',
            border: '1px solid rgba(232, 67, 31, 0.3)',
            padding: '6px 12px'
          }}
        >
          <span style={{ fontSize: '14px' }}>🔒</span>
          <span className="font-mono" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>
            Muestra protegida · Descarga sin marca de agua tras compra
          </span>
        </div>
      </div>
    </div>
  );
};
