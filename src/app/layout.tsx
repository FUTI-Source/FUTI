import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';

import { ServiceWorkerRegistration } from '@/components/pwa/service-worker-registration';
import { SITE_URL } from '@/lib/site';

import './globals.css';

const geometos = localFont({
  src: '../../public/fonts/Geometos.woff',
  display: 'swap',
  variable: '--font-geometos',
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: 'FUTI',
  title: {
    default: 'FUTI · 个人主页',
    template: '%s | FUTI',
  },
  description: 'FUTI（张文涛）的个人主页，分享全栈开发、开源项目与技术实践。',
  authors: [{ name: 'FUTI', url: SITE_URL }],
  creator: 'FUTI',
  publisher: 'FUTI',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icon-192.png',
  },
  manifest: '/manifest.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: SITE_URL,
    siteName: 'FUTI · 个人主页',
    title: 'FUTI · 个人主页',
    description: 'FUTI（张文涛）的个人主页，分享全栈开发、开源项目与技术实践。',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FUTI 个人主页',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FUTI · 个人主页',
    description: 'FUTI（张文涛）的个人主页，分享全栈开发、开源项目与技术实践。',
    images: ['/og-image.png'],
  },
  appleWebApp: {
    capable: true,
    title: 'FUTI',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#15161a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={geometos.variable}>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
