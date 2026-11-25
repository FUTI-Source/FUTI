import { NextResponse, type NextRequest } from 'next/server';

import {
  SITE_MUSIC_API_BASE,
  type MetingServer,
  type MetingType,
  type MusicTrack,
} from '@/config/site';
import { jsonError } from '@/lib/http/api-response';
import { queryLocalMeting } from '@/features/music/server/meting';

const SERVERS = new Set<MetingServer>(['netease', 'tencent', 'kugou', 'baidu', 'kuwo']);
const TYPES = new Set<MetingType>(['song', 'playlist', 'album', 'artist', 'search']);

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const isHttpsUrl = (value: string | undefined): value is string => {
  if (!value) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const toHttpsUrl = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const normalized = value.startsWith('//') ? `https:${value}` : value.replace(/^http:\/\//i, 'https://');
  return isHttpsUrl(normalized) ? normalized : undefined;
};

interface MetingItem {
  name?: unknown;
  artist?: unknown;
  url?: unknown;
  cover?: unknown;
  lyric_id?: unknown;
  lyric?: unknown;
}

function normalizeExternalPayload(payload: unknown): MusicTrack[] {
  if (!Array.isArray(payload)) return [];

  return payload.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];

    const item = entry as MetingItem;
    const title = asString(item.name);
    const src = toHttpsUrl(asString(item.url));
    const artist = asString(item.artist);
    const cover = toHttpsUrl(asString(item.cover));
    const lyricId =
      typeof item.lyric_id === 'string' || typeof item.lyric_id === 'number'
        ? String(item.lyric_id)
        : undefined;
    const lyrics = asString(item.lyric);

    if (!title || !src) return [];
    return [{ title, artist, src, cover, lyricId, lyrics }];
  });
}

async function queryExternalMeting(
  base: string,
  server: MetingServer,
  type: MetingType,
  id: string,
): Promise<MusicTrack[] | Response> {
  let upstream: URL;
  try {
    upstream = new URL(base);
  } catch {
    return jsonError(500, 'INVALID_API_BASE', 'Meting API 地址配置错误');
  }

  upstream.searchParams.set('server', server);
  upstream.searchParams.set('type', type);
  upstream.searchParams.set('id', id);
  upstream.searchParams.set('r', '1');

  try {
    const response = await fetch(upstream, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    });
    if (!response.ok) {
      return jsonError(502, 'UPSTREAM_FAILED', `Meting API 返回 ${response.status}`);
    }
    return normalizeExternalPayload(await response.json());
  } catch {
    return jsonError(502, 'UPSTREAM_FAILED', '无法读取在线歌单');
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const server = params.get('server');
  const rawType = params.get('type') ?? 'playlist';
  const id = params.get('id');

  if (!server || !SERVERS.has(server as MetingServer)) {
    return jsonError(400, 'INVALID_SERVER', '不支持的音乐平台');
  }
  if (!TYPES.has(rawType as MetingType)) {
    return jsonError(400, 'INVALID_TYPE', '不支持的资源类型');
  }
  if (!id || id.length > 100) {
    return jsonError(400, 'INVALID_ID', '歌单 ID 不合法');
  }

  const typedServer = server as MetingServer;
  const typedType = rawType as MetingType;
  const base = SITE_MUSIC_API_BASE.trim();

  let tracks: MusicTrack[];
  if (base) {
    const result = await queryExternalMeting(base, typedServer, typedType, id);
    if (result instanceof Response) return result;
    tracks = result;
  } else {
    try {
      tracks = await queryLocalMeting(typedServer, typedType, id);
    } catch {
      return jsonError(502, 'LOCAL_METING_FAILED', '解析在线歌单失败，请稍后重试');
    }
  }

  if (tracks.length === 0) {
    return jsonError(502, 'EMPTY_PLAYLIST', '歌单里没有可播放的 HTTPS 音频');
  }

  return NextResponse.json({ tracks });
}
