'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client-api';
import Icon from './icon';
type Review = {
  id: string;
  revision: number;
  decision: string;
  message: string;
  author: { name: string };
};
export default function ProjectReview({
  projectId,
  role,
  dirty,
  notify,
}: {
  projectId: string;
  role: string;
  dirty: boolean;
  notify: (s: string) => void;
}) {
  const [data, setData] = useState<{ revision: number; status: string; reviews: Review[] } | null>(
    null,
  );
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setData(await api(`/api/projects/${projectId}/review`));
  }
  useEffect(() => {
    let live = true;
    void api<{ revision: number; status: string; reviews: Review[] }>(
      `/api/projects/${projectId}/review`,
    )
      .then((r) => {
        if (live) setData(r);
      })
      .catch((e) => notify(e.message));
    return () => {
      live = false;
    };
  }, [projectId, notify]);
  async function decide(decision: string) {
    if (!data) return;
    setBusy(true);
    try {
      await api(`/api/projects/${projectId}/review`, {
        revision: data.revision,
        decision,
        message,
      });
      setMessage('');
      await refresh();
      notify('Décision enregistrée sur cette version.');
    } catch (e) {
      notify((e as Error).message);
      await refresh().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  if (!data) return null;
  return (
    <section className="panel project-review">
      <h2>
        <Icon name="shield" />
        Validation client · version {data.revision}
      </h2>
      <p className="muted">
        {
          (
            {
              DRAFT: 'Brouillon',
              IN_REVIEW: 'En attente de validation',
              APPROVED: 'Version approuvée',
              CHANGES_REQUESTED: 'Modifications demandées',
            } as Record<string, string>
          )[data.status]
        }
      </p>
      {dirty ? (
        <p className="warning">Enregistrez vos modifications en ligne avant la validation.</p>
      ) : null}
      <label className="field">
        Commentaire
        <textarea
          value={message}
          maxLength={2000}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
        />
      </label>
      <div className="management-actions">
        {role !== 'VIEWER' && data.status !== 'IN_REVIEW' ? (
          <button
            className="button secondary compact"
            disabled={busy || dirty}
            onClick={() => void decide('IN_REVIEW')}
          >
            Demander une validation
          </button>
        ) : null}
        {role !== 'EDITOR' && data.status === 'IN_REVIEW' ? (
          <>
            <button
              className="button primary compact"
              disabled={busy || dirty}
              onClick={() => void decide('APPROVED')}
            >
              Approuver
            </button>
            <button
              className="button secondary compact"
              disabled={busy || dirty}
              onClick={() => void decide('CHANGES_REQUESTED')}
            >
              Demander des modifications
            </button>
          </>
        ) : null}
      </div>
      {data.reviews.slice(0, 5).map((r) => (
        <div className="service-row" key={r.id}>
          <span>
            {r.author.name} · v{r.revision}
            <small className="muted"> {r.message}</small>
          </span>
          <span className="tag">{r.decision}</span>
        </div>
      ))}
    </section>
  );
}
