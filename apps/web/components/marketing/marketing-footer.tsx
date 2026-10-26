import Link from 'next/link';

export default function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <div className="marketing-footer-top">
        <div className="marketing-footer-col brand-col">
          <Link href="/" className="marketing-brand" aria-label="Vidi — Accueil">
            <span className="brand-symbol">
              <span />
              <span />
            </span>
            <span className="brand-name">
              vidi<span>®</span>
            </span>
          </Link>
          <p className="marketing-footer-desc">
            Plateforme IA de référence pour la création automatisée de publicités vidéo UGC.
            De l'import produit au rendu MP4 haute fidélité pour TikTok, Meta Ads et YouTube.
          </p>
          <div className="status-indicator-badge">
            <span className="status-dot-pulse" />
            <span>Moteur média opérationnel — Rendu MP4 H.264</span>
          </div>
        </div>

        <div className="marketing-footer-col">
          <h4>Produit</h4>
          <ul>
            <li><Link href="/app">Studio de création</Link></li>
            <li><Link href="/features">Fonctionnalités complètes</Link></li>
            <li><Link href="/ai-avatars">Avatars IA photoréalistes</Link></li>
            <li><Link href="/ai-video-generator">Moteur de rendu vidéo</Link></li>
            <li><Link href="/pricing">Tarifs & Crédits</Link></li>
            <li><Link href="/examples">Galerie de créations</Link></li>
          </ul>
        </div>

        <div className="marketing-footer-col">
          <h4>Solutions</h4>
          <ul>
            <li><Link href="/solutions#ecommerce">E-Commerce & DTC</Link></li>
            <li><Link href="/solutions#agencies">Agences Média & Growth</Link></li>
            <li><Link href="/solutions#creators">Créateurs & Affiliés</Link></li>
            <li><Link href="/solutions#dropshipping">Boutiques multi-catalogues</Link></li>
            <li><Link href="/features#connectors">Connecteurs Shopify & WooCommerce</Link></li>
          </ul>
        </div>

        <div className="marketing-footer-col">
          <h4>Éthique & Sécurité</h4>
          <ul>
            <li><Link href="/contact">Support & Contact</Link></li>
            <li><span className="footer-label-badge">Acteurs 100% consentants</span></li>
            <li><span className="footer-label-badge">Conformité RGPD / Privacy</span></li>
            <li><span className="footer-label-badge">Sous-titres mot-à-mot</span></li>
            <li><span className="footer-label-badge">Pas de faux avis inventés</span></li>
          </ul>
        </div>
      </div>

      <div className="marketing-footer-bottom">
        <div className="marketing-footer-copy">
          © {new Date().getFullYear()} VIDI Technologies SAS. Tous droits réservés.
        </div>
        <div className="marketing-footer-legal-links">
          <Link href="/solutions">Solutions</Link>
          <Link href="/pricing">Tarifs</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/login">Espace Client</Link>
        </div>
      </div>
    </footer>
  );
}
