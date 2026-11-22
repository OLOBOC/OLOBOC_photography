import React from 'react';

interface FooterProps {
  onNavigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--line)',
        padding: '50px 24px 70px',
        background: 'var(--bg2)',
        marginTop: '60px'
      }}
    >
      <div
        style={{
          maxWidth: '1500px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '30px'
        }}
      >
        <div>
          <span
            style={{
              fontFamily: 'Bebas Neue',
              fontSize: '36px',
              display: 'inline-block'
            }}
          >
            OLOBOC<i style={{ color: 'var(--ac)', fontStyle: 'normal' }}>_</i>
          </span>
          <p
            className="font-mono"
            style={{
              marginTop: '8px',
              maxWidth: '380px',
              color: 'var(--mut)'
            }}
          >
            Plataforma independiente de fotografía motorsport. Capturando el instante, la velocidad y la máquina.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <span className="font-mono" style={{ color: 'var(--ink)', fontWeight: 600 }}>
            Legal y Privacidad
          </span>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }} className="font-mono">
            <a href="#aviso-legal" onClick={(e) => { e.preventDefault(); onNavigate('aviso-legal'); }}>
              Aviso legal
            </a>
            <a href="#privacidad" onClick={(e) => { e.preventDefault(); onNavigate('privacidad'); }}>
              Privacidad
            </a>
            <a href="#cookies" onClick={(e) => { e.preventDefault(); onNavigate('cookies'); }}>
              Cookies
            </a>
            <a href="#licencia-imagen" onClick={(e) => { e.preventDefault(); onNavigate('licencia-imagen'); }}>
              Licencia e imagen
            </a>
            <a href="#order-lookup" onClick={(e) => { e.preventDefault(); onNavigate('order-lookup'); }}>
              Recuperar Compras
            </a>
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: '1500px',
          margin: '36px auto 0',
          paddingTop: '20px',
          borderTop: '1px solid rgba(35, 39, 45, 0.6)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
        className="font-mono"
      >
        <p style={{ color: 'var(--mut)' }}>
          © {new Date().getFullYear()} OLOBOC_. Todos los derechos reservados.
        </p>

        {/* Discreet and professional Nortcode credit */}
        <p style={{ color: 'var(--mut)' }}>
          Una solución digital desarrollada por{' '}
          <a
            href="https://www.nortcode.es/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--ink)',
              textDecoration: 'underline',
              fontWeight: 500
            }}
          >
            Nortcode
          </a>
          .
        </p>
      </div>
    </footer>
  );
};
