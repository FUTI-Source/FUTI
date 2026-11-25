import type { MetingType, MusicTrack } from '@/config/site';

// 协议参考 Domdkw/miguMusic-api-enhanced（MIT），本项目独立实现。
const API_ORIGIN = 'https://app.c.nf.migu.cn';
const COVER_ORIGIN = 'https://d.musicapp.migu.cn';
const RESOURCE_ORIGIN = 'https://app.u.nf.migu.cn';
const CHANNEL = '014X031';
const MAX_TRACKS = 40;
const PAGE_SIZE = 40;
const BATCH_SIZE = 4;
const REQUEST_TIMEOUT_MS = 10_000;
const MUSIC_DEADLINE_MS = 25_000;
const MAX_JSON_BYTES = 2_000_000;
const MAX_LYRIC_BYTES = 1_000_000;

type JsonRecord = Record<string, unknown>;

interface MiguSong {
  contentId: string;
  copyrightId: string;
  songName: string;
  singerList: JsonRecord[];
  img1?: string;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: JsonRecord, key: string): string | undefined {
  const item = value[key];
  return typeof item === 'string' && item.trim() ? item.trim() : undefined;
}

function normalizeHttpsUrl(value: unknown, base?: string): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const input = value.trim();
  const normalized = input.startsWith('//')
    ? `https:${input}`
    : base && input.startsWith('/')
      ? `${base}${input}`
      : input;

  try {
    const url = new URL(normalized);
    if (url.protocol !== 'https:' || url.username || url.password) return undefined;
    return normalized;
  } catch {
    return undefined;
  }
}

function requestSignal(deadline?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return deadline ? AbortSignal.any([timeout, deadline]) : timeout;
}

async function fetchJson(
  origin: string,
  path: string,
  params: Record<string, string>,
  headers: Record<string, string> = {},
  deadline?: AbortSignal,
): Promise<JsonRecord> {
  const url = new URL(path, origin);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetch(url, {
    headers: { Accept: 'application/json', ...headers },
    cache: 'no-store',
    redirect: 'error',
    signal: requestSignal(deadline),
  });
  if (!response.ok) throw new Error('Migu request failed');

  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BYTES) {
    throw new Error('Migu response too large');
  }

  const text = await response.text();
  if (text.length > MAX_JSON_BYTES) throw new Error('Migu response too large');
  const payload: unknown = JSON.parse(text);
  if (!isRecord(payload) || payload.code !== '000000') throw new Error('Migu response failed');
  return payload;
}

async function fetchText(url: string, deadline?: AbortSignal): Promise<string> {
  const response = await fetch(url, {
    headers: { Accept: 'text/plain,application/octet-stream' },
    cache: 'no-store',
    redirect: 'error',
    signal: requestSignal(deadline),
  });
  if (!response.ok) throw new Error('Migu lyric request failed');

  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_LYRIC_BYTES) {
    throw new Error('Migu lyric too large');
  }

  const text = await response.text();
  if (text.length > MAX_LYRIC_BYTES) throw new Error('Migu lyric too large');
  return text;
}

function parseSong(value: unknown): MiguSong | null {
  if (!isRecord(value)) return null;
  const contentId = readString(value, 'contentId') ?? readString(value, 'songId');
  const copyrightId = readString(value, 'copyrightId');
  const songName = readString(value, 'songName') ?? readString(value, 'name');
  if (!contentId || !copyrightId || !songName) return null;

  const singerList = Array.isArray(value.singerList)
    ? value.singerList.filter(isRecord)
    : [];
  return {
    contentId,
    copyrightId,
    songName,
    singerList,
    img1: readString(value, 'img1'),
  };
}

async function loadPlaylistSongs(id: string, deadline: AbortSignal): Promise<MiguSong[]> {
  const songs: MiguSong[] = [];
  const seen = new Set<string>();

  for (let pageNo = 1; pageNo <= 10; pageNo += 1) {
    const payload = await fetchJson(
      API_ORIGIN,
      '/MIGUM3.0/resource/playlist/song/v2.0',
      { pageNo: String(pageNo), pageSize: String(PAGE_SIZE), playlistId: id },
      {},
      deadline,
    );
    if (!isRecord(payload.data) || !Array.isArray(payload.data.songList)) {
      throw new Error('Migu playlist response invalid');
    }

    for (const item of payload.data.songList) {
      const song = parseSong(item);
      if (!song || seen.has(song.contentId)) continue;
      seen.add(song.contentId);
      songs.push(song);
      if (songs.length === MAX_TRACKS) return songs;
    }

    const totalCount = payload.data.totalCount;
    if (
      payload.data.songList.length < PAGE_SIZE ||
      (typeof totalCount === 'number' && songs.length >= totalCount)
    ) {
      break;
    }
  }

  return songs;
}

async function loadSongsByIds(ids: readonly string[], deadline: AbortSignal): Promise<MiguSong[]> {
  if (ids.length === 0) return [];
  const payload = await fetchJson(
    API_ORIGIN,
    '/resource/song/by-contentids/v2.0',
    { contentId: ids.join('|') },
    {},
    deadline,
  );
  if (!Array.isArray(payload.data)) throw new Error('Migu song response invalid');
  return payload.data.flatMap((item) => {
    const song = parseSong(item);
    return song ? [song] : [];
  });
}

async function loadSearchSongs(text: string, deadline: AbortSignal): Promise<MiguSong[]> {
  const songs: MiguSong[] = [];
  for (let pageNo = 1; pageNo <= 5; pageNo += 1) {
    const payload = await fetchJson(
      API_ORIGIN,
      '/bmw/search/song/v1.0',
      { pageNo: String(pageNo), text },
      {},
      deadline,
    );
    if (!isRecord(payload.data) || !Array.isArray(payload.data.items)) break;

    for (const item of payload.data.items) {
      if (!isRecord(item)) continue;
      const song = parseSong(item.song);
      if (song) songs.push(song);
      if (songs.length === MAX_TRACKS) return songs;
    }

    if (payload.data.hasNext !== true) break;
  }
  return songs;
}

