'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client-api';
export default function VoiceChoice({
  workspaceId,
  value,
  onChange,
}: {
  workspaceId: string;
  value: string;
  onChange: (id: string) => void;
}) {
  const [voices, setVoices] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    if (workspaceId)
      void api<{ profiles: typeof voices }>(`/api/voices?workspaceId=${workspaceId}`)
        .then((r) => {
          if (live) setVoices(r.profiles);
        })
        .catch(() => {
          if (live) setError('Ouvrez Mon espace pour préparer une voix.');
        });
    return () => {
      live = false;
    };
  }, [workspaceId]);
  return (
    <label className="field">
      Voix autorisée du projet
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choisir une voix</option>
        {voices.map((voice) => (
          <option key={voice.id} value={voice.id}>
            {voice.name}
          </option>
        ))}
      </select>
      <small className="muted">
        {error || 'Profils et déclarations de droits dans Mon espace. Offre Pro ou Agency requise.'}
      </small>
    </label>
  );
}
