import React, { useState, useEffect } from 'react';
import { CartProvider } from './context/CartContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { CookieBanner } from './components/CookieBanner';

import { HomePage } from './pages/HomePage';
import { ArchivePage } from './pages/ArchivePage';
import { EventDetailPage } from './pages/EventDetailPage';
import { OrderSuccessPage } from './pages/OrderSuccessPage';
import { OrderLookupPage } from './pages/OrderLookupPage';
import { LegalPage } from './pages/LegalPage';
import { AdminPage } from './pages/AdminPage';

const getInitialRoute = (): string => {
  const hash = window.location.hash.slice(1);
  if (hash) return hash;

  const pathname = window.location.pathname.replace(/^\/+/, '');
  const search = window.location.search;

  if (pathname.startsWith('order-success')) {
    const fullRoute = `order-success${search}`;
    window.location.hash = `#${fullRoute}`;
    return fullRoute;
  }

  if (pathname.startsWith('event/')) {
    const slug = pathname.replace('event/', '');
    window.location.hash = `#event-${slug}`;
    return `event-${slug}`;
  }

  if (['archive', 'order-lookup', 'admin', 'aviso-legal', 'privacidad', 'cookies', 'licencia-imagen', 'condiciones-compra'].includes(pathname)) {
    window.location.hash = `#${pathname}`;
    return pathname;
  }

  return 'home';
};

export const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<string>(getInitialRoute);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || 'home';
      setCurrentRoute(hash);

      // If navigating to an anchor section on home page (e.g. discover, about, contact)
      if (['discover', 'about', 'contact'].includes(hash)) {
        setTimeout(() => {
          const el = document.getElementById(hash);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
            return;
          }
        }, 80);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    // Initial load check for hash anchors
    if (['discover', 'about', 'contact'].includes(window.location.hash.slice(1))) {
      setTimeout(() => {
        const hash = window.location.hash.slice(1);
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (route: string) => {
    window.location.hash = `#${route}`;
  };

  const renderCurrentPage = () => {
    // 1. Event detail routes: #event-<slug>
    if (currentRoute.startsWith('event-')) {
      const slug = currentRoute.replace('event-', '');
      return <EventDetailPage slug={slug} onNavigate={navigateTo} />;
    }

    // 2. Order success route: #order-success?token=... or order-success
    if (currentRoute.startsWith('order-success')) {
      let token = '';
      if (currentRoute.includes('?')) {
        const params = new URLSearchParams(currentRoute.split('?')[1]);
        token = params.get('token') || '';
      }
      if (!token && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        token = params.get('token') || '';
      }
      return <OrderSuccessPage token={token} onNavigate={navigateTo} />;
    }

    // 3. Legal pages
    if (['aviso-legal', 'privacidad', 'cookies', 'licencia-imagen', 'condiciones-compra'].includes(currentRoute)) {
      return (
        <LegalPage
          page={currentRoute as any}
          onNavigate={navigateTo}
        />
      );
    }

    // 4. Other pages
    switch (currentRoute) {
      case 'archive':
        return <ArchivePage onNavigate={navigateTo} />;
      case 'order-lookup':
        return <OrderLookupPage onNavigate={navigateTo} />;
      case 'admin':
        return <AdminPage onNavigate={navigateTo} />;
      case 'home':
      default:
        return <HomePage onNavigate={navigateTo} />;
    }
  };

  const isAdminRoute = currentRoute === 'admin';

  return (
    <CartProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {!isAdminRoute && <Header currentRoute={currentRoute} onNavigate={navigateTo} />}

        <main style={{ flex: 1 }}>{renderCurrentPage()}</main>

        {!isAdminRoute && <Footer onNavigate={navigateTo} />}

        <CartDrawer />
        <CookieBanner />
      </div>
    </CartProvider>
  );
};
