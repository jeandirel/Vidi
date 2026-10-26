'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Icon from '../icon';

const DEMO_SCENES = [
  {
    avatar: '/portraits/lea.jpg',
    avatarName: 'Léa',
    voice: 'Claire (fr-FR)',
    title: 'Hook Stop-Scroll',
    subtitleWord: 'Arrêtez',
    subtitleFull: 'Arrêtez de gaspiller votre budget pub en 2026.',
    tag: 'Taux de rétention élevé',
    time: '0:02 / 0:30',
  },
  {
    avatar: '/portraits/marcus.jpg',
    avatarName: 'Marcus',
    voice: 'Noah (fr-FR)',
    title: 'Démonstration Produit',
    subtitleWord: 'Regardez',
    subtitleFull: 'Regardez la différence en appliquant ce geste simple.',
    tag: 'Preuve concrète',
    time: '0:12 / 0:30',
  },
  {
    avatar: '/portraits/maya.jpg',
    avatarName: 'Maya',
    voice: 'Amina (fr-FR)',
    title: 'Appel à l action',
    subtitleWord: 'Profitez-en',
    subtitleFull: 'Profitez des frais de port offerts sur votre première commande.',
    tag: 'Conversion maximale',
    time: '0:28 / 0:30',
  },
];

export default function HeroDemoPlayer() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % DEMO_SCENES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const scene = DEMO_SCENES[activeIdx];

  return (
    <div className="hero-demo-wrapper">
      {/* Dynamic ambient glow behind the mockup */}
      <div className="hero-ambient-glow" />

      {/* Modern phone chassis */}
      <div className="hero-phone-container">
        {/* Top dynamic island notch */}
        <div className="phone-dynamic-island">
          <div className="island-camera" />
          <div className="island-indicator" />
        </div>

        {/* Video Screen Content */}
        <div className="phone-screen-content">
          <Image
            src={scene.avatar}
            alt={`Avatar IA ${scene.avatarName} en situation UGC`}
            fill
            sizes="(max-width: 768px) 100vw, 380px"
            style={{ objectFit: 'cover' }}
            priority
          />

          {/* Video overlay gradient */}
          <div className="phone-video-overlay" />

          {/* Top meta tags */}
          <div className="phone-header-tags">
            <span className="phone-live-tag">
              <span className="status-dot-pulse" /> LIVE UGC
            </span>
            <span className="phone-ratio-tag">9:16 FHD</span>
          </div>

          {/* Dynamic Subtitles overlay (TikTok style with animated word highlight) */}
          <div className="phone-subtitles-box">
            <span className="caption-badge">{scene.title}</span>
            <p className="caption-text">
              <span className="highlight-word">{scene.subtitleWord}</span>{' '}
              {scene.subtitleFull.replace(scene.subtitleWord, '').trim()}
            </p>
          </div>

          {/* Bottom player controls & avatar info */}
          <div className="phone-bottom-bar">
            <div className="phone-creator-info">
              <div className="creator-avatar-thumb">
                <Image
                  src={scene.avatar}
                  alt={scene.avatarName}
                  width={32}
                  height={32}
                  style={{ borderRadius: '50%', objectFit: 'cover' }}
                />
              </div>
              <div className="creator-meta">
                <strong>{scene.avatarName}</strong>
                <small>{scene.voice}</small>
              </div>
            </div>

            <button
              type="button"
              className="phone-play-toggle"
              aria-label={isPlaying ? 'Mettre en pause la démo' : 'Lire la démo'}
              onClick={() => setIsPlaying(!isPlaying)}
            >
              <Icon name={isPlaying ? 'audio' : 'wand'} size={14} />
            </button>
          </div>

          {/* Timeline progress line */}
          <div className="phone-progress-line">
            <div
              className="phone-progress-fill"
              style={{ width: `${((activeIdx + 1) / DEMO_SCENES.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Floating feature pills around the mockup */}
      <div className="floating-pill pill-top-right">
        <Icon name="check" size={14} />
        <div>
          <strong>Synchronisation labiale</strong>
          <small>Moteur neural haute précision</small>
        </div>
      </div>

      <div className="floating-pill pill-bottom-left">
        <Icon name="zap" size={14} />
        <div>
          <strong>Export MP4 natif</strong>
          <small>Rendu H.264 prêt pour les régies</small>
        </div>
      </div>
    </div>
  );
}
