'use client';

import { useState } from 'react';
import Link from 'next/link';
import MarketingNav from '@/components/marketing/marketing-nav';
import MarketingFooter from '@/components/marketing/marketing-footer';
import Icon from '@/components/icon';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const plansData = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Pour lancer vos premiers tests UGC et valider vos hooks rentables.',
      monthlyPrice: 99,
      annualPrice: 79,
      credits: 15,
      maxResolution: '720p HD',
      workspaces: '1 espace de travail',
      features: [
        '15 crédits de rendu mensuels',
        'Résolution jusqu’à 720p HD',
        'Accès à tous les avatars du catalogue',
        'Générateur de scripts AIDA & PAS',
        'Sous-titres mot-à-mot dynamiques',
        'Connecteurs Shopify & WooCommerce',
        'Support par email en semaine',
      ],
      ctaText: 'Commencer en Starter',
      featured: false,
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'Pour les e-commerçants actifs et marques DTC à fort volume.',
      monthlyPrice: 299,
      annualPrice: 239,
      credits: 60,
      maxResolution: '1080p Full HD',
      workspaces: '3 espaces de travail',
      features: [
        '60 crédits de rendu mensuels',
        'Résolution jusqu’à 1080p Full HD',
        'Rendu prioritaire sur GPU haute performance',
        'Laboratoire de campagnes & tests A/B',
        'Brief de marque permanent & preuves vérifiées',
        'Export formats 9:16, 1:1 et 16:9',
        '3 espaces de travail inclus',
        'Support prioritaire sous 12h',
      ],
      ctaText: 'Choisir l’offre Pro',
      featured: true,
    },
    {
      id: 'agency',
      name: 'Agency',
      description: 'Pour les agences média et structures multi-marques.',
      monthlyPrice: 999,
      annualPrice: 799,
      credits: 250,
      maxResolution: '4K Ultra HD',
      workspaces: '20 espaces clients dédiés',
      features: [
        '250 crédits de rendu mensuels',
        'Résolution maximale 4K Ultra HD',
        'Jusqu’à 20 espaces clients isolés',
        'Kit de marque personnalisé par client',
        'File d’attente VIP garantie sans latence',
        'Accès API pour automatisation de catalogue',
        'Account manager dédié & onboarding personnalisé',
      ],
      ctaText: 'Choisir l’offre Agency',
      featured: false,
    },
  ];

  return (
    <div className="marketing-page-wrapper">
      <MarketingNav />

      <main id="main-content" className="marketing-inner-page">
        {/* Header */}
        <section className="inner-hero-section">
          <div className="marketing-container text-center">
            <span className="section-eyebrow">TARIFICATION SIMPLE & TRANSPARENTE</span>
            <h1 className="inner-hero-title">
              Des forfaits clairs, <span className="gradient-text">sans frais cachés</span>
            </h1>
            <p className="inner-hero-desc">
              Chaque plan inclut un quota de crédits mensuels. 1 crédit = 15 secondes de vidéo en 720p.
              Passez à l’annuel pour économiser 20% sur votre abonnement.
            </p>

            {/* Billing cycle toggle */}
            <div className="billing-cycle-toggle-wrapper">
              <div className="billing-toggle-pill">
                <button
                  type="button"
                  className={`toggle-option ${billingCycle === 'monthly' ? 'active' : ''}`}
                  onClick={() => setBillingCycle('monthly')}
                >
                  Mensuel
                </button>
                <button
                  type="button"
                  className={`toggle-option ${billingCycle === 'annual' ? 'active' : ''}`}
                  onClick={() => setBillingCycle('annual')}
                >
                  Annuel <span className="discount-tag">-20%</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="marketing-section">
          <div className="marketing-container">
            <div className="pricing-cards-grid">
              {plansData.map((plan) => {
                const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
                return (
                  <div
                    key={plan.id}
                    className={`pricing-card ${plan.featured ? 'featured-plan' : ''}`}
                  >
                    {plan.featured && (
                      <div className="featured-badge">PLUS POPULAIRE</div>
                    )}
                    <div className="pricing-card-header">
                      <h3>{plan.name}</h3>
                      <p className="plan-summary">{plan.description}</p>
                      <div className="price-display">
                        <span className="price-amount">{price}€</span>
                        <span className="price-cycle">
                          /mois {billingCycle === 'annual' ? '(facturé annuellement)' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="plan-credits-callout">
                      <strong>{plan.credits} crédits</strong> inclus par mois
                    </div>

                    <ul className="plan-features-list">
                      {plan.features.map((feat, i) => (
                        <li key={i}>
                          <Icon name="check" size={14} />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/app"
                      className={plan.featured ? 'marketing-btn-primary' : 'marketing-btn-secondary'}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <span>{plan.ctaText}</span>
                      <Icon name="arrow" size={14} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Comparison Matrix */}
        <section className="marketing-section section-bordered bg-elevated">
          <div className="marketing-container">
            <div className="section-header text-center">
              <span className="section-eyebrow">GRILLE COMPARATIVE</span>
              <h2 className="section-title">Comparatif détaillé des fonctionnalités</h2>
            </div>

            <div className="comparison-table-wrapper">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Fonctionnalité</th>
                    <th>Starter</th>
                    <th className="highlight-col">Pro</th>
                    <th>Agency</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Crédits de rendu inclus</td>
                    <td>15 / mois</td>
                    <td className="highlight-col">60 / mois</td>
                    <td>250 / mois</td>
                  </tr>
                  <tr>
                    <td>Résolution maximale</td>
                    <td>720p HD</td>
                    <td className="highlight-col">1080p Full HD</td>
                    <td>4K Ultra HD</td>
                  </tr>
                  <tr>
                    <td>Espaces de travail (Workspaces)</td>
                    <td>1</td>
                    <td className="highlight-col">3</td>
                    <td>20</td>
                  </tr>
                  <tr>
                    <td>Générateur de scripts IA</td>
                    <td>Standard</td>
                    <td className="highlight-col">Avancé A/B</td>
                    <td>Illimité + API</td>
                  </tr>
                  <tr>
                    <td>Sous-titres mot-à-mot animés</td>
                    <td>Inclus</td>
                    <td className="highlight-col">Inclus</td>
                    <td>Inclus</td>
                  </tr>
                  <tr>
                    <td>Laboratoire de campagnes</td>
                    <td>Lecture</td>
                    <td className="highlight-col">Complet (Brief + A/B)</td>
                    <td>Complet + Multi-comptes</td>
                  </tr>
                  <tr>
                    <td>Connecteur Shopify & WooCommerce</td>
                    <td>1 boutique</td>
                    <td className="highlight-col">3 boutiques</td>
                    <td>Illimité</td>
                  </tr>
                  <tr>
                    <td>Watermark Vidi</td>
                    <td>Sans watermark</td>
                    <td className="highlight-col">Sans watermark</td>
                    <td>Sans watermark</td>
                  </tr>
                  <tr>
                    <td>Support technique</td>
                    <td>Email (24-48h)</td>
                    <td className="highlight-col">Email prioritaire (12h)</td>
                    <td>Account Manager dédié</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Additional Credits & Billing FAQ */}
        <section className="marketing-section section-bordered">
          <div className="marketing-container max-w-narrow">
            <div className="section-header text-center">
              <span className="section-eyebrow">QUESTIONS SUR LA FACTURATION</span>
              <h2 className="section-title">Paiement, abonnements et crédits</h2>
            </div>

            <div className="faq-accordion">
              <details className="faq-item" open>
                <summary className="faq-question">
                  <span>Que se passe-t-il si j'ai besoin de crédits supplémentaires ?</span>
                  <Icon name="down" size={16} />
                </summary>
                <div className="faq-answer">
                  Vous pouvez recharger votre solde de crédits à tout moment depuis votre tableau de
                  bord sans changer de forfait d'abonnement. Les recharges n'expirent pas tant que votre compte reste actif.
                </div>
              </details>

              <details className="faq-item">
                <summary className="faq-question">
                  <span>Puis-je annuler ou changer de formule à tout moment ?</span>
                  <Icon name="down" size={16} />
                </summary>
                <div className="faq-answer">
                  Oui, sans aucun engagement de durée pour les forfaits mensuels. Vous pouvez upgrader,
                  downgrader ou résilier directement via le portail client Stripe accessible dans vos paramètres.
                </div>
              </details>

              <details className="faq-item">
                <summary className="faq-question">
                  <span>Comment fonctionne la déduction des crédits lors d'un rendu ?</span>
                  <Icon name="down" size={16} />
                </summary>
                <div className="faq-answer">
                  Les crédits sont réservés de manière atomique et idempotente au lancement du rendu.
                  Si un rendu échoue pour une raison technique, vos crédits sont automatiquement recrédités.
                </div>
              </details>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
