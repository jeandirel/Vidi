import Studio from '@/components/studio';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Studio — Vidi',
  description: 'Espace de création de publicités vidéo UGC avec avatars IA, scripts et voix.',
};

export default function AppPage() {
  return <Studio />;
}
