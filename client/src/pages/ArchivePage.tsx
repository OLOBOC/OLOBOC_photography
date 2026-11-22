import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { EventItem } from '../types';

interface ArchivePageProps {
  onNavigate: (route: string) => void;
}

export const ArchivePage: React.FC<ArchivePageProps> = ({ onNavigate }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="page-pad">
      <div className="font-mono">Event Archive</div>
      <h1 className="font-display" style={{ fontSize: 'clamp(56px, 9vw, 120px)', margin: '6px 0 28px' }}>
        Archivo de eventos
      </h1>

      {/* Category Chips */}
      <div className="chips-row">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setSelectedCategory(c)}
            className={`chip ${selectedCategory === c ? 'active' : ''}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Search and Season Filters */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '32px' }}>
        <input
          style={{ flex: '1 1 300px' }}
          placeholder="Buscar evento por nombre…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          style={{ flex: '0 1 200px' }}
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value)}
        >
          <option value="all">Todas las temporadas</option>
          {seasons
            .filter((s) => s !== 'all')
            .map((s) => (
              <option key={s} value={s}>
                Temporada {s}
              </option>
            ))}
        </select>
      </div>

      {/* Event List */}
      {loading ? (
        <p className="font-mono" style={{ padding: '40px 0' }}>
          Cargando archivo de eventos…
        </p>
      ) : events.length === 0 ? (
        <p className="font-mono" style={{ padding: '50px 0', color: 'var(--mut)' }}>
          No se han encontrado eventos con los filtros seleccionados.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {events.map((e) => (
            <a
              key={e.id}
              href={`#event-${e.slug}`}
              onClick={(ev) => {
                ev.preventDefault();
                onNavigate(`event-${e.slug}`);
              }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(120px, 160px) 1fr auto auto',
                gap: '24px',
                alignItems: 'center',
                padding: '16px 0',
                borderTop: '1px solid var(--line)',
                transition: 'all 0.2s',
                textDecoration: 'none'
              }}
              onMouseEnter={(el) => (el.currentTarget.style.paddingLeft = '12px')}
              onMouseLeave={(el) => (el.currentTarget.style.paddingLeft = '0px')}
            >
              <div style={{ height: '90px', background: 'var(--bg2)', overflow: 'hidden' }}>
                {e.coverPhoto ? (
                  <img src={e.coverPhoto.thumbnailUrl} alt={e.name} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                    <span className="font-mono">FOTO</span>
                  </div>
                )}
              </div>

              <div>
                <span className="font-mono" style={{ color: 'var(--ac)' }}>
                  {e.season} · {e.category}
                </span>
                <h3 className="font-display" style={{ fontSize: 'clamp(28px, 4vw, 44px)', margin: '4px 0' }}>
                  {e.name}
                </h3>
              </div>

              <div className="font-mono" style={{ color: 'var(--mut)' }}>
                {e.location}
              </div>

              <div className="font-mono" style={{ textAlign: 'right' }}>
                {new Date(e.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--mut)' }}>
                  {e.photoCount} fotos
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
