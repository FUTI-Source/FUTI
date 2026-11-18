import type { Metadata, Viewport } from 'next';

import './globals.css';

export const metadata: Metadata = {
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
      <body>
        {children}
      </body>
    </html>
  );
}
