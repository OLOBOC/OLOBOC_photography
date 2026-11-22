import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { OrderDetails } from '../types';

interface OrderSuccessPageProps {
  token: string;
  onNavigate: (route: string) => void;
}

export const OrderSuccessPage: React.FC<OrderSuccessPageProps> = ({ token, onNavigate }) => {
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Token de pedido no proporcionado.');
      setLoading(false);
      return;
    }

    setLoading(true);

    // In local dev simulation, ensure order is marked paid
    api
      .simulatePaymentSuccess(token)
      .catch(() => {})
      .finally(() => {
        api
          .getOrder(token)
          .then((res) => setOrder(res))
          .catch((err) => setError(err.message || 'Error cargando pedido'))
          .finally(() => setLoading(false));
      });
  }, [token]);

  if (loading) {
    return (
      <div className="page-pad">
        <p className="font-mono">Verificando pedido y generando enlaces de descarga seguros…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="page-pad">
        <h2 className="font-display" style={{ fontSize: '48px', color: 'var(--danger)' }}>
          Pedido no encontrado
        </h2>
        <p style={{ margin: '16px 0' }}>{error || 'El enlace de descarga es inválido o ha caducado.'}</p>
        <button onClick={() => onNavigate('home')} className="btn btn-primary">
          VOLVER AL INICIO
        </button>
      </div>
    );
  }

  return (
    <div className="page-pad">
      <div className="font-mono" style={{ color: 'var(--success)' }}>
        ✓ PAGO CONFIRMADO CON ÉXITO
      </div>

      <h1 className="font-display" style={{ fontSize: 'clamp(52px, 8vw, 100px)', margin: '8px 0 16px' }}>
        ¡Gracias por tu compra!
      </h1>

      <p style={{ maxWidth: '680px', fontSize: '18px', color: 'var(--ink)', marginBottom: '24px' }}>
        Tu pedido ha sido procesado de manera segura. A continuación dispones de los enlaces directos para descargar tus fotografías en <strong>máxima resolución y sin marcas de agua</strong>.
      </p>

      {/* Order Summary Box */}
      <div
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--line)',
          padding: '24px',
          maxWidth: '740px',
          marginBottom: '32px'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <div>
            <span className="font-mono">Número de pedido:</span>
            <p style={{ fontWeight: 600, fontSize: '16px', marginTop: '4px' }}>{order.orderNumber}</p>
          </div>
          <div>
            <span className="font-mono">Email de entrega:</span>
            <p style={{ fontWeight: 600, fontSize: '16px', marginTop: '4px' }}>{order.customerEmail}</p>
          </div>
          <div>
            <span className="font-mono">Total abonado:</span>
            <p style={{ fontWeight: 600, fontSize: '16px', marginTop: '4px', color: 'var(--ac)' }}>
              {(order.totalAmountCents / 100).toFixed(2)} €
            </p>
          </div>
          <div>
            <span className="font-mono">Vigencia del enlace:</span>
            <p style={{ fontWeight: 600, fontSize: '14px', marginTop: '4px' }}>
              Hasta {new Date(order.downloadExpiresAt).toLocaleDateString('es-ES')}
            </p>
          </div>
        </div>
      </div>

      {/* Purchased Photos Downloads */}
      <h2 className="font-display" style={{ fontSize: '36px', marginBottom: '18px' }}>
        Descargas disponibles ({order.items.length} fotografía{order.items.length === 1 ? '' : 's'})
      </h2>

      <div style={{ display: 'grid', gap: '14px', maxWidth: '740px', marginBottom: '40px' }}>
        {order.items.map((it) => (
          <div
            key={it.photoId}
            style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              background: 'var(--bg2)',
              border: '1px solid var(--line)',
              padding: '12px 16px'
            }}
          >
            <div style={{ width: '80px', height: '60px', overflow: 'hidden', flexShrink: 0 }}>
              <img src={it.thumbnailUrl} alt={it.filename} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: '15px' }}>{it.filename}</p>
              <span className="font-mono" style={{ fontSize: '10px' }}>
                {it.eventName} · {it.width} × {it.height} px
              </span>
            </div>

            {it.downloadUrl ? (
              <a href={it.downloadUrl} download className="btn btn-sm btn-primary">
                DESCARGAR ORIGINAL ⬇
              </a>
            ) : (
              <span className="font-mono" style={{ color: 'var(--danger)' }}>
                Descarga no disponible
              </span>
            )}
          </div>
        ))}
      </div>

      {/* License & Terms Notice */}
      <div
        style={{
          maxWidth: '740px',
          background: 'rgba(232, 67, 31, 0.08)',
          border: '1px solid var(--ac)',
          padding: '20px'
        }}
      >
        <span className="font-mono" style={{ color: 'var(--ac)', fontWeight: 600 }}>
          Condiciones de licencia de uso
        </span>
        <p style={{ fontSize: '13px', marginTop: '8px', lineHeight: 1.5 }}>
          La compra otorga una licencia de uso personal y difusión en redes sociales personales o de equipo. No se autoriza la reventa ni la cesión comercial a terceros sin autorización previa expresa de OLOBOC_. Etiqueta <strong>@oloboc_</strong> cuando compartas tus momentos en carrera.
        </p>
      </div>

      <div style={{ marginTop: '30px' }}>
        <button onClick={() => onNavigate('archive')} className="btn">
          EXPLORAR MÁS EVENTOS →
        </button>
      </div>
    </div>
  );
};
