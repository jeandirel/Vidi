'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import MarketingNav from '@/components/marketing/marketing-nav';
import MarketingFooter from '@/components/marketing/marketing-footer';
import Icon from '@/components/icon';
import { avatars } from '@/lib/catalog';

const AVATAR_DETAILS: Record<
  string,
  {
    bio: string;
    niches: string[];
    recommendedVoice: string;
    tone: string;
    expression: string;
  }
> = {
  lea: {
    bio: 'Style naturel et chaleureux. Idéale pour les produits bien-être, soins de la peau, compléments alimentaires et lifestyle quotidien.',
    niches: ['Cosmétique & Skincare', 'Maison & Décoration', 'Bien-être'],
    recommendedVoice: 'Claire (fr-FR)',
    tone: 'Chaleureux & Spontané',
    expression: 'Souriante et engageante',
  },
  marcus: {
    bio: 'Présence dynamique et rassurante. Parfait pour les accessoires tech, applications mobiles, vêtements de sport et matériel outdoor.',
    niches: ['High-Tech & Gadgets', 'Sport & Fitness', 'Applications Mobiles'],
    recommendedVoice: 'Noah (fr-FR)',
    tone: 'Direct & Authentique',
    expression: 'Confiant et accessible',
  },
  maya: {
    bio: 'Élégance moderne en environnement studio soigné. Conçue pour les marques premium, la joaillerie, le prêt-à-porter et les services pro.',
    niches: ['Mode & Accessoires', 'Marques D2C Premium', 'Services & SaaS'],
    recommendedVoice: 'Amina (fr-FR)',
    tone: 'Sophistiqué & Énergique',
    expression: 'Expressive et professionnelle',
  },
  alex: {
    bio: 'Approche pragmatique et décontractée face caméra. Très efficace pour les démonstrations de produits du quotidien et les unboxings.',
    niches: ['Outils & Maison', 'Électronique grand public', 'Alimentation'],
    recommendedVoice: 'James (en-US) / Noah (fr-FR)',
    tone: 'Posé & Pédagogique',
    expression: 'Naturel et franc',
  },
  ines: {
    bio: 'Look frais et lumineux dédié aux rituels beauté, maquillage, soins capillaires et tutoriels d’application en gros plan.',
    niches: ['Soins Beauté & Capillaires', 'Santé naturelle', 'Bijoux & Mode'],
    recommendedVoice: 'Claire (fr-FR)',
    tone: 'Complice & Lumineux',
    expression: 'Douce et pétillante',
  },
  kenji: {
    bio: 'Créateur de contenu urbain et technophile. Recommandé pour le gaming, les accessoires streetwear, le son et les gadgets viraux.',
    niches: ['Gaming & Tech virale', 'Streetwear & Mode', 'Accessoires Audio'],
    recommendedVoice: 'Noah (fr-FR)',
    tone: 'Rythmé & Créatif',
    expression: 'Vif et expressif',
  },
};

