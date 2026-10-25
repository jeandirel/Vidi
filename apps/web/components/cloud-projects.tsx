'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { projectSchema, type ProjectInput } from '@vidi/core';
import { api } from '@/lib/client-api';
import Icon from './icon';
type CloudProject = { id: string; data: ProjectInput; revision: number; updatedAt: string };
export default function CloudProjects({
  workspaceId,
  canWrite,
  onOpen,
  notify,
}: {
  workspaceId: string;
  canWrite: boolean;
  onOpen: (project: CloudProject) => void;
  notify: (message: string) => void;
}) {
  const [projects, setProjects] = useState<CloudProject[]>([]);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const generation = useRef(0);
  const load = useCallback(
    async (search: string, next: string | null = null) => {
      const request = ++generation.current;
      setBusy(true);
      setError('');
      try {
        const params = new URLSearchParams({ workspaceId, q: search });
        if (next) params.set('cursor', next);
        const result = await api<{ projects: CloudProject[]; nextCursor: string | null }>(
          `/api/projects?${params}`,
        );
        if (request !== generation.current) return;
        const valid = result.projects.filter((p) => projectSchema.safeParse(p.data).success);
        setProjects((previous) =>
          next ? [...new Map([...previous, ...valid].map((p) => [p.id, p])).values()] : valid,
        );
        setCursor(result.nextCursor);
        setAppliedQuery(search);
        setLoaded(true);
      } catch (e) {
        if (request === generation.current) setError((e as Error).message);
      } finally {
        if (request === generation.current) setBusy(false);
      }
    },
    [workspaceId],
  );
  useEffect(() => {
    void load('');
    return () => {
      generation.current++;
    };
  }, [load]);
  async function archive(id: string) {
    const request = ++generation.current;
    setBusy(true);
    try {
      await api(`/api/projects/${id}`, {}, 'DELETE');
      if (request !== generation.current) return;
      setProjects((previous) => previous.filter((p) => p.id !== id));
      setArchiveId(null);
      notify('Projet archivé. Vos brouillons locaux sont conservés.');
    } catch (e) {
      if (request === generation.current) notify((e as Error).message);
    } finally {
      if (request === generation.current) setBusy(false);
    }
  }
  return (
    <section className="cloud-projects" aria-label="Projets cloud" aria-busy={busy}>
      <h2 className="section-title">Dans votre espace cloud</h2>
      <form
        className="section-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setArchiveId(null);
          void load(query.trim());
        }}
      >
        <label className="search-box">
          <Icon name="search" />
          <input
            aria-label="Rechercher dans le cloud"
            placeholder="Rechercher dans le cloud…"
            maxLength={200}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button className="button secondary compact" disabled={busy}>
          Rechercher
        </button>
        <button
          type="button"
          className="button secondary compact"
          disabled={busy}
          onClick={() => {
            setArchiveId(null);
            void load(appliedQuery);
          }}
        >
          Actualiser le cloud
        </button>
      </form>
      {appliedQuery ? <p className="muted">Résultats pour « {appliedQuery} »</p> : null}
      {error ? (
        <p role="alert" className="warning">
          {error}
        </p>
      ) : null}
      {!loaded && busy ? <p role="status">Chargement des projets…</p> : null}
      {loaded && !projects.length ? <p className="muted">Aucun projet cloud trouvé.</p> : null}
      <div className="cloud-list">
        {projects.map((p) => (
          <article className="cloud-project-row" key={p.id}>
            <button
              className="cloud-project-open"
              disabled={busy}
              onClick={() => onOpen(p)}
              aria-label={`Ouvrir ${p.data.title}`}
            >
              <Icon name="cloud" />
              <strong>{p.data.title}</strong>
              <span>{new Date(p.updatedAt).toLocaleDateString('fr-FR')}</span>
              <Icon name="right" />
            </button>
            {canWrite ? (
              <button
                className="icon-button"
                disabled={busy}
                aria-label={`Archiver ${p.data.title}`}
                onClick={() => setArchiveId(p.id)}
              >
                <Icon name="trash" size={16} />
              </button>
            ) : null}
            {archiveId === p.id ? (
              <div
                className="cloud-archive-confirm"
                role="group"
                aria-label={`Confirmer l’archivage de ${p.data.title}`}
              >
                <p>Archiver « {p.data.title} » ? Le projet sera retiré de cette liste.</p>
                <button
                  className="button secondary compact"
                  disabled={busy}
                  onClick={() => setArchiveId(null)}
                >
                  Annuler
                </button>
                <button
                  className="button primary compact"
                  disabled={busy}
                  onClick={() => void archive(p.id)}
                >
                  Confirmer l’archivage
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
      {cursor ? (
        <button
          className="button secondary compact"
          disabled={busy}
          onClick={() => void load(appliedQuery, cursor)}
        >
          {busy ? 'Chargement…' : 'Charger plus de projets'}
        </button>
      ) : null}
    </section>
  );
}
