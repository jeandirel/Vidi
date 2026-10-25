'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client-api';
import Icon from './icon';
type Asset = { id: string; name: string; mime: string; size: number };
export default function AssetLibrary({
  workspaceId,
  canWrite,
  notify,
}: {
  workspaceId: string;
  canWrite: boolean;
  notify: (s: string) => void;
}) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let live = true;
    setAssets([]);
    void api<{ assets: Asset[] }>(`/api/assets?workspaceId=${workspaceId}`)
      .then((r) => {
        if (live) setAssets(r.assets);
      })
      .catch((e) => {
        if (live) notify(e.message);
      });
    return () => {
      live = false;
    };
  }, [workspaceId, notify]);
  async function refresh() {
    setAssets((await api<{ assets: Asset[] }>(`/api/assets?workspaceId=${workspaceId}`)).assets);
  }
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      notify('Le fichier doit faire moins de 100 Mo.');
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ assetId: string; uploadUrl: string }>('/api/assets/presign', {
        workspaceId,
        name: file.name,
        type: file.type,
        size: file.size,
      });
      const put = await fetch(r.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!put.ok)
        throw new Error('Le stockage a refusé le fichier. Vérifiez la configuration CORS.');
      await api(`/api/assets/${r.assetId}`, {});
      await refresh();
      notify('Média ajouté à cet espace.');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }
  return (
    <section className="panel">
      <h2>Bibliothèque de médias</h2>
      <p className="muted">
        Images, B-rolls et pistes audio de cet espace. Les médias sont conservés dans un stockage
        privé.
      </p>
      {canWrite ? (
        <label className="button secondary compact">
          <Icon name={busy ? 'loader' : 'upload'} className={busy ? 'spin' : ''} size={15} />
          {busy ? 'Envoi en cours…' : 'Ajouter un média'}
          <input
            ref={input}
            disabled={busy}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,audio/mpeg,audio/wav"
            onChange={(e) => void upload(e.target.files?.[0])}
            hidden
          />
        </label>
      ) : null}
      {!assets.length ? (
        <p className="muted footnote">Aucun média enregistré.</p>
      ) : (
        assets.map((a) => (
          <div className="service-row" key={a.id}>
            <span>
              {a.name}
              <small className="muted">
                {' '}
                · {(a.size / 1024 / 1024).toFixed(1)} Mo · {a.mime}
              </small>
            </span>
            <div className="management-actions">
              <button
                className="text-button"
                onClick={async () => {
                  try {
                    const r = await api<{ url: string }>(`/api/assets/${a.id}`);
                    const link = document.createElement('a');
                    link.href = r.url;
                    link.rel = 'noreferrer';
                    link.click();
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              >
                Télécharger
              </button>
              {canWrite ? (
                <button
                  className="icon-button"
                  aria-label={`Supprimer ${a.name}`}
                  onClick={async () => {
                    try {
                      await api(`/api/assets/${a.id}`, {}, 'DELETE');
                      await refresh();
                    } catch (e) {
                      notify((e as Error).message);
                    }
                  }}
                >
                  <Icon name="trash" size={14} />
                </button>
              ) : null}
            </div>
          </div>
        ))
      )}
    </section>
  );
}
