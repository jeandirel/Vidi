'use client';
import { useEffect, useRef, useState } from 'react';
import Icon from './icon';
import GoogleSignInButton from './google-sign-in-button';
export default function AccountDialog({
  onClose,
  onConnected,
  databaseAvailable,
}: {
  onClose: () => void;
  onConnected: () => Promise<void>;
  databaseAvailable: boolean;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Connexion impossible.');
      await onConnected();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog ref={ref} className="account-dialog" onCancel={onClose} aria-labelledby="account-title">
      <button className="icon-button dialog-close" onClick={onClose} aria-label="Fermer">
        <Icon name="close" />
      </button>
      <div className="eyebrow">VOTRE STUDIO, PARTOUT.</div>
      <h2 id="account-title">
        {mode === 'login' ? 'Bienvenue chez Vidi.' : 'Créez votre espace.'}
      </h2>
      <p>Retrouvez vos projets et lancez vos productions.</p>
      {!databaseAvailable ? (
        <div className="info-banner">
          <Icon name="cloud" />
          <p>
            Les comptes cloud seront disponibles une fois la base de données connectée. Vous pouvez
            déjà travailler et enregistrer vos brouillons sur cet appareil.
          </p>
        </div>
      ) : null}

      <div style={{ marginTop: '16px' }}>
        <GoogleSignInButton
          text={mode === 'login' ? 'Continuer avec Google' : 'S’inscrire avec Google'}
          returnTo="/app"
        />
      </div>

      <div className="auth-divider" style={{ margin: '14px 0' }}>
        <span />
        <em>ou avec vos identifiants</em>
        <span />
      </div>

      <form onSubmit={submit}>
        {mode === 'register' ? (
          <label className="field">
            Votre nom
            <input name="name" minLength={2} maxLength={80} required autoComplete="name" />
          </label>
        ) : null}
        <label className="field">
          Email
          <input name="email" type="email" required maxLength={254} autoComplete="email" />
        </label>
        <label className="field">
          Mot de passe
          <input
            name="password"
            type="password"
            minLength={mode === 'register' ? 12 : 1}
            maxLength={128}
            required
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />
        </label>
        {mode === 'register' ? (
          <p className="field-help">12 caractères minimum. Aucun paiement à l’inscription.</p>
        ) : null}
        {error ? (
          <p role="alert" className="warning">
            {error}
          </p>
        ) : null}
        <button className="button primary" disabled={busy || !databaseAvailable} type="submit">
          {busy ? <Icon name="loader" className="spin" /> : null}
          {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
        </button>
      </form>
      <button
        className="text-button account-switch"
        onClick={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setError('');
        }}
      >
        {mode === 'login'
          ? 'Pas encore de compte ? Créer mon espace'
          : 'Déjà un compte ? Se connecter'}
      </button>
    </dialog>
  );
}
