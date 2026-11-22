import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { EventItem, BibSearchResult } from '../types';
import { useCart } from '../context/CartContext';
import { PhotoViewer } from '../components/PhotoViewer';

interface HomePageProps {
  onNavigate: (route: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [bibQuery, setBibQuery] = useState('');
  const [selectedBibEvent, setSelectedBibEvent] = useState('all');
  const [bibResults, setBibResults] = useState<BibSearchResult[]>([]);
  const [isSearchingBib, setIsSearchingBib] = useState(false);
  const [viewerPhoto, setViewerPhoto] = useState<{ photos: any[]; index: number; eventName: string } | null>(null);

  // Contact form state
  const [contactForm, setContactForm] = useState({
    n: '',
    e: '',
    r: '',
    m: '',
    ok: false,
    web: ''
  });
  const [contactStatus, setContactStatus] = useState<{ loading: boolean; error?: string; success?: string }>({
    loading: false
  });

  const { showToast } = useCart();

  useEffect(() => {
    api
      .getEvents()
      .then((res) => setEvents(res.events))
      .catch(console.error);
  }, []);

  const handleBibSearch = (val: string, eventId: string = selectedBibEvent) => {
    setBibQuery(val);
    const clean = val.trim();
    if (!clean) {
      setBibResults([]);
      return;
    }

    setIsSearchingBib(true);
    api
      .searchBib(clean, eventId !== 'all' ? eventId : undefined)
      .then((res) => setBibResults(res.results))
      .catch((err) => console.error('Bib search error:', err))
      .finally(() => setIsSearchingBib(false));
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.n.trim()) return setContactStatus({ loading: false, error: 'Indica tu nombre.' });
    if (!/^\S+@\S+\.\S+$/.test(contactForm.e.trim())) return setContactStatus({ loading: false, error: 'Email no válido.' });
    if (!contactForm.r) return setContactStatus({ loading: false, error: 'Selecciona un motivo.' });
    if (contactForm.m.trim().length < 10) return setContactStatus({ loading: false, error: 'El mensaje es muy corto.' });
    if (!contactForm.ok) return setContactStatus({ loading: false, error: 'Debes aceptar la política de privacidad.' });

    try {
      setContactStatus({ loading: true });
      await api.sendContact(contactForm);
      setContactStatus({
        loading: false,
        success: 'Mensaje enviado correctamente. Te responderemos lo antes posible.'
      });
      setContactForm({ n: '', e: '', r: '', m: '', ok: false, web: '' });
      showToast('Mensaje de contacto enviado con éxito');
    } catch (err: any) {
      setContactStatus({ loading: false, error: err.message || 'Error al enviar el mensaje' });
    }
  };

  const copyToClipboard = async (text: string, msg: string) => {
    await navigator.clipboard.writeText(text);
    showToast(msg);
  };

  const heroCoverUrl = events[0]?.coverPhoto?.previewUrl || '/api/photos/preview/060b3ff7-3249-4dc5-bfe4-6857141726ed-preview.webp';

