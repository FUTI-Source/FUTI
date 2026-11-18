import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';

import './globals.css';

const geometos = localFont({
  src: '../../public/fonts/Geometos.woff',
  display: 'swap',
  variable: '--font-geometos',
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL('https://zhang-wentao.tech'),
  title: 'FUTI · 个人主页',
  description: '独立开发者个人主页，欢迎通过邮件与我联系。',
  icons: {
    icon: '/favicon.ico',
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'FUTI · 个人主页',
    description: '独立开发者个人主页，欢迎通过邮件与我联系。',
    images: [{ url: '/og-image.png' }],
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
      </body>
    </html>
  );
}
