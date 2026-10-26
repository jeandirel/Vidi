'use client';

import { useState } from 'react';
import MarketingNav from '@/components/marketing/marketing-nav';
import MarketingFooter from '@/components/marketing/marketing-footer';
import Icon from '@/components/icon';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [category, setCategory] = useState<
    'general' | 'sales' | 'support' | 'partnership' | 'custom_models'
  >('general');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          company: company.trim(),
          category,
          message: message.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Impossible d envoyer votre message.');
      }

      setSuccess(data.message || 'Votre message a bien été envoyé.');
      setName('');
      setEmail('');
      setCompany('');
      setMessage('');
    } catch (err) {
      setError((err as Error).message || 'Une erreur est survenue lors de l envoi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="marketing-page-wrapper">
      <MarketingNav />

      <main id="main-content" className="marketing-inner-page">
        <section className="inner-hero-section">
          <div className="marketing-container text-center">
            <span className="section-eyebrow">CONTACT & SUPPORT</span>
            <h1 className="inner-hero-title">
              Échangez avec l’équipe <span className="gradient-text">Vidi</span>
            </h1>
            <p className="inner-hero-desc">
              Une question technique, une demande de démonstration personnalisée ou un projet
              d'avatar sur mesure ? Nous vous répondons sous 24h ouvrées.
            </p>
          </div>
        </section>

        <section className="marketing-section">
          <div className="marketing-container max-w-narrow">
            <div className="contact-card-glass">
              {success ? (
                <div className="contact-success-state">
                  <div className="success-icon-badge">
                    <Icon name="check" size={28} />
                  </div>
                  <h3>Message bien transmis</h3>
                  <p>{success}</p>
                  <button
                    type="button"
                    className="marketing-btn-secondary"
                    onClick={() => setSuccess(null)}
                    style={{ marginTop: '1.5rem' }}
                  >
                    Envoyer un autre message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="contact-form-layout">
                  <div className="form-row-2">
                    <div className="field-group">
                      <label htmlFor="contact-name">Nom et prénom *</label>
                      <input
                        id="contact-name"
                        type="text"
                        required
                        minLength={2}
                        maxLength={80}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Alexandre Dubois"
                      />
                    </div>

                    <div className="field-group">
                      <label htmlFor="contact-email">Email professionnel *</label>
                      <input
                        id="contact-email"
                        type="email"
                        required
                        maxLength={254}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alexandre@votremarque.com"
                      />
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div className="field-group">
                      <label htmlFor="contact-company">Entreprise / Marque (optionnel)</label>
                      <input
                        id="contact-company"
                        type="text"
                        maxLength={100}
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Nom de votre entreprise"
                      />
                    </div>

                    <div className="field-group">
                      <label htmlFor="contact-category">Objet de votre demande</label>
                      <select
                        id="contact-category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as typeof category)}
                      >
                        <option value="general">Renseignement général</option>
                        <option value="sales">Devis grand compte / Offre Agency</option>
                        <option value="custom_models">Avatar IA sur mesure (égérie dédiée)</option>
                        <option value="partnership">Partenariat & Intégration</option>
                        <option value="support">Support technique</option>
                      </select>
                    </div>
                  </div>

                  <div className="field-group">
                    <label htmlFor="contact-message">Votre message *</label>
                    <textarea
                      id="contact-message"
                      rows={5}
                      required
                      minLength={10}
                      maxLength={2000}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Expliquez-nous vos besoins, vos volumes de production ou vos questions..."
                    />
                  </div>

                  {error && <div className="form-error-banner">{error}</div>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="marketing-btn-primary hero-btn-lg"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-dot" />
                        <span>Envoi de votre message en cours...</span>
                      </>
                    ) : (
                      <>
                        <Icon name="arrow" size={16} />
                        <span>Envoyer le message</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            <div className="contact-info-grid">
              <div className="info-box">
                <Icon name="check" size={18} />
                <div>
                  <strong>Temps de réponse garanti</strong>
                  <small>Moins de 24h ouvrées</small>
                </div>
              </div>
              <div className="info-box">
                <Icon name="cloud" size={18} />
                <div>
                  <strong>Sécurité & Confidentialité</strong>
                  <small>Vos données ne sont jamais cédées</small>
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
