import type { Metadata } from 'next';
import Link from 'next/link';
import MarketingNav from '@/components/marketing/marketing-nav';
import MarketingFooter from '@/components/marketing/marketing-footer';
import Icon from '@/components/icon';

export const metadata: Metadata = {
  title: 'Fonctionnalités — Vidi Studio UGC IA',
  description:
    'Découvrez les fonctionnalités complètes de Vidi : scriptwriting IA, avatars photoréalistes, voix naturelles, timeline multi-pistes et laboratoire de campagnes.',
};

export default function FeaturesPage() {
  return (
    <div className="marketing-page-wrapper">
      <MarketingNav />

      <main id="main-content" className="marketing-inner-page">
        {/* Header */}
        <section className="inner-hero-section">
          <div className="marketing-container text-center">
            <span className="section-eyebrow">FONCTIONNALITÉS COMPLÈTES</span>
            <h1 className="inner-hero-title">
              Une suite complète d'outils <span className="gradient-text">taillée pour la conversion</span>
            </h1>
            <p className="inner-hero-desc">
              Chaque brique de Vidi est optimisée pour accélérer votre production publicitaire sans
              sacrifier la qualité ni la crédibilité de votre marque.
            </p>
          </div>
        </section>

        {/* Feature 1: Scriptwriting */}
        <section className="marketing-section section-bordered">
          <div className="marketing-container">
            <div className="feature-showcase-row">
              <div className="feature-text-side">
                <span className="feature-pill">MOTEUR DE SCRIPTS UGC</span>
                <h2>Des hooks qui arrêtent le scroll et des structures qui vendent</h2>
                <p>
                  Ne perdez plus des heures devant une feuille blanche. Vidi analyse votre produit et
                  génère des scénarios basés sur les meilleures techniques de copywriting direct.
                </p>
                <ul className="feature-bullets">
                  <li>
                    <Icon name="check" size={16} />
                    <span><strong>Structures éprouvées :</strong> AIDA, PAS, Témoignage, Démonstration et Tutoriel.</span>
                  </li>
                  <li>
                    <Icon name="check" size={16} />
                    <span><strong>Durées adaptées :</strong> 6s (Bumper), 15s (Hook), 30s (Classique), 60s et 90s.</span>
                  </li>
                  <li>
                    <Icon name="check" size={16} />
                    <span><strong>Angles A/B :</strong> Générez 3 variantes d'angles publicitaires à partir d'un seul produit.</span>
                  </li>
                  <li>
                    <Icon name="check" size={16} />
                    <span><strong>Zéro invention :</strong> Respect absolu des bénéfices et caractéristiques réelles du produit.</span>
                  </li>
                </ul>
                <div className="feature-actions">
                  <Link href="/app" className="marketing-btn-primary">
                    <span>Tester le générateur de scripts</span>
                    <Icon name="arrow" size={14} />
                  </Link>
                </div>
              </div>
              <div className="feature-visual-side">
                <div className="feature-card-glass">
                  <div className="code-header">
                    <span className="dot red" />
                    <span className="dot yellow" />
                    <span className="dot green" />
                    <span className="title">Script Publicitaire — Structure PAS</span>
                  </div>
                  <div className="script-preview-lines">
                    <p className="line hook"><span className="label">HOOK</span> "Vous perdez encore 20 minutes chaque matin sur votre routine ?"</p>
                    <p className="line problem"><span className="label">PROBLÈME</span> "La plupart des crèmes s'évaporent avant même d'agir."</p>
                    <p className="line solution"><span className="label">SOLUTION</span> "Voici le premier sérum micro-encapsulé qui hydrate pendant 24h chrono."</p>
                    <p className="line cta"><span className="label">CTA</span> "Profitez des 100 derniers coffrets avec le lien ci-dessous."</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature 2: Avatars & Lip Sync */}
        <section className="marketing-section section-bordered bg-elevated">
          <div className="marketing-container">
            <div className="feature-showcase-row reverse">
              <div className="feature-text-side">
                <span className="feature-pill">AVATARS IA & SYNCHRONISATION</span>
                <h2>Des visages humains crédibles, diversifiés et consentants</h2>
                <p>
                  Fini les robots inexpressifs. Nos avatars sont basés sur des prises de vue réelles
                  d'acteurs adultes qui ont formellement concédé leurs droits pour des créations publicitaires.
                </p>
                <ul className="feature-bullets">
                  <li>
                    <Icon name="check" size={16} />
                    <span><strong>Synchronisation labiale phonème par phonème :</strong> Les lèvres bougent en accord parfait avec l'audio.</span>
                  </li>
                  <li>
                    <Icon name="check" size={16} />
                    <span><strong>Diversité de profils :</strong> Variété d'âges, de styles vestimentaires et de tons de voix.</span>
                  </li>
                  <li>
                    <Icon name="check" size={16} />
                    <span><strong>Prévisualisation instantanée :</strong> Testez l'avatar avec votre script avant de lancer le rendu définitif.</span>
                  </li>
                  <li>
                    <Icon name="check" size={16} />
                    <span><strong>Conformité légale :</strong> Utilisation commerciale 100% sécurisée sans risque de litige d'image.</span>
                  </li>
                </ul>
                <div className="feature-actions">
                  <Link href="/ai-avatars" className="marketing-btn-secondary">
                    <span>Découvrir tous les avatars</span>
                    <Icon name="arrow" size={14} />
                  </Link>
                </div>
              </div>
              <div className="feature-visual-side">
                <div className="avatars-showcase-grid">
                  <div className="showcase-avatar-card">
                    <div className="avatar-image-box" style={{ backgroundImage: "url('/portraits/lea.jpg')" }}>
                      <span className="avatar-tag">Léa • Lifestyle</span>
                    </div>
                  </div>
                  <div className="showcase-avatar-card">
                    <div className="avatar-image-box" style={{ backgroundImage: "url('/portraits/marcus.jpg')" }}>
                      <span className="avatar-tag">Marcus • Quotidien</span>
                    </div>
                  </div>
                  <div className="showcase-avatar-card">
                    <div className="avatar-image-box" style={{ backgroundImage: "url('/portraits/maya.jpg')" }}>
                      <span className="avatar-tag">Maya • Studio</span>
                    </div>
                  </div>
                  <div className="showcase-avatar-card">
                    <div className="avatar-image-box" style={{ backgroundImage: "url('/portraits/ines.jpg')" }}>
                      <span className="avatar-tag">Inès • Beauté</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature 3: Voice Studio */}
        <section className="marketing-section section-bordered">
          <div className="marketing-container">
            <div className="feature-showcase-row">
              <div className="feature-text-side">
                <span className="feature-pill">SYNTHÈSE VOCALE AVANCÉE</span>
                <h2>Des voix chaleureuses avec intonations UGC naturelles</h2>
                <p>
                  Une publicité vidéo réussit ou échoue sur le ton de la voix. Vidi intègre des
                  modèles de Text-to-Speech calibrés pour les codes oraux des réseaux sociaux.
                </p>
                <ul className="feature-bullets">
                  <li>
                    <Icon name="check" size={16} />
                    <span><strong>Multiples langues & accents :</strong> Français naturel, Anglais US/UK, Espagnol et Allemand.</span>
                  </li>
                  <li>
                    <Icon name="check" size={16} />
                    <span><strong>Rythme & respiration réalistes :</strong> Pauses calibrées sur la ponctuation et le souffle.</span>
                  </li>
                  <li>
                    <Icon name="check" size={16} />
                    <span><strong>Prévisualisation audio directe :</strong> Écoutez chaque réplique avant de valider votre projet.</span>
                  </li>
                </ul>
              </div>
              <div className="feature-visual-side">
                <div className="voice-cards-stack">
                  <div className="voice-item-card">
                    <div className="voice-wave-anim">
                      <span /><span /><span /><span /><span />
                    </div>
                    <div className="voice-info">
                      <strong>Claire</strong>
                      <small>Français • Chaleureuse et engageante</small>
                    </div>
                    <span className="voice-badge-pill">UGC Féminin</span>
                  </div>

                  <div className="voice-item-card">
                    <div className="voice-wave-anim active">
                      <span /><span /><span /><span /><span />
                    </div>
                    <div className="voice-info">
                      <strong>Noah</strong>
                      <small>Français • Posé et convaincant</small>
                    </div>
                    <span className="voice-badge-pill">UGC Masculin</span>
                  </div>

                  <div className="voice-item-card">
                    <div className="voice-wave-anim">
                      <span /><span /><span /><span /><span />
                    </div>
                    <div className="voice-info">
                      <strong>Amina</strong>
                      <small>Français • Dynamique et percutante</small>
                    </div>
                    <span className="voice-badge-pill">Énergie High</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature 4: Multi-Track Timeline & Subtitles */}
        <section className="marketing-section section-bordered bg-elevated">
          <div className="marketing-container">
            <div className="feature-showcase-row reverse">
              <div className="feature-text-side">
                <span className="feature-pill">MONTAGE & RENDU MP4</span>
                <h2>Éditeur vidéo multi-pistes et sous-titres animés</h2>
                <p>
                  Prenez le contrôle total de votre montage vidéo. Ajustez vos médias sur plusieurs
                  pistes indépendantes et exportez un MP4 fidèle à votre création.
                </p>
                <ul className="feature-bullets">
                  <li>
                    <Icon name="check" size={16} />
                    <span><strong>Pistes séparées :</strong> Avatar face-caméra, B-rolls produit, piste vocale et musique de fond.</span>
                  </li>
                  <li>
                    <Icon name="check" size={16} />
                    <span><strong>Sous-titres mot-à-mot :</strong> Synchronisation temporelle exacte avec coloration du mot clé en cours.</span>
                  </li>
                  <li>
                    <Icon name="check" size={16} />
                    <span><strong>Export MP4 H.264 :</strong> Rendu FFmpeg optimisé pour les plateformes TikTok, Instagram et YouTube.</span>
                  </li>
                  <li>
                    <Icon name="check" size={16} />
                    <span><strong>Formats multiples :</strong> 9:16 vertical, 1:1 carré, 16:9 horizontal.</span>
                  </li>
                </ul>
                <div className="feature-actions">
                  <Link href="/ai-video-generator" className="marketing-btn-primary">
                    <span>En savoir plus sur le moteur vidéo</span>
                    <Icon name="arrow" size={14} />
                  </Link>
                </div>
              </div>
              <div className="feature-visual-side">
                <div className="timeline-mockup-card">
                  <div className="timeline-header">
                    <span>Timeline Multi-Pistes — 00:30.00</span>
                    <span className="status-live">Prêt pour encodage</span>
                  </div>
                  <div className="tracks-container">
                    <div className="track-row">
                      <div className="track-head">Avatar</div>
                      <div className="track-body"><div className="clip clip-avatar">Face-Caméra (Léa)</div></div>
                    </div>
                    <div className="track-row">
                      <div className="track-head">B-Roll</div>
                      <div className="track-body"><div className="clip clip-broll">Plan Rapproche Flacon (0:08 - 0:18)</div></div>
                    </div>
                    <div className="track-row">
                      <div className="track-head">Sous-titres</div>
                      <div className="track-body"><div className="clip clip-subs">Mots animés (style punchy)</div></div>
                    </div>
                    <div className="track-row">
                      <div className="track-head">Audio</div>
                      <div className="track-body"><div className="clip clip-audio">Voix Claire + Fond musical (-18dB)</div></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature 5: Campaign Lab & Connectors */}
        <section id="connectors" className="marketing-section">
          <div className="marketing-container">
            <div className="section-header text-center">
              <span className="section-eyebrow">AUTOMATISATION & ÉCOSYSTÈME</span>
              <h2 className="section-title">Connecté à votre boutique et vos flux de travail</h2>
              <p className="section-subtitle">
                Gagnez du temps en synchronisant vos produits et en organisant vos campagnes publicitaires.
              </p>
            </div>

            <div className="grid-3-cols">
              <div className="feature-box">
                <div className="feature-box-icon"><Icon name="link" size={24} /></div>
                <h3>Connecteur Shopify</h3>
                <p>
                  Importez vos fiches produits Shopify, titres, descriptions, prix et images en un seul
                  clic sans saisie manuelle.
                </p>
              </div>

              <div className="feature-box">
                <div className="feature-box-icon"><Icon name="layers" size={24} /></div>
                <h3>Connecteur WooCommerce</h3>
                <p>
                  Connectez votre catalogue WordPress WooCommerce pour générer des vidéos sur l'ensemble
                  de vos références produits.
                </p>
              </div>

              <div className="feature-box">
                <div className="feature-box-icon"><Icon name="sliders" size={24} /></div>
                <h3>Laboratoire de Campagnes</h3>
                <p>
                  Définissez un brief de marque persistant, enregistrez vos preuves scientifiques et
                  suivez vos variantes A/B avec métriques réelles.
                </p>
              </div>
            </div>

            <div className="cta-centered-row">
              <Link href="/app" className="marketing-btn-primary hero-btn-lg">
                <Icon name="wand" size={18} />
                <span>Découvrir le Studio Vidi</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
