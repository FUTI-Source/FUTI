import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import type { MusicServer } from '@/config/site';
import { queryLocalTrack } from '@/features/music/server/meting';
import { jsonError } from '@/lib/http/api-response';

export const runtime = 'nodejs';

const SERVERS = new Set<MusicServer>(['netease', 'tencent', 'kugou', 'kuwo', 'migu']);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const server = params.get('server');
  const id = params.get('id')?.trim();

  if (!server || !SERVERS.has(server as MusicServer)) {
    return jsonError(400, 'INVALID_SERVER', '不支持的音乐平台');
  }
  if (!id || id.length > 100) {
    return jsonError(400, 'INVALID_ID', '歌曲 ID 不合法');
  }

  try {
    const track = await queryLocalTrack(server as MusicServer, id);
    if (!track) {
      return jsonError(404, 'TRACK_NOT_FOUND', '没有找到这首歌');
    }
    return NextResponse.json({ track });
  } catch {
    return jsonError(502, 'TRACK_RESOLVE_FAILED', '音源解析失败，请稍后重试');
  }
}
