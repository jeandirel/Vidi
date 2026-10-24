'use client';
import { useRef, useState } from 'react';
import { scriptSeconds, scriptWords, type Clip, type ProjectInput } from '@vidi/core';
import { avatars, voices } from '@/lib/catalog';
import Icon from './icon';
import ProductImport from './product-import';
type Props = {
  step: number;
  project: ProjectInput;
  update: (p: ProjectInput) => void;
  busy: string;
  onCompose: () => void;
  onAI: () => void;
  notify: (s: string) => void;
  workspaceId: string;
  onLogin: () => void;
};
export default function CreationPanel({
  step,
  project: p,
  update,
  busy,
  onCompose,
  onAI,
  notify,
  workspaceId,
  onLogin,
}: Props) {
  const upload = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragClip, setDragClip] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  function productField<K extends keyof ProjectInput['product']>(
    key: K,
    value: ProjectInput['product'][K],
  ) {
    update({ ...p, product: { ...p.product, [key]: value } });
  }
  async function addImage(file?: File) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1000000) {
      notify('Choisissez une image JPG, PNG ou WebP de moins de 1 Mo pour le brouillon local.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => productField('image', String(reader.result));
    reader.onerror = () => notify('Cette image n’a pas pu être lue.');
    reader.readAsDataURL(file);
  }
  function changeDuration(value: 15 | 30 | 60) {
    update({
      ...p,
      duration: value,
      clips: p.clips.map((c) => ({
        ...c,
        start: Math.min(c.start, value - 0.1),
        duration: Math.max(0.1, Math.min(c.duration, value - Math.min(c.start, value - 0.1))),
      })),
    });
  }
  function moveClip(id: string, delta: number) {
    const next = [...p.clips];
    const index = next.findIndex((c) => c.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    update({ ...p, clips: next });
  }
  function dropClip(target: string) {
    if (!dragClip || dragClip === target) return;
    const next = [...p.clips];
    const from = next.findIndex((c) => c.id === dragClip);
    const to = next.findIndex((c) => c.id === target);
    if (from < 0 || to < 0) return;
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    update({ ...p, clips: next });
    setDragClip(null);
  }
  function addClip(kind: Clip['kind']) {
    if (p.clips.length >= 30) {
      notify('Maximum 30 segments par projet.');
      return;
    }
    update({
      ...p,
      clips: [
        ...p.clips,
        {
          id: crypto.randomUUID(),
          kind,
          label: kind === 'product' ? 'Plan produit' : 'Ambiance sonore',
          start: 0,
          duration: p.duration,
        },
      ],
    });
  }
  function playVoice() {
    if (!('speechSynthesis' in window)) {
      notify('L’aperçu vocal n’est pas disponible dans ce navigateur.');
      return;
    }
    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const text = Object.values(p.script).join(' ').trim();
    if (!text) {
      notify('Ajoutez d’abord votre script.');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', de: 'de-DE', pt: 'pt-PT' }[
      p.language
    ];
    utterance.rate = p.emotion === 'energetic' ? 1.1 : p.emotion === 'calm' ? 0.85 : 1;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
    setSpeaking(true);
  }
  return (
    <div className="creation-panel">
      {step === 0 ? (
        <>
          <div className="panel-heading">
            <span className="section-icon">
              <Icon name="link" size={20} />
            </span>
            <div>
              <h2>Tout commence par votre produit.</h2>
              <p>Ajoutez les informations qui feront la différence.</p>
            </div>
          </div>
          <label className="field">
            Lien du produit <span className="optional">Facultatif</span>
            <div className="input-icon">
              <Icon name="link" size={17} />
              <input
                type="url"
                placeholder="https://votre-boutique.com/produit"
                value={p.product.url}
                onChange={(e) => productField('url', e.target.value)}
                maxLength={2000}
              />
            </div>
          </label>
          <ProductImport
            url={p.product.url}
            workspaceId={workspaceId}
            onLogin={onLogin}
            notify={notify}
            onApply={(imported) => {
              update({
                ...p,
                title:
                  p.title === 'Nouvelle création' || p.title === p.product.name
                    ? imported.name
                    : p.title,
                product: {
                  name: imported.name,
                  description: imported.description,
                  url: imported.url,
                  image: imported.image,
                  benefits: [],
                  audience: '',
                },
                script: { hook: '', body: '', cta: '' },
              });
              notify('Fiche appliquée. Vérifiez les détails, puis composez votre script.');
            }}
          />

          <div className="divider">
            <span>LES DÉTAILS QUI COMPTENT</span>
          </div>
          <div className="product-fields">
            <div>
              <label
                className={`upload-box ${dragging ? 'dragging' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  void addImage(e.dataTransfer.files[0]);
                }}
              >
                <input
                  ref={upload}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="Photo du produit"
                  onChange={(e) => void addImage(e.target.files?.[0])}
                />
                {p.product.image ? (
                  <img src={p.product.image} alt="Votre produit" />
                ) : (
                  <>
                    <span className="upload-icon">
                      <Icon name="image" size={24} />
                    </span>
                    <strong>Photo du produit</strong>
                    <small>
                      Glissez une image ici
                      <br />
                      ou cliquez pour parcourir
                    </small>
                    <span className="upload-formats">JPG, PNG, WEBP · 1 MO MAX.</span>
                  </>
                )}
              </label>
              {p.product.image ? (
                <button className="text-button" onClick={() => productField('image', '')}>
                  <Icon name="trash" size={13} />
                  Retirer l’image
                </button>
              ) : null}
            </div>
            <div className="product-basics">
              <label className="field">
                Nom du produit
                <input
                  placeholder="Ex. Sérum hydratant Lumé"
                  value={p.product.name}
                  maxLength={120}
                  onChange={(e) => {
                    update({
                      ...p,
                      title:
                        p.title === 'Nouvelle création' || p.title === p.product.name
                          ? e.target.value || 'Nouvelle création'
                          : p.title,
                      product: { ...p.product, name: e.target.value },
                    });
                  }}
                />
              </label>
              <label className="field">
                À qui s’adresse-t-il ?
                <input
                  placeholder="Ex. Les peaux sèches, au quotidien"
                  value={p.product.audience}
                  maxLength={300}
                  onChange={(e) => productField('audience', e.target.value)}
                />
              </label>
              <div className="product-tip">
                <Icon name="sparkles" size={16} />
                <p>Les meilleurs scripts partent de détails précis, pas de grandes promesses.</p>
              </div>
            </div>
          </div>
          <label className="field">
            Description du produit
            <textarea
              rows={3}
              placeholder="Ce que fait votre produit, comment il s’utilise, ce qui le rend différent…"
              value={p.product.description}
              maxLength={4000}
              onChange={(e) => productField('description', e.target.value)}
            />
          </label>
          <label className="field">
            Bénéfices vérifiés <span className="optional">Un par ligne</span>
            <textarea
              rows={2}
              placeholder={'Ex. Texture légère\nFlacon rechargeable'}
              value={p.product.benefits.join('\n')}
              onChange={(e) => productField('benefits', e.target.value.split('\n').slice(0, 8))}
            />
          </label>
          <div className="inline-options">
            <label className="field">
              Langue
              <select
                value={p.language}
                onChange={(e) =>
                  update({ ...p, language: e.target.value as ProjectInput['language'] })
                }
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="de">Deutsch</option>
                <option value="pt">Português</option>
              </select>
            </label>
            <div className="field">
              Durée
              <div className="segmented">
                {([15, 30, 60] as const).map((n) => (
                  <button
                    key={n}
                    className={p.duration === n ? 'selected' : ''}
                    onClick={() => changeDuration(n)}
                  >
                    {n} s
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button className="button draft-button" onClick={onCompose}>
            <Icon name="wand" size={17} />
            Composer mon premier brouillon
            <Icon name="next" size={16} />
          </button>
        </>
      ) : null}
      {step === 1 ? (
        <>
          <div className="panel-heading">
            <span className="section-icon">
              <Icon name="type" size={20} />
            </span>
            <div>
              <h2>Les bons mots. Dès la première seconde.</h2>
              <p>Une accroche, un message, une prochaine étape.</p>
            </div>
          </div>
          <label className="import-image-choice">
            <input
              type="checkbox"
              checked={aiConsent}
              onChange={(e) => setAiConsent(e.target.checked)}
            />
            J’accepte d’envoyer ces informations au modèle gratuit. Le fournisseur peut les
            conserver pour améliorer ses modèles.
          </label>
          <div className="script-toolbar">
            <span className="tag">
              <Icon name="clock" size={12} />
              {scriptWords(p.script)} mots · ≈ {scriptSeconds(p.script)} s
            </span>
            <div>
              <button className="text-button" onClick={onCompose}>
                Composer un brouillon
              </button>
              <button
                className="button secondary compact"
                disabled={!!busy || !aiConsent}
                onClick={onAI}
              >
                <Icon
                  name={busy === 'script' ? 'loader' : 'sparkles'}
                  size={15}
                  className={busy === 'script' ? 'spin' : ''}
                />
                Rédiger avec l’IA
              </button>
            </div>
          </div>
          {busy === 'script' ? (
            <div className="script-skeleton" role="status" aria-label="Rédaction en cours">
              <i />
              <i />
              <i />
            </div>
          ) : null}
          {(
            [
              {
                key: 'hook',
                label: 'L’accroche',
                hint: 'Donnez une raison de s’arrêter.',
                number: '01',
                max: 400,
              },
              {
                key: 'body',
                label: 'Le message',
                hint: 'Un bénéfice concret. Une explication simple.',
                number: '02',
                max: 2400,
              },
              {
                key: 'cta',
                label: 'L’appel à l’action',
                hint: 'Une prochaine étape claire.',
                number: '03',
                max: 300,
              },
            ] as const
          ).map((s) => (
            <label className={`script-field ${s.key}`} key={s.key}>
              <span className="script-label">
                <span>{s.number}</span>
                <strong>{s.label}</strong>
                <small>
                  {p.script[s.key].length}/{s.max}
                </small>
              </span>
              <textarea
                aria-label={s.label}
                rows={s.key === 'body' ? 5 : 2}
                placeholder={s.hint}
                value={p.script[s.key]}
                maxLength={s.max}
                onChange={(e) => update({ ...p, script: { ...p.script, [s.key]: e.target.value } })}
              />
            </label>
          ))}
          {scriptSeconds(p.script) > p.duration ? (
            <p className="warning">
              <Icon name="clock" size={16} />
              Votre script dépasse la durée visée. Raccourcissez-le ou augmentez la durée.
            </p>
          ) : (
            <p className="field-help">
              Estimation à 2,4 mots par seconde. Le rythme réel dépendra de la voix choisie.
            </p>
          )}
          <div className="info-banner">
            <Icon name="shield" size={17} />
            <p>
              Décrivez des bénéfices réels. Un avatar présente votre produit ; il ne doit pas
              inventer une expérience client.
            </p>
          </div>
        </>
      ) : null}
      {step === 2 ? (
        <>
          <div className="panel-heading">
            <span className="section-icon">
              <Icon name="users" size={20} />
            </span>
            <div>
              <h2>Un visage qui porte votre message.</h2>
              <p>Choisissez votre direction de casting.</p>
            </div>
          </div>
          <div className="avatar-grid">
            {avatars.map((a) => (
              <button
                className={`avatar-card ${p.avatarId === a.id ? 'selected' : ''}`}
                key={a.id}
                onClick={() => update({ ...p, avatarId: a.id })}
                aria-pressed={p.avatarId === a.id}
              >
                <div>
                  <img src={a.image} alt={`Portrait de prévisualisation ${a.name}`} />
                  <span className="avatar-choice">
                    <Icon name="check" size={13} />
                  </span>
                </div>
                <span>
                  <strong>{a.name}</strong>
                  <small>{a.tag}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="info-banner">
            <Icon name="users" size={17} />
            <p>
              Portraits de prévisualisation. Le catalogue d’avatars animés, la gestuelle et la
              synchronisation labiale dépendent du moteur vidéo à connecter.
            </p>
          </div>
        </>
      ) : null}
      {step === 3 ? (
        <>
          <div className="panel-heading">
            <span className="section-icon">
              <Icon name="audio" size={20} />
            </span>
            <div>
              <h2>Trouvez votre ton.</h2>
              <p>Une voix, une intention, votre personnalité.</p>
            </div>
          </div>
          <div className="voice-list">
            {voices.map((v, i) => (
              <button
                className={`voice-card ${p.voiceId === v.id ? 'selected' : ''}`}
                key={v.id}
                aria-pressed={p.voiceId === v.id}
                onClick={() => update({ ...p, voiceId: v.id })}
              >
                <span className={`voice-avatar voice-${i}`}>
                  <Icon name="mic" size={18} />
                </span>
                <span>
                  <strong>{v.name}</strong>
                  <small>{v.tag}</small>
                </span>
                <span className="waveform" aria-hidden="true">
                  {[9, 16, 24, 12, 20, 28, 14, 21, 10, 17, 25, 13].map((n, j) => (
                    <i key={j} style={{ height: n }} />
                  ))}
                </span>
                <span className="radio-mark">
                  {p.voiceId === v.id ? <Icon name="check" size={12} /> : null}
                </span>
              </button>
            ))}
          </div>
          <div className="field">
            Intention
            <div className="emotion-options">
              {(
                [
                  { id: 'warm', label: 'Chaleureux', icon: 'sparkles' },
                  { id: 'energetic', label: 'Énergique', icon: 'zap' },
                  { id: 'calm', label: 'Posé', icon: 'audio' },
                ] as const
              ).map((e) => (
                <button
                  key={e.id}
                  aria-pressed={p.emotion === e.id}
                  className={p.emotion === e.id ? 'selected' : ''}
                  onClick={() => update({ ...p, emotion: e.id })}
                >
                  <Icon name={e.icon} size={16} />
                  {e.label}
                </button>
              ))}
            </div>
          </div>
          <button className="button secondary" onClick={playVoice}>
            <Icon name={speaking ? 'pause' : 'play'} size={16} />
            {speaking ? 'Arrêter l’aperçu' : 'Écouter un aperçu navigateur'}
          </button>
          <p className="field-help">
            Cet aperçu utilise la voix système du navigateur, pas une voix premium. Les profils de
            voix seront associés au fournisseur TTS connecté.
          </p>
          <div className="info-banner">
            <Icon name="shield" size={17} />
            <p>
              Le clonage vocal sur mesure sera activé avec un parcours de consentement et de
              vérification du titulaire.
            </p>
          </div>
        </>
      ) : null}
      {step === 4 ? (
        <>
          <div className="panel-heading">
            <span className="section-icon">
              <Icon name="layers" size={20} />
            </span>
            <div>
              <h2>Donnez du rythme à votre création.</h2>
              <p>Préparez les pistes et les points d’entrée du montage.</p>
            </div>
          </div>
          <div className="timeline-toolbar">
            <span className="tag">
              <Icon name="film" size={13} />
              9:16 · {p.duration} s
            </span>
            <div>
              <button className="button secondary compact" onClick={() => addClip('product')}>
                <Icon name="plus" size={14} />
                Plan produit
              </button>
              <button className="button secondary compact" onClick={() => addClip('audio')}>
                <Icon name="audio" size={14} />
                Audio
              </button>
            </div>
          </div>
          <div className="timeline">
            <div className="timeline-ruler">
              <span>00:00</span>
              <span>00:{String(p.duration / 2).padStart(2, '0')}</span>
              <span>{p.duration === 60 ? '01:00' : `00:${p.duration}`}</span>
            </div>
            {p.clips.map((c, i) => (
              <div
                key={c.id}
                className={`timeline-row ${c.kind}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  dropClip(c.id);
                }}
              >
                <div className="track-heading">
                  <button
                    className="drag-handle"
                    draggable
                    onDragStart={() => setDragClip(c.id)}
                    onDragEnd={() => setDragClip(null)}
                    aria-label={`Déplacer ${c.label}`}
                  >
                    <Icon name="grip" size={15} />
                  </button>
                  <Icon
                    name={
                      c.kind === 'avatar'
                        ? 'users'
                        : c.kind === 'product'
                          ? 'image'
                          : c.kind === 'caption'
                            ? 'type'
                            : 'audio'
                    }
                    size={14}
                  />
                  <span>{c.label}</span>
                  <button
                    className="track-move"
                    aria-label={`Monter ${c.label}`}
                    disabled={i === 0}
                    onClick={() => moveClip(c.id, -1)}
                  >
                    ↑
                  </button>
                  <button
                    className="track-move"
                    aria-label={`Descendre ${c.label}`}
                    disabled={i === p.clips.length - 1}
                    onClick={() => moveClip(c.id, 1)}
                  >
                    ↓
                  </button>
                  <button
                    className="track-move"
                    aria-label={`Supprimer le segment ${c.label}`}
                    onClick={() => update({ ...p, clips: p.clips.filter((t) => t.id !== c.id) })}
                  >
                    ×
                  </button>
                </div>
                <div className="track-lane">
                  <span
                    style={{
                      marginLeft: `${(c.start / p.duration) * 100}%`,
                      width: `${(c.duration / p.duration) * 100}%`,
                    }}
                  >
                    <Icon name={c.kind === 'audio' ? 'audio' : 'film'} size={13} />
                    {c.label}
                  </span>
                </div>
                <div className="track-timing">
                  <label>
                    Début
                    <input
                      aria-label={`Début ${c.label}`}
                      type="number"
                      min={0}
                      max={p.duration - c.duration}
                      step={0.1}
                      value={c.start}
                      onChange={(e) => {
                        const start = Number(e.target.value);
                        if (
                          Number.isFinite(start) &&
                          start >= 0 &&
                          start + c.duration <= p.duration
                        )
                          update({
                            ...p,
                            clips: p.clips.map((t) => (t.id === c.id ? { ...t, start } : t)),
                          });
                      }}
                    />
                  </label>
                  <label>
                    Durée
                    <input
                      aria-label={`Durée ${c.label}`}
                      type="number"
                      min={0.1}
                      max={p.duration - c.start}
                      step={0.1}
                      value={c.duration}
                      onChange={(e) => {
                        const duration = Number(e.target.value);
                        if (
                          Number.isFinite(duration) &&
                          duration >= 0.1 &&
                          duration + c.start <= p.duration
                        )
                          update({
                            ...p,
                            clips: p.clips.map((t) => (t.id === c.id ? { ...t, duration } : t)),
                          });
                      }}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <div className="export-settings">
            <label className="field">
              Résolution
              <select
                value={p.resolution}
                onChange={(e) =>
                  update({ ...p, resolution: e.target.value as ProjectInput['resolution'] })
                }
              >
                <option value="720p">720p · Starter</option>
                <option value="1080p">1080p · Pro</option>
                <option value="4k">4K · Agency</option>
              </select>
            </label>
            <label className="toggle-field">
              <span>
                <strong>Sous-titres dynamiques</strong>
                <small>Mettre l’accroche en évidence</small>
              </span>
              <input
                type="checkbox"
                checked={p.captions}
                onChange={(e) => update({ ...p, captions: e.target.checked })}
              />
            </label>
          </div>
          <div className="info-banner">
            <Icon name="layers" size={17} />
            <p>
              Cette timeline prépare les instructions du rendu. L’import des B-rolls, la musique et
              les transitions avancées seront ajoutés à l’éditeur ; aucun export vidéo local n’est
              simulé.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
