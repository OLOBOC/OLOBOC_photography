import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { api } from '../api';

export const CartDrawer: React.FC = () => {
  const {
    selectedPhotos,
    removePhoto,
    clearCart,
    isDrawerOpen,
    closeDrawer,
    quote,
    isLoadingQuote,
    tipCents,
    setTipCents,
    showToast
  } = useCart();

  const [customerEmail, setCustomerEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isDrawerOpen) return null;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customerEmail || !/^\S+@\S+\.\S+$/.test(customerEmail)) {
      setErrorMsg('Introduce un email válido para recibir tus descargas.');
      return;
    }

    if (selectedPhotos.length === 0) {
      setErrorMsg('Tu selección está vacía.');
      return;
    }

    try {
      setIsSubmitting(true);
      const session = await api.createCheckoutSession(
        selectedPhotos.map((p) => p.id),
        customerEmail,
        tipCents
      );

      clearCart();
      closeDrawer();

      if (session.sessionUrl) {
        window.location.href = session.sessionUrl;
      } else {
        window.location.hash = `#order-success?token=${session.downloadToken}`;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error iniciando la pasarela de pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeDrawer();
      }}
    >
      <div
        style={{
          width: 'min(500px, 100%)',
          height: '100%',
          background: 'var(--bg2)',
          borderLeft: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.6)'
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--line)'
          }}
        >
          <div>
            <h2 className="font-display" style={{ fontSize: '32px' }}>
              Tu Selección
            </h2>
            <span className="font-mono">
              {selectedPhotos.length} fotografía{selectedPhotos.length === 1 ? '' : 's'}
            </span>
          </div>
          <button onClick={closeDrawer} className="btn btn-sm btn-outline">
            CERRAR ✕
          </button>
        </div>

        {/* Photos List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          {selectedPhotos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <p className="font-mono" style={{ color: 'var(--mut)' }}>
                No has seleccionado ninguna fotografía todavía.
              </p>
              <p style={{ marginTop: '10px', fontSize: '14px' }}>
                Explora los eventos y pulsa «Añadir a la selección» o el icono de carrito en cualquier foto.
              </p>
            </div>
          ) : (
            selectedPhotos.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  background: 'var(--bg)',
                  padding: '8px 12px',
                  border: '1px solid var(--line)'
                }}
              >
                <div style={{ width: '64px', height: '48px', overflow: 'hidden', flexShrink: 0 }}>
                  <img src={p.thumbnailUrl} alt={p.filename} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {p.filename}
                  </p>
                  <span className="font-mono" style={{ fontSize: '10px' }}>
                    {p.eventName || 'Fotografía de motorsport'}
                  </span>
                </div>
                <button
                  onClick={() => removePhoto(p.id)}
                  style={{
                    color: 'var(--mut)',
                    padding: '4px 8px',
                    fontSize: '14px'
                  }}
                  title="Eliminar de la selección"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* Pricing & Checkout Summary */}
        {selectedPhotos.length > 0 && (
          <div
            style={{
              borderTop: '1px solid var(--line)',
              paddingTop: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {/* Server-verified breakdown */}
            {quote && (
              <div
                style={{
                  background: 'var(--bg)',
                  padding: '14px',
                  border: '1px solid var(--line)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span className="font-mono">Subtotal ({quote.photoCount} fotos)</span>
                  <span className="font-mono">{(quote.baseTotalCents / 100).toFixed(2)} €</span>
                </div>

                {quote.savingsCents > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                      color: 'var(--success)'
                    }}
                  >
                    <span className="font-mono">{quote.appliedPackName || 'Descuento Pack'}</span>
                    <span className="font-mono">-{(quote.savingsCents / 100).toFixed(2)} €</span>
                  </div>
                )}

                {/* Voluntary support */}
                <div style={{ margin: '12px 0 6px' }}>
                  <span className="font-mono" style={{ fontSize: '10px', display: 'block', marginBottom: '6px' }}>
                    Apoyo voluntario al fotógrafo:
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[
                      { label: '0 €', cents: 0 },
                      { label: '+1 €', cents: 100 },
                      { label: '+2 €', cents: 200 },
                      { label: '+5 €', cents: 500 }
                    ].map((t) => (
                      <button
                        key={t.cents}
                        type="button"
                        onClick={() => setTipCents(t.cents)}
                        className={`chip ${tipCents === t.cents ? 'active' : ''}`}
                        style={{ padding: '4px 10px', fontSize: '10px' }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    borderTop: '1px solid var(--line)',
                    paddingTop: '8px',
                    marginTop: '8px'
                  }}
                >
                  <span className="font-display" style={{ fontSize: '24px' }}>
                    TOTAL
                  </span>
                  <span className="font-display" style={{ fontSize: '32px', color: 'var(--ac)' }}>
                    {(quote.totalCents / 100).toFixed(2)} €
                  </span>
                </div>
              </div>
            )}

            {/* Email for guest order and delivery */}
            <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="email"
                placeholder="Tu email para recibir las descargas…"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
              />

              {errorMsg && (
                <div style={{ color: 'var(--danger)', fontSize: '12px' }}>{errorMsg}</div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || isLoadingQuote}
                className="btn btn-primary"
                style={{ width: '100%', padding: '16px' }}
              >
                {isSubmitting ? 'Iniciando pago…' : 'PAGAR DE MANERA SEGURA →'}
              </button>

              <span className="font-mono" style={{ fontSize: '9px', textAlign: 'center', color: 'var(--mut)', lineHeight: 1.4 }}>
                🔒 Pago seguro SSL 256-bit mediante Stripe. Descarga inmediata en máxima resolución (18 MP) sin marcas de agua.
              </span>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
