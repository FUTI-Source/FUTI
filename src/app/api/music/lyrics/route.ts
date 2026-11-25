import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { SITE_MUSIC_PLAYLIST } from '@/config/site';
import { queryLocalLyric } from '@/features/music/server/meting';
import { jsonError } from '@/lib/http/api-response';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')?.trim();
  if (!id || id.length > 100) {
    return jsonError(400, 'INVALID_LYRIC_ID', '歌词 ID 不合法');
  }

  const lyric = await queryLocalLyric(SITE_MUSIC_PLAYLIST.server, id);
  if (!lyric) {
    return jsonError(404, 'LYRIC_NOT_FOUND', '这首歌暂时没有歌词');
  }

  return NextResponse.json({ lyric });
}
