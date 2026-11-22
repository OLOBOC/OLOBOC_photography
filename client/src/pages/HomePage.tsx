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
    api.getEvents().then((res) => setEvents(res.events)).catch(console.error);
  }, []);

  const handleBibSearch = (val: string) => {
    setBibQuery(val);
    const clean = val.trim();
    if (!clean) {
      setBibResults([]);
      return;
    }

    setIsSearchingBib(true);
    api
      .searchBib(clean)
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

  return (
    <div>
      {/* Hero Section */}
      <section
        style={{
          position: 'relative',
          height: '100svh',
          minHeight: '600px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-end',
          paddingBottom: '12vh'
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 60% 40%, rgba(232, 67, 31, 0.15), transparent 60%), #08090B'
          }}
        />

        {/* Ambient Motorsport Lighting Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(8, 9, 11, 0.4), transparent 40%, #08090B 96%)',
            pointerEvents: 'none'
          }}
        />

        <div className="container" style={{ position: 'relative', zIndex: 2, width: '100%' }}>
          <div className="font-mono" style={{ color: 'var(--ink)', marginBottom: '8px' }}>
            Motorsport Photography · Platform by Nortcode
          </div>

          <h1
            className="font-display"
            style={{
              fontSize: 'clamp(84px, 20vw, 300px)',
              lineHeight: 0.82,
              letterSpacing: '-0.01em',
              mixBlendMode: 'difference'
            }}
          >
            OLOBOC<i style={{ color: 'var(--ac)', fontStyle: 'normal' }}>_</i>
          </h1>

          <p
            style={{
              fontSize: 'clamp(18px, 2.5vw, 24px)',
              maxWidth: '560px',
              margin: '20px 0 28px',
              color: 'var(--ink)'
            }}
          >
            The moment. The machine. The motion. Galerías completas de rally, rallysprint, circuito y drift.
          </p>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <button onClick={() => onNavigate('archive')} className="btn btn-primary">
              ENTRAR A LAS GALERÍAS →
            </button>
            <a href="#discover" className="btn btn-outline">
              BUSCAR POR DORSAL #
            </a>
          </div>
        </div>
      </section>

      {/* Ticker Tape */}
      <div className="ticker-wrap">
        <div className="ticker-inner">
          {'<span>RALLY</span><b>/</b><span>RALLYSPRINT</span><b>/</b><span>DRIFT</span><b>/</b><span>CIRCUITO</span><b>/</b><span>HISTÓRICOS</span><b>/</b>'.repeat(
            6
          )}
        </div>
      </div>

      {/* 01 - Latest Events */}
      <section className="section-pad">
        <div className="font-mono">01 — Latest Events</div>
        <h2 className="font-display" style={{ fontSize: 'clamp(48px, 8vw, 110px)', margin: '6px 0 34px' }}>
          Últimas galerías
        </h2>

        <div className="events-grid">
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
                  {e.location} · {e.photoCount} fotografías
                </span>
              </div>
            </a>
          ))}
        </div>

        <div style={{ marginTop: '30px' }}>
          <button onClick={() => onNavigate('archive')} className="btn">
            VER TODO EL ARCHIVO →
          </button>
        </div>
      </section>

      {/* 02 - Car / Bib Recognition Finder */}
      <section id="discover" className="section-pad" style={{ background: 'var(--bg2)', borderBlock: '1px solid var(--line)' }}>
        <div className="font-mono">02 — Photo Discovery</div>
        <h2 className="font-display" style={{ fontSize: 'clamp(48px, 8vw, 110px)', margin: '6px 0 16px' }}>
          Encuentra tu coche
        </h2>
        <p style={{ maxWidth: '620px', marginBottom: '24px', color: 'var(--mut)', fontSize: '15px' }}>
          Búsqueda de fotografías por número de dorsal analizado mediante nuestro pipeline de reconocimiento automático. Introduce tu número de carrera.
        </p>

        <div style={{ maxWidth: '320px', marginBottom: '30px' }}>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Dorsal (ej. 7, 12, 23)"
            value={bibQuery}
            onChange={(e) => handleBibSearch(e.target.value)}
          />
        </div>

        {isSearchingBib && (
          <p className="font-mono" style={{ color: 'var(--ac)', marginBottom: '16px' }}>
            Buscando dorsales en la base de datos…
          </p>
        )}

        {bibQuery && !isSearchingBib && bibResults.length === 0 && (
          <p className="font-mono" style={{ color: 'var(--mut)' }}>
            No se han encontrado fotografías publicadas con el dorsal #{bibQuery}.
          </p>
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

      {/* 03 - Behind the Lens */}
      <section id="about" className="section-pad">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '50px', alignItems: 'center' }}>
          <div style={{ aspectRatio: '4/5', background: 'var(--bg2)', border: '1px solid var(--line)', overflow: 'hidden' }}>
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #16181d, #08090b)',
                display: 'grid',
                placeItems: 'center',
                padding: '30px',
                textAlign: 'center'
              }}
            >
              <div>
                <span className="font-display" style={{ fontSize: '72px', color: 'var(--ac)' }}>
                  OLOBOC_
                </span>
                <p className="font-mono" style={{ marginTop: '10px' }}>
                  Motorsport Visual Storyteller
                </p>
              </div>
            </div>
          </div>

          <div>
            <div className="font-mono">03 — Fotógrafo</div>
            <h2 className="font-display" style={{ fontSize: 'clamp(48px, 7vw, 90px)', margin: '6px 0 20px' }}>
              Detrás del objetivo
            </h2>
            <p style={{ color: 'var(--ink)', fontSize: '18px', lineHeight: 1.6, marginBottom: '16px' }}>
              Pasión por el rally, las subidas de montaña, el drift y la cultura del motor. Capturando el instante exacto en que la máquina, la velocidad y la concentración del piloto se funden con el paisaje.
            </p>
            <p className="font-mono" style={{ marginBottom: '28px', color: 'var(--mut)' }}>
              Asturias · Cobertura nacional · Eventos oficiales y privados
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <a href="https://www.instagram.com/oloboc_/" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                INSTAGRAM @OLOBOC_
              </a>
              <a href="https://www.tiktok.com/@oloboc_" target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                TIKTOK @OLOBOC_
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 04 - Share your moment */}
      <section className="section-pad" style={{ background: 'var(--bg3)', borderBlock: '1px solid var(--line)' }}>
        <div className="font-mono" style={{ color: 'var(--ac)' }}>04 — Share Your Moment</div>
        <h2 className="font-display" style={{ fontSize: 'clamp(52px, 9vw, 130px)', margin: '6px 0 16px' }}>
          Share your shot. Tag @oloboc_.
        </h2>
        <p style={{ maxWidth: '640px', fontSize: '18px', marginBottom: '24px' }}>
          Si encontraste tu momento en carrera y lo compartes en tus redes sociales, menciona y etiqueta <strong>@oloboc_</strong> para apoyar la continuidad de las coberturas.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => copyToClipboard('@oloboc_', '@oloboc_ copiado al portapapeles')} className="btn btn-primary">
            COPIAR @OLOBOC_
          </button>
          <a href="https://www.instagram.com/oloboc_/" target="_blank" rel="noopener noreferrer" className="btn">
            VER EN INSTAGRAM
          </a>
        </div>
      </section>

      {/* 05 - Contact Form */}
      <section id="contact" className="section-pad">
        <div className="font-mono">05 — Contacto</div>
        <h2 className="font-display" style={{ fontSize: 'clamp(48px, 8vw, 100px)', margin: '6px 0 24px' }}>
          Hablemos
        </h2>

        <form onSubmit={handleContactSubmit} style={{ maxWidth: '640px', display: 'grid', gap: '14px' }}>
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
            <option value="Colaboración">Colaboración</option>
            <option value="Evento / Organizador">Evento / Organizador</option>
            <option value="Equipo / Piloto">Equipo / Piloto</option>
            <option value="Solicitud fotográfica">Solicitud fotográfica</option>
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

          <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px', cursor: 'pointer' }}>
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
            style={{ justifySelf: 'start', minWidth: '160px' }}
          >
            {contactStatus.loading ? 'ENVIANDO…' : 'ENVIAR MENSAJE'}
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
