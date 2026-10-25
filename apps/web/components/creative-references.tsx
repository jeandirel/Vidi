'use client';
import { type ProjectInput } from '@vidi/core';
export default function CreativeReferences({
  project: p,
  update,
}: {
  project: ProjectInput;
  update: (p: ProjectInput) => void;
}) {
  const references = p.campaign?.inspiration || [];
  if (!references.length || !p.campaign) return null;
  const campaign = p.campaign;
  return (
    <section className="lab-card">
      <h2>Références créatives</h2>
      <p className="lab-note">
        Titres et notes disponibles pour la rédaction IA. Le contenu de la vidéo n’a pas été
        analysé.
      </p>
      {references.map((reference) => (
        <article className="lab-evidence" key={reference.url}>
          <div>
            <a href={reference.url} target="_blank" rel="noreferrer">
              {reference.title}
            </a>
            <label className="field">
              Intention pour cette référence
              <textarea
                maxLength={600}
                rows={2}
                value={reference.note}
                onChange={(e) =>
                  update({
                    ...p,
                    campaign: {
                      ...campaign,
                      inspiration: references.map((r) =>
                        r.url === reference.url ? { ...r, note: e.target.value } : r,
                      ),
                    },
                  })
                }
                placeholder="Ex. Tester une question courte en ouverture, sans reprendre le texte."
              />
            </label>
            <button
              className="text-button"
              onClick={() =>
                update({
                  ...p,
                  campaign: {
                    ...campaign,
                    inspiration: references.filter((r) => r.url !== reference.url),
                  },
                })
              }
            >
              Retirer la référence
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