async function loadAlbumSongs(id: string, deadline: AbortSignal): Promise<MiguSong[]> {
  const songs: MiguSong[] = [];
  for (let pageNo = 1; pageNo <= 10; pageNo += 1) {
    const payload = await fetchJson(
      API_ORIGIN,
      '/MIGUM3.0/resource/album/song/v2.0',
      { albumId: id, pageNo: String(pageNo) },
      {},
      deadline,
    );
    if (!isRecord(payload.data) || !Array.isArray(payload.data.songList)) break;

    for (const item of payload.data.songList) {
      const song = parseSong(item);
      if (song) songs.push(song);
      if (songs.length === MAX_TRACKS) return songs;
    }

    const totalCount = payload.data.totalCount;
    if (
      payload.data.songList.length === 0 ||
      (typeof totalCount === 'number' && songs.length >= totalCount)
    ) {
      break;
    }
  }
  return songs;
}

async function loadArtistSongs(id: string, deadline: AbortSignal): Promise<MiguSong[]> {
  const songs: MiguSong[] = [];
  for (let pageNo = 1; pageNo <= 10; pageNo += 1) {
    const payload = await fetchJson(
      API_ORIGIN,
      '/bmw/singer/song/v1.0',
      { pageNo: String(pageNo), singerId: id, type: '1' },
      {},
      deadline,
    );
    if (!isRecord(payload.data) || !Array.isArray(payload.data.contents)) break;

    const section = payload.data.contents.find(
      (item): item is JsonRecord => isRecord(item) && item.view === 'ZJ-Singer-Song-Scroll',
    );
    const items = section && Array.isArray(section.contents) ? section.contents : [];
    if (items.length === 0) break;

    for (const item of items) {
      if (!isRecord(item)) continue;
      const song = parseSong(item.songItem);
      if (song) songs.push(song);
      if (songs.length === MAX_TRACKS) return songs;
    }
  }
  return songs;
}

async function resolveTrack(song: MiguSong, deadline: AbortSignal): Promise<MusicTrack | null> {
  const payload = await fetchJson(
    API_ORIGIN,
    '/MIGUM3.0/strategy/pc/listen/v1.0',
    {
      contentId: song.contentId,
      copyrightId: song.copyrightId,
      resourceType: '2',
      toneFlag: 'PQ',
    },
    { Channel: CHANNEL },
    deadline,
  );
  if (!isRecord(payload.data)) return null;

  const src = normalizeHttpsUrl(payload.data.url);
  if (!src) return null;

  const audioSong = parseSong(payload.data.song);
  const singers = (audioSong?.singerList ?? song.singerList)
    .map((singer) => readString(singer, 'name'))
    .filter((name): name is string => Boolean(name))
    .join(' / ');

  return {
    title: audioSong?.songName ?? song.songName,
    artist: singers || undefined,
    src,
    cover: normalizeHttpsUrl(audioSong?.img1 ?? song.img1, COVER_ORIGIN),
    lyricId: song.contentId,
  };
}

async function resolveTracks(songs: readonly MiguSong[], deadline: AbortSignal): Promise<MusicTrack[]> {
  const uniqueSongs: MiguSong[] = [];
  const seen = new Set<string>();
  for (const song of songs) {
    if (seen.has(song.contentId)) continue;
    seen.add(song.contentId);
    uniqueSongs.push(song);
    if (uniqueSongs.length === MAX_TRACKS) break;
  }

  const tracks: MusicTrack[] = [];
  for (let i = 0; i < uniqueSongs.length; i += BATCH_SIZE) {
    const batch = await Promise.all(
      uniqueSongs
        .slice(i, i + BATCH_SIZE)
        .map((song) => resolveTrack(song, deadline).catch(() => null)),
    );
    for (const track of batch) {
      if (track) tracks.push(track);
    }
  }
  return tracks;
}

export async function queryMiguMusic(type: MetingType, id: string): Promise<MusicTrack[]> {
  const deadline = AbortSignal.timeout(MUSIC_DEADLINE_MS);
  let songs: MiguSong[];
  switch (type) {
    case 'playlist':
      songs = await loadPlaylistSongs(id, deadline);
      break;
    case 'song':
      songs = await loadSongsByIds([id], deadline);
      break;
    case 'search':
      songs = await loadSearchSongs(id, deadline);
      break;
    case 'album':
      songs = await loadAlbumSongs(id, deadline);
      break;
    case 'artist':
      songs = await loadArtistSongs(id, deadline);
      break;
    default:
      throw new Error('Unsupported Migu resource type');
  }
  return resolveTracks(songs, deadline);
}

export async function queryMiguLyric(id: string): Promise<string | undefined> {
  const deadline = AbortSignal.timeout(MUSIC_DEADLINE_MS);
  const payload = await fetchJson(
    RESOURCE_ORIGIN,
    '/MIGUM2.0/v1.0/content/resourceinfo.do',
    { resourceId: id, resourceType: '2' },
    {},
    deadline,
  );
  if (!Array.isArray(payload.resource)) return undefined;

  const lyricUrl = normalizeHttpsUrl(
    isRecord(payload.resource[0]) ? readString(payload.resource[0], 'lrcUrl') : undefined,
  );
  if (!lyricUrl) return undefined;

  const lyric = (await fetchText(lyricUrl, deadline)).trim();
  return lyric || undefined;
}
