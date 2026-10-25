'use client';
import { useEffect, useRef, useState } from 'react';
import {
  campaignSchema,
  createVariants,
  evidenceSchema,
  metricsFor,
  productSchema,
  readResultsCsv,
  renderCost,
  reviewScript,
  scriptSchema,
  toCsv,
  type BrandBrief,
  type Campaign,
  type Metrics,
  type ProjectInput,
  type Variant,
} from '@vidi/core';
import Icon from './icon';

type Props = {
  project: ProjectInput;
  update: (p: ProjectInput) => void;
  onEdit: (variant?: Variant) => void;
  onSave: () => void;
  onCloudSave: () => void;
  notify: (message: string) => void;
  busy: boolean;
};
function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function CampaignLab({
  project: p,
  update,
  onEdit,
  onSave,
  onCloudSave,
  notify,
  busy,
}: Props) {
  const c = p.campaign || campaignSchema.parse({});
  const [tab, setTab] = useState<'brief' | 'variants' | 'results'>('brief');
  const [variable, setVariable] = useState<Variant['variable']>('hook');
  const [alternatives, setAlternatives] = useState(['', '']);
  const [claim, setClaim] = useState('');
  const [source, setSource] = useState('');
  const [note, setNote] = useState('');
  const [resultSource, setResultSource] = useState(
    c.resultContext?.source || 'Export publicitaire',
  );
  const [period, setPeriod] = useState(c.resultContext?.period || '');
  const [currency, setCurrency] = useState<'EUR' | 'USD' | 'GBP' | 'XAF' | 'XOF'>(
    c.resultContext?.currency || 'EUR',
  );
  const [pending, setPending] = useState<{
    results: Metrics[];
    context: NonNullable<Campaign['resultContext']>;
  } | null>(null);
  const [reading, setReading] = useState(false);
  const [sort, setSort] = useState<'ctr' | 'cpa' | 'roas'>('ctr');
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  function change(next: Campaign) {
    update({ ...p, campaign: next });
  }
  function brief(key: keyof BrandBrief, value: string) {
    change({ ...c, brief: { ...c.brief, [key]: value } });
  }
  const check = reviewScript(p.script, p.duration, c.brief, c.evidence, p.language);
  const totalCredits = c.variants.reduce(
    (total, v) => total + renderCost(v.duration, v.resolution),
    0,
  );
  function addEvidence() {
    const result = evidenceSchema.safeParse({ id: crypto.randomUUID(), claim, source, note });
    if (!result.success) {
      notify('Ajoutez un argument et une URL HTTPS valide sans identifiants.');
      return;
    }
    if (c.evidence.length >= 8) {
      notify('Maximum 8 sources par campagne.');
      return;
    }
    change({ ...c, evidence: [...c.evidence, result.data] });
    setClaim('');
    setSource('');
    setNote('');
  }
  function build() {
    try {
      productSchema.parse(p.product);
      scriptSchema.parse(p.script);
      const variants = createVariants(
        {
          script: p.script,
          avatarId: p.avatarId,
          voiceId: p.voiceId,
          language: p.language,
          emotion: p.emotion,
          duration: p.duration,
          resolution: p.resolution,
          productName: p.product.name,
        },
        variable,
        alternatives,
        crypto.randomUUID(),
        new Date().toISOString(),
      );
      if (c.variants.length + variants.length > 24)
        throw new Error('Maximum 24 variantes. Supprimez un test avant d’en ajouter.');
      change(campaignSchema.parse({ ...c, variants: [...c.variants, ...variants] }));
      setAlternatives(['', '']);
      notify(`${variants.length} variantes préparées. Aucun rendu lancé ni crédit débité.`);
    } catch (e) {
      notify(
        e instanceof Error && e.name !== 'ZodError'
          ? e.message
          : 'Complétez le produit et le script dans le studio.',
      );
    }
  }
  function template() {
    download(
      'vidi-modele-resultats.csv',
      toCsv([
        ['variant_id', 'impressions', 'clicks', 'spend', 'conversions', 'revenue'],
        ...c.variants.map((v) => [v.id, '', '', '', '', '']),
      ]),
      'text/csv;charset=utf-8',
    );
  }
  async function readFile(file?: File) {
    if (!file) return;
    setPending(null);
    if (file.size > 100000) {
      notify('Le fichier dépasse 100 Ko.');
      return;
    }
    if (!period.trim() || !resultSource.trim()) {
      notify('Indiquez la source et la période avant l’import.');
      return;
    }
    setReading(true);
    try {
      const contents = await file.text();
      if (!alive.current) return;
      const results = readResultsCsv(
        contents,
        c.variants.map((v) => v.id),
      );
      setPending({
        results,
        context: { source: resultSource, period, currency, importedAt: new Date().toISOString() },
      });
    } catch (e) {
      if (alive.current) notify((e as Error).message);
    } finally {
      if (alive.current) setReading(false);
    }
  }
  function confirmImport() {
    if (!pending) return;
    try {
      change(
        campaignSchema.parse({ ...c, results: pending.results, resultContext: pending.context }),
      );
      setPending(null);
      notify('Résultats remplacés par cet import. Enregistrez votre projet pour les conserver.');
    } catch {
      notify('Les variantes ont changé. Réimportez le fichier.');
      setPending(null);
    }
  }
  function exportPack() {
    try {
      const campaign = campaignSchema.parse(c);
      const product = productSchema.parse(p.product);
      const pack = {
        version: 1,
        exportedAt: new Date().toISOString(),
        title: p.title,
        product: {
          name: product.name,
          description: product.description,
          benefits: product.benefits,
          url: product.url,
        },
        campaign,
        checks: campaign.variants.map((v) => ({
          variantId: v.id,
          ...reviewScript(v.script, v.duration, campaign.brief, campaign.evidence, v.language),
        })),
        estimatedVidiCredits: totalCredits,
        notes: [
          'Scripts et paramètres de préparation ; aucune vidéo incluse.',
          'Contrôles indicatifs par règles, sans prédiction de performance.',
          'Les sources et résultats sont déclarés par l’utilisateur.',
        ],
      };
      download('vidi-campagne.json', JSON.stringify(pack, null, 2), 'application/json');
    } catch {
      notify('Complétez le produit et vérifiez les champs du brief avant l’export.');
    }
  }
  const ranked = c.results
    .map((result) => ({
      result,
      metrics: metricsFor(result),
      variant: c.variants.find((v) => v.id === result.variantId)!,
    }))
    .sort((a, b) => {
      const x = a.metrics[sort],
        y = b.metrics[sort];
      if (x === null) return y === null ? 0 : 1;
      if (y === null) return -1;
      return sort === 'cpa' ? x - y : y - x;
    });
  const number = (value: number | null, suffix = '') =>
    value === null ? '—' : value.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + suffix;
  const groups = [...new Set(c.variants.map((v) => v.testId))];
  return (
    <div className="campaign-lab">
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span /> VIDI LAB
          </div>
          <h1>Créez avec une intention. Testez avec des faits.</h1>
          <p>Un brief, des variantes comparables et les résultats que vous importez.</p>
        </div>
        <div className="lab-actions">
          <button className="button secondary compact" onClick={onSave} disabled={busy}>
            <Icon name="save" size={15} /> Enregistrer
          </button>
          <button className="button secondary compact" onClick={onCloudSave} disabled={busy}>
            <Icon name="cloud" size={15} /> Enregistrer en ligne
          </button>
        </div>
      </section>
      <div className="lab-summary">
        <div>
          <small>PROJET EN COURS</small>
          <strong>{p.title}</strong>
          <button className="text-button" onClick={() => onEdit()}>
            Ouvrir le studio <Icon name="next" size={14} />
          </button>
        </div>
        <div>
          <small>VARIANTES PRÉPARÉES</small>
          <strong>
            {c.variants.length}
            <em> / 24</em>
          </strong>
          <span>Aucun rendu automatique</span>
        </div>
        <div>
          <small>RENDU À PRÉVOIR</small>
          <strong>
            {totalCredits}
            <em> crédits Vidi</em>
          </strong>
          <span>Estimation selon durée et résolution ; aucun débit</span>
        </div>
        <div>
          <small>RÉSULTATS IMPORTÉS</small>
          <strong>{c.results.length}</strong>
          <span>{c.resultContext?.period || 'En attente de vos données'}</span>
        </div>
      </div>
      <div className="lab-navigation" aria-label="Sections du laboratoire">
        {(
          [
            ['brief', '01', 'Brief & preuves'],
            ['variants', '02', 'Tests créatifs'],
            ['results', '03', 'Résultats'],
          ] as const
        ).map(([id, n, label]) => (
          <button
            key={id}
            aria-pressed={tab === id}
            className={tab === id ? 'selected' : ''}
            onClick={() => setTab(id)}
          >
            <span>{n}</span>
            {label}
          </button>
        ))}
        <button className="lab-export" onClick={exportPack}>
          <Icon name="download" size={15} /> Exporter le dossier
        </button>
      </div>
      <fieldset className="editor-fieldset" disabled={busy || reading}>
        {tab === 'brief' ? (
          <div className="lab-columns">
            <section className="lab-card">
              <div className="lab-card-heading">
                <Icon name="type" />
                <div>
                  <h2>La marque donne le ton.</h2>
                  <p>Ces consignes accompagnent la rédaction IA du script.</p>
                </div>
              </div>
              <div className="lab-fields">
                <label className="field">
                  Marque
                  <input
                    value={c.brief.name}
                    maxLength={120}
                    onChange={(e) => brief('name', e.target.value)}
                    placeholder="Ex. Lumé"
                  />
                </label>
                <label className="field">
                  Objectif
                  <select
                    value={c.brief.objective}
                    onChange={(e) => brief('objective', e.target.value)}
                  >
                    <option value="sales">Ventes</option>
                    <option value="traffic">Visites de la boutique</option>
                    <option value="awareness">Notoriété</option>
                  </select>
                </label>
              </div>
              <label className="field">
                Audience de la campagne
                <input
                  value={c.brief.audience}
                  maxLength={300}
                  onChange={(e) => brief('audience', e.target.value)}
                  placeholder="Besoins, contexte, objections"
                />
              </label>
              <label className="field">
                Ton de la marque
                <textarea
                  rows={2}
                  value={c.brief.tone}
                  maxLength={300}
                  onChange={(e) => brief('tone', e.target.value)}
                  placeholder="Simple, chaleureux, sans superlatifs"
                />
              </label>
              <div className="lab-fields">
                <label className="field">
                  Mentions à inclure <span className="optional">Une par ligne</span>
                  <textarea
                    rows={3}
                    maxLength={600}
                    value={c.brief.required}
                    onChange={(e) => brief('required', e.target.value)}
                  />
                </label>
                <label className="field">
                  Expressions à éviter <span className="optional">Une par ligne</span>
                  <textarea
                    rows={3}
                    maxLength={600}
                    value={c.brief.avoided}
                    onChange={(e) => brief('avoided', e.target.value)}
                  />
                </label>
              </div>
              <p className="lab-note">
                Brief propre à ce projet. Enregistrez pour le retrouver sur cet appareil ou dans
                votre espace cloud.
              </p>
            </section>
            <div className="lab-stack">
              <section className="lab-card">
                <div className="lab-card-heading">
                  <Icon name="link" />
                  <div>
                    <h2>Les arguments ont une source.</h2>
                    <p>Reliez une formulation précise à une fiche ou un document public.</p>
                  </div>
                </div>
                {c.evidence.map((e) => (
                  <article className="lab-evidence" key={e.id}>
                    <div>
                      <strong>{e.claim}</strong>
                      <a href={e.source} target="_blank" rel="noreferrer">
                        {e.source}
                        <Icon name="external" size={12} />
                      </a>
                      {e.note ? <p>{e.note}</p> : null}
                    </div>
                    <button
                      className="icon-button"
                      aria-label={`Retirer la source ${e.claim}`}
                      onClick={() =>
                        change({ ...c, evidence: c.evidence.filter((item) => item.id !== e.id) })
                      }
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </article>
                ))}
                <label className="field">
                  Argument à sourcer
                  <input
                    value={claim}
                    maxLength={300}
                    onChange={(e) => setClaim(e.target.value)}
                    placeholder="Ex. Flacon rechargeable"
                  />
                </label>
                <label className="field">
                  URL de la preuve
                  <input
                    type="url"
                    value={source}
                    maxLength={2000}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="https://votre-boutique.com/produit"
                  />
                </label>
                <label className="field">
                  Note de vérification
                  <input
                    value={note}
                    maxLength={600}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ex. Fiche fabricant consultée le…"
                  />
                </label>
                <button
                  className="button secondary compact"
                  disabled={c.evidence.length >= 8}
                  onClick={addEvidence}
                >
                  <Icon name="plus" size={14} /> Ajouter la source
                </button>
                <p className="lab-note">
                  Sources déclarées par vous ; Vidi ne vérifie pas automatiquement leur contenu.
                  Maximum 8.
                </p>
              </section>
              <section className="lab-card">
                <div className="lab-card-heading">
                  <Icon name="shield" />
                  <div>
                    <h2>Relecture du script actuel</h2>
                    <p>
                      {check.words} mots · lecture estimée {check.estimatedSeconds} s ·{' '}
                      {check.linkedEvidence.length} argument(s) sourcé(s) retrouvé(s)
                    </p>
                  </div>
                </div>
                <ul className="lab-checks">
                  {check.issues.length ? (
                    check.issues.map((issue, i) => (
                      <li key={`${issue.code}-${i}`}>{issue.message}</li>
                    ))
                  ) : (
                    <li>Aucun signal détecté par les règles actuelles.</li>
                  )}
                </ul>
                <p className="lab-note">
                  Contrôle indicatif par correspondance de texte, sans validation juridique ni
                  garantie de performance. Détection des promesses et témoignages en
                  français/anglais ; limitée dans les autres langues.
                </p>
              </section>
            </div>
          </div>
        ) : null}
        {tab === 'variants' ? (
          <div className="lab-stack">
            <section className="lab-card">
              <div className="lab-card-heading">
                <Icon name="layers" />
                <div>
                  <h2>Une variable à la fois.</h2>
                  <p>
                    Le script actuel devient la référence. Le message, la voix, l’avatar, la langue
                    et la durée restent identiques dans ce test.
                  </p>
                </div>
              </div>
              <div className="lab-fields">
                <label className="field">
                  Élément à tester
                  <select
                    value={variable}
                    onChange={(e) => {
                      setVariable(e.target.value as Variant['variable']);
                      setAlternatives(['', '']);
                    }}
                  >
                    <option value="hook">L’accroche</option>
                    <option value="cta">L’appel à l’action</option>
                  </select>
                </label>
                <div className="lab-baseline">
                  <small>RÉFÉRENCE ACTUELLE</small>
                  <p>{p.script[variable] || 'Rédigez d’abord votre script dans le studio.'}</p>
                </div>
              </div>
              <div className="lab-fields">
                {alternatives.map((value, i) => (
                  <label className="field" key={i}>
                    Alternative {i + 1}
                    <textarea
                      rows={2}
                      maxLength={variable === 'hook' ? 400 : 300}
                      value={value}
                      onChange={(e) =>
                        setAlternatives(
                          alternatives.map((old, j) => (i === j ? e.target.value : old)),
                        )
                      }
                    />
                  </label>
                ))}
              </div>
              <button
                className="button primary compact"
                disabled={c.variants.length >= 24}
                onClick={build}
              >
                <Icon name="plus" size={15} /> Préparer le test
              </button>
              <p className="lab-note">
                Préparation de scripts uniquement. Aucun appel au moteur vidéo. Les paramètres de
                chaque variante restent figés même si le projet change ensuite.
              </p>
            </section>
            {groups.map((testId, groupIndex) => (
              <section className="lab-test" key={testId}>
                <div className="lab-test-heading">
                  <h2>
                    Test {groupIndex + 1} ·{' '}
                    {c.variants.find((v) => v.testId === testId)?.variable === 'hook'
                      ? 'Accroches'
                      : 'Appels à l’action'}
                  </h2>
                  <button
                    className="text-button"
                    onClick={() => {
                      if (!window.confirm('Supprimer ce test et ses résultats importés ?')) return;
                      const removed = new Set(
                        c.variants.filter((v) => v.testId === testId).map((v) => v.id),
                      );
                      change({
                        ...c,
                        variants: c.variants.filter((v) => !removed.has(v.id)),
                        results: c.results.filter((r) => !removed.has(r.variantId)),
                      });
                    }}
                  >
                    Supprimer le test
                  </button>
                </div>
                <div className="lab-variant-grid">
                  {c.variants
                    .filter((v) => v.testId === testId)
                    .map((v, i) => {
                      const review = reviewScript(
                        v.script,
                        v.duration,
                        c.brief,
                        c.evidence,
                        v.language,
                      );
                      return (
                        <article className="lab-card lab-variant" key={v.id}>
                          <div className="lab-variant-top">
                            <span className="lab-letter">{String.fromCharCode(65 + i)}</span>
                            <span className="tag">{i === 0 ? 'Référence' : 'Alternative'}</span>
                            <span>
                              {v.duration} s · {v.language.toUpperCase()}
                            </span>
                          </div>
                          <h3>{v.script.hook}</h3>
                          <p>{v.script.body}</p>
                          <strong className="lab-cta">{v.script.cta}</strong>
                          <code>{v.id}</code>
                          <div className="lab-variant-footer">
                            <span>
                              {review.issues.length} point(s) à relire · ≈ {review.estimatedSeconds}{' '}
                              s
                            </span>
                            <button className="text-button" onClick={() => onEdit(v)}>
                              Utiliser dans le studio <Icon name="next" size={14} />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                </div>
              </section>
            ))}
            {!c.variants.length ? (
              <div className="lab-empty">
                <Icon name="layers" size={28} />
                <h2>Votre premier test commence ici.</h2>
                <p>Ajoutez une autre accroche ou un autre CTA pour comparer deux versions.</p>
              </div>
            ) : null}
          </div>
        ) : null}
        {tab === 'results' ? (
          <div className="lab-stack">
            <section className="lab-card">
              <div className="lab-card-heading">
                <Icon name="upload" />
                <div>
                  <h2>Vos données. Vos décisions.</h2>
                  <p>Importez un CSV au format Vidi après avoir diffusé vos créations.</p>
                </div>
              </div>
              <div className="lab-fields lab-three">
                <label className="field">
                  Source des résultats
                  <input
                    maxLength={120}
                    value={resultSource}
                    onChange={(e) => setResultSource(e.target.value)}
                    placeholder="Ex. Export Meta Ads"
                  />
                </label>
                <label className="field">
                  Période et attribution
                  <input
                    maxLength={120}
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    placeholder="Ex. 1–7 octobre · clic 7 j"
                  />
                </label>
                <label className="field">
                  Devise
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as typeof currency)}
                  >
                    {['EUR', 'USD', 'GBP', 'XAF', 'XOF'].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="lab-actions">
                <button
                  className="button secondary compact"
                  disabled={!c.variants.length}
                  onClick={template}
                >
                  <Icon name="download" size={15} /> Modèle CSV
                </button>
                <label className="lab-file">
                  Importer un CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    disabled={!c.variants.length || reading}
                    aria-label="Importer les résultats CSV"
                    onChange={(e) => {
                      void readFile(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
              <p className="lab-note">
                Colonnes : variant_id, impressions, clicks, spend, conversions, revenue.
                Identifiants du modèle, une ligne par variante. Point décimal, pas de séparateur de
                milliers. L’import remplace les résultats précédents après confirmation ; aucune
                connexion Meta/TikTok automatique.
              </p>
              {reading ? <p role="status">Lecture du fichier…</p> : null}
              {pending ? (
                <div className="lab-import-preview" role="region" aria-label="Aperçu des résultats">
                  <strong>
                    {pending.results.length} ligne(s) valides · {pending.context.currency} ·{' '}
                    {pending.context.period}
                  </strong>
                  <p>
                    {c.results.length
                      ? `${c.results.length} résultat(s) existant(s) seront remplacés.`
                      : 'Ces données ne sont pas encore appliquées.'}
                  </p>
                  <div className="lab-actions">
                    <button className="button primary compact" onClick={confirmImport}>
                      Confirmer l’import
                    </button>
                    <button className="button secondary compact" onClick={() => setPending(null)}>
                      Annuler
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
            {c.results.length ? (
              <section className="lab-card">
                <div className="lab-test-heading">
                  <div>
                    <h2>Comparer les résultats observés</h2>
                    <p className="lab-note">
                      {c.resultContext?.source} · {c.resultContext?.period} ·{' '}
                      {c.resultContext?.currency}
                    </p>
                  </div>
                  <label className="field">
                    Trier par
                    <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                      <option value="ctr">CTR décroissant</option>
                      <option value="cpa">CPA croissant</option>
                      <option value="roas">ROAS décroissant</option>
                    </select>
                  </label>
                </div>
                <div className="lab-table-wrap">
                  <table>
                    <caption>
                      Résultats déclarés par variante, sans estimation de significativité
                      statistique.
                    </caption>
                    <thead>
                      <tr>
                        <th>Variante</th>
                        <th>Impressions</th>
                        <th>Clics</th>
                        <th>Dépenses</th>
                        <th>Conversions</th>
                        <th>CTR</th>
                        <th>CPA</th>
                        <th>ROAS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranked.map(({ result, metrics, variant }) => (
                        <tr key={variant.id}>
                          <td>
                            <strong>
                              Test {groups.indexOf(variant.testId) + 1} · {variant.name}
                            </strong>
                            <small>{variant.script[variant.variable]}</small>
                          </td>
                          <td>{number(result.impressions)}</td>
                          <td>{number(result.clicks)}</td>
                          <td>{number(result.spend)}</td>
                          <td>{number(result.conversions)}</td>
                          <td>{number(metrics.ctr, ' %')}</td>
                          <td>{number(metrics.cpa)}</td>
                          <td>{number(metrics.roas, '×')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="lab-note">
                  Un classement descriptif ne prouve pas un gagnant. Comparez des audiences,
                  budgets, périodes et règles d’attribution équivalents. « — » indique un
                  dénominateur nul. Aucune prédiction de ROAS.
                </p>
              </section>
            ) : (
              <div className="lab-empty">
                <Icon name="grid" size={28} />
                <h2>Pas de résultats inventés.</h2>
                <p>Préparez un test, diffusez vos vidéos, puis importez les chiffres observés.</p>
              </div>
            )}
          </div>
        ) : null}
      </fieldset>
    </div>
  );
}
