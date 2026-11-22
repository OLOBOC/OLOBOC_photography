import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { EventItem } from '../types';

interface ArchivePageProps {
  onNavigate: (route: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Rally: '#E8431F',
  Rallysprint: '#D4860F',
  Drift: '#1FABE8',
  Circuito: '#1FE843',
  Otros: '#888'
};

export const ArchivePage: React.FC<ArchivePageProps> = ({ onNavigate }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    setLoading(true);
    api
      .getEvents({
        category: selectedCategory !== 'Todas' ? selectedCategory : undefined,
        season: selectedSeason !== 'all' ? selectedSeason : undefined,
        query: searchQuery.trim() || undefined
      })
      .then((res) => setEvents(res.events))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedCategory, selectedSeason, searchQuery]);

  const categories = ['Todas', 'Rally', 'Rallysprint', 'Drift', 'Circuito', 'Otros'];
  const seasons = ['all', '2026', '2025', '2024'];

  const eventsWithPhotos = events.filter((e) => e.photoCount > 0);
  const eventsEmpty = events.filter((e) => e.photoCount === 0);

  return (
    <div className="page-pad" style={{ paddingTop: '100px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '40px' }}>
        <div className="font-mono" style={{ color: 'var(--ac)', fontSize: '11px', letterSpacing: '0.16em', marginBottom: '8px' }}>
          ARCHIVO · OLOBOC_ MOTORSPORT PHOTOGRAPHY
        </div>
        <h1 className="font-display" style={{ fontSize: 'clamp(56px, 9vw, 120px)', margin: '0 0 16px' }}>
          Eventos
        </h1>
        <p style={{ color: 'var(--mut)', maxWidth: '540px' }}>
          Archivo completo de eventos fotografiados. Encuentra tu coche, selecciona las fotos y descarga en alta resolución.
        </p>
      </div>

      {/* Filters row */}
      <div className="archive-filters">
        {/* Category Chips */}
        <div className="chips-row">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`chip${selectedCategory === c ? ' active' : ''}`}
              style={
                selectedCategory === c && c !== 'Todas'
                  ? { background: CATEGORY_COLORS[c] || 'var(--ac)', borderColor: 'transparent' }
                  : {}
              }
            >
              {c}
            </button>
          ))}
        </div>

        {/* Search + Season + View toggle */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            style={{ flex: '1 1 240px', minWidth: '180px' }}
            placeholder="Buscar evento…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            style={{ flex: '0 1 180px' }}
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
          >
            <option value="all">Todas las temporadas</option>
            {seasons
              .filter((s) => s !== 'all')
              .map((s) => (
                <option key={s} value={s}>Temporada {s}</option>
              ))}
          </select>
          <div className="view-toggle">
            <button
              className={`view-toggle-btn${viewMode === 'grid' ? ' active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Vista cuadrícula"
            >
              ⊞
            </button>
            <button
              className={`view-toggle-btn${viewMode === 'list' ? ' active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Vista lista"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="event-loading" style={{ padding: '60px 0' }}>
          <span className="font-mono" style={{ color: 'var(--ac)' }}>CARGANDO EVENTOS…</span>
          <div className="loading-bar" />
        </div>
      ) : events.length === 0 ? (
        <div className="gallery-empty">
          <span style={{ fontSize: '48px' }}>📂</span>
          <h3 className="font-display" style={{ fontSize: '36px', margin: '12px 0 8px' }}>
            Sin resultados
          </h3>
          <p style={{ color: 'var(--mut)' }}>
            No hay eventos con los filtros seleccionados.
          </p>
          <button
            onClick={() => { setSelectedCategory('Todas'); setSelectedSeason('all'); setSearchQuery(''); }}
            className="btn btn-sm btn-primary"
            style={{ marginTop: '16px' }}
          >
            VER TODOS
          </button>
        </div>
      ) : (
        <>
          {/* Events WITH photos */}
          {eventsWithPhotos.length > 0 && (
            <>
              {viewMode === 'grid' ? (
                <div className="archive-grid">
                  {eventsWithPhotos.map((e) => (
                    <a
                      key={e.id}
                      href={`#event-${e.slug}`}
                      onClick={(ev) => { ev.preventDefault(); onNavigate(`event-${e.slug}`); }}
                      className="archive-card"
                    >
                      <div className="archive-card-cover">
                        {e.coverPhoto ? (
                          <img src={e.coverPhoto.thumbnailUrl} alt={e.name} loading="lazy" />
                        ) : (
                          <div className="archive-card-cover-placeholder">
                            <span className="font-display">OLOBOC_</span>
                          </div>
                        )}
                        <div className="archive-card-vignette" />
                        <span
                          className="archive-card-category font-mono"
                          style={{ background: CATEGORY_COLORS[e.category] || 'var(--ac)' }}
                        >
                          {e.category}
                        </span>
                        <span className="archive-card-count font-mono">{e.photoCount} fotos</span>
                      </div>
                      <div className="archive-card-info">
                        <div className="font-mono archive-card-meta">
                          {e.season} · {new Date(e.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase()}
                        </div>
                        <h3 className="font-display archive-card-title">{e.name}</h3>
                        <div className="font-mono archive-card-location">{e.location}</div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                /* List view */
                <div className="archive-list">
                  {eventsWithPhotos.map((e) => (
                    <a
                      key={e.id}
                      href={`#event-${e.slug}`}
                      onClick={(ev) => { ev.preventDefault(); onNavigate(`event-${e.slug}`); }}
                      className="archive-list-row"
                    >
                      <div className="archive-list-thumb">
                        {e.coverPhoto ? (
                          <img src={e.coverPhoto.thumbnailUrl} alt={e.name} loading="lazy" />
                        ) : (
                          <div className="archive-list-thumb-placeholder" />
                        )}
                      </div>
                      <div className="archive-list-info">
                        <span
                          className="archive-list-category font-mono"
                          style={{ color: CATEGORY_COLORS[e.category] || 'var(--ac)' }}
                        >
                          {e.season} · {e.category}
                        </span>
                        <h3 className="font-display archive-list-title">{e.name}</h3>
                        <span className="font-mono archive-list-location">{e.location}</span>
                      </div>
                      <div className="archive-list-right font-mono">
                        <span>{new Date(e.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</span>
                        <span style={{ color: 'var(--ac)' }}>{e.photoCount} fotos →</span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Events WITHOUT photos (smaller section) */}
          {eventsEmpty.length > 0 && (
            <div style={{ marginTop: '48px' }}>
              <div className="font-mono" style={{ color: 'var(--mut)', fontSize: '11px', letterSpacing: '0.12em', marginBottom: '16px', borderTop: '1px solid var(--line)', paddingTop: '24px' }}>
                PRÓXIMAMENTE — GALERÍA EN PREPARACIÓN
              </div>
              <div className="archive-upcoming">
                {eventsEmpty.map((e) => (
                  <div key={e.id} className="upcoming-event font-mono">
                    <span style={{ color: CATEGORY_COLORS[e.category] || 'var(--mut)' }}>{e.category}</span>
                    <span className="upcoming-name">{e.name}</span>
                    <span style={{ color: 'var(--mut)' }}>{e.location}</span>
                    <span style={{ color: 'var(--mut)' }}>
                      {new Date(e.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
