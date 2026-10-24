import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Vidi — Studio de création UGC',
  description:
    'Transformez vos produits en créations publicitaires. Scripts, avatars, voix et montage dans un seul studio.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