  return (
    <div>
      {/* 1. Cinematic Hero Section */}
      <section className="hero-wrapper">
        <div className="hero-bg">
          <img src={heroCoverUrl} alt="OLOBOC_ Motorsport Photography" />
        </div>
        <div className="hero-overlay" />

        <div className="container" style={{ position: 'relative', zIndex: 3, width: '100%' }}>
          {/* Motorsport HUD telemetry header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              borderBottom: '1px solid rgba(243, 239, 234, 0.2)',
              paddingBottom: '12px',
              marginBottom: '20px'
            }}
            className="font-mono"
          >
            <span style={{ color: 'var(--ac)' }}>
              ● REC // ARCHIVO MOTORSPORT // ASTURIAS
            </span>
            <span style={{ color: 'var(--ink)' }}>
              F/2.8 · 1/1600S · ISO 400 · RAW 18MP
            </span>
          </div>

          <h1
            className="font-display"
            style={{
              fontSize: 'clamp(84px, 21vw, 290px)',
              letterSpacing: '-0.01em',
              mixBlendMode: 'difference',
              textShadow: '0 8px 30px rgba(0,0,0,0.8)'
            }}
          >
            OLOBOC<i style={{ color: 'var(--ac)', fontStyle: 'normal' }}>_</i>
          </h1>

          <p
            style={{
              fontSize: 'clamp(18px, 2.6vw, 26px)',
              maxWidth: '640px',
              margin: '18px 0 32px',
              color: 'var(--ink)',
              fontWeight: 500,
              lineHeight: 1.3
            }}
          >
            The moment. The machine. The motion. Galerías completas de rally, rallysprint, circuito y drift con entrega digital en alta resolución.
          </p>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => onNavigate('archive')} className="btn btn-primary">
              ENTRAR A LAS GALERÍAS →
            </button>
            <a href="#discover" className="btn btn-outline">
              BUSCAR MI COCHE POR DORSAL #
            </a>
            <a
              href="https://www.instagram.com/oloboc_/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
              style={{ borderColor: 'transparent', color: 'var(--mut)' }}
            >
              @OLOBOC_ EN INSTAGRAM ↗
            </a>
          </div>
        </div>
      </section>

      {/* 2. Ticker Tape */}
      <div className="ticker-wrap">
        <div className="ticker-inner">
          {'<span>RALLY</span><b>/</b><span>RALLYSPRINT</span><b>/</b><span>DRIFT</span><b>/</b><span>CIRCUITO</span><b>/</b><span>HISTÓRICOS</span><b>/</b><span>VELOCIDAD</span><b>/</b>'.repeat(
            5
          )}
        </div>
      </div>

      {/* 3. Latest Events (Asymmetrical Editorial Grid) */}
      <section className="section-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '34px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="font-mono">01 — Latest Events</div>
            <h2 className="font-display" style={{ fontSize: 'clamp(48px, 8vw, 110px)', margin: '4px 0 0' }}>
              Últimas galerías
            </h2>
          </div>
          <button onClick={() => onNavigate('archive')} className="btn btn-outline">
            VER ARCHIVO COMPLETO ({events.reduce((acc, e) => acc + e.photoCount, 0)} FOTOS) →
          </button>
        </div>

        <div className="editorial-grid">
          {events.slice(0, 6).map((e, idx) => (
            <a
              key={e.id}
              href={`#event-${e.slug}`}
              onClick={(eNav) => {
                eNav.preventDefault();
                onNavigate(`event-${e.slug}`);
              }}
              className={`event-tile ${idx === 0 ? 'tile-span-7' : idx < 3 ? 'tile-span-5' : 'tile-span-4'}`}
            >
              {e.coverPhoto ? (
                <img src={e.coverPhoto.previewUrl} alt={e.name} loading="lazy" />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'var(--bg2)', display: 'grid', placeItems: 'center' }}>
                  <span className="font-mono" style={{ color: 'var(--mut)' }}>{e.category}</span>
                </div>
              )}
              <div className="overlay">
                <span className="font-mono" style={{ color: 'var(--ac)' }}>
                  {e.category} · {new Date(e.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                </span>
                <h3>{e.name}</h3>
                <span className="font-mono">
                  {e.location} · {e.photoCount} fotografías disponibles
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* 4. Car & Bib Recognition Finder */}
      <section id="discover" className="section-pad" style={{ background: 'var(--bg2)', borderBlock: '1px solid var(--line)' }}>
        <div className="font-mono" style={{ color: 'var(--ac)' }}>02 — Reconocimiento Automático</div>
        <h2 className="font-display" style={{ fontSize: 'clamp(48px, 8vw, 110px)', margin: '6px 0 16px' }}>
          Encuentra tu dorsal
        </h2>
        <p style={{ maxWidth: '640px', marginBottom: '24px', color: 'var(--mut)', fontSize: '16px' }}>
          ¿Has participado en carrera? Localiza al instante todas las fotografías de tu vehículo analizadas automáticamente mediante nuestro pipeline OCR.
        </p>

        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '28px' }}>
          <div style={{ maxWidth: '280px', flex: '1 1 200px' }}>
            <input
              type="number"
              inputMode="numeric"
              placeholder="Nº dorsal (ej. 7, 12, 23)"
              value={bibQuery}
              onChange={(e) => handleBibSearch(e.target.value)}
              style={{ fontSize: '18px', fontWeight: 600, padding: '14px 18px' }}
            />
          </div>

          <div style={{ maxWidth: '260px', flex: '1 1 200px' }}>
            <select
              value={selectedBibEvent}
              onChange={(e) => {
                setSelectedBibEvent(e.target.value);
                if (bibQuery) handleBibSearch(bibQuery, e.target.value);
              }}
              style={{ padding: '15px 16px', fontSize: '13px' }}
            >
              <option value="all">Todos los eventos</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
          </div>

          {/* Quick Filter Chips */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="font-mono" style={{ fontSize: '10px' }}>Dorsales destacados:</span>
            {['7', '12', '23', '44', '5'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleBibSearch(d)}
                className={`chip ${bibQuery === d ? 'active' : ''}`}
                style={{ padding: '6px 14px' }}
              >
                #{d}
              </button>
            ))}
          </div>
        </div>

