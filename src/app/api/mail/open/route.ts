import { NextResponse, type NextRequest } from 'next/server';

import { SITE_MAILBOX } from '@/lib/site';

/** 按设备跳转邮箱：iPhone/iPad 走通用链接唤起 139 邮箱 App，其余打开电脑端网页版 */
export function GET(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') ?? '';
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const target = isIOS ? SITE_MAILBOX.ios : SITE_MAILBOX.desktop;

  return NextResponse.redirect(target, {
    status: 302,
    headers: { 'Cache-Control': 'no-store' },
  });
}
