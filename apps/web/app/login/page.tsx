'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/icon';
import GoogleSignInButton from '@/components/google-sign-in-button';

export default function LoginPage() {
  const router = useRouter();
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
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Connexion impossible. Vérifiez vos identifiants.');
      }

      // Successful login creates session cookie -> redirect to studio
      router.push('/app');
      router.refresh();
    } catch (err) {
      setError((err as Error).message || 'Erreur lors de la connexion.');
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
          <span className="auth-eyebrow">ESPACE MEMBRE</span>
          <h1>Connexion au Studio</h1>
          <p>Retrouvez vos projets, vos marques et vos rendus vidéo en cours.</p>
        </div>

        {/* Login form */}
        <div className="auth-form-card">
          {error && <div className="form-error-banner">{error}</div>}

          {/* Dedicated Google Authentication */}
          <GoogleSignInButton text="Continuer avec Google" />

          <div className="auth-divider">
            <span />
            <em>ou par email</em>
            <span />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

          <div className="field-group">
            <label htmlFor="login-email">Adresse email</label>
            <input
              id="login-email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nom@entreprise.com"
            />
          </div>

          <div className="field-group">
            <div className="field-label-row">
              <label htmlFor="login-password">Mot de passe</label>
            </div>
            <input
              id="login-password"
              type="password"
              required
              minLength={1}
              maxLength={128}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
            />
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
                <span>Connexion en cours...</span>
              </>
            ) : (
              <>
                <Icon name="wand" size={16} />
                <span>Accéder au Studio</span>
              </>
            )}
          </button>
        </form>
        </div>

        {/* Footer links */}
        <div className="auth-footer-links">
          <span>Pas encore de compte ?</span>{' '}
          <Link href="/register" className="auth-link-highlight">
            Créer un compte Vidi
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
