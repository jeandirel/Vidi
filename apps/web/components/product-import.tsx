'use client';
import { useEffect, useRef, useState } from 'react';
import type { ImportedProduct } from '@/lib/product-metadata';
import Icon from './icon';

type Props = {
  url: string;
  workspaceId: string;
  onLogin: () => void;
  onApply: (product: ImportedProduct) => void;
  notify: (message: string) => void;
};
export default function ProductImport({ url, workspaceId, onLogin, onApply, notify }: Props) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ImportedProduct | null>(null);
  const [useImage, setUseImage] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function importProduct() {
    if (!workspaceId) {
      onLogin();
      return;
    }
    if (!url.trim()) {
      notify('Ajoutez le lien HTTPS d’une fiche produit.');
      return;
    }
    controller.current?.abort();
    const requestController = new AbortController();
    controller.current = requestController;
    setPending(true);
    setResult(null);
    setUseImage(false);
    try {
      const response = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, url }),
        signal: requestController.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Import impossible.');
      setResult(data.product);
    } catch (error) {
      if (!requestController.signal.aborted)
        notify(error instanceof Error ? error.message : 'Import impossible.');
    } finally {
      if (!requestController.signal.aborted) setPending(false);
    }
  }
  return (
    <div className="product-import">
      <div className="import-actions">
        <p>Importez une fiche publique, puis vérifiez les informations.</p>
        <button
          className="button secondary compact"
          disabled={pending}
          onClick={() => void importProduct()}
        >
          <Icon
            name={pending ? 'loader' : 'download'}
            className={pending ? 'spin' : ''}
            size={14}
          />
          {pending ? 'Lecture de la fiche…' : 'Importer la fiche'}
        </button>
      </div>
      {pending ? (
        <div className="script-skeleton" role="status" aria-label="Import de la fiche en cours">
          <i />
          <i />
        </div>
      ) : null}
      {result ? (
        <section className="import-review" aria-label="Informations récupérées">
          <div className="import-review-heading">
            <strong>Vérifier avant d’appliquer</strong>
            <button
              className="icon-button"
              aria-label="Fermer les informations importées"
              onClick={() => setResult(null)}
            >
              <Icon name="close" size={15} />
            </button>
          </div>
          <h3>{result.name}</h3>
          <p>{result.description || 'Aucune description récupérée.'}</p>
          <a href={result.url} target="_blank" rel="noopener noreferrer">
            Voir la fiche source <Icon name="external" size={12} />
          </a>
          <ul>
            {result.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          {result.image ? (
            <label className="import-image-choice">
              <input
                type="checkbox"
                checked={useImage}
                onChange={(e) => setUseImage(e.target.checked)}
              />
              Utiliser aussi l’image de la fiche (si vous en avez les droits)
            </label>
          ) : null}
          <p className="import-replace-note">
            Appliquer remplace les informations produit actuelles et remet le script à zéro.
          </p>
          <button
            className="button primary compact"
            onClick={() => {
              onApply({ ...result, image: useImage ? result.image : '' });
              setResult(null);
            }}
          >
            Appliquer à mon projet
            <Icon name="check" size={14} />
          </button>
        </section>
      ) : null}
    </div>
  );
}
