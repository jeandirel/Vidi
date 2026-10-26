'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '../icon';

const navItems = [
  { href: '/features', label: 'Fonctionnalités' },
  { href: '/ai-avatars', label: 'Avatars IA' },
  { href: '/ai-video-generator', label: 'Générateur Vidéo' },
  { href: '/pricing', label: 'Tarifs' },
  { href: '/examples', label: 'Exemples' },
  { href: '/solutions', label: 'Solutions' },
  { href: '/contact', label: 'Contact' },
];

export default function MarketingNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="marketing-header">
      <div className="marketing-nav-container">
        <Link href="/" className="marketing-brand" aria-label="Vidi — Accueil">
          <span className="brand-symbol">
            <span />
            <span />
          </span>
          <span className="brand-name">
            vidi<span>®</span>
          </span>
          <span className="brand-badge">IA UGC</span>
        </Link>

        {/* Desktop navigation */}
        <nav className="marketing-nav-links" aria-label="Navigation principale">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`marketing-nav-link ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="marketing-nav-actions">
          <Link href="/login" className="marketing-btn-ghost">
            Connexion
          </Link>
          <Link href="/app" className="marketing-btn-primary">
            <span>Ouvrir le Studio</span>
            <Icon name="arrow" size={14} />
          </Link>

          {/* Mobile hamburger toggle */}
          <button
            type="button"
            className="marketing-mobile-toggle"
            aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Icon name={mobileMenuOpen ? 'close' : 'sliders'} size={20} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="marketing-mobile-drawer">
          <nav className="marketing-mobile-nav" aria-label="Navigation mobile">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="marketing-mobile-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="marketing-mobile-divider" />
            <Link
              href="/login"
              className="marketing-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Connexion
            </Link>
            <Link
              href="/app"
              className="marketing-btn-primary"
              style={{ justifyContent: 'center', marginTop: '0.75rem' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>Lancer le Studio</span>
              <Icon name="arrow" size={14} />
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
