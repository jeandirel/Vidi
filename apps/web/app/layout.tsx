import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://vidi.ai'),
  title: {
    template: '%s | Vidi',
    default: 'Vidi — Studio de création vidéo UGC par IA',
  },
  description:
    'Créez des publicités vidéo UGC professionnelles avec intelligence artificielle. Scripts AIDA & PAS, avatars réalistes, voix naturelles et rendu MP4 haute fidélité.',
  keywords: [
    'UGC',
    'publicité vidéo IA',
    'avatars IA',
    'TikTok Ads',
    'Meta Ads',
    'Reels',
    'Shorts',
    'générateur vidéo e-commerce',
  ],
  authors: [{ name: 'Vidi Technologies' }],
  creator: 'Vidi Technologies',
  publisher: 'Vidi Technologies',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://vidi.ai',
    siteName: 'Vidi',
    title: 'Vidi — Studio de création vidéo UGC par IA',
    description:
      'Créez des publicités vidéo UGC professionnelles avec intelligence artificielle. Rendu MP4 haute fidélité.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vidi — Studio de création vidéo UGC par IA',
    description: 'Transformez vos produits en créations publicitaires vidéo ultra-rentables.',
  },
};

export const viewport: Viewport = {
  themeColor: '#08090d',
  width: 'device-width',
  initialScale: 1,
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Vidi',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'All',
      offers: [
        {
          '@type': 'Offer',
          name: 'Starter',
          price: '99',
          priceCurrency: 'EUR',
        },
        {
          '@type': 'Offer',
          name: 'Pro',
          price: '299',
          priceCurrency: 'EUR',
        },
        {
          '@type': 'Offer',
          name: 'Agency',
          price: '999',
          priceCurrency: 'EUR',
        },
      ],
      description:
        'Plateforme SaaS de production automatisée de publicités vidéo UGC avec avatars IA, scripts marketing et rendu MP4 natif.',
    },
    {
      '@type': 'Organization',
      name: 'Vidi Technologies',
      url: 'https://vidi.ai',
      logo: 'https://vidi.ai/icon.png',
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
