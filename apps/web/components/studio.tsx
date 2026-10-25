'use client';

import { useEffect, useRef, useState } from 'react';
import {
  composeDraft,
  plans,
  productSchema,
  projectSchema,
  renderCost,
  type ProjectInput,
} from '@vidi/core';
import { avatars } from '@/lib/catalog';
import { deleteDraft, emptyProject, loadDrafts, saveDraft, type Draft } from '@/lib/drafts';
import Icon from './icon';
import CreationPanel from './creation-panel';
import Preview from './preview';
import AccountDialog from './account-dialog';
import { api } from '@/lib/client-api';
import WorkspaceConsole from './workspace-console';
import ProjectReview from './project-review';
import AssetLibrary from './asset-library';
import CloudProjects from './cloud-projects';

type View = 'studio' | 'projects' | 'avatars' | 'renders' | 'settings' | 'plans';
export type Workspace = { id: string; name: string; credits: number; plan: string; role: string };
export type Session = {
  user: { id: string; name: string; email: string };
  workspaces: Workspace[];
};
type Capabilities = {
  guestScripts: boolean;
  database: boolean;
  scripts: boolean;
  video: boolean;
  storage: boolean;
  billing: boolean;
  trends: boolean;
  ecommerce: boolean;
  voiceCloning: boolean;
};
type Render = {
  id: string;
  projectId: string;
  status: string;
  credits: number;
  outputUrl: string | null;
  error: string | null;
  createdAt: string;
};
const steps = [
  { label: 'Produit', icon: 'link' },
  { label: 'Script', icon: 'type' },
  { label: 'Avatar', icon: 'users' },
  { label: 'Voix', icon: 'audio' },
  { label: 'Montage', icon: 'layers' },
] as const;
const titles: Record<View, string> = {
  studio: 'Studio de création',
  projects: 'Mes projets',
  avatars: 'Bibliothèque d’avatars',
  renders: 'Mes rendus',
  settings: 'Mon espace',
  plans: 'Offres & crédits',
};
export default function Studio() {
  const [view, setView] = useState<View>('studio');
  const [step, setStep] = useState(0);
  const [project, setProject] = useState<ProjectInput>(emptyProject);
  const [draftId, setDraftId] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [cloudId, setCloudId] = useState<string | null>(null);
  const [cloudRevision, setCloudRevision] = useState(0);
  const [cloudDirty, setCloudDirty] = useState(true);
  const [inviteToken, setInviteToken] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [workspaceId, setWorkspaceId] = useState('');
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [renders, setRenders] = useState<Render[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [saved, setSaved] = useState(false);
  const renderKey = useRef<string | null>(null);
  const workspace = session?.workspaces.find((w) => w.id === workspaceId);
  function update(next: ProjectInput) {
    setCloudDirty(true);
    setProject(next);
    setSaved(false);
    renderKey.current = null;
  }
  async function refreshSession() {
    try {
      const data = await api<Session>('/api/auth/session');
      setSession(data);
      setWorkspaceId((id) =>
        data.workspaces.some((w) => w.id === id) ? id : data.workspaces[0]?.id || '',
      );
    } catch {
      setSession(null);
      setWorkspaceId('');
    }
  }
  useEffect(() => {
    setInviteToken(new URLSearchParams(window.location.search).get('invite') || '');
    setDrafts(loadDrafts());
    setDraftId(crypto.randomUUID());
    void refreshSession();
    void api<Capabilities>('/api/capabilities')
      .then(setCapabilities)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 7000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (view !== 'renders' || !workspaceId) return;
    let active = true;
    async function poll() {
      try {
        const data = await api<{ renders: Render[] }>(`/api/renders?workspaceId=${workspaceId}`);
        if (active) setRenders(data.renders);
      } catch (error) {
        if (active) setNotice((error as Error).message);
      }
    }
    void poll();
    const timer = setInterval(() => void poll(), 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [view, workspaceId]);
  function navigate(next: View) {
    setView(next);
    setMobileOpen(false);
  }
  function newProject() {
    setProject({
      ...emptyProject,
      product: { ...emptyProject.product },
      script: { ...emptyProject.script },
    });
    setDraftId(crypto.randomUUID());
    setCloudId(null);
    setSaved(false);
    setStep(0);
    navigate('studio');
  }
  function localSave() {
    try {
      setDrafts(saveDraft(draftId || crypto.randomUUID(), project));
      setSaved(true);
      setNotice('Brouillon enregistré sur cet appareil.');
    } catch {
      setNotice(
        'Ajoutez un nom de produit, sa description et un script avant d’enregistrer. Vérifiez aussi l’espace disponible sur cet appareil.',
      );
    }
  }
  function openDraft(draft: Draft) {
    setProject(draft.data);
    setDraftId(draft.id);
    setCloudId(null);
    setStep(0);
    setSaved(true);
    navigate('studio');
  }
  async function cloudSave() {
    if (!session) {
      setAccountOpen(true);
      throw new Error('Connectez-vous pour enregistrer ce projet dans votre espace.');
    }
    projectSchema.parse(project);
    const result = cloudId
      ? await api<{ id: string; revision: number }>(`/api/projects/${cloudId}`, project, 'PUT')
      : await api<{ id: string; revision: number }>('/api/projects', {
          workspaceId,
          data: project,
        });
    setCloudId(result.id);
    setCloudRevision(result.revision);
    setCloudDirty(false);
    return result.id;
  }
  async function generateScript(ai = false) {
    try {
      const product = productSchema.parse(project.product);
      if (!ai) {
        update({ ...project, script: composeDraft(product, project.language) });
        setStep(1);
        setNotice('Brouillon composé à partir de vos informations. Relisez-le avant publication.');
        return;
      }
      if (!session && !capabilities?.guestScripts) {
        setAccountOpen(true);
        return;
      }
      setBusy('script');
      const result = await api<{ script: ProjectInput['script'] }>('/api/scripts', {
        workspaceId,
        dataConsent: true,
        product,
        language: project.language,
        duration: project.duration,
      });
      update({ ...project, script: result.script });
    } catch (error) {
      setNotice(
        error instanceof Error && error.name !== 'ZodError'
          ? error.message
          : 'Ajoutez au moins le nom et une description du produit.',
      );
    } finally {
      setBusy('');
    }
  }
  async function render() {
    if (busy) return;
    if (!session) {
      setAccountOpen(true);
      return;
    }
    setBusy('render');
    try {
      const id = await cloudSave();
      renderKey.current ??= crypto.randomUUID();
      const result = await api<{ id: string; dispatchPending?: boolean }>('/api/renders', {
        workspaceId,
        projectId: id,
        idempotencyKey: renderKey.current,
      });
      setNotice(
        result.dispatchPending
          ? 'Demande enregistrée. Le worker la reprendra dès que la file sera disponible.'
          : 'Votre vidéo a rejoint la file de rendu.',
      );
      renderKey.current = null;
      await refreshSession();
      navigate('renders');
    } catch (error) {
      setNotice(
        error instanceof Error && error.name !== 'ZodError'
          ? error.message
          : 'Complétez le produit et le script avant le rendu.',
      );
    } finally {
      setBusy('');
    }
  }
  async function syncCloud() {
    if (!session) {
      setAccountOpen(true);
      return;
    }
    setBusy('sync');
    try {
      await cloudSave();
      setNotice('Projet enregistré dans votre espace.');
    } catch (error) {
      setNotice(
        (error as Error).name === 'ZodError'
          ? 'Complétez le produit et le script.'
          : (error as Error).message,
      );
    } finally {
      setBusy('');
    }
  }
  useEffect(() => {
    setCloudId(null);
    setRenders([]);
  }, [workspaceId]);
  const filtered = drafts.filter(
    (d) =>
      d.data.title.toLowerCase().includes(query.toLowerCase()) ||
      d.data.product.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className={`app ${collapsed ? 'sidebar-collapsed' : ''}`} data-ready={!!draftId}>
      {mobileOpen ? (
        <button
          className="scrim"
          aria-label="Fermer la navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <a className="brand" href="/" aria-label="Vidi, accueil">
          <span className="brand-symbol">
            <span />
            <span />
          </span>
          <span className="brand-name">
            vidi<span>®</span>
          </span>
        </a>
        <button className="workspace-switch" onClick={() => navigate('settings')}>
          <span className="workspace-mark">{workspace?.name[0] || 'V'}</span>
          <span className="sidebar-label">
            <strong>{workspace?.name || 'Mon studio'}</strong>
            <small>{session ? 'Espace de travail' : 'Espace personnel'}</small>
          </span>
          <Icon name="down" size={14} />
        </button>
        <div className="nav-heading sidebar-label">CRÉATION</div>
        <nav aria-label="Navigation principale">
          {(
            [
              { id: 'studio', label: 'Studio', icon: 'wand' },
              { id: 'projects', label: 'Mes projets', icon: 'folder' },
              { id: 'avatars', label: 'Avatars', icon: 'users' },
              { id: 'renders', label: 'Rendus', icon: 'film' },
            ] as const
          ).map((item) => (
            <button
              title={item.label}
              key={item.id}
              className={`nav-item ${view === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.icon} />
              <span className="sidebar-label">{item.label}</span>
              {item.id === 'projects' && drafts.length ? (
                <span className="nav-count sidebar-label">{drafts.length}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="credit-card sidebar-label">
            <div>
              <Icon name="zap" size={15} />
              <span>
                {workspace
                  ? `${workspace.credits} crédits disponibles`
                  : 'Votre prochain contenu commence ici'}
              </span>
            </div>
            {workspace ? (
              <div className="credit-track">
                <i
                  style={{
                    width: `${Math.min(100, (workspace.credits / Math.max(1, plans[workspace.plan as keyof typeof plans]?.credits || 15)) * 100)}%`,
                  }}
                />
              </div>
            ) : null}
            <button onClick={() => navigate('plans')}>
              Découvrir les offres <Icon name="next" size={13} />
            </button>
          </div>
          <button
            className={`nav-item ${view === 'settings' ? 'active' : ''}`}
            onClick={() => navigate('settings')}
            title="Mon espace"
          >
            <Icon name="settings" />
            <span className="sidebar-label">Mon espace</span>
          </button>
          <button
            className="profile"
            onClick={() => (session ? navigate('settings') : setAccountOpen(true))}
          >
            <span className="user-avatar">
              {session?.user.name.slice(0, 2).toUpperCase() || 'JD'}
            </span>
            <span className="sidebar-label">
              <strong>{session?.user.name || 'Votre espace Vidi'}</strong>
              <small>{session ? 'Compte personnel' : 'Se connecter'}</small>
            </span>
            <Icon name="more" size={17} />
          </button>
        </div>
        <button
          className="collapse-button"
          aria-label={collapsed ? 'Développer la navigation' : 'Réduire la navigation'}
          onClick={() => setCollapsed(!collapsed)}
        >
          <Icon name={collapsed ? 'right' : 'left'} size={14} />
        </button>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Ouvrir la navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Icon name="menu" />
            </button>
            <span>Mon studio</span>
            <Icon name="right" size={13} />
            <strong>{titles[view]}</strong>
          </div>
          <div className="topbar-actions">
            <span className="local-status">
              <i />
              {session ? 'Espace cloud' : 'Brouillons locaux'}
            </span>
            <button
              className="icon-button"
              title="Mon espace"
              aria-label="Mon espace"
              onClick={() => navigate('settings')}
            >
              <span className="user-avatar small">{session?.user.name.slice(0, 1) || 'V'}</span>
            </button>
          </div>
        </header>
        <main>
          {inviteToken ? (
            <section className="info-banner">
              <Icon name="users" />
              <div>
                <p>Une invitation à rejoindre un espace est disponible.</p>
                <button
                  className="button secondary compact"
                  onClick={async () => {
                    if (!session) {
                      setAccountOpen(true);
                      return;
                    }
                    try {
                      const r = await api<{ workspaceId: string }>('/api/invitations/accept', {
                        token: inviteToken,
                      });
                      await refreshSession();
                      setWorkspaceId(r.workspaceId);
                      setInviteToken('');
                      window.history.replaceState({}, '', window.location.pathname);
                      setNotice('Vous avez rejoint l’espace.');
                    } catch (e) {
                      setNotice((e as Error).message);
                    }
                  }}
                >
                  Accepter avec mon compte
                </button>
              </div>
            </section>
          ) : null}
          {view === 'studio' ? (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span />
                    LE STUDIO UGC
                  </div>
                  <h1>Une idée. Votre prochaine vidéo.</h1>
                  <p>Donnez une voix à vos produits. Créez, ajustez, déclinez.</p>
                </div>
                <div className="heading-actions">
                  <button className="button secondary compact" onClick={localSave}>
                    <Icon name={saved ? 'check' : 'save'} size={15} />
                    {saved ? 'Enregistré' : 'Enregistrer'}
                  </button>
                  <button
                    className="button secondary compact icon-button"
                    onClick={newProject}
                    aria-label="Nouveau projet"
                  >
                    <Icon name="plus" />
                  </button>
                </div>
              </section>
              <div className="studio-layout">
                <section className="editor-column">
                  <div className="project-title">
                    <input
                      aria-label="Titre du projet"
                      disabled={!!busy}
                      value={project.title}
                      maxLength={120}
                      onChange={(e) => update({ ...project, title: e.target.value })}
                    />
                    <span className="tag">9:16 · Vertical</span>
                  </div>
                  <div className="step-tabs" role="tablist" aria-label="Étapes de création">
                    {steps.map((s, i) => (
                      <button
                        key={s.label}
                        role="tab"
                        aria-selected={step === i}
                        aria-controls={`panel-${i}`}
                        id={`tab-${i}`}
                        tabIndex={step === i ? 0 : -1}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                            const next = (i + (e.key === 'ArrowRight' ? 1 : 4)) % 5;
                            setStep(next);
                            document.getElementById(`tab-${next}`)?.focus();
                          }
                        }}
                        className={step === i ? 'selected' : ''}
                        onClick={() => setStep(i)}
                      >
                        <span className="step-number">{i + 1}</span>
                        <Icon name={s.icon} size={15} />
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                  <div role="tabpanel" id={`panel-${step}`} aria-labelledby={`tab-${step}`}>
                    <fieldset className="editor-fieldset" disabled={!!busy}>
                      <CreationPanel
                        step={step}
                        workspaceId={workspaceId}
                        onLogin={() => setAccountOpen(true)}
                        project={project}
                        update={update}
                        busy={busy}
                        onCompose={() => void generateScript()}
                        onAI={() => void generateScript(true)}
                        notify={setNotice}
                      />
                    </fieldset>
                  </div>
                  <div className="editor-footer">
                    <span>
                      <Icon name="shield" size={14} />
                      Vous gardez le contrôle créatif.
                    </span>
                    <div>
                      <button
                        className="button secondary compact"
                        onClick={() => void syncCloud()}
                        disabled={!!busy}
                      >
                        <Icon name="cloud" size={15} />
                        Enregistrer en ligne
                      </button>
                      {step < 4 ? (
                        <button
                          className="button primary compact"
                          onClick={() => setStep(step + 1)}
                        >
                          Continuer <Icon name="next" size={15} />
                        </button>
                      ) : (
                        <button
                          className="button primary compact"
                          disabled={!!busy}
                          onClick={() => void render()}
                        >
                          <Icon
                            name={busy === 'render' ? 'loader' : 'sparkles'}
                            size={15}
                            className={busy === 'render' ? 'spin' : ''}
                          />
                          Générer la vidéo
                        </button>
                      )}
                    </div>
                  </div>
                </section>
                <Preview
                  project={project}
                  onRender={() => void render()}
                  busy={busy === 'render'}
                  videoConnected={!!capabilities?.video}
                />
              </div>
              {cloudId && workspace ? (
                <ProjectReview
                  key={`${cloudId}:${cloudRevision}`}
                  projectId={cloudId}
                  role={workspace.role}
                  dirty={cloudDirty}
                  notify={setNotice}
                />
              ) : null}
              <div className="studio-note">
                <Icon name="sparkles" size={16} />
                <span>
                  Un produit, plusieurs angles. Dupliquez un projet pour explorer une nouvelle
                  accroche.
                </span>
                <button onClick={() => navigate('projects')}>
                  Mes projets <Icon name="next" size={14} />
                </button>
              </div>
            </>
          ) : null}
          {view === 'projects' ? (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">VOTRE BIBLIOTHÈQUE</div>
                  <h1>Vos idées prennent forme.</h1>
                  <p>Retrouvez vos brouillons sur cet appareil et vos projets cloud.</p>
                </div>
                <button className="button primary" onClick={newProject}>
                  <Icon name="plus" />
                  Nouvelle création
                </button>
              </section>
              <div className="section-toolbar">
                <label className="search-box">
                  <Icon name="search" />
                  <input
                    placeholder="Rechercher un projet…"
                    aria-label="Rechercher un projet"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              </div>
              <h2 className="section-title">
                Sur cet appareil <span>{filtered.length}</span>
              </h2>
              {filtered.length ? (
                <div className="project-grid">
                  {filtered.map((d) => (
                    <article className="project-card" key={d.id}>
                      <button className="project-cover" onClick={() => openDraft(d)}>
                        <img
                          src={avatars.find((a) => a.id === d.data.avatarId)?.image}
                          alt="Portrait de prévisualisation"
                        />
                        <span className="project-cover-caption">{d.data.product.name}</span>
                        <span className="tag">{d.data.duration}s</span>
                      </button>
                      <div className="project-card-info">
                        <div>
                          <strong>{d.data.title}</strong>
                          <small>
                            Brouillon · {new Date(d.updatedAt).toLocaleDateString('fr-FR')}
                          </small>
                        </div>
                        <button
                          className="icon-button"
                          aria-label={`Supprimer ${d.data.title}`}
                          onClick={() => {
                            try {
                              setDrafts(deleteDraft(d.id));
                            } catch {
                              setNotice('Suppression impossible sur cet appareil.');
                            }
                          }}
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                      <button
                        className="text-button duplicate"
                        onClick={() => {
                          setProject({ ...d.data, title: `${d.data.title.slice(0, 105)} — copie` });
                          setDraftId(crypto.randomUUID());
                          setCloudId(null);
                          setSaved(false);
                          setStep(1);
                          navigate('studio');
                        }}
                      >
                        <Icon name="copy" size={14} />
                        Créer une variante
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <Empty
                  icon="folder"
                  title="Votre première création vous attend."
                  text="Ajoutez un produit, composez votre script et enregistrez votre brouillon."
                  action={newProject}
                  label="Ouvrir le studio"
                />
              )}
              {workspaceId ? (
                <CloudProjects
                  key={workspaceId}
                  workspaceId={workspaceId}
                  canWrite={!!workspace && workspace.role !== 'VIEWER'}
                  notify={setNotice}
                  onOpen={(p) => {
                    setProject(p.data);
                    setCloudId(p.id);
                    setCloudRevision(p.revision);
                    setCloudDirty(false);
                    setDraftId(crypto.randomUUID());
                    setSaved(false);
                    setStep(0);
                    navigate('studio');
                  }}
                />
              ) : (
                <button className="button secondary" onClick={() => setAccountOpen(true)}>
                  <Icon name="cloud" />
                  Ouvrir mes projets cloud
                </button>
              )}
            </>
          ) : null}
          {view === 'avatars' ? (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">CASTING</div>
                  <h1>Le bon visage pour votre histoire.</h1>
                  <p>Sélectionnez une direction de casting pour votre création.</p>
                </div>
                <span className="tag">6 profils de prévisualisation</span>
              </section>
              <div className="avatar-library">
                {avatars.map((a) => (
                  <button
                    key={a.id}
                    className={`avatar-library-card ${project.avatarId === a.id ? 'chosen' : ''}`}
                    onClick={() => {
                      update({ ...project, avatarId: a.id });
                      setStep(2);
                      navigate('studio');
                    }}
                  >
                    <img src={a.image} alt={`Direction de casting ${a.name}`} />
                    <span>
                      <strong>{a.name}</strong>
                      <small>{a.tag}</small>
                      <Icon name="next" />
                    </span>
                  </button>
                ))}
              </div>
              <p className="muted footnote">
                Ces portraits illustrent le casting souhaité. Les avatars générables et leur
                correspondance fournisseur seront connectés au moteur vidéo ; ces photos ne sont pas
                des avatars animés.
              </p>
            </>
          ) : null}
          {view === 'renders' ? (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">PRODUCTION</div>
                  <h1>De l’idée au dernier pixel.</h1>
                  <p>Suivez vos générations et ouvrez vos vidéos finalisées.</p>
                </div>
                <span className="tag">
                  <span className="status-dot" />
                  Actualisation toutes les 5 s
                </span>
              </section>
              {renders.length ? (
                <div className="render-list">
                  {renders.map((r) => (
                    <article key={r.id}>
                      <span className={`render-icon ${r.status.toLowerCase()}`}>
                        <Icon
                          name={
                            r.status === 'COMPLETED'
                              ? 'check'
                              : r.status === 'FAILED'
                                ? 'close'
                                : 'film'
                          }
                        />
                      </span>
                      <div>
                        <strong>
                          {{
                            QUEUED: 'En attente',
                            PROCESSING: 'Génération en cours',
                            COMPLETED: 'Vidéo prête',
                            FAILED: 'Échec du rendu',
                          }[r.status] || r.status}
                        </strong>
                        <small>
                          {new Date(r.createdAt).toLocaleString('fr-FR')} · {r.credits} crédit
                          {r.credits > 1 ? 's' : ''}
                        </small>
                        {r.error ? <p>{r.error}</p> : null}
                      </div>
                      {r.outputUrl ? (
                        <a
                          className="button secondary compact"
                          href={r.outputUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Icon name="download" size={15} />
                          Ouvrir la vidéo
                        </a>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <Empty
                  icon="film"
                  title="Votre salle de projection est prête."
                  text={
                    session
                      ? 'Vos vidéos apparaîtront ici dès le premier rendu.'
                      : 'Connectez-vous pour retrouver vos générations cloud.'
                  }
                  action={() => (session ? navigate('studio') : setAccountOpen(true))}
                  label={session ? 'Créer une vidéo' : 'Se connecter'}
                />
              )}
            </>
          ) : null}
          {view === 'settings' ? (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">VOTRE ESPACE</div>
                  <h1>Tout à sa place.</h1>
                  <p>Compte, espaces de travail et services connectés.</p>
                </div>
                {!session ? (
                  <button className="button primary" onClick={() => setAccountOpen(true)}>
                    Se connecter <Icon name="next" />
                  </button>
                ) : null}
              </section>
              {workspace ? (
                <WorkspaceConsole
                  workspace={workspace}
                  notify={setNotice}
                  refresh={refreshSession}
                />
              ) : null}
              {workspace ? (
                <AssetLibrary
                  workspaceId={workspace.id}
                  canWrite={workspace.role !== 'VIEWER'}
                  notify={setNotice}
                />
              ) : null}
              <div className="settings-grid">
                <section className="panel">
                  <h2>Compte & espace de travail</h2>
                  {session ? (
                    <>
                      <p>
                        {session.user.name}
                        <br />
                        <span className="muted">{session.user.email}</span>
                      </p>
                      <label className="field">
                        Espace actif
                        <select
                          value={workspaceId}
                          onChange={(e) => setWorkspaceId(e.target.value)}
                        >
                          {session.workspaces.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="detail-row">
                        <span>Rôle</span>
                        <strong>{workspace?.role}</strong>
                      </div>
                      <button
                        className="button secondary"
                        onClick={async () => {
                          try {
                            await api('/api/auth/logout', {});
                            setSession(null);
                            setWorkspaceId('');
                            setNotice('Vous êtes déconnecté.');
                          } catch (e) {
                            setNotice((e as Error).message);
                          }
                        }}
                      >
                        <Icon name="logout" />
                        Se déconnecter
                      </button>
                    </>
                  ) : (
                    <p className="muted">
                      Vos brouillons fonctionnent sans compte et restent sur cet appareil.
                      Connectez-vous pour accéder aux projets cloud et aux rendus.
                    </p>
                  )}
                </section>
                <section className="panel">
                  <h2>Services connectés</h2>
                  <p className="muted">
                    État de la configuration serveur, sans exposition des clés.
                  </p>
                  {(
                    [
                      { key: 'database', label: 'Espaces cloud' },
                      { key: 'scripts', label: 'Rédaction IA' },
                      { key: 'video', label: 'Génération vidéo' },
                      { key: 'storage', label: 'Stockage média' },
                      { key: 'billing', label: 'Abonnements' },
                      { key: 'trends', label: 'Tendances sociales' },
                      { key: 'ecommerce', label: 'Shopify / WooCommerce' },
                      { key: 'voiceCloning', label: 'Clonage vocal' },
                    ] as const
                  ).map((s) => (
                    <div className="service-row" key={s.key}>
                      <span>{s.label}</span>
                      <span
                        className={`service-status ${capabilities?.[s.key] ? 'connected' : ''}`}
                      >
                        {capabilities?.[s.key] ? 'Configuré' : 'À connecter'}
                      </span>
                    </div>
                  ))}
                </section>
              </div>
            </>
          ) : null}
          {view === 'plans' ? (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">PASSEZ À L’ÉCHELLE</div>
                  <h1>Votre rythme. Votre studio.</h1>
                  <p>Une offre pour chaque étape de votre production.</p>
                </div>
              </section>
              {workspace && capabilities?.billing ? (
                <button
                  className="button secondary compact"
                  onClick={async () => {
                    try {
                      const r = await api<{ url: string }>('/api/billing/portal', { workspaceId });
                      window.location.assign(r.url);
                    } catch (e) {
                      setNotice((e as Error).message);
                    }
                  }}
                >
                  Gérer mon abonnement
                </button>
              ) : null}
              <div className="pricing-grid">
                {Object.entries(plans).map(([key, p]) => (
                  <article className={`pricing-card ${key === 'pro' ? 'featured' : ''}`} key={key}>
                    {key === 'pro' ? (
                      <span className="pricing-badge">Pour les marques en croissance</span>
                    ) : null}
                    <h2>{p.name}</h2>
                    <div className="price">
                      {p.price} €<span>/ mois</span>
                    </div>
                    <p>{p.credits} crédits vidéo par mois</p>
                    <ul>
                      {[
                        `${p.maxResolution} · résolution maximale`,
                        `${p.workspaces === 1 ? '1 espace' : `${p.workspaces} espaces de travail`}`,
                        'Scripts, avatars et sous-titres',
                        key === 'agency'
                          ? 'API & marque blanche prévus'
                          : 'Bibliothèque de créations',
                      ].map((s) => (
                        <li key={s}>
                          <Icon name="check" size={15} />
                          {s}
                        </li>
                      ))}
                    </ul>
                    <button
                      className={`button ${key === 'pro' ? 'primary' : 'secondary'}`}
                      disabled={!capabilities?.billing || !!busy}
                      onClick={async () => {
                        if (!session || !workspace) {
                          setAccountOpen(true);
                          return;
                        }
                        setBusy('checkout');
                        try {
                          const r = await api<{ url: string }>('/api/billing/checkout', {
                            workspaceId,
                            plan: key,
                          });
                          window.location.assign(r.url);
                        } catch (e) {
                          setNotice((e as Error).message);
                        } finally {
                          setBusy('');
                        }
                      }}
                    >
                      {capabilities?.billing ? 'Choisir cette offre' : 'Bientôt disponible'}{' '}
                      <Icon name="next" size={15} />
                    </button>
                  </article>
                ))}
              </div>
              <p className="muted footnote">
                Offres prévues, non commercialisées à ce stade. Base de calcul : 1 crédit pour 15 s
                en 720p, 2 en 1080p, 4 en 4K. Une vidéo de {project.duration} s en{' '}
                {project.resolution} représente {renderCost(project.duration, project.resolution)}{' '}
                crédits. Les capacités finales dépendront du moteur connecté.
              </p>
            </>
          ) : null}
        </main>
        <footer className="app-footer">
          <span>
            vidi<span className="footer-dot">.</span> Make it human.
          </span>
          <span>Votre créativité, augmentée.</span>
        </footer>
      </div>
      {notice ? (
        <div className="toast" role="status">
          <Icon name="sparkles" size={18} />
          <span>{notice}</span>
          <button
            className="icon-button"
            aria-label="Fermer le message"
            onClick={() => setNotice('')}
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      ) : null}
      {accountOpen ? (
        <AccountDialog
          databaseAvailable={!!capabilities?.database}
          onClose={() => setAccountOpen(false)}
          onConnected={async () => {
            await refreshSession();
            setAccountOpen(false);
            setNotice('Bienvenue dans votre espace Vidi.');
          }}
        />
      ) : null}
    </div>
  );
}
function Empty({
  icon,
  title,
  text,
  action,
  label,
}: {
  icon: 'film' | 'folder';
  title: string;
  text: string;
  action: () => void;
  label: string;
}) {
  return (
    <section className="empty-state">
      <div className="empty-orbit">
        <Icon name={icon} size={30} />
      </div>
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="button secondary" onClick={action}>
        {label}
        <Icon name="next" size={15} />
      </button>
    </section>
  );
}
