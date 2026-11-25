import Meting, {
  type MetingPicInfo,
  type MetingTrack,
  type MetingUrlInfo,
} from '@meting/core';

import { getMetingCookie } from '@/config/env';
import type { MetingServer, MetingType, MusicServer, MusicTrack } from '@/config/site';
import { queryMiguLyric, queryMiguMusic } from './migu';

const MAX_TRACKS = 40;
const BATCH_SIZE = 5;

function createMeting(server: MetingServer): InstanceType<typeof Meting> {
  const meting = new Meting(server);
  meting.format(true);

  const cookie = getMetingCookie(server);
  if (cookie) meting.cookie(cookie);

  return meting;
}

function parseList<T>(raw: string): T[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? (value as T[]) : [];
  } catch {
    return [];
  }
}

function parseFirst<T>(raw: string): T | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (Array.isArray(value)) return (value[0] as T) ?? null;
    if (value && typeof value === 'object') return value as T;
    return null;
  } catch {
    return null;
  }
}

function normalizeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const normalized = value.startsWith('//')
    ? `https:${value}`
    : value.replace(/^http:\/\//i, 'https://');
  try {
    return new URL(normalized).protocol === 'https:' ? normalized : undefined;
  } catch {
    return undefined;
  }
}

function artistToString(artist: string | string[] | undefined): string | undefined {
  if (Array.isArray(artist)) return artist.filter(Boolean).join(' / ');
  return artist?.trim() || undefined;
}

async function loadBaseTracks(
  meting: InstanceType<typeof Meting>,
  type: MetingType,
  id: string,
): Promise<MetingTrack[]> {
  if (type === 'playlist') return parseList<MetingTrack>(await meting.playlist(id));
  if (type === 'song') return parseList<MetingTrack>(await meting.song(id));
  if (type === 'album') return parseList<MetingTrack>(await meting.album(id));
  if (type === 'artist') return parseList<MetingTrack>(await meting.artist(id, MAX_TRACKS));
  return parseList<MetingTrack>(await meting.search(id, { limit: MAX_TRACKS }));
}

async function resolveTrack(
  server: MetingServer,
  item: MetingTrack,
): Promise<MusicTrack | null> {
  const title = typeof item.name === 'string' ? item.name.trim() : '';
  const mediaId = item.url_id ?? item.id;
  if (!title || mediaId === undefined || mediaId === null || mediaId === '') return null;

  // Meting 实例内部保存请求状态，音链与封面分别用独立实例，避免并发互相污染。
  const urlMeting = createMeting(server);
  const urlRaw = await urlMeting.url(mediaId, 320);
  const urlInfo = parseFirst<MetingUrlInfo>(urlRaw);
  const src = normalizeUrl(urlInfo?.url);
  if (!src) return null;

  let cover: string | undefined;
  if (item.pic_id !== undefined && item.pic_id !== null) {
    try {
      const picMeting = createMeting(server);
      const picRaw = await picMeting.pic(item.pic_id, 300);
      cover = normalizeUrl(parseFirst<MetingPicInfo>(picRaw)?.url);
    } catch {
      cover = undefined;
    }
  }

  return {
    title,
    artist: artistToString(item.artist),
    src,
    cover,
    lyricId:
      item.lyric_id === undefined || item.lyric_id === null || item.lyric_id === ''
        ? undefined
        : String(item.lyric_id),
  };
}

export async function queryLocalLyric(
  server: MusicServer,
  id: string,
): Promise<string | undefined> {
  if (server === 'migu') return queryMiguLyric(id);

  try {
    const raw = await createMeting(server).lyric(id);
    const lyric = parseFirst<{ lyric?: unknown }>(raw)?.lyric;
    return typeof lyric === 'string' && lyric.trim() ? lyric : undefined;
  } catch {
    return undefined;
  }
}

/** 项目内置音乐解析：不依赖外部公共 API 服务 */
export async function queryLocalMusic(
  server: MusicServer,
  type: MetingType,
  id: string,
): Promise<MusicTrack[]> {
  if (server === 'migu') return queryMiguMusic(type, id);

  const baseTracks = (await loadBaseTracks(createMeting(server), type, id)).slice(0, MAX_TRACKS);
  const tracks: MusicTrack[] = [];

  for (let i = 0; i < baseTracks.length; i += BATCH_SIZE) {
    const batch = await Promise.all(
      baseTracks.slice(i, i + BATCH_SIZE).map((item) => resolveTrack(server, item).catch(() => null)),
    );
    for (const track of batch) {
      if (track) tracks.push(track);
    }
  }

  return tracks;
}