export default function AiAvatarsPage() {
  const [selectedTag, setSelectedTag] = useState<string>('Tous');
  const [activeAvatar, setActiveAvatar] = useState<(typeof avatars)[number]>(avatars[0]);

  const tags = ['Tous', 'Lifestyle', 'Décontracté', 'Studio', 'Quotidien', 'Beauté', 'Créateur'];

  const filteredAvatars =
    selectedTag === 'Tous'
      ? avatars
      : avatars.filter((a) => a.tag.toLowerCase() === selectedTag.toLowerCase());

  const currentDetail = AVATAR_DETAILS[activeAvatar.id] || {
    bio: 'Avatar IA professionnel pour vidéos UGC.',
    niches: ['E-Commerce', 'DTC'],
    recommendedVoice: 'Claire',
    tone: 'Naturel',
    expression: 'Équilibrée',
  };

  return (
    <div className="marketing-page-wrapper">
      <MarketingNav />

      <main id="main-content" className="marketing-inner-page">
        {/* Header */}
        <section className="inner-hero-section">
          <div className="marketing-container text-center">
            <span className="section-eyebrow">BIBLIOTHÈQUE D'AVATARS IA</span>
            <h1 className="inner-hero-title">
              Des visages humains réels <span className="gradient-text">pour incarner votre marque</span>
            </h1>
            <p className="inner-hero-desc">
              Tous nos avatars sont formés à partir de captations réelles d'acteurs professionnels
              adultes ayant consenti explicitement à leur usage publicitaire.
            </p>
          </div>
        </section>

        {/* Interactive Filter & Showcase */}
        <section className="marketing-section">
          <div className="marketing-container">
            {/* Tag filters */}
            <div className="avatar-filter-bar">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`avatar-filter-btn ${selectedTag === tag ? 'active' : ''}`}
                  onClick={() => setSelectedTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Main Showcase Layout: Grid of avatars + Detail inspector */}
            <div className="avatars-interactive-layout">
              {/* Left: Avatar Grid */}
              <div className="avatars-selection-grid">
                {filteredAvatars.map((avatar) => {
                  const isSelected = activeAvatar.id === avatar.id;
                  return (
                    <div
                      key={avatar.id}
                      className={`avatar-catalog-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setActiveAvatar(avatar)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setActiveAvatar(avatar)}
                    >
                      <div className="avatar-card-image-wrapper">
                        <Image
                          src={avatar.image}
                          alt={`Avatar IA ${avatar.name}`}
                          width={280}
                          height={350}
                          style={{ objectFit: 'cover' }}
                        />
                        <div className="avatar-card-overlay" />
                        <span className="avatar-pill-tag">{avatar.tag}</span>
                      </div>
                      <div className="avatar-card-info">
                        <strong>{avatar.name}</strong>
                        <span className="avatar-mini-status">
                          <span className="status-dot-pulse" /> Actif
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right: Detailed Avatar Profile Inspector */}
              <div className="avatar-detail-inspector">
                <div className="inspector-card">
                  <div className="inspector-header">
                    <div className="inspector-portrait">
                      <Image
                        src={activeAvatar.image}
                        alt={activeAvatar.name}
                        width={90}
                        height={90}
                        style={{ borderRadius: '16px', objectFit: 'cover' }}
                      />
                    </div>
                    <div className="inspector-title">
                      <div className="inspector-eyebrow">AVATAR SÉLECTIONNÉ</div>
                      <h3>{activeAvatar.name}</h3>
                      <span className="inspector-badge">{activeAvatar.tag}</span>
                    </div>
                  </div>

                  <p className="inspector-bio">{currentDetail.bio}</p>

                  <div className="inspector-specs">
                    <div className="spec-row">
                      <span className="spec-label">Voix recommandée</span>
                      <strong className="spec-value">{currentDetail.recommendedVoice}</strong>
                    </div>
                    <div className="spec-row">
                      <span className="spec-label">Tonalité d'expression</span>
                      <strong className="spec-value">{currentDetail.tone}</strong>
                    </div>
                    <div className="spec-row">
                      <span className="spec-label">Expression faciale</span>
                      <strong className="spec-value">{currentDetail.expression}</strong>
                    </div>
                    <div className="spec-row">
                      <span className="spec-label">Synchronisation</span>
                      <strong className="spec-value">Modèle neural MuseTalk</strong>
                    </div>
                  </div>

                  <div className="inspector-niches">
                    <span className="niches-label">Industries de prédilection :</span>
                    <div className="niches-tags">
                      {currentDetail.niches.map((n) => (
                        <span key={n} className="niche-chip">
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="inspector-actions">
                    <Link
                      href="/app"
                      className="marketing-btn-primary"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <Icon name="wand" size={16} />
                      <span>Créer une vidéo avec {activeAvatar.name}</span>
                    </Link>
                  </div>
                </div>

                {/* Consent & Ethics Box */}
                <div className="ethics-guarantee-box">
                  <div className="ethics-icon">
                    <Icon name="check" size={18} />
                  </div>
                  <div>
                    <strong>Garantie Éthique & Consentement</strong>
                    <p>
                      Tous nos visages sont sous contrat d'exclusivité ou de licence avec des comédiens
                      adultes. Aucune utilisation non autorisée, aucun deepfake sauvage.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Custom Avatar for Brands (Enterprise) */}
        <section className="marketing-section section-bordered bg-elevated">
          <div className="marketing-container">
            <div className="custom-avatar-banner">
              <div className="custom-avatar-text">
                <span className="section-eyebrow">OFFRE SUR MESURE</span>
                <h2>Créez l'avatar IA exclusif de votre propre égérie</h2>
                <p>
                  Vous avez déjà un ambassadeur ou vous souhaitez numériser le fondateur de votre
                  marque ? Notre équipe réalise la captation 4K et entraîne un modèle neural dédié,
                  strictement privé et réservé à votre entreprise.
                </p>
                <div className="hero-cta-group">
                  <Link href="/contact" className="marketing-btn-primary">
                    <Icon name="users" size={16} />
                    <span>Demander un avatar personnalisé</span>
                  </Link>
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
