import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '离线',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main
      style={{
        alignItems: 'center',
        background: '#15161a',
        color: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, sans-serif',
        justifyContent: 'center',
        minHeight: '100dvh',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '24px', margin: '0 0 12px' }}>当前处于离线状态</h1>
      <p style={{ fontSize: '14px', margin: '0 0 24px', opacity: 0.72 }}>
        这个页面还没有缓存。恢复网络后点下面的按钮重新加载。
      </p>
      <Link
        href="/"
        style={{
          background: '#f5f5f5',
          borderRadius: '999px',
          color: '#15161a',
          fontSize: '14px',
          padding: '10px 22px',
          textDecoration: 'none',
        }}
      >
        返回首页
      </Link>
    </main>
  );
}
