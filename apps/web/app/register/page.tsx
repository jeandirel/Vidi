'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/icon';
import GoogleSignInButton from '@/components/google-sign-in-button';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('oauth_error');
    if (oauthError) {
      setError(oauthError);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 12) {
      setError('Le mot de passe doit comporter au moins 12 caractères pour la sécurité de votre compte.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Impossible de créer ce compte.');
      }

      // Successful registration creates session and default workspace -> redirect to studio
      router.push('/app');
      router.refresh();
    } catch (err) {
      setError((err as Error).message || 'Erreur lors de l inscription.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page-wrapper">
      <div className="auth-glow-bg" />

      <div className="auth-card-container">
        {/* Brand header */}
        <div className="auth-brand-header">
          <Link href="/" className="auth-brand-logo" aria-label="Retour à l'accueil">
            <span className="brand-symbol">
              <span />
              <span />
            </span>
            <span className="brand-name">
              vidi<span>®</span>
            </span>
          </Link>
          <span className="auth-eyebrow">CRÉATION D'ESPACE</span>
          <h1>Créer votre compte Studio</h1>
          <p>Commencez à produire vos publicités vidéo UGC assistées par IA.</p>
        </div>

        {/* Register form */}
        <div className="auth-form-card">
          {error && <div className="form-error-banner">{error}</div>}

          {/* Dedicated Google Authentication */}
          <GoogleSignInButton text="S’inscrire avec Google" />

          <div className="auth-divider">
            <span />
            <em>ou par email</em>
            <span />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

          <div className="field-group">
            <label htmlFor="reg-name">Nom complet ou nom d'équipe</label>
            <input
              id="reg-name"
              type="text"
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Sarah Martin"
            />
          </div>

          <div className="field-group">
            <label htmlFor="reg-email">Email professionnel</label>
            <input
              id="reg-email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@votremarque.com"
            />
          </div>

          <div className="field-group">
            <label htmlFor="reg-password">Mot de passe (12 caractères min.)</label>
            <input
              id="reg-password"
              type="password"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
            />
            <small className="field-hint">
              12 caractères minimum avec majuscules, minuscules et chiffres recommandés.
            </small>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="marketing-btn-primary hero-btn-lg"
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
          >
            {loading ? (
              <>
                <span className="spinner-dot" />
                <span>Création de votre espace en cours...</span>
              </>
            ) : (
              <>
                <Icon name="wand" size={16} />
                <span>Créer mon studio Vidi</span>
              </>
            )}
          </button>
        </form>
        </div>

        {/* Footer links */}
        <div className="auth-footer-links">
          <span>Vous avez déjà un compte ?</span>{' '}
          <Link href="/login" className="auth-link-highlight">
            Se connecter
          </Link>
          <div style={{ marginTop: '0.75rem' }}>
            <Link href="/" className="auth-link-subtle">
              ← Retour au site public
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
