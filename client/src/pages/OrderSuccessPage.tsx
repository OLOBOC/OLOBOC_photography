import React, { useState, useEffect, useRef } from 'react';
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
  const [pollCount, setPollCount] = useState(0);
  const pollTimerRef = useRef<any>(null);

  const fetchOrder = async (isInitial = false) => {
    if (!token) {
      setError('Token de pedido no proporcionado.');
      setLoading(false);
      return;
    }

    try {
      if (isInitial) setLoading(true);

      // In local dev simulation, ensure order is marked paid if simulated=true
      if (window.location.href.includes('simulated=true') || window.location.hash.includes('simulated=true')) {
        await api.simulatePaymentSuccess(token).catch(() => {});
      }

      const res = await api.getOrder(token);
      setOrder(res);
      setError(null);

      // If still PENDING and hasn't exceeded 6 polls (12s), schedule poll
      if (res.status === 'PENDING' && pollCount < 6) {
        pollTimerRef.current = setTimeout(() => {
          setPollCount((prev) => prev + 1);
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Error cargando pedido');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder(pollCount === 0);
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [token, pollCount]);

  if (loading) {
    return (
      <div className="page-pad" style={{ paddingTop: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
          <div className="font-mono" style={{ color: 'var(--ac)', marginBottom: '16px' }}>
            ● PROCESANDO TRANSACCIÓN // ENLACES CRIPTOGRÁFICOS
          </div>
          <h2 className="font-display" style={{ fontSize: '40px', marginBottom: '16px' }}>
            Verificando pedido…
          </h2>
          <p style={{ color: 'var(--mut)', marginBottom: '24px' }}>
            Conectando con la pasarela bancaria y generando tus enlaces de descarga directa en alta resolución.
          </p>
          <div className="loading-bar" style={{ maxWidth: '320px', margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="page-pad" style={{ paddingTop: '100px' }}>
        <div style={{ maxWidth: '640px', background: 'var(--bg2)', border: '1px solid var(--danger)', padding: '32px' }}>
          <div className="font-mono" style={{ color: 'var(--danger)', marginBottom: '12px' }}>
            ⚠ ERROR DE AUTORIZACIÓN
          </div>
          <h2 className="font-display" style={{ fontSize: '44px', color: 'var(--danger)', margin: '0 0 16px' }}>
            Pedido no disponible
          </h2>
          <p style={{ margin: '16px 0', lineHeight: 1.6 }}>{error || 'El enlace de descarga es inválido, ha caducado o no existe.'}</p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button onClick={() => fetchOrder(true)} className="btn btn-outline btn-sm">
              REINTENTAR COMPROBACIÓN
            </button>
            <button onClick={() => onNavigate('home')} className="btn btn-primary btn-sm">
              VOLVER AL INICIO
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 1. STATE: PENDING
  if (order.status === 'PENDING') {
    return (
      <div className="page-pad" style={{ paddingTop: '100px' }}>
        <div style={{ maxWidth: '680px', background: 'var(--bg2)', border: '1px solid var(--line)', padding: '32px' }}>
          <div className="font-mono" style={{ color: '#D4860F', marginBottom: '12px' }}>
            ⏳ PAGO EN PROCESO DE CONFIRMACIÓN
          </div>
          <h1 className="font-display" style={{ fontSize: 'clamp(44px, 6vw, 72px)', margin: '0 0 16px' }}>
            Esperando a la pasarela
          </h1>
          <p style={{ lineHeight: 1.6, color: 'var(--ink)', marginBottom: '20px' }}>
            Estamos esperando la confirmación oficial del pago por parte de Stripe para el pedido <strong>{order.orderNumber}</strong>. Las descargas se habilitarán automáticamente en cuanto se reciba el webhook bancario.
          </p>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button onClick={() => fetchOrder(true)} className="btn btn-primary btn-sm">
              ACTUALIZAR ESTADO AHORA ↻
            </button>
            <span className="font-mono" style={{ fontSize: '11px', color: 'var(--mut)' }}>
              Comprobación #{pollCount}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. STATE: REFUNDED
  if (order.status === 'REFUNDED') {
    return (
      <div className="page-pad" style={{ paddingTop: '100px' }}>
        <div style={{ maxWidth: '680px', background: 'var(--bg2)', border: '1px solid var(--line)', padding: '32px' }}>
          <div className="font-mono" style={{ color: 'var(--mut)', marginBottom: '12px' }}>
            ↩ ESTADO: REEMBOLSADO
          </div>
          <h1 className="font-display" style={{ fontSize: 'clamp(44px, 6vw, 72px)', margin: '0 0 16px' }}>
            Pedido reembolsado
          </h1>
          <p style={{ lineHeight: 1.6, color: 'var(--ink)', marginBottom: '20px' }}>
            El importe correspondiente al pedido <strong>{order.orderNumber}</strong> ha sido reembolsado a través del método de pago original. Conforme a las condiciones de venta, el acceso a las descargas digitales de este pedido ha sido revocado.
          </p>
          <button onClick={() => onNavigate('archive')} className="btn btn-primary btn-sm">
            EXPLORAR GALERÍAS →
          </button>
        </div>
      </div>
    );
  }

  // 3. STATE: EXPIRED
  if (order.isExpired) {
    return (
      <div className="page-pad" style={{ paddingTop: '100px' }}>
        <div style={{ maxWidth: '680px', background: 'var(--bg2)', border: '1px solid var(--line)', padding: '32px' }}>
          <div className="font-mono" style={{ color: 'var(--danger)', marginBottom: '12px' }}>
            ✕ PLAZO VENCIDO
          </div>
          <h1 className="font-display" style={{ fontSize: 'clamp(44px, 6vw, 72px)', margin: '0 0 16px' }}>
            Enlace caducado
          </h1>
          <p style={{ lineHeight: 1.6, color: 'var(--ink)', marginBottom: '20px' }}>
            El periodo autorizado de descarga de 7 días para el pedido <strong>{order.orderNumber}</strong> expiró el {new Date(order.downloadExpiresAt).toLocaleDateString('es-ES')}. Si necesitas asistencia o volver a acceder a tus archivos, ponte en contacto con nosotros indicando tu email y número de pedido.
          </p>
          <button onClick={() => onNavigate('home')} className="btn btn-primary btn-sm">
            IR AL INICIO
          </button>
        </div>
      </div>
    );
  }

  // 4. STATE: PAID (Active downloads)
  return (
    <div className="page-pad" style={{ paddingTop: '100px' }}>
      <div className="font-mono" style={{ color: 'var(--success)', letterSpacing: '0.12em' }}>
        ✓ PAGO CONFIRMADO CON ÉXITO // ACCESO CONCEDIDO
      </div>

      <h1 className="font-display" style={{ fontSize: 'clamp(52px, 8vw, 100px)', margin: '8px 0 16px' }}>
        ¡Gracias por tu compra!
      </h1>

      <p style={{ maxWidth: '680px', fontSize: '18px', color: 'var(--ink)', marginBottom: '16px' }}>
        Tu pedido ha sido procesado de manera segura. A continuación dispones de los enlaces directos para descargar tus fotografías en <strong>máxima resolución y sin marcas de agua</strong>.
      </p>

      {/* Email confirmation notice */}
      <div
        style={{
          background: 'rgba(31, 232, 67, 0.08)',
          border: '1px solid #1FE843',
          padding: '14px 18px',
          maxWidth: '740px',
          marginBottom: '28px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}
      >
        <span style={{ fontSize: '20px' }}>📧</span>
        <span style={{ fontSize: '14px', lineHeight: 1.5 }}>
          Hemos enviado una copia del recibo y tus enlaces de descarga seguros a: <strong>{order.customerEmail}</strong>.
        </span>
      </div>

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
            <span className="font-mono" style={{ fontSize: '11px', color: 'var(--mut)' }}>NÚMERO DE PEDIDO:</span>
            <p style={{ fontWeight: 600, fontSize: '16px', marginTop: '4px' }}>{order.orderNumber}</p>
          </div>
          <div>
            <span className="font-mono" style={{ fontSize: '11px', color: 'var(--mut)' }}>TOTAL ABONADO:</span>
            <p style={{ fontWeight: 600, fontSize: '16px', marginTop: '4px', color: 'var(--ac)' }}>
              {(order.totalAmountCents / 100).toFixed(2)} €
            </p>
          </div>
          <div>
            <span className="font-mono" style={{ fontSize: '11px', color: 'var(--mut)' }}>DESCARGAS UTILIZADAS:</span>
            <p style={{ fontWeight: 600, fontSize: '16px', marginTop: '4px' }}>
              {order.downloadCount} / {order.maxDownloads}
            </p>
          </div>
          <div>
            <span className="font-mono" style={{ fontSize: '11px', color: 'var(--mut)' }}>VIGENCIA DEL ENLACE:</span>
            <p style={{ fontWeight: 600, fontSize: '14px', marginTop: '4px' }}>
              Hasta {new Date(order.downloadExpiresAt).toLocaleDateString('es-ES')} (7 días)
            </p>
          </div>
        </div>
      </div>

      {/* Purchased Photos Downloads */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
        <h2 className="font-display" style={{ fontSize: '36px', margin: 0 }}>
          Descargas disponibles ({order.items.length} fotografía{order.items.length === 1 ? '' : 's'})
        </h2>
        <a
          href={`/api/checkout/order/${token}/receipt`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm btn-outline font-mono"
          style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          📄 DESCARGAR FACTURA SIMPLIFICADA (IVA 21%) ↗
        </a>
      </div>

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
              padding: '12px 16px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ width: '80px', height: '60px', overflow: 'hidden', flexShrink: 0, background: 'var(--bg)' }}>
              <img src={it.thumbnailUrl} alt={it.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>{it.filename}</p>
              <span className="font-mono" style={{ fontSize: '11px', color: 'var(--mut)' }}>
                {it.eventName} · {it.width} × {it.height} px
              </span>
            </div>

            {it.downloadUrl ? (
              <a href={it.downloadUrl} download className="btn btn-sm btn-primary" style={{ whiteSpace: 'nowrap' }}>
                DESCARGAR ORIGINAL ⬇
              </a>
            ) : (
              <span className="font-mono" style={{ color: 'var(--danger)', fontSize: '12px' }}>
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
        <span className="font-mono" style={{ color: 'var(--ac)', fontWeight: 600, fontSize: '12px' }}>
          Condiciones de licencia de uso digital
        </span>
        <p style={{ fontSize: '13px', marginTop: '8px', lineHeight: 1.5, color: '#C0BEB8' }}>
          La adquisición de esta fotografía otorga una licencia de uso personal y difusión en redes sociales personales o de equipo. No se autoriza la reventa ni la cesión comercial a terceros sin autorización previa expresa de OLOBOC_. Etiqueta <strong>@oloboc_</strong> cuando compartas tus momentos en carrera.
        </p>
      </div>

      <div style={{ marginTop: '30px', display: 'flex', gap: '14px' }}>
        <button onClick={() => onNavigate('archive')} className="btn btn-outline">
          EXPLORAR MÁS EVENTOS →
        </button>
        <button onClick={() => onNavigate('order-lookup')} className="btn btn-outline">
          RECUPERAR OTRAS COMPRAS
        </button>
      </div>
    </div>
  );
};
