'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import MarketingNav from '@/components/marketing/marketing-nav';
import MarketingFooter from '@/components/marketing/marketing-footer';
import Icon from '@/components/icon';

const EXAMPLES = [
  {
    id: 'skincare-glow',
    niche: 'Cosmétique & Skincare',
    title: 'Sérum Éclat Vitamine C Micro-Encapsulée',
    avatar: '/portraits/lea.jpg',
    avatarName: 'Léa',
    framework: 'PAS — Problème Agitation Solution',
    duration: '30s',
    ratio: '9:16 Vertical (TikTok Ads)',
    hook: 'Si votre crème visage peluche ou colle dès le matin, arrêtez tout.',
    scriptLines: [
      { tag: 'HOOK (0-3s)', text: 'Si votre crème visage peluche ou colle dès le matin, arrêtez tout.' },
      { tag: 'PROBLÈME (3-9s)', text: '90% des formules classiques s oxydent au contact de l air et perdent leurs actifs avant même d agir.' },
      { tag: 'DÉMO & PREUVE (9-20s)', text: 'Ce sérum utilise des micro-sphères végétales qui libèrent la vitamine C pure uniquement au contact de votre peau. Texture ultra-légère, fini velouté garanti.' },
      { tag: 'CTA (20-30s)', text: 'Commandez le flacon découverte avec 20% de remise via le lien sous cette vidéo.' },
    ],
    keyInsight: 'Le hook cible une frustration tactile immédiate (peluche/colle), garantissant un taux de rétention élevé dans les 3 premières secondes.',
  },
  {
    id: 'tech-anc-earbuds',
    niche: 'High-Tech & Gadgets',
    title: 'Écouteurs Pulse Pro ANC 45dB',
    avatar: '/portraits/marcus.jpg',
    avatarName: 'Marcus',
    framework: 'AIDA — Attention Intérêt Désir Action',
    duration: '30s',
    ratio: '9:16 Vertical (Instagram Reels)',
    hook: 'Comment s isoler instantanément dans un open-space bruyant sans casque lourd ?',
    scriptLines: [
      { tag: 'ATTENTION (0-3s)', text: 'Comment s isoler instantanément dans un open-space bruyant sans casque lourd ?' },
      { tag: 'INTÉRÊT (3-10s)', text: 'Ces écouteurs compacts réduisent jusqu à 45 décibels de bruit de fond grâce à leur puce de traitement hybride.' },
      { tag: 'DÉSIR (10-21s)', text: '36 heures d autonomie avec l étui de charge, résistant à la pluie IPX7 et une clarté vocale bluffante en appel.' },
      { tag: 'ACTION (21-30s)', text: 'Frais de port offerts et 30 jours d essai satisfait ou remboursé. Cliquez sur le lien.' },
    ],
    keyInsight: 'Mise en avant du bénéfice d usage pratique dès les 5 premières secondes sans jargon technique incompréhensible.',
  },
  {
    id: 'fitness-adaptogen',
    niche: 'Nutrition & Santé',
    title: 'Café Adaptogène Focus Lion',
    avatar: '/portraits/kenji.jpg',
    avatarName: 'Kenji',
    framework: 'Témoignage Démonstration',
    duration: '45s',
    ratio: '9:16 Vertical (YouTube Shorts)',
    hook: 'J ai remplacé mes 4 expressos quotidiens par cette boisson, voici ce qui s est passé.',
    scriptLines: [
      { tag: 'HOOK (0-4s)', text: 'J ai remplacé mes 4 expressos quotidiens par cette boisson, voici ce qui s est passé.' },
      { tag: 'HISTOIRE (4-15s)', text: 'Avant, à 14 heures, j avais ce gros coup de fatigue qui m obligeait à reprendre du café. Résultat : palpitations et sommeil perturbé.' },
      { tag: 'DÉCOUVERTE (15-32s)', text: 'J ai testé le café adaptogène enrichi aux extraits de crinière de lion. Une énergie stable toute la journée, zéro nervosité et une digestion impeccable.' },
      { tag: 'CTA (32-45s)', text: 'Testez le pack démarrage de 30 portions directement sur leur boutique officielle.' },
    ],
    keyInsight: 'Angle storytelling avec identification personnelle : l audience s identifie au coup de fatigue de 14h.',
  },
];

