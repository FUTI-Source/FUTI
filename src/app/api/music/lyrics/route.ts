import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { SITE_MUSIC_PLAYLIST, type MusicServer } from '@/config/site';
import { queryLocalLyric } from '@/features/music/server/meting';
import { jsonError } from '@/lib/http/api-response';

export const runtime = 'nodejs';

const SERVERS = new Set<MusicServer>(['netease', 'tencent', 'kugou', 'kuwo', 'migu']);

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')?.trim();
  const server = request.nextUrl.searchParams.get('server') ?? SITE_MUSIC_PLAYLIST.server;
  if (!id || id.length > 100) {
    return jsonError(400, 'INVALID_LYRIC_ID', '歌词 ID 不合法');
  }
  if (!SERVERS.has(server as MusicServer)) {
    return jsonError(400, 'INVALID_SERVER', '不支持的音乐平台');
  }

  let lyric: string | undefined;
  try {
    lyric = await queryLocalLyric(server as MusicServer, id);
  } catch {
    return jsonError(502, 'LYRIC_FETCH_FAILED', '歌词读取失败，请稍后重试');
  }

  if (!lyric) {
    return jsonError(404, 'LYRIC_NOT_FOUND', '这首歌暂时没有歌词');
  }

  return NextResponse.json({ lyric });
}
