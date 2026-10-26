import type { Metadata } from 'next';
import Link from 'next/link';
import MarketingNav from '@/components/marketing/marketing-nav';
import MarketingFooter from '@/components/marketing/marketing-footer';
import HeroDemoPlayer from '@/components/marketing/hero-demo-player';
import InteractiveScriptTrial from '@/components/marketing/interactive-script-trial';
import Icon from '@/components/icon';

export const metadata: Metadata = {
  title: 'Vidi — Créez des publicités vidéo UGC IA qui convertissent',
  description:
    'Plateforme SaaS de pointe pour générer des vidéos UGC professionnelles avec avatars IA, scripts marketing AIDA/PAS, voix naturelles et rendu MP4 haute fidélité.',
  keywords: [
    'UGC',
    'publicités vidéo IA',
    'avatars IA',
    'générateur vidéo e-commerce',
    'TikTok Ads',
    'Meta Ads',
    'scripts publicitaires',
  ],
  openGraph: {
    title: 'Vidi — Créez des publicités vidéo UGC IA qui convertissent',
    description:
      'Générez des vidéos publicitaires UGC complètes de bout en bout avec avatars photoréalistes, scripts IA et rendu MP4.',
    type: 'website',
    locale: 'fr_FR',
  },
};

export default function HomePage() {
  return (
    <div className="marketing-page-wrapper">
      <MarketingNav />

      <main id="main-content">
        {/* ================= HERO SECTION ================= */}
        <section className="marketing-hero-section">
          <div className="marketing-container">
            <div className="hero-content-grid">
              {/* Left Column: Value Prop */}
              <div className="hero-text-block">
                <div className="hero-eyebrow-badge">
                  <span className="eyebrow-glow" />
                  <span className="eyebrow-text">Moteur Vidéo Vidi v2.4 — Rendu MP4 Natif</span>
                </div>

                <h1 className="hero-headline">
                  Créez des publicités vidéo <span className="gradient-text">UGC ultra-rentables</span> grâce à l'IA.
                </h1>

                <p className="hero-description">
                  Importez votre produit en un clic. L'intelligence artificielle rédige vos scripts,
                  anime des avatars photoréalistes, synchronise les voix et produit de vraies vidéos
                  MP4 optimisées pour TikTok, Reels et Shorts.
                </p>

                <div className="hero-cta-group">
                  <Link href="/app" className="marketing-btn-primary hero-btn-lg">
                    <Icon name="wand" size={18} />
                    <span>Lancer le Studio gratuitement</span>
                  </Link>
                  <Link href="#workflow" className="marketing-btn-secondary hero-btn-lg">
                    <span>Comment ça marche</span>
                    <Icon name="arrow" size={16} />
                  </Link>
                </div>

                {/* Trust and Compliance Highlights */}
                <div className="hero-trust-bar">
                  <div className="trust-item">
                    <Icon name="check" size={14} />
                    <span>Rendu MP4 réel téléchargeable</span>
                  </div>
                  <div className="trust-item">
                    <Icon name="check" size={14} />
                    <span>Acteurs majeurs consentants</span>
                  </div>
                  <div className="trust-item">
                    <Icon name="check" size={14} />
                    <span>Formats 9:16, 1:1 et 16:9</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Phone Mockup */}
              <div className="hero-visual-block">
                <HeroDemoPlayer />
              </div>
            </div>
          </div>
        </section>

        {/* ================= 4-STEP WORKFLOW ================= */}
        <section id="workflow" className="marketing-section section-bordered">
          <div className="marketing-container">
            <div className="section-header text-center">
              <span className="section-eyebrow">WORKFLOW DE PRODUCTION</span>
              <h2 className="section-title">De votre fiche produit à la vidéo finale en 4 étapes</h2>
              <p className="section-subtitle">
                Un pipeline unifié pensé pour les e-commerçants, les agences et les créateurs de contenu.
              </p>
            </div>

            <div className="workflow-cards-grid">
              {/* Step 1 */}
              <div className="workflow-card">
                <div className="workflow-step-num">01</div>
                <div className="workflow-icon-box">
                  <Icon name="link" size={24} />
                </div>
                <h3>Importez votre produit</h3>
                <p>
                  Entrez l'URL de votre boutique Shopify, WooCommerce ou collez une description avec
                  vos visuels. Vidi extrait automatiquement la promesse, le prix et les bénéfices clés.
                </p>
                <div className="workflow-tag">Connecteurs e-commerce</div>
              </div>

              {/* Step 2 */}
              <div className="workflow-card">
                <div className="workflow-step-num">02</div>
                <div className="workflow-icon-box">
                  <Icon name="type" size={24} />
                </div>
                <h3>Générez les scripts publicitaires</h3>
                <p>
                  Choisissez parmi des structures qui ont fait leurs preuves : AIDA, PAS, Storytelling
                  ou Témoignage. Adaptez la durée de 15s à 60s avec des hooks stop-scroll sur mesure.
                </p>
                <div className="workflow-tag">Structures AIDA / PAS</div>
              </div>

              {/* Step 3 */}
              <div className="workflow-card">
                <div className="workflow-step-num">03</div>
                <div className="workflow-icon-box">
                  <Icon name="users" size={24} />
                </div>
                <h3>Associez avatar & voix</h3>
                <p>
                  Sélectionnez parmi une bibliothèque d'avatars adultes réels aux styles variés.
                  Combinez avec des voix de synthèse naturelles multilingues (français, anglais, espagnol).
                </p>
                <div className="workflow-tag">Synchronisation labiale</div>
              </div>

              {/* Step 4 */}
              <div className="workflow-card">
                <div className="workflow-step-num">04</div>
                <div className="workflow-icon-box">
                  <Icon name="layers" size={24} />
                </div>
                <h3>Montez & exportez le MP4</h3>
                <p>
                  Ajustez les sous-titres animés mot à mot, insérez vos B-rolls produit et lancez
                  le rendu. Téléchargez un fichier MP4 H.264 prêt à être importé dans TikTok Ads et Meta.
                </p>
                <div className="workflow-tag">Rendu FFmpeg 1080p</div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= BENTO GRID CAPABILITIES ================= */}
        <section className="marketing-section">
          <div className="marketing-container">
            <div className="section-header text-center">
              <span className="section-eyebrow">TECHNOLOGIE & PERFORMANCE</span>
              <h2 className="section-title">Conçu pour rivaliser avec les meilleurs studios mondiaux</h2>
              <p className="section-subtitle">
                Chaque module a été développé avec une exigence de fidélité et d'efficacité publicitaire.
              </p>
            </div>

            <div className="bento-grid">
              {/* Bento 1: Large - Avatars */}
              <div className="bento-card bento-col-2">
                <div className="bento-content">
                  <div className="bento-badge">Avatars Photoréalistes</div>
                  <h3>Des visages humains et des expressions naturelles</h3>
                  <p>
                    Oubliez les images figées et les animations saccadées. Nos avatars sont basés sur
                    des acteurs ayant consenti à leur utilisation numérique, avec un alignement labial
                    calculé phonème par phonème.
                  </p>
                  <Link href="/ai-avatars" className="inline-action-link">
                    <span>Explorer la bibliothèque d'avatars</span>
                    <Icon name="arrow" size={14} />
                  </Link>
                </div>
                <div className="bento-visual bento-avatars-preview">
                  <div className="avatar-chip-row">
                    <div className="avatar-pill">Léa • Lifestyle</div>
                    <div className="avatar-pill">Marcus • Décontracté</div>
                    <div className="avatar-pill">Maya • Studio</div>
                    <div className="avatar-pill">Kenji • Tech & Créateur</div>
                  </div>
                </div>
              </div>

              {/* Bento 2: Subtitles */}
              <div className="bento-card">
                <div className="bento-badge">Sous-Titres Dynamiques</div>
                <h3>Sous-titres mot à mot style TikTok</h3>
                <p>
                  85% des vidéos sur mobile sont consommées sans le son. Vidi incruste automatiquement
                  des sous-titres percutants avec mise en valeur colorée des mots clés.
                </p>
                <div className="bento-mini-preview">
                  <div className="sample-caption-bubble">
                    <span className="highlight">INCROYABLE</span> résultat en 3 jours
                  </div>
                </div>
              </div>

              {/* Bento 3: Scriptwriting */}
              <div className="bento-card">
                <div className="bento-badge">Scriptwriting Précis</div>
                <h3>Pas d'affirmations gratuites ni de fausses promesses</h3>
                <p>
                  Le moteur de rédaction respecte scrupuleusement la fiche produit, les bénéfices réels
                  et la réglementation publicitaire en vigueur.
                </p>
                <div className="script-mini-stats">
                  <div className="mini-stat">
                    <strong>6 à 90s</strong>
                    <span>Durées calibrées</span>
                  </div>
                  <div className="mini-stat">
                    <strong>A/B</strong>
                    <span>Angles multiples</span>
                  </div>
                </div>
              </div>

              {/* Bento 4: Multi-Track Timeline */}
              <div className="bento-card bento-col-2">
                <div className="bento-badge">Moteur de Montage & Timeline</div>
                <h3>Timeline multi-pistes fluide et réactive</h3>
                <p>
                  Superposez l'avatar avec des plans de coupe B-roll de votre produit, calibrez la
                  musique de fond avec fondu automatique et ajustez vos points de découpe à la milliseconde.
                </p>
                <div className="timeline-mockup-bar">
                  <div className="track-bar video-track">
                    <span>Piste 1 : Avatar IA</span>
                  </div>
                  <div className="track-bar broll-track">
                    <span>Piste 2 : B-Roll Produit</span>
                  </div>
                  <div className="track-bar audio-track">
                    <span>Piste 3 : Voix de synthèse + Ducking musical</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= INTERACTIVE SCRIPT GENERATOR TRIAL ================= */}
        <section id="trial" className="marketing-section section-bordered bg-elevated">
          <div className="marketing-container">
            <InteractiveScriptTrial />
          </div>
        </section>

        {/* ================= PRICING OVERVIEW ================= */}
        <section className="marketing-section">
          <div className="marketing-container">
            <div className="section-header text-center">
              <span className="section-eyebrow">TARIFICATION TRANSPARENTE</span>
              <h2 className="section-title">Des formules pensées pour monter en puissance</h2>
              <p className="section-subtitle">
                Tarification claire basée sur les crédits de rendu. 1 crédit = 15 secondes en 720p.
              </p>
            </div>

            <div className="pricing-cards-grid">
              {/* Starter */}
              <div className="pricing-card">
                <div className="pricing-card-header">
                  <h3>Starter</h3>
                  <p className="plan-summary">Idéal pour tester vos premiers hooks publicitaires.</p>
                  <div className="price-display">
                    <span className="price-amount">99€</span>
                    <span className="price-cycle">/mois</span>
                  </div>
                </div>
                <ul className="plan-features-list">
                  <li><Icon name="check" size={14} /> <strong>100 crédits</strong> de production / mois</li>
                  <li><Icon name="check" size={14} /> Rendu jusqu'en <strong>1080p Full HD</strong></li>
                  <li><Icon name="check" size={14} /> Bibliothèque d'avatars complète</li>
                  <li><Icon name="check" size={14} /> Générateur de scripts AIDA & PAS</li>
                  <li><Icon name="check" size={14} /> Connecteur Shopify & WooCommerce</li>
                </ul>
                <Link href="/app" className="marketing-btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                  Choisir Starter
                </Link>
              </div>

              {/* Pro (Highlighted) */}
              <div className="pricing-card featured-plan">
                <div className="featured-badge">RECOMMANDÉ POUR LES MARQUES</div>
                <div className="pricing-card-header">
                  <h3>Pro</h3>
                  <p className="plan-summary">Pour les équipes e-commerce qui itèrent chaque semaine.</p>
                  <div className="price-display">
                    <span className="price-amount">299€</span>
                    <span className="price-cycle">/mois</span>
                  </div>
                </div>
                <ul className="plan-features-list">
                  <li><Icon name="check" size={14} /> <strong>400 crédits</strong> de production / mois</li>
                  <li><Icon name="check" size={14} /> Rendu ultra-rapide prioritaire <strong>1080p & 4K</strong></li>
                  <li><Icon name="check" size={14} /> Laboratoire de campagnes avec tests A/B</li>
                  <li><Icon name="check" size={14} /> Export multi-formats (9:16, 1:1, 16:9)</li>
                  <li><Icon name="check" size={14} /> Collaboration jusqu'à 5 membres</li>
                </ul>
                <Link href="/app" className="marketing-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  Démarrer avec Pro
                </Link>
              </div>

              {/* Agency */}
              <div className="pricing-card">
                <div className="pricing-card-header">
                  <h3>Agency</h3>
                  <p className="plan-summary">Pour les agences gérant des dizaines de comptes clients.</p>
                  <div className="price-display">
                    <span className="price-amount">999€</span>
                    <span className="price-cycle">/mois</span>
                  </div>
                </div>
                <ul className="plan-features-list">
                  <li><Icon name="check" size={14} /> <strong>1 500 crédits</strong> mensuels inclus</li>
                  <li><Icon name="check" size={14} /> Multi-workspaces illimités par client</li>
                  <li><Icon name="check" size={14} /> Gestion avancée des brand kits</li>
                  <li><Icon name="check" size={14} /> Support dédié et onboarding prioritaire</li>
                  <li><Icon name="check" size={14} /> Accès API pour génération en volume</li>
                </ul>
                <Link href="/pricing" className="marketing-btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                  Détails & Devis
                </Link>
              </div>
            </div>

            <div className="pricing-bottom-link text-center">
              <Link href="/pricing" className="inline-action-link">
                <span>Voir la grille comparative détaillée des fonctionnalités</span>
                <Icon name="arrow" size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* ================= FAQ SECTION ================= */}
        <section className="marketing-section section-bordered">
          <div className="marketing-container max-w-narrow">
            <div className="section-header text-center">
              <span className="section-eyebrow">QUESTIONS FRÉQUENTES</span>
              <h2 className="section-title">Tout ce que vous devez savoir sur Vidi</h2>
            </div>

            <div className="faq-accordion">
              <details className="faq-item" open>
                <summary className="faq-question">
                  <span>Les vidéos générées sont-elles de vrais fichiers MP4 téléchargeables ?</span>
                  <Icon name="down" size={16} />
                </summary>
                <div className="faq-answer">
                  Oui. Vidi dispose d'un pipeline de rendu natif propulsé par FFmpeg qui assemble
                  vos pistes vidéo, la piste audio de synthèse, les sous-titres incrustés et les
                  transitions en un fichier MP4 encodé en H.264 / AAC standard. Vous pouvez télécharger
                  le fichier et l'importer directement dans TikTok Ads Manager, Meta Ads ou YouTube Shorts.
                </div>
              </details>

              <details className="faq-item">
                <summary className="faq-question">
                  <span>D'où proviennent les avatars et sont-ils libres de droits commerciaux ?</span>
                  <Icon name="down" size={16} />
                </summary>
                <div className="faq-answer">
                  Tous les avatars de notre bibliothèque sont issus de séances d'enregistrement avec
                  des acteurs professionnels majeurs qui ont consenti explicitement à leur numérisation
                  dans le cadre de campagnes publicitaires. Vous disposez des droits commerciaux complets
                  sur toutes les vidéos produites avec votre abonnement.
                </div>
              </details>

              <details className="faq-item">
                <summary className="faq-question">
                  <span>Puis-je modifier le script ou monter la vidéo moi-même ?</span>
                  <Icon name="down" size={16} />
                </summary>
                <div className="faq-answer">
                  Absolument. Vidi n'est pas une simple boîte noire : après la génération automatique
                  du script, vous pouvez retoucher chaque phrase, modifier les sous-titres, changer
                  d'avatar, réajuster la voix et prévisualiser le résultat dans le Studio avant de consommer vos crédits de rendu.
                </div>
              </details>

              <details className="faq-item">
                <summary className="faq-question">
                  <span>Quelles sont les langues prises en charge pour la voix et les sous-titres ?</span>
                  <Icon name="down" size={16} />
                </summary>
                <div className="faq-answer">
                  Vidi prend en charge le français, l'anglais, l'espagnol et l'allemand avec une
                  prosodie naturelle et des intonations adaptées aux formats courts des réseaux sociaux.
                </div>
              </details>

              <details className="faq-item">
                <summary className="faq-question">
                  <span>Combien de temps prend la génération d'une vidéo complète ?</span>
                  <Icon name="down" size={16} />
                </summary>
                <div className="faq-answer">
                  La génération de script prend entre 3 et 8 secondes. La synthèse vocale prend environ
                  5 secondes. Le rendu vidéo final dépend de la durée et de la résolution choisie (en moyenne
                  de 45 à 90 secondes pour une vidéo 1080p de 30 secondes).
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* ================= FINAL CTA BANNER ================= */}
        <section className="marketing-final-cta-section">
          <div className="marketing-container">
            <div className="final-cta-card">
              <div className="final-cta-glow" />
              <div className="final-cta-content">
                <span className="section-eyebrow">PRÊT À ACCÉLÉRER ?</span>
                <h2>Commencez à créer vos publicités vidéo UGC dès aujourd'hui</h2>
                <p>
                  Rejoignez les e-commerçants et les agences qui produisent leurs déclinaisons
                  publicitaires avec Vidi. Testez le Studio sans engagement.
                </p>
                <div className="hero-cta-group" style={{ justifyContent: 'center' }}>
                  <Link href="/app" className="marketing-btn-primary hero-btn-lg">
                    <Icon name="wand" size={18} />
                    <span>Ouvrir le Studio Vidi</span>
                  </Link>
                  <Link href="/contact" className="marketing-btn-ghost hero-btn-lg">
                    <span>Parler à un conseiller</span>
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
