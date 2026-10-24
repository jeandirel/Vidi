'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client-api';
import Icon from './icon';
type Workspace = { id: string; name: string; plan: string; role: string };
type Member = { role: string; user: { id: string; name: string; email: string } };
type Key = {
  id: string;
  name: string;
  prefix: string;
  role: string;
  expiresAt: string;
  revokedAt: string | null;
};
type Invitation = { id: string; email: string; role: string; expiresAt: string };
export default function WorkspaceConsole({
  workspace: w,
  notify,
  refresh,
}: {
  workspace: Workspace;
  notify: (s: string) => void;
  refresh: () => Promise<void>;
}) {
  const [tab, setTab] = useState<'team' | 'keys'>('team');
  const [members, setMembers] = useState<Member[]>([]);
  const [keys, setKeys] = useState<Key[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [keyName, setKeyName] = useState('');
  const [newKey, setNewKey] = useState('');
  const [link, setLink] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    const [m, k, i] = await Promise.all([
      api<{ members: Member[] }>(`/api/workspaces/${w.id}/members`),
      api<{ keys: Key[] }>(`/api/workspaces/${w.id}/keys`),
      api<{ invitations: Invitation[] }>(`/api/workspaces/${w.id}/invitations`),
    ]);
    setMembers(m.members);
    setKeys(k.keys);
    setInvites(i.invitations);
  }
  useEffect(() => {
    setNewKey('');
    setLink('');
    setMembers([]);
    setKeys([]);
    setInvites([]);
    if (w.role !== 'OWNER') return;
    let active = true;
    void Promise.all([
      api<{ members: Member[] }>(`/api/workspaces/${w.id}/members`),
      api<{ keys: Key[] }>(`/api/workspaces/${w.id}/keys`),
      api<{ invitations: Invitation[] }>(`/api/workspaces/${w.id}/invitations`),
    ])
      .then(([m, k, i]) => {
        if (active) {
          setMembers(m.members);
          setKeys(k.keys);
          setInvites(i.invitations);
        }
      })
      .catch((e) => {
        if (active) notify(e.message);
      });
    return () => {
      active = false;
    };
  }, [w.id, w.role, notify]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      await load();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      notify('Copié dans le presse-papiers.');
    } catch {
      notify('Copiez le contenu du champ manuellement.');
    }
  }
  if (w.role !== 'OWNER')
    return (
      <section className="panel">
        <h2>Collaboration</h2>
        <p className="muted">
          Votre rôle : {w.role}. Le propriétaire gère les invitations et les accès API.
        </p>
      </section>
    );
  return (
    <section className="panel workspace-console">
      <div className="management-actions">
        <button
          className={`button ${tab === 'team' ? 'primary' : 'secondary'} compact`}
          onClick={() => setTab('team')}
        >
          <Icon name="users" size={15} />
          Équipe
        </button>
        <button
          className={`button ${tab === 'keys' ? 'primary' : 'secondary'} compact`}
          onClick={() => setTab('keys')}
        >
          <Icon name="shield" size={15} />
          Clés API
        </button>
      </div>
      {tab === 'team' ? (
        <>
          <h2>Membres de {w.name}</h2>
          {members.map((m) => (
            <div className="member-row" key={m.user.id}>
              <div>
                <strong>{m.user.name}</strong>
                <small>{m.user.email}</small>
              </div>
              {m.role === 'OWNER' ? (
                <span className="tag">Propriétaire</span>
              ) : (
                <>
                  <select
                    aria-label={`Rôle de ${m.user.name}`}
                    disabled={busy}
                    value={m.role}
                    onChange={(e) =>
                      void run(async () => {
                        await api(
                          `/api/workspaces/${w.id}/members`,
                          { userId: m.user.id, role: e.target.value },
                          'PATCH',
                        );
                      })
                    }
                  >
                    <option value="EDITOR">Éditeur</option>
                    <option value="VIEWER">Client / lecture</option>
                  </select>
                  <button
                    className="icon-button"
                    aria-label={`Retirer ${m.user.name}`}
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await api(
                          `/api/workspaces/${w.id}/members`,
                          { userId: m.user.id },
                          'DELETE',
                        );
                      })
                    }
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </>
              )}
            </div>
          ))}
          <form
            className="management-form"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const r = await api<{ url: string }>(`/api/workspaces/${w.id}/invitations`, {
                  email,
                  role,
                });
                setLink(r.url);
                setEmail('');
                notify('Invitation créée. Partagez le lien avec cette personne.');
              });
            }}
          >
            <label className="field">
              Email de la personne
              <input
                type="email"
                required
                value={email}
                maxLength={254}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="field">
              Accès
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="VIEWER">Client / lecture et validation</option>
                <option value="EDITOR">Éditeur</option>
              </select>
            </label>
            <button className="button secondary compact" disabled={busy}>
              Créer une invitation
            </button>
          </form>
          {link ? (
            <div className="secret-output">
              <label className="field">
                Lien à partager (valable 7 jours)
                <input readOnly value={link} />
              </label>
              <button className="text-button" onClick={() => void copy(link)}>
                Copier le lien
              </button>
            </div>
          ) : null}
          {invites.map((i) => (
            <div className="service-row" key={i.id}>
              <span>
                {i.email} · {i.role}
              </span>
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await api(
                      `/api/workspaces/${w.id}/invitations`,
                      { invitationId: i.id },
                      'DELETE',
                    );
                  })
                }
              >
                Révoquer
              </button>
            </div>
          ))}
          <form
            className="management-form"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await api('/api/workspaces', { name });
                setName('');
                await refresh();
                notify('Espace créé. Retrouvez-le dans le sélecteur d’espaces.');
              });
            }}
          >
            <label className="field">
              Nouvel espace de marque
              <input
                required
                minLength={2}
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button className="button secondary compact" disabled={busy}>
              Créer l’espace
            </button>
          </form>
        </>
      ) : (
        <>
          <h2>Accès programmatique · {w.plan}</h2>
          <p className="muted">
            Les clés Agency sont limitées à cet espace. Elles expirent au bout de 30 jours et ne
            s’affichent qu’une fois à leur création.
          </p>
          <form
            className="management-form"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const r = await api<{ token: string }>(`/api/workspaces/${w.id}/keys`, {
                  name: keyName,
                  role: 'EDITOR',
                  days: 30,
                });
                setNewKey(r.token);
                setKeyName('');
              });
            }}
          >
            <label className="field">
              Nom de la clé
              <input
                minLength={2}
                maxLength={80}
                required
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
            </label>
            <button className="button secondary compact" disabled={busy || w.plan !== 'agency'}>
              Créer une clé d’écriture
            </button>
          </form>
          {newKey ? (
            <div className="secret-output">
              <label className="field">
                Clé créée — sauvegardez-la maintenant
                <textarea readOnly value={newKey} rows={2} />
              </label>
              <button className="text-button" onClick={() => void copy(newKey)}>
                Copier la clé
              </button>
              <button className="text-button" onClick={() => setNewKey('')}>
                Masquer
              </button>
            </div>
          ) : null}
          {keys.map((k) => (
            <div className="service-row" key={k.id}>
              <span>
                {k.name}
                <small className="muted">
                  {' '}
                  {k.prefix}… · {k.role} · {new Date(k.expiresAt).toLocaleDateString('fr-FR')}
                </small>
              </span>
              {k.revokedAt ? (
                <span className="tag">Révoquée</span>
              ) : (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await api(`/api/workspaces/${w.id}/keys`, { keyId: k.id }, 'DELETE');
                    })
                  }
                >
                  Révoquer
                </button>
              )}
            </div>
          ))}
        </>
      )}
    </section>
  );
}
