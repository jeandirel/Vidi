'use client';
import { useEffect, useRef, useState } from 'react';
import { campaignSchema, type ProjectInput } from '@vidi/core';
import { api } from '@/lib/client-api';
import type { CatalogItem } from '@/lib/connections';
import Icon from './icon';
type Connection = {
  id: string;
  provider: string;
  config: { url?: string; region?: string };
  checkedAt: string;
};
type Trend = {
  id: string;
  title: string;
  channel: string;
  url: string;
  publishedAt: string;
  views: string | null;
};
export default function ServiceConnections({
  workspaceId,
  role,
  project,
  onProduct,
  update,
  notify,
  onChange,
}: {
  workspaceId: string;
  role: string;
  project: ProjectInput;
  onProduct: (data: ProjectInput['product']) => void;
  update: (p: ProjectInput) => void;
  notify: (s: string) => void;
  onChange: () => void;
}) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [tab, setTab] = useState<'connections' | 'catalog' | 'trends'>('connections');
  const [provider, setProvider] = useState<'shopify' | 'woocommerce' | 'youtube'>('shopify');
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [region, setRegion] = useState('FR');
  const [busy, setBusy] = useState(false);
  const [shop, setShop] = useState<'shopify' | 'woocommerce'>('shopify');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selection, setSelection] = useState<CatalogItem | null>(null);
  const [verified, setVerified] = useState(false);
  const [reviews, setReviews] = useState<
    { id: string; text: string; rating: number; date: string }[]
  >([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [scope, setScope] = useState('');
  const [fetchedAt, setFetchedAt] = useState('');
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    void api<{ connections: Connection[] }>(`/api/connections?workspaceId=${workspaceId}`)
      .then((r) => {
        if (alive.current) setConnections(r.connections);
      })
      .catch((e) => {
        if (alive.current) notify(e.message);
      });
    return () => {
      alive.current = false;
    };
  }, [workspaceId, notify]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      if (alive.current) notify((e as Error).message);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function refresh() {
    const r = await api<{ connections: Connection[] }>(
      `/api/connections?workspaceId=${workspaceId}`,
    );
    if (alive.current) {
      setConnections(r.connections);
      onChange();
    }
  }
  async function loadCatalog(next = '') {
    setSelection(null);
    setReviews([]);
    const params = new URLSearchParams({ workspaceId, provider: shop, q: query, cursor: next });
    const r = await api<{ items: CatalogItem[]; cursor: string | null }>(`/api/commerce?${params}`);
    if (alive.current) {
      setItems(r.items);
      setCursor(r.cursor);
    }
  }
  return (
    <section className="panel service-console" aria-label="Connexions boutiques et tendances">
      <h2>Boutiques & tendances</h2>
      <p className="muted">
        Connectez une source, consultez ses données puis choisissez ce qui entre dans votre projet.
      </p>
      <div className="lab-navigation">
        {(
          [
            ['connections', 'Connexions'],
            ['catalog', 'Catalogue'],
            ['trends', 'Tendances YouTube'],
          ] as const
        ).map(([id, name]) => (
          <button
            key={id}
            disabled={busy}
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={tab === id ? 'selected' : ''}
          >
            {name}
          </button>
        ))}
      </div>
      <fieldset className="editor-fieldset" disabled={busy}>
        {tab === 'connections' ? (
          <>
            {connections.map((c) => (
              <div className="service-row" key={c.id}>
                <span>
                  <strong>{c.provider}</strong>
                  <small className="muted">
                    {' '}
                    · {c.config.url || c.config.region} · vérifié le{' '}
                    {new Date(c.checkedAt).toLocaleDateString('fr-FR')}
                  </small>
                </span>
                {role === 'OWNER' ? (
                  <button
                    className="text-button"
                    onClick={() =>
                      void run(async () => {
                        if (!window.confirm('Déconnecter ce service ?')) return;
                        await api(
                          '/api/connections',
                          { workspaceId, provider: c.provider },
                          'DELETE',
                        );
                        await refresh();
                        setItems([]);
                        setTrends([]);
                      })
                    }
                  >
                    Déconnecter
                  </button>
                ) : null}
              </div>
            ))}
            {role === 'OWNER' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    await api('/api/connections', {
                      workspaceId,
                      provider,
                      url,
                      region,
                      secret: key || undefined,
                    });
                    if (!alive.current) return;
                    setKey('');
                    await refresh();
                    notify('Source vérifiée et connexion enregistrée.');
                  });
                }}
              >
                <div className="lab-fields">
                  <label className="field">
                    Service
                    <select
                      value={provider}
                      onChange={(e) => {
                        setProvider(e.target.value as typeof provider);
                        setKey('');
                      }}
                    >
                      <option value="shopify">Shopify · catalogue Storefront public</option>
                      <option value="woocommerce">WooCommerce · catalogue public</option>
                      <option value="youtube">YouTube Data API</option>
                    </select>
                  </label>
                  {provider === 'youtube' ? (
                    <label className="field">
                      Région YouTube
                      <input
                        value={region}
                        maxLength={2}
                        minLength={2}
                        pattern="[A-Z]{2}"
                        onChange={(e) => setRegion(e.target.value.toUpperCase())}
                        placeholder="FR"
                      />
                    </label>
                  ) : (
                    <label className="field">
                      Adresse de la boutique
                      <input
                        type="url"
                        required
                        maxLength={2000}
                        placeholder="https://votre-boutique.com"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                      />
                    </label>
                  )}
                </div>
                {provider === 'youtube' ? (
                  <label className="field">
                    Clé YouTube Data API
                    <input
                      type="password"
                      autoComplete="off"
                      maxLength={250}
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                      placeholder="Conservée chiffrée, jamais réaffichée"
                    />
                  </label>
                ) : null}
                <button className="button secondary compact" type="submit">
                  <Icon name={busy ? 'loader' : 'link'} size={15} /> Vérifier et connecter
                </button>
                <p className="lab-note">
                  Lecture seule du catalogue publié. Pas d’accès aux commandes, clients ou produits
                  privés. Shopify doit autoriser la lecture Storefront sans jeton. Pour YouTube,
                  activez la Data API et limitez la clé à cette API dans Google Cloud.
                </p>
              </form>
            ) : (
              <p className="lab-note">Le propriétaire de l’espace gère les connexions.</p>
            )}
          </>
        ) : null}
        {tab === 'catalog' ? (
          <>
            <form
              className="lab-actions"
              onSubmit={(e) => {
                e.preventDefault();
                void run(() => loadCatalog());
              }}
            >
              <label className="field">
                Boutique
                <select
                  value={shop}
                  onChange={(e) => {
                    setShop(e.target.value as typeof shop);
                    setItems([]);
                    setCursor(null);
                    setSelection(null);
                  }}
                >
                  <option value="shopify">Shopify</option>
                  <option value="woocommerce">WooCommerce</option>
                </select>
              </label>
              <label className="field">
                Recherche catalogue
                <input value={query} maxLength={100} onChange={(e) => setQuery(e.target.value)} />
              </label>
              <button className="button secondary compact">Charger les produits</button>
            </form>
            <div className="service-catalog">
              {items.map((item) => (
                <button
                  className="service-product"
                  key={item.id}
                  onClick={() => {
                    setSelection(item);
                    setVerified(false);
                    setReviews([]);
                  }}
                >
                  <strong>{item.name}</strong>
                  <span>
                    {item.price} {item.currency}
                  </span>
                  <small>
                    Examiner la fiche <Icon name="next" size={12} />
                  </small>
                </button>
              ))}
            </div>
            {cursor ? (
              <button className="text-button" onClick={() => void run(() => loadCatalog(cursor))}>
                Page suivante
              </button>
            ) : null}
            {selection ? (
              <div
                className="lab-import-preview"
                role="region"
                aria-label="Fiche catalogue sélectionnée"
              >
                <h3>{selection.name}</h3>
                <p>{selection.description}</p>
                <p>
                  {selection.price} {selection.currency} · prix à revérifier avant publication
                </p>
                <a
                  href={selection.url || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="text-button"
                >
                  Voir la fiche source
                </a>
                {shop === 'woocommerce' ? (
                  <button
                    className="text-button"
                    onClick={() =>
                      void run(async () => {
                        const r = await api<{ reviews: typeof reviews }>(
                          `/api/commerce?${new URLSearchParams({ workspaceId, provider: shop, productId: selection.id })}`,
                        );
                        if (alive.current) setReviews(r.reviews);
                      })
                    }
                  >
                    Consulter les avis publics
                  </button>
                ) : (
                  <p className="lab-note">
                    Les avis Shopify dépendent de l’application utilisée par le marchand ; ils ne
                    sont pas exposés par Storefront.
                  </p>
                )}
                {reviews.map((r) => (
                  <blockquote className="service-review" key={r.id}>
                    <span>
                      {r.rating}/5 · {r.date}
                    </span>
                    <p>{r.text}</p>
                  </blockquote>
                ))}
                <label className="import-image-choice">
                  <input
                    type="checkbox"
                    checked={verified}
                    onChange={(e) => setVerified(e.target.checked)}
                  />
                  J’ai vérifié cette fiche et j’accepte de remplacer le produit et le script
                  actuels.
                </label>
                <button
                  className="button primary compact"
                  disabled={!verified || role === 'VIEWER'}
                  onClick={() => {
                    onProduct({
                      name: selection.name,
                      description: selection.description,
                      url: selection.url,
                      image: selection.image,
                      audience: '',
                      benefits: [],
                      commerce: {
                        provider: shop,
                        externalId: selection.id,
                        price: selection.price,
                        currency: selection.currency,
                        checkedAt: new Date().toISOString(),
                      },
                    });
                  }}
                >
                  Utiliser ce produit dans le studio
                </button>
              </div>
            ) : null}
          </>
        ) : null}
        {tab === 'trends' ? (
          <>
            <button
              className="button secondary compact"
              onClick={() =>
                void run(async () => {
                  const r = await api<{ items: Trend[]; scope: string; fetchedAt: string }>(
                    `/api/trends?workspaceId=${workspaceId}`,
                  );
                  if (alive.current) {
                    setTrends(r.items);
                    setScope(r.scope);
                    setFetchedAt(r.fetchedAt);
                  }
                })
              }
            >
              <Icon name="search" size={15} /> Charger les tendances
            </button>
            <p className="lab-note">
              Classement officiel YouTube, avec source et date. Aucune analyse automatique du
              contenu vidéo ni promesse de viralité.
            </p>
            {scope ? (
              <p className="lab-note">
                {scope} · récupéré le {new Date(fetchedAt).toLocaleString('fr-FR')}
              </p>
            ) : null}
            <div className="service-catalog">
              {trends.map((trend) => (
                <article className="service-product" key={trend.id}>
                  <strong>{trend.title}</strong>
                  <span>
                    {trend.channel} ·{' '}
                    {trend.views === null
                      ? 'Vues non communiquées'
                      : `${Number(trend.views).toLocaleString('fr-FR')} vues`}
                  </span>
                  <a href={trend.url} target="_blank" rel="noreferrer" className="text-button">
                    Voir la vidéo source
                  </a>
                  <button
                    className="text-button"
                    disabled={role === 'VIEWER'}
                    onClick={() => {
                      const campaign = project.campaign || campaignSchema.parse({});
                      const inspiration = campaign.inspiration || [];
                      if (inspiration.some((r) => r.url === trend.url)) {
                        notify('Cette référence est déjà dans le projet.');
                        return;
                      }
                      if (inspiration.length >= 8) {
                        notify('Maximum 8 références par projet.');
                        return;
                      }
                      update({
                        ...project,
                        campaign: {
                          ...campaign,
                          inspiration: [
                            ...inspiration,
                            {
                              title: trend.title,
                              url: trend.url,
                              provider: 'youtube',
                              observedAt: fetchedAt,
                              note: '',
                            },
                          ],
                        },
                      });
                      notify('Référence ajoutée au projet. Enregistrez pour la conserver.');
                    }}
                  >
                    Garder comme référence
                  </button>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </fieldset>
    </section>
  );
}
