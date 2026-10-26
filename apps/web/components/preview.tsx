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
  currentTime,
  onSeek,
  isPlaying,
  onTogglePlay,
}: {
  project: ProjectInput;
  onRender: () => void;
  busy: boolean;
  videoConnected: boolean;
  currentTime?: number;
  onSeek?: (t: number) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
}) {
  const [internalPlaying, setInternalPlaying] = useState(false);
  const [internalTime, setInternalTime] = useState(0);

  const playing = isPlaying !== undefined ? isPlaying : internalPlaying;
  const setPlaying = (val: boolean) => {
    if (onTogglePlay) onTogglePlay();
    else setInternalPlaying(val);
  };

  const time = currentTime !== undefined ? currentTime : internalTime;
  const setTime = (val: number) => {
    if (onSeek) onSeek(val);
    else setInternalTime(val);
  };

  const avatar = avatars.find((a) => a.id === p.avatarId) || avatars[0];

  useEffect(() => {
    if (isPlaying !== undefined) return;
    if (!playing) return;
    const timer = setInterval(() => setInternalTime((t) => t + 0.1), 100);
    return () => clearInterval(timer);
  }, [playing, isPlaying]);

  useEffect(() => {
    if (time >= p.duration) {
      if (isPlaying === undefined) {
        setInternalPlaying(false);
        setInternalTime(0);
      }
    }
  }, [time, p.duration, isPlaying]);

  const caption =
    time < p.duration * 0.25
      ? p.script.hook
      : time < p.duration * 0.8
        ? p.script.body
        : p.script.cta;

  // Determine if a B-roll product clip is currently playing
  const isProductBRollActive = p.clips.some(
    (c) => c.kind === 'product' && time >= c.start && time <= c.start + c.duration,
  );

  const subtitleClass = `subtitle-${p.subtitleStyle || 'tiktok-punchy'}`;

  return (
    <aside className="preview-column">
      <div className="preview-heading">
        <span>
          <Icon name="video" size={16} />
          Aperçu de composition
        </span>
        <span className="preview-ratio">{p.aspectRatio || '9:16'} · {p.resolution}</span>
      </div>
      <div className="preview-stage">
        <div
          className={`phone-preview ratio-${(p.aspectRatio || '9:16').replace(':', '-')} ${
            playing ? 'is-playing' : ''
          } ${isProductBRollActive ? 'broll-active' : ''}`}
        >
          {/* Avatar Person / Face Cam */}
          <img
            className="preview-person"
            src={avatar.image}
            alt={`Composition avec le portrait ${avatar.name}`}
            style={{
              filter: isProductBRollActive ? 'brightness(0.35) blur(3px)' : 'none',
              transition: 'filter 0.3s ease',
            }}
          />

          <div className="preview-vignette" />

          <div className="preview-top">
            <span className="preview-brand">vidi</span>
            <span className="preview-example">
              {isProductBRollActive ? 'PLAN B-ROLL' : 'FACE-CAMÉRA'}
            </span>
          </div>

          <div className="safe-zone" />

          {/* Product visual: if B-roll active, expand and emphasize */}
          {p.product.image ? (
            <div
              className={`preview-product ${isProductBRollActive ? 'product-in-focus' : ''}`}
            >
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

          {/* Subtitles Overlay with dynamic styles */}
          <div className={`preview-caption ${subtitleClass}`}>
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

      {/* Synchronized Playback Controls */}
      <div className="preview-controls">
        <button
          type="button"
          className="icon-button"
          aria-label={playing ? 'Pause de l’aperçu' : 'Lire l’aperçu de composition'}
          onClick={() => setPlaying(!playing)}
        >
          <Icon name={playing ? 'pause' : 'play'} size={15} />
        </button>
        <span className="time-display">{`00:${Math.floor(time).toString().padStart(2, '0')}.${Math.floor((time % 1) * 10)}`}</span>
        <input
          aria-label="Position dans l’aperçu"
          type="range"
          min={0}
          max={p.duration}
          step={0.1}
          value={Math.min(time, p.duration)}
          onChange={(e) => setTime(Number(e.target.value))}
        />
        <span>{p.duration >= 60 ? `01:${String(p.duration - 60).padStart(2, '0')}` : `00:${p.duration}`}</span>
        <Icon name="volume" size={14} />
      </div>

      <p className="preview-disclaimer">
        Aperçu de composition en direct.
        <br />
        Le rendu final utilisera le moteur vidéo natif FFmpeg.
      </p>

      <div className="render-summary">
        <div>
          <span>Format & Ratio</span>
          <strong>MP4 · {p.aspectRatio || '9:16'} · {p.resolution}</strong>
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

      <button
        type="button"
        className="button primary render-button"
        disabled={busy}
        onClick={onRender}
      >
        <Icon name={busy ? 'loader' : 'sparkles'} className={busy ? 'spin' : ''} size={17} />
        {busy ? 'Préparation…' : 'Générer la vidéo'}
        <Icon name="next" size={17} />
      </button>

      <div className={`engine-status ${videoConnected ? 'connected' : ''}`}>
        <span />
        {videoConnected ? 'Moteur HeyGen Connecté' : 'Moteur vidéo HeyGen à connecter'}
      </div>
    </aside>
  );
}
