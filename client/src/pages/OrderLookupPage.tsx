import React, { useState } from 'react';
import { api } from '../api';

interface OrderLookupPageProps {
  onNavigate: (route: string) => void;
}

export const OrderLookupPage: React.FC<OrderLookupPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !orderNumber.trim()) {
      setError('Por favor, indica tanto el email como el número de pedido.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.lookupOrder(email, orderNumber);
      onNavigate(`order-success?token=${res.downloadToken}`);
    } catch (err: any) {
      setError(err.message || 'No se ha encontrado ningún pedido con los datos facilitados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-pad">
      <div className="font-mono">Order Recovery</div>
      <h1 className="font-display" style={{ fontSize: 'clamp(52px, 8vw, 100px)', margin: '6px 0 20px' }}>
        Recuperar mis compras
      </h1>
      <p style={{ maxWidth: '640px', fontSize: '16px', color: 'var(--mut)', marginBottom: '32px' }}>
        ¿Compraste como invitado o necesitas volver a descargar tus fotografías adquiridas? Introduce el email utilizado durante el pago y el número de pedido (ej. <code>OLB-20260516-A1B2</code>).
      </p>

      <form onSubmit={handleSubmit} style={{ maxWidth: '480px', display: 'grid', gap: '14px' }}>
        <div>
          <label className="font-mono" style={{ display: 'block', marginBottom: '6px' }}>
            Email de compra:
          </label>
          <input
            type="email"
            placeholder="ejemplo@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="font-mono" style={{ display: 'block', marginBottom: '6px' }}>
            Número de pedido:
          </label>
          <input
            type="text"
            placeholder="OLB-YYYYMMDD-XXXX"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            required
          />
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: '13px' }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{ marginTop: '10px' }}
        >
          {loading ? 'BUSCANDO PEDIDO…' : 'CONSULTAR PEDIDO Y DESCARGAS →'}
        </button>
      </form>

      <div style={{ marginTop: '40px', borderTop: '1px solid var(--line)', paddingTop: '24px', maxWidth: '480px' }}>
        <p className="font-mono" style={{ fontSize: '10px', color: 'var(--mut)' }}>
          Si no recuerdas tu número de pedido, revisa el email de confirmación enviado por Stripe o contacta con nosotros desde la sección de contacto indicando fecha y detalles del pago.
        </p>
      </div>
    </div>
  );
};
