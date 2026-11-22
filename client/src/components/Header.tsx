import React, { useState } from 'react';
import { useCart } from '../context/CartContext';

interface HeaderProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentRoute, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { count, openDrawer } = useCart();

  const handleNav = (route: string) => {
    setMobileMenuOpen(false);
    onNavigate(route);
  };

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        background: 'linear-gradient(rgba(8, 9, 11, 0.95), rgba(8, 9, 11, 0.6) 80%, transparent)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(35, 39, 45, 0.4)'
      }}
    >
      <a
        href="#home"
        onClick={(e) => {
          e.preventDefault();
          handleNav('home');
        }}
        style={{
          fontFamily: 'Bebas Neue',
          fontSize: '32px',
          letterSpacing: '0.04em',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        OLOBOC<i style={{ color: 'var(--ac)', fontStyle: 'normal' }}>_</i>
      </a>

      {/* Desktop Navigation */}
      <nav
        style={{
          display: 'flex',
          gap: '24px',
          alignItems: 'center'
        }}
        className="desktop-nav"
      >
        {[
          { id: 'home', label: 'Home' },
          { id: 'archive', label: 'Eventos' },
          { id: 'discover', label: 'Dorsal' },
          { id: 'about', label: 'Sobre mí' },
          { id: 'contact', label: 'Contacto' },
          { id: 'order-lookup', label: 'Mis Compras' },
          { id: 'admin', label: 'Admin' }
        ].map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => {
              e.preventDefault();
              handleNav(item.id);
            }}
            style={{
              fontFamily: 'IBM Plex Mono',
              fontSize: '12px',
              fontWeight: 500,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: currentRoute === item.id ? 'var(--ac)' : 'var(--ink)',
              transition: 'color 0.2s'
            }}
          >
            {item.label}
          </a>
        ))}

        {/* Selection / Cart Trigger */}
        <button
          onClick={openDrawer}
          className="btn btn-sm btn-primary"
          style={{
            marginLeft: '8px',
            position: 'relative'
          }}
          aria-label="Abrir selección de fotos"
        >
          SELECCIÓN {count > 0 && <span style={{ fontWeight: 700 }}>[{count}]</span>}
        </button>
      </nav>

      {/* Mobile Toggle */}
      <div style={{ display: 'none' }} className="mobile-actions">
        <button
          onClick={openDrawer}
          className="btn btn-sm btn-primary"
          style={{ marginRight: '10px' }}
        >
          [{count}]
        </button>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="btn btn-sm"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? 'CERRAR' : 'MENÚ'}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--bg)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '24px',
            padding: '40px 24px'
          }}
        >
          <button
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '24px',
              fontFamily: 'IBM Plex Mono',
              fontSize: '14px'
            }}
          >
            CERRAR ✕
          </button>
          {[
            { id: 'home', label: 'Home' },
            { id: 'archive', label: 'Eventos' },
            { id: 'discover', label: 'Buscar Dorsal' },
            { id: 'about', label: 'Sobre mí' },
            { id: 'contact', label: 'Contacto' },
            { id: 'order-lookup', label: 'Mis Compras' },
            { id: 'admin', label: 'Panel Admin' }
          ].map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                handleNav(item.id);
              }}
              style={{
                fontFamily: 'Bebas Neue',
                fontSize: '44px',
                color: currentRoute === item.id ? 'var(--ac)' : 'var(--ink)'
              }}
            >
              {item.label}
            </a>
          ))}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              openDrawer();
            }}
            className="btn btn-primary"
            style={{ marginTop: '20px', width: '100%', maxWidth: '280px' }}
          >
            VER SELECCIÓN ({count})
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 860px) {
          .desktop-nav { display: none !important; }
          .mobile-actions { display: flex !important; }
        }
      `}</style>
    </header>
  );
};
