'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client-api';
import Icon from './icon';
type Profile = { id: string; name: string; consentAt: string };
type Generation = { id: string; status: string; outputAssetId: string | null };
export default function VoiceStudio({
  workspaceId,
  canWrite,
  plan,
  connected,
  notify,
}: {
  workspaceId: string;
  canWrite: boolean;
  plan: string;
  connected: boolean;
  notify: (s: string) => void;
}) {
  const [profiles, setProfiles] = useState<Profile[]>([]),
    [generations, setGenerations] = useState<Generation[]>([]);
  const [assets, setAssets] = useState<{ id: string; name: string; mime: string }[]>([]);
  const [name, setName] = useState(''),
    [sourceId, setSourceId] = useState(''),
    [consent, setConsent] = useState(false);
  const [profileId, setProfileId] = useState(''),
    [text, setText] = useState(''),
    [language, setLanguage] = useState('fr'),
    [emotion, setEmotion] = useState('warm');
  const [busy, setBusy] = useState(false);
  const alive = useRef(true),
    key = useRef<{ input: string; key: string } | null>(null);
  async function refresh() {
    const [voices, library] = await Promise.all([
      api<{ profiles: Profile[]; generations: Generation[] }>(
        `/api/voices?workspaceId=${workspaceId}`,
      ),
      api<{ assets: typeof assets }>(`/api/assets?workspaceId=${workspaceId}`),
    ]);
    if (!alive.current) return;
    setProfiles(voices.profiles);
    setGenerations(voices.generations);
    setAssets(library.assets.filter((a) => ['audio/mpeg', 'audio/wav'].includes(a.mime)));
    setProfileId((id) =>
      voices.profiles.some((p) => p.id === id) ? id : voices.profiles[0]?.id || '',
    );
  }
  useEffect(() => {
    alive.current = true;
    void refresh().catch((e) => {
      if (alive.current) notify(e.message);
    });
    const interval = setInterval(() => {
      void api<{ profiles: Profile[]; generations: Generation[] }>(
        `/api/voices?workspaceId=${workspaceId}`,
      )
        .then((r) => {
          if (alive.current) {
            setProfiles(r.profiles);
            setGenerations(r.generations);
          }
        })
        .catch(() => {});
    }, 5000);
    return () => {
      alive.current = false;
      clearInterval(interval);
    };
    // workspace remounts this component; refresh is only used by user actions below.
  }, [workspaceId, notify]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      if (alive.current) notify((e as Error).message);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section className="panel service-console" aria-label="Studio vocal">
      <h2>Voix personnalisées</h2>
      <p className="muted">
        Ajoutez d’abord votre extrait MP3/WAV dans la bibliothèque de médias. Le moteur vérifiera
        une durée de 5 à 30 secondes. La déclaration de droits est enregistrée avec votre compte et
        la date.
      </p>
      <button className="text-button" disabled={busy} onClick={() => void run(refresh)}>
        Actualiser les voix et les extraits
      </button>
      {!connected ? (
        <p className="lab-note">
          Le serveur Chatterbox n’est pas connecté. Vous pouvez préparer vos profils ; la synthèse
          restera bloquée jusqu’à son activation.
        </p>
      ) : null}
      <fieldset className="editor-fieldset" disabled={busy || !canWrite}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await api('/api/voices', { workspaceId, name, sourceAssetId: sourceId, consent });
              if (!alive.current) return;
              setName('');
              setConsent(false);
              await refresh();
              notify('Profil enregistré avec votre déclaration de droits.');
            });
          }}
        >
          <div className="lab-fields">
            <label className="field">
              Nom de la voix
              <input
                maxLength={100}
                minLength={2}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field">
              Extrait de référence
              <select value={sourceId} required onChange={(e) => setSourceId(e.target.value)}>
                <option value="">Choisir un fichier audio</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="import-image-choice">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            Je suis la personne enregistrée ou je dispose de son autorisation explicite pour cloner
            et utiliser sa voix dans mes contenus.
          </label>
          <button className="button secondary compact" disabled={!consent || !sourceId}>
            <Icon name="mic" size={15} /> Enregistrer la voix autorisée
          </button>
        </form>
        {profiles.map((p) => (
          <div className="service-row" key={p.id}>
            <span>
              {p.name}
              <small className="muted">
                {' '}
                · déclaration du {new Date(p.consentAt).toLocaleDateString('fr-FR')}
              </small>
            </span>
            <button
              className="text-button"
              onClick={() =>
                void run(async () => {
                  if (
                    !window.confirm(
                      'Révoquer cette autorisation vocale ? Les nouvelles synthèses seront bloquées.',
                    )
                  )
                    return;
                  await api('/api/voices', { workspaceId, profileId: p.id }, 'DELETE');
                  await refresh();
                })
              }
            >
              Révoquer
            </button>
          </div>
        ))}
        <div className="divider">
          <span>SYNTHÈSE VOCALE · PRO / AGENCY</span>
        </div>
        <label className="field">
          Voix pour la synthèse
          <select value={profileId} onChange={(e) => setProfileId(e.target.value)}>
            <option value="">Choisir une voix</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Texte à prononcer
          <textarea
            maxLength={1000}
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <div className="lab-fields">
          <label className="field">
            Langue de synthèse
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {[
                ['fr', 'Français'],
                ['en', 'English'],
                ['es', 'Español'],
                ['de', 'Deutsch'],
                ['pt', 'Português'],
              ].map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Intention vocale
            <select value={emotion} onChange={(e) => setEmotion(e.target.value)}>
              <option value="warm">Chaleureuse</option>
              <option value="energetic">Énergique</option>
              <option value="calm">Posée</option>
            </select>
          </label>
        </div>
        <button
          className="button primary compact"
          disabled={
            !connected || !profileId || text.trim().length < 2 || !['pro', 'agency'].includes(plan)
          }
          onClick={() =>
            void run(async () => {
              const input = { workspaceId, profileId, text, language, emotion };
              const signature = JSON.stringify(input);
              if (key.current?.input !== signature)
                key.current = { input: signature, key: crypto.randomUUID() };
              await api('/api/voices/generate', { ...input, idempotencyKey: key.current.key });
              key.current = null;
              await refresh();
              notify('Synthèse enregistrée. Suivez son état ci-dessous.');
            })
          }
        >
          Lancer la synthèse
        </button>
        <p className="lab-note">
          Maximum 10 synthèses par jour et par espace. Traitement sur votre serveur privé ; aucun
          appel à une API vocale payante.
        </p>
      </fieldset>
      {generations.map((g) => (
        <div className="service-row" key={g.id}>
          <span>
            {{
              QUEUED: 'En attente',
              PROCESSING: 'Synthèse en cours',
              COMPLETED: 'Audio prêt',
              FAILED: 'Échec de la synthèse',
            }[g.status] || g.status}
          </span>
          {g.status === 'COMPLETED' && g.outputAssetId ? (
            <button
              className="text-button"
              onClick={() =>
                void run(async () => {
                  const r = await api<{ url: string }>(`/api/assets/${g.outputAssetId}`);
                  const a = document.createElement('a');
                  a.href = r.url;
                  a.rel = 'noreferrer';
                  a.click();
                })
              }
            >
              Télécharger l’audio
            </button>
          ) : null}
        </div>
      ))}
    </section>
  );
}
