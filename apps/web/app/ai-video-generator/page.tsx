'use client';

import { useState } from 'react';
import Link from 'next/link';
import MarketingNav from '@/components/marketing/marketing-nav';
import MarketingFooter from '@/components/marketing/marketing-footer';
import Icon from '@/components/icon';

export default function AiVideoGeneratorPage() {
  const [selectedFormat, setSelectedFormat] = useState<'9:16' | '1:1' | '16:9'>('9:16');
  const [calcDuration, setCalcDuration] = useState<number>(30);
  const [calcResolution, setCalcResolution] = useState<'720p' | '1080p' | '4k'>('1080p');

  // Credit calculation logic matching packages/core: Math.ceil(duration / 15) * multiplier
  const creditsMultiplier = { '720p': 1, '1080p': 2, '4k': 4 }[calcResolution];
  const totalCredits = Math.ceil(calcDuration / 15) * creditsMultiplier;
  const estimatedTimeSec = calcResolution === '720p' ? Math.round(calcDuration * 1.2) : Math.round(calcDuration * 2.1);

  return (
    <div className="marketing-page-wrapper">
      <MarketingNav />

      <main id="main-content" className="marketing-inner-page">
        {/* Header */}
        <section className="inner-hero-section">
          <div className="marketing-container text-center">
            <span className="section-eyebrow">PIPELINE DE RENDU FFmpeg & GPU</span>
            <h1 className="inner-hero-title">
              Un véritable moteur de rendu vidéo <span className="gradient-text">haute fidélité</span>
            </h1>
            <p className="inner-hero-desc">
              Vidi ne simule pas la vidéo : notre architecture serveur produit de vrais fichiers MP4
              H.264 prêts pour les régies publicitaires TikTok Ads, Meta Ads et YouTube Shorts.
            </p>
          </div>
        </section>

        {/* Format Selector Showcase */}
        <section className="marketing-section section-bordered">
          <div className="marketing-container">
            <div className="section-header text-center">
              <span className="section-eyebrow">FORMATS & COMPATIBILITÉ</span>
              <h2 className="section-title">Tous les ratios publicitaires indispensables</h2>
              <p className="section-subtitle">
                Générez des déclinaisons adaptées à chaque canal d'acquisition en un clic.
              </p>
            </div>

            <div className="format-toggle-bar">
              <button
                type="button"
                className={`format-toggle-btn ${selectedFormat === '9:16' ? 'active' : ''}`}
                onClick={() => setSelectedFormat('9:16')}
              >
                9:16 Vertical (TikTok, Reels, Shorts)
              </button>
              <button
                type="button"
                className={`format-toggle-btn ${selectedFormat === '1:1' ? 'active' : ''}`}
                onClick={() => setSelectedFormat('1:1')}
              >
                1:1 Carré (Feed Instagram, Facebook)
              </button>
              <button
                type="button"
                className={`format-toggle-btn ${selectedFormat === '16:9' ? 'active' : ''}`}
                onClick={() => setSelectedFormat('16:9')}
              >
                16:9 Paysage (YouTube Desktop)
              </button>
            </div>

            <div className="format-visual-display">
              <div className={`format-frame format-frame-${selectedFormat.replace(':', '-')}`}>
                <div className="format-mockup-inner">
                  <div className="format-hud-tag">{selectedFormat} • H.264 / AAC</div>
                  <div className="format-preview-center">
                    <div className="sample-avatar-circle" />
                    <p className="sample-subtitle-line">
                      "Voici le résultat en format <span className="highlight">{selectedFormat}</span> natif."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Technical Architecture */}
        <section className="marketing-section section-bordered bg-elevated">
          <div className="marketing-container">
            <div className="section-header text-center">
              <span className="section-eyebrow">ARCHITECTURE TECHNIQUE</span>
              <h2 className="section-title">Ce qui se passe sous le capot</h2>
              <p className="section-subtitle">
                Un pipeline robuste orchestré par BullMQ et exécuté sur des workers dédiés.
              </p>
            </div>

            <div className="architecture-steps-grid">
              <div className="arch-step-box">
                <div className="arch-step-num">Étape 1</div>
                <h4>Synthèse Vocale & Chronométrage</h4>
                <p>
                  Le script est converti en audio haute résolution via Chatterbox. Chaque mot est
                  horodaté à la milliseconde près pour calibrer les sous-titres et la timeline.
                </p>
              </div>

              <div className="arch-step-box">
                <div className="arch-step-num">Étape 2</div>
                <h4>Synchronisation Labiale Neurale</h4>
                <p>
                  Le modèle MuseTalk génère les images faciales synchronisées avec les formants
                  acoustiques de la voix pour un rendu naturel sans coupures brutales.
                </p>
              </div>

              <div className="arch-step-box">
                <div className="arch-step-num">Étape 3</div>
                <h4>Montage & Incrustation B-Roll</h4>
                <p>
                  FFmpeg applique les découpes, superpose les plans de coupe produits et mixe
                  la musique de fond en appliquant un ducking audio automatique sous la voix.
                </p>
              </div>

              <div className="arch-step-box">
                <div className="arch-step-num">Étape 4</div>
                <h4>Gravure des Sous-Titres & Encodage</h4>
                <p>
                  Les sous-titres dynamiques mot à mot sont gravés directement dans le flux vidéo.
                  Le fichier est encodé en MP4 H.264 Level 4.1 avec profil compatible multi-plateformes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Production & Credit Calculator */}
        <section className="marketing-section">
          <div className="marketing-container max-w-narrow">
            <div className="calculator-card">
              <div className="section-header text-center">
                <span className="section-eyebrow">ESTIMATEUR DE RENDU</span>
                <h2 className="section-title">Calculez vos coûts de production</h2>
                <p className="section-subtitle">
                  Règle de facturation transparente : 1 crédit = 15 secondes en 720p.
                </p>
              </div>

              <div className="calc-controls">
                <div className="calc-group">
                  <label htmlFor="calc-dur">Durée de la vidéo : <strong>{calcDuration} secondes</strong></label>
                  <input
                    id="calc-dur"
                    type="range"
                    min="15"
                    max="90"
                    step="15"
                    value={calcDuration}
                    onChange={(e) => setCalcDuration(Number(e.target.value))}
                  />
                  <div className="calc-ticks">
                    <span>15s</span>
                    <span>30s</span>
                    <span>45s</span>
                    <span>60s</span>
                    <span>90s</span>
                  </div>
                </div>

                <div className="calc-group">
                  <label>Résolution d'export</label>
                  <div className="res-toggle-group">
                    {(['720p', '1080p', '4k'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={`res-btn ${calcResolution === r ? 'active' : ''}`}
                        onClick={() => setCalcResolution(r)}
                      >
                        {r.toUpperCase()} {r === '1080p' ? '(Standard Pro)' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="calc-result-box">
                <div className="calc-metric">
                  <span className="metric-label">Crédits consommés</span>
                  <strong className="metric-value">{totalCredits} crédits</strong>
                </div>
                <div className="calc-metric">
                  <span className="metric-label">Temps de calcul estimé</span>
                  <strong className="metric-value">~{estimatedTimeSec}s</strong>
                </div>
                <div className="calc-metric">
                  <span className="metric-label">Format de sortie</span>
                  <strong className="metric-value">MP4 H.264 {calcResolution}</strong>
                </div>
              </div>

              <div className="calc-action">
                <Link
                  href="/app"
                  className="marketing-btn-primary hero-btn-lg"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Icon name="wand" size={18} />
                  <span>Lancer un rendu dans le Studio</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