export default function ExamplesPage() {
  const [selectedExample, setSelectedExample] = useState(EXAMPLES[0]);

  return (
    <div className="marketing-page-wrapper">
      <MarketingNav />

      <main id="main-content" className="marketing-inner-page">
        {/* Header */}
        <section className="inner-hero-section">
          <div className="marketing-container text-center">
            <span className="section-eyebrow">DÉMONSTRATEUR DE CRÉATIONS UGC</span>
            <h1 className="inner-hero-title">
              Des structures publicitaires <span className="gradient-text">taillées pour la performance</span>
            </h1>
            <p className="inner-hero-desc">
              Découvrez les scénarios, hooks et découpages produits par Vidi pour des produits réels.
              Pas de chiffres fantaisistes : uniquement des techniques de persuasion vérifiées.
            </p>
          </div>
        </section>

        {/* Gallery & Interactive Breakdown */}
        <section className="marketing-section">
          <div className="marketing-container">
            {/* Quick tabs */}
            <div className="examples-tabs-bar">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  className={`example-tab-btn ${selectedExample.id === ex.id ? 'active' : ''}`}
                  onClick={() => setSelectedExample(ex)}
                >
                  <span className="tab-niche">{ex.niche}</span>
                  <strong className="tab-title">{ex.title}</strong>
                </button>
              ))}
            </div>

            {/* Selected Breakdown Card */}
            <div className="example-detail-card">
              <div className="example-card-grid">
                {/* Left: Avatar Visual & Metadata */}
                <div className="example-visual-col">
                  <div className="example-media-box">
                    <Image
                      src={selectedExample.avatar}
                      alt={selectedExample.avatarName}
                      width={320}
                      height={420}
                      style={{ objectFit: 'cover', borderRadius: '16px' }}
                    />
                    <div className="example-badge-overlay">
                      <span>{selectedExample.ratio}</span>
                      <span>~{selectedExample.duration}</span>
                    </div>
                  </div>

                  <div className="example-meta-box">
                    <div className="meta-line">
                      <span>Avatar utilisé :</span>
                      <strong>{selectedExample.avatarName}</strong>
                    </div>
                    <div className="meta-line">
                      <span>Structure :</span>
                      <strong>{selectedExample.framework}</strong>
                    </div>
                  </div>

                  <Link
                    href="/app"
                    className="marketing-btn-primary"
                    style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
                  >
                    <Icon name="wand" size={16} />
                    <span>Créer une vidéo similaire</span>
                  </Link>
                </div>

                {/* Right: Script Breakdown */}
                <div className="example-script-col">
                  <div className="script-col-header">
                    <span className="badge-pill">{selectedExample.niche}</span>
                    <h3>{selectedExample.title}</h3>
                  </div>

                  {/* Hook Highlight */}
                  <div className="hook-highlight-box">
                    <span className="hook-label">HOOK TESTÉ (STOP-SCROLL)</span>
                    <p className="hook-quote">"{selectedExample.hook}"</p>
                  </div>

                  {/* Script Timeline */}
                  <div className="script-breakdown-list">
                    <h4>Découpage scène par scène :</h4>
                    {selectedExample.scriptLines.map((line, idx) => (
                      <div key={idx} className="script-breakdown-item">
                        <span className="line-time-tag">{line.tag}</span>
                        <p className="line-content">{line.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Why it works */}
                  <div className="insight-box">
                    <Icon name="zap" size={16} />
                    <div>
                      <strong>Pourquoi cette structure convertit :</strong>
                      <p>{selectedExample.keyInsight}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
