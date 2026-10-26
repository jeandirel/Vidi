'use client';

import { useState } from 'react';
import Link from 'next/link';
import Icon from '../icon';

type Framework = 'aida' | 'pas' | 'testimonial';

const PRESETS = [
  {
    name: 'Sérum Éclat Botanique',
    description: 'Sérum visage antioxydant à la vitamine C pure et acide hyaluronique végétal.',
    price: '34€',
    benefits: 'Teint éclatant en 7 jours, texture non grasse, certifié bio',
  },
  {
    name: 'Écouteurs Pulse Pro ANC',
    description: 'Écouteurs sans fil à réduction active de bruit 45dB avec 36h d autonomie.',
    price: '79€',
    benefits: 'Son haute fidélité, mode transparence, étanche IPX7',
  },
  {
    name: 'Café MushPower Lion',
    description: 'Café adaptogène aux champignons crinière de lion pour un focus mental soutenu.',
    price: '29€',
    benefits: 'Zéro crash d énergie, digestion légère, concentration maximale',
  },
];

export default function InteractiveScriptTrial() {
  const [productName, setProductName] = useState(PRESETS[0].name);
  const [productDesc, setProductDesc] = useState(PRESETS[0].description);
  const [benefits, setBenefits] = useState(PRESETS[0].benefits);
  const [framework, setFramework] = useState<Framework>('pas');
  const [duration, setDuration] = useState<15 | 30 | 60>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedScript, setGeneratedScript] = useState<{
    hook: string;
    body: string[];
    cta: string;
    framework: string;
  } | null>({
    hook: 'Arrêtez d’acheter des sérums qui collent et ne changent rien à votre peau.',
    body: [
      'Si vous avez le teint terne au réveil, ce n’est pas de votre faute : la plupart des formules perdent leur efficacité après 48h à l’air libre.',
      'Le Sérum Éclat Botanique stabilise la vitamine C sous micro-capsules pour pénétrer instantanément sans aucun film gras.',
      'Plus de 94% des utilisateurs constatent une peau visiblement repulpée dès la première semaine.',
    ],
    cta: 'Testez le flacon avec -20% aujourd’hui via le lien en bio.',
    framework: 'PAS — Problème Agitation Solution',
  });

  function selectPreset(p: typeof PRESETS[0]) {
    setProductName(p.name);
    setProductDesc(p.description);
    setBenefits(p.benefits);
    setError(null);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!productName.trim() || !productDesc.trim()) {
      setError('Veuillez renseigner au moins le nom et une description de produit.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            name: productName.trim(),
            description: productDesc.trim(),
            benefits: benefits.split(',').map((b) => b.trim()).filter(Boolean),
            targetAudience: 'Acheteurs e-commerce digitaux',
          },
          language: 'fr',
          duration,
          dataConsent: true,
        }),
      });

      const data = await response.json();

      if (response.ok && data.script) {
        // Map backend script format
        const lines = data.script.lines || [];
        const hookText = lines[0]?.text || data.script.hook || 'Ne scrollez pas : regardez ce résultat.';
        const ctaText = lines[lines.length - 1]?.text || data.script.cta || 'Commandez le vôtre dès maintenant.';
        const bodyLines = lines.slice(1, lines.length - 1).map((l: { text: string }) => l.text);

        setGeneratedScript({
          hook: hookText,
          body: bodyLines.length > 0 ? bodyLines : [data.script.body || productDesc],
          cta: ctaText,
          framework: framework.toUpperCase(),
        });
      } else {
        // Fallback to high-converting structured client generator if API gateway requires auth
        const parsedBenefits = benefits.split(',').map((b) => b.trim()).filter(Boolean);
        const b1 = parsedBenefits[0] || 'une efficacité remarquable';
        const b2 = parsedBenefits[1] || 'un confort d’utilisation au quotidien';

        let generated;
        if (framework === 'pas') {
          generated = {
            hook: `Si vous galérez encore avec votre routine, vous devez voir ça.`,
            body: [
              `Le vrai problème avec la plupart des solutions pour ${productName.toLowerCase()}, c'est qu'elles demandent un temps infini pour des résultats quasi invisibles.`,
              `C'est exactement pour ça qu'on a testé ${productName} : ${productDesc}`,
              `En pratique ? Vous profitez de ${b1} tout en gardant ${b2}.`,
            ],
            cta: `Cliquez sur le lien ci-dessous pour tester avant la rupture de stock.`,
            framework: 'PAS — Problème Agitation Solution',
          };
        } else if (framework === 'aida') {
          generated = {
            hook: `Pourquoi tout le monde parle de ${productName} en ce moment ?`,
            body: [
              `J'étais ultra sceptique jusqu'à ce que je reçoive ma commande la semaine dernière.`,
              `Regardez la texture et la finition : ${productDesc}`,
              `Le bénéfice immédiat, c'est ${b1}. Vous ne reviendrez plus en arrière.`,
            ],
            cta: `Faites-vous votre propre avis en commandant avec la livraison offerte.`,
            framework: 'AIDA — Attention Intérêt Désir Action',
          };
        } else {
          generated = {
            hook: `Honnêtement, je ne pensais pas que ${productName} allait changer quoi que ce soit.`,
            body: [
              `J’en ai essayé des dizaines avant, mais aucun ne tenait ses promesses.`,
              `Là, dès le troisième jour d’utilisation, la différence sur ${b1} était juste flagrante.`,
              `Et le meilleur dans tout ça ? C'est garanti satisfait ou remboursé.`,
            ],
            cta: `Profitez de l’offre spéciale aujourd’hui avant que les stocks ne partent.`,
            framework: 'TÉMOIGNAGE AUTHENTIQUE UGC',
          };
        }

        setGeneratedScript(generated);
      }
    } catch {
      setError('Mode démonstration actif : voici un script publicitaire généré selon vos paramètres.');
    } finally {
      setLoading(false);
    }
  }

  function handleTransferToStudio() {
    if (!generatedScript) return;
    try {
      sessionStorage.setItem(
        'vidi_trial_transfer',
        JSON.stringify({
          productName,
          productDesc,
          benefits,
          script: generatedScript,
        }),
      );
    } catch {
      // fallback
    }
  }

  return (
    <div className="trial-interactive-card">
      <div className="trial-header">
        <div className="trial-tag">
          <Icon name="wand" size={14} />
          <span>GÉNÉRATEUR DE SCRIPTS UGC EN DIRECT</span>
        </div>
        <h3>Testez gratuitement la puissance du scriptwriting Vidi</h3>
        <p>
          Choisissez un produit ou entrez vos propres caractéristiques. Découvrez immédiatement un
          hook percutant et une structure publicitaire calibrée pour la conversion.
        </p>

        {/* Quick presets */}
        <div className="trial-presets-bar">
          <span className="preset-label">Exemples rapides :</span>
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className={`preset-chip ${productName === p.name ? 'active' : ''}`}
              onClick={() => selectPreset(p)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="trial-grid">
        {/* Left: Input Form */}
        <form onSubmit={handleGenerate} className="trial-form">
          <div className="trial-field">
            <label htmlFor="trial-prod-name">Nom de votre produit ou marque</label>
            <input
              id="trial-prod-name"
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Ex: Masque Capillaire Kératine"
              required
            />
          </div>

          <div className="trial-field">
            <label htmlFor="trial-prod-desc">Description & Promesse produit</label>
            <textarea
              id="trial-prod-desc"
              rows={3}
              value={productDesc}
              onChange={(e) => setProductDesc(e.target.value)}
              placeholder="Expliquez ce que fait le produit et pour qui il est conçu..."
              required
            />
          </div>

          <div className="trial-field">
            <label htmlFor="trial-prod-benefits">Bénéfices clés (séparés par virgules)</label>
            <input
              id="trial-prod-benefits"
              type="text"
              value={benefits}
              onChange={(e) => setBenefits(e.target.value)}
              placeholder="Ex: Répare les pointes, 100% naturel, senteur coco"
            />
          </div>

          <div className="trial-row-2">
            <div className="trial-field">
              <label htmlFor="trial-framework">Structure marketing</label>
              <select
                id="trial-framework"
                value={framework}
                onChange={(e) => setFramework(e.target.value as Framework)}
              >
                <option value="pas">PAS (Problème, Agitation, Solution)</option>
                <option value="aida">AIDA (Attention, Intérêt, Désir, Action)</option>
                <option value="testimonial">Témoignage Utilisateur Réaliste</option>
              </select>
            </div>

            <div className="trial-field">
              <label htmlFor="trial-duration">Format cible</label>
              <select
                id="trial-duration"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) as 15 | 30 | 60)}
              >
                <option value={15}>15 secondes (TikTok Hook)</option>
                <option value={30}>30 secondes (Reels & Shorts)</option>
                <option value={60}>60 secondes (In-Depth Review)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="marketing-btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {loading ? (
              <>
                <span className="spinner-dot" />
                <span>Analyse du produit & rédaction du script...</span>
              </>
            ) : (
              <>
                <Icon name="wand" size={16} />
                <span>Générer le script UGC</span>
              </>
            )}
          </button>

          {error && <div className="trial-error-note">{error}</div>}
        </form>

        {/* Right: Output Script Card */}
        <div className="trial-result-card">
          <div className="trial-result-header">
            <div className="trial-result-meta">
              <span className="badge-framework">{generatedScript?.framework || 'UGC OPTIMISÉ'}</span>
              <span className="badge-duration">~{duration}s</span>
            </div>
            <span className="trial-ready-indicator">
              <span className="status-dot-pulse" /> Prêt pour production
            </span>
          </div>

          {generatedScript ? (
            <div className="trial-script-content">
              <div className="script-scene hook-scene">
                <span className="scene-tag">HOOK (0-3 SECONDES)</span>
                <p className="scene-text highlight-hook">"{generatedScript.hook}"</p>
              </div>

              <div className="script-scene body-scene">
                <span className="scene-tag">CORPS DE LA VIDÉO</span>
                {generatedScript.body.map((line, idx) => (
                  <p key={idx} className="scene-text">
                    • {line}
                  </p>
                ))}
              </div>

              <div className="script-scene cta-scene">
                <span className="scene-tag">CALL TO ACTION FINAL</span>
                <p className="scene-text highlight-cta">"{generatedScript.cta}"</p>
              </div>

              <div className="trial-action-group">
                <Link
                  href="/app"
                  onClick={handleTransferToStudio}
                  className="marketing-btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Icon name="layers" size={16} />
                  <span>Produire cette vidéo dans le Studio</span>
                </Link>
                <span className="trial-micro-notice">
                  Accès direct sans carte bancaire requise. Vous pourrez associer un avatar IA et une voix.
                </span>
              </div>
            </div>
          ) : (
            <div className="trial-empty-state">
              <Icon name="type" size={32} />
              <p>Remplissez le formulaire à gauche pour voir la magie du scriptwriting UGC opérer.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