        {isSearchingBib && (
          <p className="font-mono" style={{ color: 'var(--ac)', marginBottom: '16px' }}>
            Escaneando archivo por dorsal #{bibQuery}…
          </p>
        )}

        {bibQuery && !isSearchingBib && bibResults.length === 0 && (
          <div style={{ padding: '30px', background: 'var(--bg)', border: '1px solid var(--line)', maxWidth: '600px' }}>
            <p className="font-mono" style={{ color: 'var(--mut)' }}>
              No se han encontrado fotografías publicadas con el dorsal #{bibQuery}.
            </p>
            <p style={{ fontSize: '13px', marginTop: '8px' }}>
              Si competiste en este evento y tu dorsal no aparece etiquetado, puedes solicitarlo directamente a través del formulario de contacto.
            </p>
          </div>
        )}

        {bibResults.length > 0 && (
          <div>
            <span className="font-mono" style={{ display: 'block', marginBottom: '16px' }}>
              {bibResults.length} fotografía{bibResults.length === 1 ? '' : 's'} encontradas con dorsal #{bibQuery}:
            </span>
            <div className="photo-masonry">
              {bibResults.map((r, i) => (
                <div
                  key={r.detectionId}
                  className="photo-card"
                  onClick={() =>
                    setViewerPhoto({
                      photos: bibResults.map((x) => ({
                        id: x.photoId,
                        filename: `Dorsal #${x.bibNumber}`,
                        previewUrl: x.previewUrl,
                        thumbnailUrl: x.thumbnailUrl,
                        width: x.width,
                        height: x.height,
                        isCover: false,
                        isCommercial: true,
                        bibs: [x.bibNumber]
                      })),
                      index: i,
                      eventName: r.eventName
                    })
                  }
                >
                  <img src={r.thumbnailUrl} alt={`Dorsal #${r.bibNumber}`} loading="lazy" />
                  <div className="card-info">
                    #{r.bibNumber} · {r.eventName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 5. Behind the Lens (Photographer Statement) */}
      <section id="about" className="section-pad">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '50px', alignItems: 'center' }}>
          <div style={{ aspectRatio: '4/5', background: 'var(--bg2)', border: '1px solid var(--line)', overflow: 'hidden', position: 'relative' }}>
            <img
              src={events[1]?.coverPhoto?.previewUrl || heroCoverUrl}
              alt="Detrás del objetivo OLOBOC_"
              style={{ filter: 'grayscale(25%) contrast(1.1)' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 50%, rgba(8,9,11,0.9))' }} />
            <div style={{ position: 'absolute', bottom: '24px', left: '24px' }}>
              <span className="font-mono" style={{ color: 'var(--ac)' }}>OLOBOC_ PHOTOGRAPHY</span>
              <p className="font-display" style={{ fontSize: '38px', marginTop: '4px' }}>Asturias Motorsport</p>
            </div>
          </div>

          <div>
            <div className="font-mono">03 — Detrás del Objetivo</div>
            <h2 className="font-display" style={{ fontSize: 'clamp(48px, 7vw, 90px)', margin: '6px 0 20px' }}>
              El instante. El asfalto. La pasión.
            </h2>
            <p style={{ color: 'var(--ink)', fontSize: '18px', lineHeight: 1.6, marginBottom: '16px' }}>
              No disparo fotos: persigo la décima de segundo en que el piloto clava el vértice de la curva, el escape escupe fuego y la grava impacta en el chasis. Una crónica visual cinematográfica del automovilismo deportivo real.
            </p>
            <p className="font-mono" style={{ marginBottom: '30px', color: 'var(--mut)' }}>
              Rally · Rallysprint · Drift · Montaña · Coberturas oficiales para equipos y organizadores
            </p>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <a href="https://www.instagram.com/oloboc_/" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                INSTAGRAM @OLOBOC_ ↗
              </a>
              <a href="https://www.tiktok.com/@oloboc_" target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                TIKTOK @OLOBOC_ ↗
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Share & Tag Community */}
      <section className="section-pad" style={{ background: 'var(--bg3)', borderBlock: '1px solid var(--line)' }}>
        <div className="font-mono" style={{ color: 'var(--ac)' }}>04 — Share Your Shot</div>
        <h2 className="font-display" style={{ fontSize: 'clamp(52px, 9vw, 130px)', margin: '6px 0 16px' }}>
          Share your shot. Tag @oloboc_.
        </h2>
        <p style={{ maxWidth: '680px', fontSize: '18px', marginBottom: '28px', lineHeight: 1.5 }}>
          Si encontraste tu momento en la carrera y lo compartes en tus redes sociales, menciona y etiqueta <strong>@oloboc_</strong> para apoyar la continuidad de las coberturas en los tramos.
        </p>

        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <button onClick={() => copyToClipboard('@oloboc_', '@oloboc_ copiado al portapapeles')} className="btn btn-primary">
            COPIAR @OLOBOC_
          </button>
          <a href="https://www.instagram.com/oloboc_/" target="_blank" rel="noopener noreferrer" className="btn btn-outline">
            ABRIR PERFIL EN INSTAGRAM ↗
          </a>
        </div>
      </section>

      {/* 7. Contact Form */}
      <section id="contact" className="section-pad">
        <div className="font-mono">05 — Contacto Directo</div>
        <h2 className="font-display" style={{ fontSize: 'clamp(48px, 8vw, 100px)', margin: '6px 0 24px' }}>
          Hablemos
        </h2>

        <form onSubmit={handleContactSubmit} style={{ maxWidth: '660px', display: 'grid', gap: '16px' }}>
          <input
            placeholder="Tu nombre completo"
            value={contactForm.n}
            onChange={(e) => setContactForm({ ...contactForm, n: e.target.value })}
            required
          />

          <input
            type="email"
            placeholder="Tu correo electrónico"
            value={contactForm.e}
            onChange={(e) => setContactForm({ ...contactForm, e: e.target.value })}
            required
          />

          <select
            value={contactForm.r}
            onChange={(e) => setContactForm({ ...contactForm, r: e.target.value })}
            required
          >
            <option value="">Selecciona el motivo de contacto…</option>
            <option value="Colaboración">Colaboración / Sesión privada</option>
            <option value="Evento / Organizador">Evento / Organizador de competición</option>
            <option value="Equipo / Piloto">Equipo de competición / Piloto</option>
            <option value="Solicitud fotográfica">Solicitud fotográfica personalizada</option>
            <option value="Derechos de imagen / retirada">Derechos de imagen / Solicitud de retirada</option>
          </select>

          <textarea
            rows={5}
            placeholder="Escribe tu mensaje o detalles de la solicitud…"
            value={contactForm.m}
            onChange={(e) => setContactForm({ ...contactForm, m: e.target.value })}
            required
          />

          {/* Honeypot anti-bot hidden input */}
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            style={{ display: 'none' }}
            value={contactForm.web}
            onChange={(e) => setContactForm({ ...contactForm, web: e.target.value })}
          />

          <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={contactForm.ok}
              onChange={(e) => setContactForm({ ...contactForm, ok: e.target.checked })}
              style={{ width: 'auto', marginTop: '4px' }}
              required
            />
            <span>
              He leído y acepto la{' '}
              <a
                href="#privacidad"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('privacidad');
                }}
                style={{ textDecoration: 'underline' }}
              >
                política de privacidad
              </a>
              . Tus datos se utilizarán exclusivamente para responder a tu consulta.
            </span>
          </label>

          {contactStatus.error && (
            <div style={{ color: 'var(--danger)', fontSize: '13px' }}>{contactStatus.error}</div>
          )}

          {contactStatus.success && (
            <div style={{ color: 'var(--success)', fontSize: '14px', fontWeight: 600 }}>{contactStatus.success}</div>
          )}

          <button
            type="submit"
            disabled={contactStatus.loading}
            className="btn btn-primary"
            style={{ justifySelf: 'start', minWidth: '180px' }}
          >
            {contactStatus.loading ? 'ENVIANDO…' : 'ENVIAR MENSAJE →'}
          </button>
        </form>
      </section>

      {/* Lightbox Photo Viewer when opened */}
      {viewerPhoto && (
        <PhotoViewer
          photos={viewerPhoto.photos}
          initialIndex={viewerPhoto.index}
          eventName={viewerPhoto.eventName}
          onClose={() => setViewerPhoto(null)}
        />
      )}
    </div>
  );
};
