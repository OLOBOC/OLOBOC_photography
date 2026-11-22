import React, { useState, useEffect } from 'react';

export const CookieBanner: React.FC = () => {
  const [consent, setConsent] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('oloboc_cookie_consent');
    if (saved) setConsent(saved);
  }, []);

  if (consent) return null;

  const handleAcceptAll = () => {
    localStorage.setItem('oloboc_cookie_consent', JSON.stringify({ necessary: true, analytics: true }));
    setConsent('all');
  };

  const handleOnlyNecessary = () => {
    localStorage.setItem('oloboc_cookie_consent', JSON.stringify({ necessary: true, analytics: false }));
    setConsent('necessary');
  };

  const handleSaveCustom = () => {
    localStorage.setItem('oloboc_cookie_consent', JSON.stringify({ necessary: true, analytics: analyticsEnabled }));
    setConsent('custom');
  };

  return (
    <div
      role="region"
      aria-label="Consentimiento de cookies"
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        right: '20px',
        maxWidth: '680px',
        margin: '0 auto',
        background: 'var(--bg2)',
        border: '1px solid var(--line)',
        padding: '24px',
        zIndex: 200,
        boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
      }}
    >
      <h3 className="font-display" style={{ fontSize: '24px', marginBottom: '8px' }}>
        Configuración de privacidad y cookies
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: '1.5', marginBottom: '14px' }}>
        Utilizamos cookies técnicas necesarias para el funcionamiento del carrito de compras y la sesión segura. No cargamos cookies de analítica o marketing sin tu consentimiento expreso conforme al RGPD y la LSSI-CE.
      </p>

      {showConfig && (
        <div style={{ background: 'var(--bg)', padding: '14px', border: '1px solid var(--line)', marginBottom: '14px' }}>
          <label style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
            <input type="checkbox" checked disabled style={{ width: 'auto' }} />
            <span><strong>Cookies técnicas necesarias:</strong> Imprescindibles para la navegación, selección y seguridad (Siempre activas).</span>
          </label>
          <label style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={analyticsEnabled}
              onChange={(e) => setAnalyticsEnabled(e.target.checked)}
              style={{ width: 'auto' }}
            />
            <span><strong>Cookies analíticas opcionales:</strong> Estadísticas anónimas de rendimiento.</span>
          </label>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={handleAcceptAll} className="btn btn-sm btn-primary">
          ACEPTAR TODAS
        </button>
        <button onClick={handleOnlyNecessary} className="btn btn-sm">
          SOLO NECESARIAS
        </button>
        {!showConfig ? (
          <button onClick={() => setShowConfig(true)} className="btn btn-sm btn-outline">
            CONFIGURAR
          </button>
        ) : (
          <button onClick={handleSaveCustom} className="btn btn-sm btn-primary">
            GUARDAR PREFERENCIAS
          </button>
        )}
      </div>
    </div>
  );
};
