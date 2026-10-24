'use client';
import { useEffect, useState } from 'react';
import { renderCost, type ProjectInput } from '@vidi/core';
import { avatars } from '@/lib/catalog';
import Icon from './icon';
export default function Preview({
  project: p,
  onRender,
  busy,
  videoConnected,
}: {
  project: ProjectInput;
  onRender: () => void;
  busy: boolean;
  videoConnected: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const avatar = avatars.find((a) => a.id === p.avatarId)!;
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setTime((t) => t + 0.1), 100);
    return () => clearInterval(timer);
  }, [playing]);
  useEffect(() => {
    if (time >= p.duration) {
      setPlaying(false);
      setTime(0);
    }
  }, [time, p.duration]);
  const caption =
    time < p.duration * 0.25
      ? p.script.hook
      : time < p.duration * 0.8
        ? p.script.body
        : p.script.cta;
  return (
    <aside className="preview-column">
      <div className="preview-heading">
        <span>
          <Icon name="video" size={16} />
          Aperçu de composition
        </span>
        <span className="preview-ratio">9:16</span>
      </div>
      <div className="preview-stage">
        <div className={`phone-preview ${playing ? 'is-playing' : ''}`}>
          <img
            className="preview-person"
            src={avatar.image}
            alt={`Composition avec le portrait ${avatar.name}`}
          />
          <div className="preview-vignette" />
          <div className="preview-top">
            <span className="preview-brand">vidi</span>
            <span className="preview-example">COMPOSITION</span>
          </div>
          <div className="safe-zone" />
          {p.product.image ? (
            <div className="preview-product">
              <img src={p.product.image} alt={p.product.name || 'Produit'} />
            </div>
          ) : (
            <div className="product-placeholder">
              <span>
                VOTRE
                <br />
                PRODUIT
              </span>
              <div className="bottle">
                <div className="bottle-cap" />
                <div className="bottle-label">
                  <span>v.</span>
                  <small>YOUR BRAND</small>
                </div>
              </div>
            </div>
          )}
          <div className="preview-caption">
            {p.captions ? (
              <p>
                {caption || (
                  <>
                    Votre produit.
                    <br />
                    <mark>Sa prochaine histoire.</mark>
                  </>
                )}
              </p>
            ) : null}
            <span>{p.product.name || 'Votre marque, au premier plan.'}</span>
          </div>
        </div>
      </div>
      <div className="preview-controls">
        <button
          className="icon-button"
          aria-label={playing ? 'Pause de l’aperçu' : 'Lire l’aperçu de composition'}
          onClick={() => setPlaying(!playing)}
        >
          <Icon name={playing ? 'pause' : 'play'} size={15} />
        </button>
        <span>{`00:${Math.floor(time).toString().padStart(2, '0')}`}</span>
        <input
          aria-label="Position dans l’aperçu"
          type="range"
          min={0}
          max={p.duration}
          step={0.1}
          value={Math.min(time, p.duration)}
          onChange={(e) => setTime(Number(e.target.value))}
        />
        <span>{p.duration === 60 ? '01:00' : `00:${p.duration}`}</span>
        <Icon name="volume" size={14} />
      </div>
      <p className="preview-disclaimer">
        Aperçu statique animé de la composition.
        <br />
        Le rendu final utilisera le moteur vidéo connecté.
      </p>
      <div className="render-summary">
        <div>
          <span>Format</span>
          <strong>MP4 · {p.resolution}</strong>
        </div>
        <div>
          <span>Coût estimé</span>
          <strong>
            <Icon name="zap" size={13} />
            {renderCost(p.duration, p.resolution)} crédit
            {renderCost(p.duration, p.resolution) > 1 ? 's' : ''}
          </strong>
        </div>
      </div>
      <button className="button primary render-button" disabled={busy} onClick={onRender}>
        <Icon name={busy ? 'loader' : 'sparkles'} className={busy ? 'spin' : ''} size={17} />
        {busy ? 'Préparation…' : 'Générer la vidéo'}
        <Icon name="next" size={17} />
      </button>
      <div className={`engine-status ${videoConnected ? 'connected' : ''}`}>
        <span />
        {videoConnected ? 'Moteur configuré' : 'Moteur vidéo à connecter'}
      </div>
    </aside>
  );
}
