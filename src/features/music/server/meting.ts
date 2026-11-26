import Meting, {
  type MetingPicInfo,
  type MetingTrack,
  type MetingUrlInfo,
} from '@meting/core';

import { getMetingCookie } from '@/config/env';
import {
  SITE_MUSIC_FALLBACK,
  SITE_MUSIC_QUALITIES,
  type MetingServer,
  type MetingType,
  type MusicServer,
  type MusicTrack,
} from '@/config/site';
import { matchScore, type TrackIdentity } from './matching';
import { queryMiguLyric, queryMiguMusic } from './migu';

const MAX_TRACKS = 40;
const BATCH_SIZE = 5;
/** 兜底搜索时每个平台取回的候选数量 */
const FALLBACK_SEARCH_LIMIT = 20;
/** 单个平台最多尝试解析的候选数，避免兜底时打爆上游 */
const FALLBACK_RESOLVE_ATTEMPTS = 4;

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

/**
 * 解析音源地址：按音质回退链逐个尝试。
 * 平台对高音质更严格时，320 拿不到会退到 192 / 128。
 */
async function resolveSource(
  server: MetingServer,
  mediaId: string,
): Promise<string | undefined> {
  for (const quality of SITE_MUSIC_QUALITIES) {
    // Meting 实例内部保存请求状态，音链与封面分别用独立实例，避免并发互相污染。
    const urlMeting = createMeting(server);
    try {
      const raw = await urlMeting.url(mediaId, quality);
      const src = normalizeUrl(parseFirst<MetingUrlInfo>(raw)?.url);
      if (src) return src;
    } catch {
      // 单个音质失败继续降级
    }
  }
  return undefined;
}

async function resolveCover(
  server: MetingServer,
  picId: unknown,
): Promise<string | undefined> {
  if (
    (typeof picId !== 'string' && typeof picId !== 'number') ||
    String(picId).trim() === ''
  ) {
    return undefined;
  }
  try {
    const picMeting = createMeting(server);
    const picRaw = await picMeting.pic(picId, 300);
    return normalizeUrl(parseFirst<MetingPicInfo>(picRaw)?.url);
  } catch {
    return undefined;
  }
}

/**
 * 组装单曲。取不到音源时不丢弃曲目，标记为受限并保留 ref，
 * 前端可在用户点播时再走一次跨平台兜底。
 */
async function buildTrack(server: MetingServer, item: MetingTrack): Promise<MusicTrack | null> {
  const title = typeof item.name === 'string' ? item.name.trim() : '';
  const mediaId = item.url_id ?? item.id;
  if (!title || mediaId === undefined || mediaId === null || mediaId === '') return null;

  const artist = artistToString(item.artist);
  const cover = await resolveCover(server, item.pic_id);
  const lyricId =
    item.lyric_id === undefined || item.lyric_id === null || item.lyric_id === ''
      ? undefined
      : String(item.lyric_id);
  const src = await resolveSource(server, String(mediaId));

  return {
    title,
    artist,
    src: src ?? '',
    cover,
    lyricId,
    sourceServer: server,
    restricted: src ? undefined : true,
    ref: { server, id: String(mediaId) },
  };
}

interface FallbackSource extends TrackIdentity {
  /** 已解析好的音源（咪咕适配器直接返回） */
  src?: string;
  /** 待解析的音源 ID */
  mediaId?: string;
}

interface FallbackCandidate extends FallbackSource {
  /** 是否为替代版本（同名但歌手不同） */
  alternate: boolean;
}

/**
 * 候选排序：原唱同名 > 同名替代 > 同歌手近似同名。
 * 同分时保持搜索结果原有顺序。
 */
