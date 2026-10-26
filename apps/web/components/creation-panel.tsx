'use client';
import { useRef, useState } from 'react';
import { scriptSeconds, scriptWords, type Clip, type ProjectInput } from '@vidi/core';
import { avatars, voices } from '@/lib/catalog';
import Icon from './icon';
import ProductImport from './product-import';
import VoiceChoice from './voice-choice';
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
  currentTime?: number;
  onSeek?: (t: number) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
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
  currentTime = 0,
  onSeek,
  isPlaying = false,
  onTogglePlay,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}: Props) {
  const upload = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragClip, setDragClip] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [zoom, setZoom] = useState<1 | 1.5 | 2>(1);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
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
  function changeDuration(value: ProjectInput['duration']) {
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
    const label =
      kind === 'product'
        ? 'Plan produit'
        : kind === 'caption'
          ? 'Sous-titres mot-à-mot'
          : kind === 'avatar'
            ? 'Piste avatar'
            : 'Ambiance sonore';
    update({
      ...p,
      clips: [
        ...p.clips,
        {
          id: crypto.randomUUID(),
          kind,
          label,
          start: 0,
          duration: p.duration,
        },
      ],
    });
  }
  function splitClipAtPlayhead(targetClipId?: string) {
    const time = currentTime;
    const clipToSplit = targetClipId
      ? p.clips.find((c) => c.id === targetClipId)
      : p.clips.find((c) => time > c.start + 0.2 && time < c.start + c.duration - 0.2);

    if (!clipToSplit) {
      notify('Placez le curseur de lecture au milieu d’un clip pour le scinder.');
      return;
    }

    if (time <= clipToSplit.start + 0.2 || time >= clipToSplit.start + clipToSplit.duration - 0.2) {
      notify('Le point de coupe doit être à au moins 0,2s de chaque extrémité.');
      return;
    }

    const firstDuration = Math.round((time - clipToSplit.start) * 10) / 10;
    const secondStart = Math.round(time * 10) / 10;
    const secondDuration = Math.round((clipToSplit.duration - firstDuration) * 10) / 10;

    if (firstDuration < 0.1 || secondDuration < 0.1) {
      notify('Segments trop courts.');
      return;
    }

    const firstClip: Clip = {
      ...clipToSplit,
      duration: firstDuration,
      label: `${clipToSplit.label} (Partie 1)`,
    };

    const secondClip: Clip = {
      id: crypto.randomUUID(),
      kind: clipToSplit.kind,
      label: `${clipToSplit.label} (Partie 2)`,
      start: secondStart,
      duration: secondDuration,
    };

    const newClips: Clip[] = [];
    for (const c of p.clips) {
      if (c.id === clipToSplit.id) {
        newClips.push(firstClip, secondClip);
      } else {
        newClips.push(c);
      }
    }

    update({ ...p, clips: newClips });
    setSelectedClipId(secondClip.id);
    notify(`Clip « ${clipToSplit.label} » scindé avec succès.`);
  }

  function duplicateClip(clipId: string) {
    const original = p.clips.find((c) => c.id === clipId);
    if (!original) return;
    if (p.clips.length >= 30) {
      notify('Maximum 30 segments par projet.');
      return;
    }
    const newStart = Math.min(
      Math.round((original.start + 0.5) * 10) / 10,
      Math.max(0, p.duration - original.duration)
    );
    const newClip: Clip = {
      id: crypto.randomUUID(),
      kind: original.kind,
      label: `${original.label} (copie)`,
      start: newStart,
      duration: original.duration,
    };
    update({ ...p, clips: [...p.clips, newClip] });
    setSelectedClipId(newClip.id);
    notify(`Clip « ${original.label} » dupliqué.`);
  }

  function applyStandardTemplate() {
    const dur = p.duration;
    const brollStart = Math.round(dur * 0.25 * 10) / 10;
    const brollDur = Math.round(dur * 0.45 * 10) / 10;
    const templateClips: Clip[] = [
      {
        id: crypto.randomUUID(),
        kind: 'avatar',
        label: 'Avatar Face-caméra',
        start: 0,
        duration: dur,
      },
      {
        id: crypto.randomUUID(),
        kind: 'product',
        label: 'B-roll Démo Produit',
        start: brollStart,
        duration: brollDur,
      },
      {
        id: crypto.randomUUID(),
        kind: 'caption',
        label: 'Sous-titres mot-à-mot',
        start: 0,
        duration: dur,
      },
      {
        id: crypto.randomUUID(),
        kind: 'audio',
        label: 'Ambiance sonore (-18 dB)',
        start: 0,
        duration: dur,
      },
    ];
    update({
      ...p,
      captions: true,
      clips: templateClips,
    });
    notify('Modèle standard UGC appliqué (4 pistes synchronisées).');
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
                {([6, 15, 30, 45, 60, 90] as const).map((n) => (
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
          <div className="framework-selector-row">
            <span className="framework-label">Structure :</span>
            <button
              type="button"
              className="framework-pill"
              onClick={() => {
                const prod = p.product;
                const b = prod.benefits.filter(Boolean)[0] || 'une efficacité remarquable';
                update({
                  ...p,
                  script: {
                    hook: `Si vous en avez marre de perdre du temps avec ${prod.name.toLowerCase()}, regardez ça.`,
                    body: `La plupart des solutions classiques s’évaporent sans agir. Avec ${prod.name}, vous profitez de ${b}. ${prod.description}`,
                    cta: `Profitez de l'offre spéciale dès aujourd'hui sur notre boutique.`,
                  },
                });
              }}
            >
              PAS (Problème/Solution)
            </button>
            <button
              type="button"
              className="framework-pill"
              onClick={() => {
                const prod = p.product;
                const b = prod.benefits.filter(Boolean)[0] || 'un résultat visible dès le premier jour';
                update({
                  ...p,
                  script: {
                    hook: `Pourquoi tout le monde s'arrache ${prod.name} en ce moment ?`,
                    body: `J'étais sceptique jusqu'à ce que je le teste : ${prod.description} Le résultat ? ${b}.`,
                    cta: `Commandez le vôtre avec la livraison offerte via le lien en bio.`,
                  },
                });
              }}
            >
              AIDA
            </button>
            <button
              type="button"
              className="framework-pill"
              onClick={() => {
                const prod = p.product;
                const b = prod.benefits.filter(Boolean)[0] || 'une qualité irréprochable';
                update({
                  ...p,
                  script: {
                    hook: `Honnêtement, je ne pensais pas que ${prod.name} allait me convaincre.`,
                    body: `Et pourtant, après une semaine d'utilisation quotidienne : ${b}. ${prod.description}`,
                    cta: `Faites-vous votre propre avis en commandant sur le site officiel.`,
                  },
                });
              }}
            >
              Témoignage UGC
            </button>
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
              <h2>Timeline multi-pistes & Montage professionnel.</h2>
              <p>Ajustez vos pistes, scindez au curseur, synchronisez l’aperçu et personnalisez le style des sous-titres.</p>
            </div>
          </div>

          {/* Master Timeline Controls */}
          <div className="timeline-master-bar">
            <div className="timeline-playback-group">
              <button
                type="button"
                className={`master-play-btn ${isPlaying ? 'is-playing' : ''}`}
                onClick={onTogglePlay}
                aria-label={isPlaying ? 'Pause' : 'Lecture'}
                title="Espace ou clic pour lancer"
              >
                <Icon name={isPlaying ? 'pause' : 'play'} size={15} />
                <span>{isPlaying ? 'Pause' : 'Lecture'}</span>
              </button>
              <div className="timeline-timecode-badge">
                <span className="time-cur">{`00:${Math.floor(currentTime).toString().padStart(2, '0')}.${Math.floor((currentTime % 1) * 10)}`}</span>
                <span className="time-sep">/</span>
                <span className="time-total">
                  {p.duration >= 60
                    ? `01:${String(p.duration - 60).padStart(2, '0')}.0`
                    : `00:${String(p.duration).padStart(2, '0')}.0`}
                </span>
              </div>
            </div>

            <div className="timeline-history-group">
              <button
                type="button"
                className="history-btn"
                disabled={!canUndo}
                onClick={onUndo}
                title="Annuler (Ctrl+Z)"
                aria-label="Annuler la dernière action"
              >
                <Icon name="undo" size={14} />
                <span>Annuler</span>
              </button>
              <button
                type="button"
                className="history-btn"
                disabled={!canRedo}
                onClick={onRedo}
                title="Rétablir (Ctrl+Y)"
                aria-label="Rétablir la dernière action"
              >
                <Icon name="redo" size={14} />
                <span>Rétablir</span>
              </button>
            </div>

            <div className="timeline-actions-group">
              <button
                type="button"
                className="tool-btn split-btn"
                onClick={() => splitClipAtPlayhead(selectedClipId || undefined)}
                title="Scinder le segment sélectionné ou situé sous la tête de lecture"
              >
                <Icon name="scissors" size={14} />
                <span>Scinder au curseur</span>
              </button>

              <div className="timeline-zoom-pill-group">
                <span className="zoom-title">Zoom :</span>
                {([1, 1.5, 2] as const).map((z) => (
                  <button
                    key={z}
                    type="button"
                    className={`zoom-pill ${zoom === z ? 'active' : ''}`}
                    onClick={() => setZoom(z)}
                  >
                    {z}x
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="template-btn"
                onClick={applyStandardTemplate}
                title="Appliquer la disposition standard UGC 4 pistes"
              >
                <Icon name="sparkles" size={13} />
                <span>Modèle 4 pistes UGC</span>
              </button>
            </div>
          </div>

          <div className="timeline-track-adder-bar">
            <span className="track-count-badge">
              <Icon name="film" size={13} />
              {p.clips.length} piste{p.clips.length > 1 ? 's' : ''} · 9:16 vertical
            </span>
            <div className="add-track-buttons">
              <button
                type="button"
                className="button secondary compact add-btn"
                onClick={() => addClip('product')}
              >
                <Icon name="plus" size={13} />
                + Plan B-roll produit
              </button>
              <button
                type="button"
                className="button secondary compact add-btn"
                onClick={() => addClip('audio')}
              >
                <Icon name="plus" size={13} />
                + Ambiance audio
              </button>
              <button
                type="button"
                className="button secondary compact add-btn"
                onClick={() => addClip('caption')}
              >
                <Icon name="plus" size={13} />
                + Piste sous-titres
              </button>
            </div>
          </div>

          {/* Horizontally scrollable timeline container with zoom */}
          <div className="timeline-scroll-wrapper">
            <div className="timeline-zoom-container" style={{ width: `${zoom * 100}%` }}>
              {/* Vertical Playhead Needle */}
              <div
                className="timeline-playhead-needle"
                style={{ left: `${(currentTime / p.duration) * 100}%` }}
              >
                <div className="playhead-handle" title="Tête de lecture">
                  <span className="handle-time">
                    {`00:${Math.floor(currentTime).toString().padStart(2, '0')}.${Math.floor((currentTime % 1) * 10)}`}
                  </span>
                </div>
                <div className="playhead-line" />
              </div>

              <div
                className="timeline-ruler"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const pct = Math.max(0, Math.min(1, clickX / rect.width));
                  const seekTime = Math.round(pct * p.duration * 10) / 10;
                  if (onSeek) onSeek(seekTime);
                }}
                title="Cliquez pour déplacer la tête de lecture"
              >
                <span style={{ left: '0%' }}>00:00</span>
                <span style={{ left: '25%' }}>
                  00:{String(Math.floor(p.duration * 0.25)).padStart(2, '0')}
                </span>
                <span style={{ left: '50%' }}>
                  00:{String(Math.floor(p.duration * 0.5)).padStart(2, '0')}
                </span>
                <span style={{ left: '75%' }}>
                  00:{String(Math.floor(p.duration * 0.75)).padStart(2, '0')}
                </span>
                <span style={{ right: '0%', left: 'auto' }}>
                  {p.duration >= 60
                    ? `01:${String(p.duration - 60).padStart(2, '0')}`
                    : `00:${String(p.duration).padStart(2, '0')}`}
                </span>
              </div>

              {p.clips.map((c, i) => (
                <div
                  key={c.id}
                  className={`timeline-row ${c.kind} ${selectedClipId === c.id ? 'is-selected' : ''}`}
                  onClick={() => setSelectedClipId(c.id)}
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
                      title="Glisser pour réordonner"
                    >
                      <Icon name="grip" size={15} />
                    </button>
                    <span className={`track-kind-badge ${c.kind}`}>
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
                        size={13}
                      />
                    </span>
                    <span className="track-label-text">{c.label}</span>
                    <div className="track-quick-actions">
                      <button
                        type="button"
                        className="track-action-btn"
                        title="Scinder ce clip à la position du curseur"
                        onClick={(e) => {
                          e.stopPropagation();
                          splitClipAtPlayhead(c.id);
                        }}
                      >
                        <Icon name="scissors" size={12} />
                      </button>
                      <button
                        type="button"
                        className="track-action-btn"
                        title="Dupliquer ce clip"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateClip(c.id);
                        }}
                      >
                        <Icon name="copy" size={12} />
                      </button>
                      <button
                        type="button"
                        className="track-move"
                        aria-label={`Monter ${c.label}`}
                        disabled={i === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveClip(c.id, -1);
                        }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="track-move"
                        aria-label={`Descendre ${c.label}`}
                        disabled={i === p.clips.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveClip(c.id, 1);
                        }}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="track-move delete-btn"
                        aria-label={`Supprimer ${c.label}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          update({ ...p, clips: p.clips.filter((t) => t.id !== c.id) });
                          if (selectedClipId === c.id) setSelectedClipId(null);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div
                    className="track-lane"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const pct = Math.max(0, Math.min(1, clickX / rect.width));
                      const seekTime = Math.round(pct * p.duration * 10) / 10;
                      if (onSeek) onSeek(seekTime);
                    }}
                    title="Cliquer dans la piste pour caler le curseur"
                  >
                    <span
                      className="clip-bar"
                      style={{
                        marginLeft: `${(c.start / p.duration) * 100}%`,
                        width: `${(c.duration / p.duration) * 100}%`,
                      }}
                    >
                      <Icon name={c.kind === 'audio' ? 'audio' : 'film'} size={12} />
                      <strong className="clip-bar-label">{c.label}</strong>
                      <small className="clip-bar-duration">{c.duration}s</small>
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
                        onClick={(e) => e.stopPropagation()}
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
                      s
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
                        onClick={(e) => e.stopPropagation()}
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
                      s
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subtitle Style Picker */}
          <div className="subtitle-style-section">
            <div className="section-title-row">
              <div>
                <h3>Style visuel des sous-titres dynamiques</h3>
                <p>Améliorez la rétention et le taux de complétion sur TikTok, Reels et Shorts.</p>
              </div>
              <span className="style-active-pill">
                Style actif : {
                  {
                    'tiktok-punchy': 'TikTok Punchy',
                    'boxed-minimal': 'Boxed Minimal',
                    'gradient-pop': 'Gradient Pop',
                    'classic-white': 'Blanc Classique',
                  }[p.subtitleStyle || 'tiktok-punchy']
                }
              </span>
            </div>
            <div className="subtitle-style-grid">
              {[
                {
                  id: 'tiktok-punchy',
                  title: 'TikTok Punchy',
                  desc: 'Jaune fluo & contour noir dense. L’accroche saute aux yeux.',
                  sample: 'ACHÈTE MAINTENANT !',
                  badge: 'Standard UGC',
                },
                {
                  id: 'boxed-minimal',
                  title: 'Boxed Minimal',
                  desc: 'Bandeau noir dépoli, typographie blanche épurée et moderne.',
                  sample: 'Offre exclusive',
                  badge: 'DTC Premium',
                },
                {
                  id: 'gradient-pop',
                  title: 'Gradient Pop',
                  desc: 'Dégradé vibrant cyan à violet avec lueur néon tendance.',
                  sample: 'Innovation 2026',
                  badge: 'Tendance Web',
                },
                {
                  id: 'classic-white',
                  title: 'Blanc Classique',
                  desc: 'Texte blanc centré avec ombre douce cinématographique.',
                  sample: 'Votre routine idéale',
                  badge: 'Sobre & Épuré',
                },
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={`subtitle-style-card ${
                    (p.subtitleStyle || 'tiktok-punchy') === style.id ? 'is-active' : ''
                  }`}
                  onClick={() =>
                    update({
                      ...p,
                      subtitleStyle: style.id as ProjectInput['subtitleStyle'],
                    })
                  }
                >
                  <div className="card-top">
                    <span className="card-badge">{style.badge}</span>
                    {(p.subtitleStyle || 'tiktok-punchy') === style.id ? (
                      <span className="check-indicator">
                        <Icon name="check" size={13} />
                      </span>
                    ) : null}
                  </div>
                  <div className={`style-sample-box sample-${style.id}`}>
                    <span>{style.sample}</span>
                  </div>
                  <div className="card-info">
                    <h4>{style.title}</h4>
                    <p>{style.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="inline-options">
            <label className="field">
              Type de vidéo
              <select
                value={p.media?.kind || 'product'}
                onChange={(e) =>
                  update({
                    ...p,
                    media: {
                      kind: e.target.value as 'product' | 'avatar',
                      narration:
                        e.target.value === 'avatar' ? 'standard' : p.media?.narration || 'none',
                      voiceProfileId: p.media?.voiceProfileId,
                    },
                  })
                }
              >
                <option value="product">Vidéo produit · photo et texte</option>
                <option value="avatar">Avatar parlant · bibliothèque autorisée du serveur</option>
              </select>
            </label>
            <label className="field">
              Narration du rendu
              <select
                value={p.media?.narration || 'none'}
                onChange={(e) =>
                  update({
                    ...p,
                    media: {
                      kind: p.media?.kind || 'product',
                      narration: e.target.value as 'none' | 'standard' | 'clone',
                      voiceProfileId: p.media?.voiceProfileId,
                    },
                  })
                }
              >
                <option value="none" disabled={p.media?.kind === 'avatar'}>
                  Sans narration
                </option>
                <option value="standard">Voix standard du serveur</option>
                <option value="clone">Voix personnalisée autorisée</option>
              </select>
            </label>
          </div>
          {p.media?.narration === 'clone' ? (
            <VoiceChoice
              workspaceId={workspaceId}
              value={p.media.voiceProfileId || ''}
              onChange={(voiceProfileId) =>
                update({ ...p, media: { ...p.media!, voiceProfileId } })
              }
            />
          ) : null}
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
              Cette timeline multi-pistes est entièrement synchronisée avec la prévisualisation live et le moteur vidéo FFmpeg.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
