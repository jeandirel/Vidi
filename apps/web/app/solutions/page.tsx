import type { Metadata } from 'next';
import Link from 'next/link';
import MarketingNav from '@/components/marketing/marketing-nav';
import MarketingFooter from '@/components/marketing/marketing-footer';
import Icon from '@/components/icon';

export const metadata: Metadata = {
  title: 'Solutions — Vidi pour E-Commerce, Agences et Créateurs',
  description:
    'Découvrez comment Vidi s’adapte à votre modèle : marques DTC, agences d’acquisition média, créateurs de contenu et boutiques multi-catalogues.',
};

export default function SolutionsPage() {
  return (
    <div className="marketing-page-wrapper">
      <MarketingNav />

      <main id="main-content" className="marketing-inner-page">
        {/* Header */}
        <section className="inner-hero-section">
          <div className="marketing-container text-center">
            <span className="section-eyebrow">CAS D'USAGE & SOLUTIONS MÉTIER</span>
            <h1 className="inner-hero-title">
              Une solution taillée <span className="gradient-text">pour vos objectifs de croissance</span>
            </h1>
            <p className="inner-hero-desc">
              Que vous gériez une boutique unique ou un portefeuille de marques internationales,
              Vidi s’intègre dans votre chaîne de création.
            </p>
          </div>
        </section>

        {/* Solution 1: E-Commerce & DTC */}
        <section id="ecommerce" className="marketing-section section-bordered">
          <div className="marketing-container">
            <div className="feature-showcase-row">
              <div className="feature-text-side">
                <span className="feature-pill">MARQUES DTC & BOUTIQUES E-COMMERCE</span>
                <h2>Multipliez vos créas publicitaires sans exploser vos coûts de tournage</h2>
                <p>
                  Le secret de la rentabilité sur TikTok Ads et Meta en 2026 est le renouvellement créatif
                  hebdomadaire. Vidi vous permet de tester 10 variations publicitaires au lieu d'une seule.
                </p>
                <ul className="feature-bullets">
                  <li>
                    <Icon name="check" size={16} />
                    <span><strong>Synchronisation catalogue :</strong> Importez directement depuis Shopify ou WooCommerce.</span>
                  </li>
                  <li>
                    <Icon name="check" size={16} />
                    <span><strong>Angles marketing infinis :</strong> Testez des approches problème/solution, démos et comparatifs.</span>
                  </li>
                  <li>
                    <Icon name="check" size={16} />
                    <span><strong>Maîtrise du budget :</strong> Divisez par 10 le coût de production unitaire par vidéo.</span>
                  </li>
                </ul>
                <div className="feature-actions">
                  <Link href="/app" className="marketing-btn-primary">
                    <span>Créer des vidéos pour ma boutique</span>
                    <Icon name="arrow" size={14} />
                  </Link>
                </div>
              </div>

              <div className="feature-visual-side">
                <div className="solution-stats-card">
                  <div className="solution-metric">
                    <strong>10x</strong>
                    <span>Plus de déclinaisons créatives par semaine</span>
                  </div>
                  <div className="solution-metric">
                    <strong>&lt; 5 min</strong>
                    <span>Du lien produit au fichier MP4 exporté</span>
                  </div>
                  <div className="solution-metric">
                    <strong>0€</strong>
                    <span>Frais de logistique d'envoi de colis aux créateurs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Solution 2: Agencies */}
        <section id="agencies" className="marketing-section section-bordered bg-elevated">
          <div className="marketing-container">
            <div className="feature-showcase-row reverse">
              <div className="feature-text-side">
                <span className="feature-pill">AGENCES MÉDIA & MEDIA BUYERS</span>
                <h2>Alimentez les campagnes de vos clients en continu avec des espaces isolés</h2>
                <p>
                  Vos media buyers ont besoin de variations constantes pour combattre la fatigue
                  publicitaire et maintenir un ROAS stable. Vidi devient leur allié créatif quotidien.
                </p>
                <ul className="feature-bullets">
                  <li>
                    <Icon name="check" size={16} />
                    <span><strong>Multi-Workspaces :</strong> Isolez chaque compte client avec sa propre identité et ses crédits.</span>
                  </li>
                  <li>
                    <Icon name="check" size={16} />
                    <span><strong>Brand Kits permanents :</strong> Logos, palettes de couleurs et directives publicitaires verrouillées.</span>
                  </li>
                  <li>
                    <Icon name="check" size={16} />
                    <span><strong>Export en volume :</strong> Génération par lots et intégration API disponible.</span>
                  </li>
                </ul>
                <div className="feature-actions">
                  <Link href="/pricing" className="marketing-btn-secondary">
                    <span>Découvrir l'offre Agency</span>
                    <Icon name="arrow" size={14} />
                  </Link>
                </div>
              </div>

              <div className="feature-visual-side">
                <div className="agency-workspace-mockup">
                  <div className="workspace-pill-item">
                    <span className="workspace-dot" />
                    <strong>Client A — Cosmétique Paris</strong>
                    <small>42 vidéos générées</small>
                  </div>
                  <div className="workspace-pill-item">
                    <span className="workspace-dot" />
                    <strong>Client B — Tech Accessories</strong>
                    <small>28 vidéos générées</small>
                  </div>
                  <div className="workspace-pill-item">
                    <span className="workspace-dot" />
                    <strong>Client C — Vêtements Fitness</strong>
                    <small>19 vidéos générées</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Solution 3: Dropshipping & Fast Testing */}
        <section id="dropshipping" className="marketing-section section-bordered">
          <div className="marketing-container">
            <div className="feature-showcase-row">
              <div className="feature-text-side">
                <span className="feature-pill">DROPSHIPPING & PRODUITS VIRAUX</span>
                <h2>Validez le potentiel d'un produit avant d'engager du stock</h2>
                <p>
                  Ne commandez plus de prototypes coûteux pour des produits dont vous n'êtes pas certain
                  du taux de conversion. Produisez des annonces percutantes en quelques minutes.
                </p>
                <ul className="feature-bullets">
                  <li>
                    <Icon name="check" size={16} />
                    <span><strong>Vitesse d'exécution :</strong> Réagissez aux tendances TikTok en temps réel.</span>
                  </li>
                  <li>
                    <Icon name="check" size={16} />
                    <span><strong>Sous-titres percutants :</strong> Captez l'attention dès la première seconde.</span>
                  </li>
                  <li>
                    <Icon name="check" size={16} />
                    <span><strong>Export MP4 universel :</strong> Compatible avec toutes les régies publicitaires.</span>
                  </li>
                </ul>
              </div>

              <div className="feature-visual-side">
                <div className="fast-test-card">
                  <div className="test-badge">ACCÉLÉRATEUR DE TESTS</div>
                  <h4>Workflow Express :</h4>
                  <ol className="test-steps-list">
                    <li>Copiez-collez l'URL ou la fiche produit</li>
                    <li>Générez 3 scripts avec angles distincts</li>
                    <li>Exportez 3 vidéos MP4 9:16 avec avatars différents</li>
                    <li>Lancez votre test publicitaire le jour même</li>
                  </ol>
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