function rankCandidates(
  candidates: readonly FallbackSource[],
  target: TrackIdentity,
): FallbackCandidate[] {
  const ranked: { candidate: FallbackCandidate; tier: number; score: number }[] = [];

  for (const candidate of candidates) {
    const { score, sameTitle, sameArtist } = matchScore(target, candidate);
    if (score <= 0) continue;

    let tier: number;
    let alternate: boolean;
    if (sameTitle && sameArtist) {
      tier = 0;
      alternate = false;
    } else if (sameTitle) {
      tier = 1;
      alternate = true;
    } else if (sameArtist) {
      tier = 2;
      alternate = false;
    } else {
      continue;
    }

    ranked.push({
      candidate: { ...candidate, alternate },
      tier,
      score,
    });
  }

  ranked.sort((a, b) => (a.tier === b.tier ? b.score - a.score : a.tier - b.tier));
  return ranked.map((item) => item.candidate);
}

async function searchFallbackCandidates(
  server: MusicServer,
  keyword: string,
): Promise<FallbackSource[]> {
  if (server === 'migu') {
    const tracks = await queryMiguMusic('search', keyword);
    return tracks.map((track) => ({
      title: track.title,
      artist: track.artist,
      src: track.src,
    }));
  }

  const raw = await createMeting(server).search(keyword, { limit: FALLBACK_SEARCH_LIMIT });
  return parseList<MetingTrack>(raw).map((item) => ({
    title: typeof item.name === 'string' ? item.name.trim() : '',
    artist: artistToString(item.artist),
    mediaId: String(item.url_id ?? item.id ?? ''),
  }));
}

/** 在备用平台找到可播放的同名版本 */
async function resolveViaFallback(
  server: MusicServer,
  track: MusicTrack,
): Promise<{ src: string; sourceServer: MusicServer; alternate: boolean } | null> {
  if (!SITE_MUSIC_FALLBACK.enabled) return null;

  const keyword = [track.title, track.artist].filter(Boolean).join(' ');
  const target: TrackIdentity = { title: track.title, artist: track.artist };

  for (const candidateServer of SITE_MUSIC_FALLBACK.servers) {
    if (candidateServer === server) continue;

    let candidates: FallbackSource[];
    try {
      candidates = await searchFallbackCandidates(candidateServer, keyword);
    } catch {
      continue;
    }

    const ranked = rankCandidates(candidates, target);
    if (ranked.length === 0) continue;

    if (candidateServer === 'migu') {
      const playable = ranked.find((candidate) => Boolean(candidate.src));
      if (playable?.src) {
        return { src: playable.src, sourceServer: candidateServer, alternate: playable.alternate };
      }
      continue;
    }

    for (const candidate of ranked.slice(0, FALLBACK_RESOLVE_ATTEMPTS)) {
      if (!candidate.mediaId) continue;
      const src = await resolveSource(candidateServer, candidate.mediaId);
      if (src) {
        return { src, sourceServer: candidateServer, alternate: candidate.alternate };
      }
    }
  }

  return null;
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
      baseTracks
        .slice(i, i + BATCH_SIZE)
        .map((item) => buildTrack(server, item).catch(() => null)),
    );
    for (const track of batch) {
      if (track) tracks.push(track);
    }
  }

  return tracks;
}

/**
 * 按需解析单曲音源：用户点播受限歌曲时才调用。
 * 先试原平台（会员 Cookie 生效时可直接解锁），失败再跨平台找同名可播版本。
 */
export async function queryLocalTrack(
  server: MusicServer,
  id: string,
): Promise<MusicTrack | null> {
  if (server === 'migu') {
    const tracks = await queryMiguMusic('song', id);
    const track = tracks[0];
    if (!track) return null;
    if (track.src) return track;

    const fallback = await resolveViaFallback(server, track);
    if (!fallback) return track;

    return {
      ...track,
      src: fallback.src,
      sourceServer: fallback.sourceServer,
      alternate: fallback.alternate,
      restricted: undefined,
    };
  }

  const item = parseFirst<MetingTrack>(await createMeting(server).song(id));
  if (!item) return null;

  const track = await buildTrack(server, item);
  if (!track) return null;
  if (track.src) return track;

  const fallback = await resolveViaFallback(server, track);
  if (!fallback) return track;

  return {
    ...track,
    src: fallback.src,
    sourceServer: fallback.sourceServer,
    alternate: fallback.alternate,
    restricted: undefined,
  };
}
