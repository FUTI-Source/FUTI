'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { cn } from '@/lib/utils';

import { SITE_MUSIC_PLAYLIST, SITE_MUSIC_TRACKS, type MusicTrack } from '@/config/site';

const STORAGE_KEY = 'site-music-index';
const MODE_KEY = 'site-music-mode';

/**
 * 播放模式：
 *  - list：列表循环（默认），一首完 → (index + 1) % len；
 *  - single：单曲循环，直接给 audio 置 loop=true，浏览器不会 fire ended；
 *  - shuffle：随机播放，ended 时从 tracks 中随机取不同于当前的一首。
 */
type PlayMode = 'list' | 'single' | 'shuffle';
const MODE_ORDER: readonly PlayMode[] = ['list', 'single', 'shuffle'];
const MODE_LABEL: Record<PlayMode, string> = {
  list: '列表循环',
  single: '单曲循环',
  shuffle: '随机播放',
};

const readSavedMode = (): PlayMode => {
  if (typeof window === 'undefined') return 'list';
  const s = window.localStorage.getItem(MODE_KEY);
  return s === 'single' || s === 'shuffle' ? s : 'list';
};

/** 列表行高： size-8 封面 32px + button 上下内边距 12px = 44px，与渲染时的 li 高度保持同步 */
const ROW_HEIGHT = 44;
/** 虚拟列表上下缓冲行数：避免快速滞回时露白 */
const OVERSCAN = 4;

interface LyricLine {
  time: number;
  text: string;
}

function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const rawLine of lrc.split(/\r?\n/)) {
    const text = rawLine.replace(/\[[^\]]*\]/g, '').trim();
    if (!text) continue;

    for (const match of rawLine.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)) {
      const milliseconds = Number((match[3] ?? '0').padEnd(3, '0').slice(0, 3));
      lines.push({
        time: Number(match[1]) * 60 + Number(match[2]) + milliseconds / 1000,
        text,
      });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

function findActiveLyric(lines: readonly LyricLine[], time: number): number {
  let low = 0;
  let high = lines.length - 1;
  let active = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (lines[middle].time <= time) {
      active = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return active;
}

const readSavedIndex = (length: number): number => {
  if (typeof window === 'undefined' || length === 0) return 0;
  const saved = Number(window.localStorage.getItem(STORAGE_KEY));
  return Number.isInteger(saved) && saved >= 0 && saved < length ? saved : 0;
};

type IconButtonProps = React.ComponentPropsWithoutRef<'button'> & {
  label: string;
};

const IconButton: React.FC<IconButtonProps> = ({ label, className, children, ...props }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label={label}
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-full text-white/55 transition-colors',
          'hover:bg-white/[0.06] hover:text-[color:var(--accent-ink-strong)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--accent-ink)]',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    </TooltipTrigger>
    <TooltipContent sideOffset={12}>{label}</TooltipContent>
  </Tooltip>
);

const MusicIcon: React.FC<{ spinning?: boolean }> = ({ spinning }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={cn('size-5', spinning && 'animate-spin')}
  >
    <path d="M9 18V6l10-2v12" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="16" cy="16" r="3" />
  </svg>
);

const PlayIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 fill-current">
    <path d="M8 5.5v13l10-6.5-10-6.5Z" />
  </svg>
);

const PauseIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
    className="size-3.5"
  >
    <path d="M9 5v14M15 5v14" />
  </svg>
);

const PrevIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 fill-current">
    <path d="M7 5h2v14H7zM19 5v14l-9-7 9-7Z" />
  </svg>
);

const NextIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 fill-current">
    <path d="M15 5h2v14h-2zM5 5v14l9-7L5 5Z" />
  </svg>
);

const VolumeIcon: React.FC<{ muted: boolean }> = ({ muted }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="size-3.5"
  >
    <path d="M4 9v6h4l5 4V5L8 9H4Z" />
    {muted ? <path d="m17 9 4 6M21 9l-4 6" /> : <path d="M16.5 8.5a5 5 0 0 1 0 7" />}
  </svg>
);

const ListIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="size-3.5"
  >
    <path d="M4 6h10M4 12h10M4 18h7" />
    <circle cx="18" cy="16" r="2.4" />
    <path d="M20.4 16V9.5l-3 .7" />
  </svg>
);

const LyricsIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="size-3.5"
  >
    <path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" />
  </svg>
);

const ModeLoopIcon: React.FC<{ mode: PlayMode }> = ({ mode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="size-3.5"
  >
    {/* 外框三种模式共用一套 loop 箭头，中心小字 / 小图标区分 */}
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    {mode === 'single' ? <text x="12" y="14.6" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor" stroke="none">1</text> : null}
    {mode === 'shuffle' ? <path d="m7 9 4 6M7 15l4-6" strokeWidth="1.5" /> : null}
  </svg>
);

export const MusicPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingPlayRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const lyricsCacheRef = useRef(new Map<string, readonly LyricLine[]>());

  const [isDesktop, setIsDesktop] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [lyricLines, setLyricLines] = useState<readonly LyricLine[]>([]);
  const [lyricsStatus, setLyricsStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [lyricsLoadedKey, setLyricsLoadedKey] = useState<string>();
  // 虚拟滞回限制封面并发请求，也避免原生懒加载触发 Edge 的 LazyLoad intervention。
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(0);
  const [tracks, setTracks] = useState<readonly MusicTrack[]>(SITE_MUSIC_TRACKS);
  const [index, setIndex] = useState(() => readSavedIndex(SITE_MUSIC_TRACKS.length));
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mode, setMode] = useState<PlayMode>(readSavedMode);
  const [resolvingIndex, setResolvingIndex] = useState<number | undefined>(undefined);
  const [notice, setNotice] = useState<string | undefined>(undefined);
  const consecutiveFailuresRef = useRef(0);

  const current = tracks[index] ?? tracks[0];
  const currentPosition = current ? tracks.indexOf(current) : -1;
  const currentSrc = current?.src;
  const currentLyrics = current?.lyrics;
  const currentLyricId = current?.lyricId;
  const lyricKey = currentLyrics
    ? `local:${current.src}`
    : currentLyricId
      ? `online:${SITE_MUSIC_PLAYLIST.server}:${currentLyricId}`
      : current?.src;

  useEffect(() => {
    const media = window.matchMedia('(min-width: 640px)');
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!isDesktop || !SITE_MUSIC_PLAYLIST) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      server: SITE_MUSIC_PLAYLIST.server,
      type: SITE_MUSIC_PLAYLIST.type,
      id: SITE_MUSIC_PLAYLIST.id,
    });

    fetch(`/api/music/playlist?${params.toString()}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('playlist failed'))))
      .then((data: unknown) => {
        if (!data || typeof data !== 'object') return;
        const loaded = (data as { tracks?: unknown }).tracks;
        if (!Array.isArray(loaded)) return;

        const nextTracks = loaded.filter(
          (item): item is MusicTrack =>
            Boolean(item) &&
            typeof item === 'object' &&
            typeof (item as MusicTrack).title === 'string' &&
            typeof (item as MusicTrack).src === 'string',
        );
        if (nextTracks.length === 0) return;

        setTracks(nextTracks);
        setIndex(readSavedIndex(nextTracks.length));
      })
      .catch(() => {});

    return () => controller.abort();
  }, [isDesktop]);

  useEffect(() => {
    if (!lyricsOpen || !lyricKey) return;

    const cached = lyricsCacheRef.current.get(lyricKey);
    if (cached?.length) {
      setLyricLines(cached);
      setLyricsLoadedKey(lyricKey);
      setLyricsStatus('ready');
      return;
    }

    if (currentLyrics) {
      const lines = parseLrc(currentLyrics);
      lyricsCacheRef.current.set(lyricKey, lines);
      setLyricLines(lines);
      setLyricsLoadedKey(lyricKey);
      setLyricsStatus('ready');
      return;
    }

    if (!currentLyricId) {
      setLyricLines([]);
      setLyricsLoadedKey(lyricKey);
      setLyricsStatus('ready');
      return;
    }

    const controller = new AbortController();
    setLyricLines([]);
    setLyricsStatus('loading');

    const params = new URLSearchParams({
      server: SITE_MUSIC_PLAYLIST.server,
      id: currentLyricId,
    });
    fetch(`/api/music/lyrics?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (response.status === 404) return { lyric: '' };
        return response.ok
          ? response.json()
          : Promise.reject(new Error('lyrics failed'));
      })
      .then((data: unknown) => {
        const lyric = (data as { lyric?: unknown })?.lyric;
        const lines = typeof lyric === 'string' ? parseLrc(lyric) : [];
        if (lines.length > 0) lyricsCacheRef.current.set(lyricKey, lines);
        if (controller.signal.aborted) return;
        setLyricLines(lines);
        setLyricsLoadedKey(lyricKey);
        setLyricsStatus('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setLyricsStatus('error');
      });

    return () => controller.abort();
  }, [lyricsOpen, currentLyrics, currentLyricId, lyricKey]);

  const displayedLyrics = lyricsLoadedKey === lyricKey ? lyricLines : [];
  const activeLyricIndex = findActiveLyric(displayedLyrics, currentTime);

  useEffect(() => {
    if (!lyricsOpen || activeLyricIndex < 0) return;
    const container = lyricsRef.current;
    const activeLine = container?.querySelector<HTMLElement>('[data-active="true"]');
    if (!container || !activeLine) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    activeLine.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'center',
    });
  }, [lyricsOpen, activeLyricIndex, lyricKey]);

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = Math.min(Math.max(0, time), audio.duration);
    setCurrentTime(audio.currentTime);
  }, []);

  /**
   * 受限歌曲按需解析：先试原平台（配置了平台 Cookie 时可直接解锁），
   * 仍取不到音源时服务端会跨平台找同名可播版本。解析成功就把音源写回列表。
   */
  const resolveTrackAt = useCallback(
    async (targetIndex: number): Promise<boolean> => {
      const track = tracks[targetIndex];
      if (!track) return false;
      if (track.src) return true;
      if (!track.ref) return false;

      setResolvingIndex(targetIndex);
      try {
        const params = new URLSearchParams({ server: track.ref.server, id: track.ref.id });
        const response = await fetch(`/api/music/track?${params.toString()}`);
        if (!response.ok) return false;

        const data = (await response.json()) as { track?: MusicTrack };
        const resolved = data.track;
        if (!resolved?.src) return false;

        setTracks((previous) =>
          previous.map((item, position) =>
            position === targetIndex
              ? { ...item, ...resolved, restricted: undefined }
              : item,
          ),
        );
        return true;
      } catch {
        return false;
      } finally {
        setResolvingIndex(undefined);
      }
    },
    [tracks],
  );

  const switchTrack = useCallback(
    (nextIndex: number, autoplay: boolean) => {
      if (tracks.length === 0) return;
      const normalized = ((nextIndex % tracks.length) + tracks.length) % tracks.length;

      // 同一首（点到当前行）：src 不会变，[current?.src] 效应不会重跑，
      // 必须手动接同一下行逻辑，避免乐观 playing 与真实 audio 状态失同步。
      if (normalized === index) {
        const audio = audioRef.current;
        const target = tracks[normalized];
        if (target && !target.src) {
          pendingPlayRef.current = true;
          setPlaying(true);
          void resolveTrackAt(normalized).then((resolved) => {
            if (resolved) {
              setNotice(undefined);
              return;
            }
            pendingPlayRef.current = false;
            setPlaying(false);
            setNotice('该歌曲为平台会员专享，暂无可播放音源');
          });
          return;
        }
        if (audio && autoplay && audio.paused) {
          setPlaying(true);
          void audio.play().catch(() => setPlaying(false));
        }
        return;
      }

      pendingPlayRef.current = autoplay;
      // 乐观更新 playing：UI 立即跟上新行高亮/图标，不靠异步 onPlay 反馈。
      // 如果随后 play() 拒绝（自动播放策略、跨域失败），effect 里的 catch 会回平。
      setPlaying(autoplay);
      setIndex(normalized);
      setCurrentTime(0);
      setDuration(0);

      // 目标曲目没有音源（会员专享）：先按需解析，解析成功后由 src 变化触发播放。
      const target = tracks[normalized];
      if (target && !target.src) {
        void resolveTrackAt(normalized).then((resolved) => {
          if (resolved) {
            setNotice(undefined);
            return;
          }
          pendingPlayRef.current = false;
          setPlaying(false);
          setNotice('该歌曲为平台会员专享，暂无可播放音源');
        });
      }
    },
    [tracks, index, resolveTrackAt],
  );

  // 音源失效（链接过期、平台限制）：自动跳到下一首有音源的曲目。
  const handleAudioError = useCallback(() => {
    setPlaying(false);
    if (!currentSrc || tracks.length === 0) return;

    consecutiveFailuresRef.current += 1;
    if (consecutiveFailuresRef.current > tracks.length) {
      setNotice('连续多首播放失败，已暂停播放');
      return;
    }

    for (let step = 1; step <= tracks.length; step += 1) {
      const next = (index + step) % tracks.length;
      if (tracks[next]?.src) {
        setNotice('音源播放失败，已自动切换到下一首');
        switchTrack(next, true);
        return;
      }
    }
    setNotice('没有可播放的下一首');
  }, [currentSrc, index, tracks, switchTrack]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;

    // 受限歌曲还没有音源：先按需解析，拿到音源后由 src 变化自动起播。
    if (!current.src) {
      pendingPlayRef.current = true;
      setPlaying(true);
      void resolveTrackAt(currentPosition).then((resolved) => {
        if (resolved) {
          setNotice(undefined);
          return;
        }
        pendingPlayRef.current = false;
        setPlaying(false);
        setNotice('该歌曲为平台会员专享，暂无可播放音源');
      });
      return;
    }

    if (audio.paused) {
      // 乐观翻转：胶囊与列表行里的图标立刻变，play() 失败时 catch 回平。
      setPlaying(true);
      void audio.play().catch(() => setPlaying(false));
    } else {
      setPlaying(false);
      audio.pause();
    }
  }, [current, currentPosition, resolveTrackAt]);

  useEffect(() => {
    if (!isDesktop || typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, String(index));
  }, [isDesktop, index]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(undefined), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // 切到还没有音源的曲目：停掉上一首，避免继续播旧音频。
    if (!currentSrc) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      return;
    }

    audio.load();
    if (!pendingPlayRef.current) return;

    pendingPlayRef.current = false;
    void audio.play().catch(() => setPlaying(false));
  }, [currentSrc]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  // 模式切换时直接同 audio.loop（single 下 ended 不会 fire，自动回到同一首）。
  // deps 里带上 current?.src：列表初次异步拉到后才会渲染 audio，否则首次 mount
  // audioRef 仍为 null，loop 属性会遗漏。
  useEffect(() => {
    if (audioRef.current) audioRef.current.loop = mode === 'single';
  }, [mode, current?.src]);

  useEffect(() => {
    if (!isDesktop || typeof window === 'undefined') return;
    window.localStorage.setItem(MODE_KEY, mode);
  }, [isDesktop, mode]);

  const cycleMode = useCallback(() => {
    setMode((m) => MODE_ORDER[(MODE_ORDER.indexOf(m) + 1) % MODE_ORDER.length]);
  }, []);

  // 列表挂载时同步尺寸；滞回/窗口变化持续更新，供虚拟范围计算使用
  useLayoutEffect(() => {
    if (!listOpen) return;
    const el = listRef.current;
    if (!el) return;
    const sync = () => {
      const s = el.scrollTop;
      setViewportH(el.clientHeight);
      // 只在跨行边界时才 setState，避免 60fps 滞回下频繁 re-render
      setScrollTop((prev) =>
        Math.floor(prev / ROW_HEIGHT) === Math.floor(s / ROW_HEIGHT) ? prev : s,
      );
    };
    sync();
    el.addEventListener('scroll', sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', sync);
      ro.disconnect();
    };
  }, [listOpen]);

  // 打开列表或切歌时，手动将当前行滚到可视区（block:'nearest' 语义）。
  // 虚拟列表下目标行可能根本没挂载，scrollIntoView 会失效，必须直接算 scrollTop。
  useLayoutEffect(() => {
    if (!listOpen) return;
    const el = listRef.current;
    if (!el) return;
    const top = index * ROW_HEIGHT;
    const bottom = top + ROW_HEIGHT;
    if (top < el.scrollTop) {
      el.scrollTop = top;
    } else if (bottom > el.scrollTop + el.clientHeight) {
      el.scrollTop = bottom - el.clientHeight;
    }
    setScrollTop(el.scrollTop);
    setViewportH(el.clientHeight);
  }, [listOpen, index]);

  useEffect(() => {
    if (!isDesktop) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.key.toLowerCase() !== 'm') return;

      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.isContentEditable ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT';
      if (isTyping) return;

      event.preventDefault();
      toggle();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDesktop, toggle]);

  if (!isDesktop || !current) return null;

  const progress = Number.isFinite(duration) && duration > 0 ? (currentTime / duration) * 100 : 0;
  const resolvingCurrent = resolvingIndex === currentPosition;
  const toggleLabel = resolvingCurrent
    ? '解析音源'
    : playing
      ? '暂停音乐'
      : current.restricted
        ? '尝试解析会员歌曲'
        : '播放音乐';

  // 歌单虚拟滞回范围：上下各多渲 OVERSCAN 行做缓冲，viewportH 首次读取失败时退回 CSS max-h（420）
  const listViewportH = viewportH || 420;
  const vStart = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const vEnd = Math.min(
    tracks.length,
    Math.ceil((scrollTop + listViewportH) / ROW_HEIGHT) + OVERSCAN,
  );

  return (
    <div
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => {
        setExpanded(false);
        setListOpen(false);
        setLyricsOpen(false);
      }}
      className="fixed bottom-5 right-[var(--desktop-edge-inset)] z-40 flex flex-col items-end gap-2"
    >
      <audio
        ref={audioRef}
        src={current.src || undefined}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onCanPlay={() => {
          consecutiveFailuresRef.current = 0;
        }}
        onEnded={() => {
          // 单曲循环走 audio.loop，不会 fire ended；这里只需处理 list / shuffle
          if (mode === 'shuffle' && tracks.length > 1) {
            const playable = tracks
              .map((track, position) => ({ track, position }))
              .filter(({ track }) => Boolean(track.src));
            if (playable.length === 0) return;
            let picked = playable[0];
            while (picked.position === index && playable.length > 1) {
              picked = playable[Math.floor(Math.random() * playable.length)];
            }
            switchTrack(picked.position, true);
            return;
          }
          switchTrack(index + 1, true);
        }}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onError={handleAudioError}
      />

      {notice ? (
        <p
          role="status"
          className="max-w-[min(320px,calc(100vw-2rem))] rounded-lg border border-[color:var(--hairline)] bg-[#121720]/90 px-3 py-2 text-[11px] leading-snug text-white/70 backdrop-blur-md"
        >
          {notice}
        </p>
      ) : null}

      {lyricsOpen ? (
        <div
          id="site-music-lyrics"
          role="dialog"
          aria-label="同步歌词"
          className={cn(
            'w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-xl',
            'border border-[color:var(--hairline)] bg-[#121720]/90 shadow-2xl backdrop-blur-md',
          )}
        >
          <div className="border-b border-[color:var(--hairline)] px-4 py-3">
            <p className="truncate text-xs font-semibold text-[color:var(--accent-ink-strong)]">
              {current.title}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-white/45">
              {current.artist || '未知歌手'}
            </p>
          </div>
          <div
            ref={lyricsRef}
            className="scrollbar-slim h-60 overflow-y-auto overscroll-contain px-3 py-24"
          >
            {lyricsStatus === 'loading' ? (
              <p className="py-8 text-center text-xs text-white/45">歌词加载中…</p>
            ) : lyricsStatus === 'error' ? (
              <p className="py-8 text-center text-xs text-white/45">歌词加载失败，请关闭后重试</p>
            ) : displayedLyrics.length === 0 ? (
              <p className="py-8 text-center text-xs text-white/45">这首歌暂时没有同步歌词</p>
            ) : (
              displayedLyrics.map((line, lineIndex) => (
                <button
                  key={`${line.time}-${lineIndex}`}
                  type="button"
                  data-active={lineIndex === activeLyricIndex ? 'true' : undefined}
                  aria-current={lineIndex === activeLyricIndex ? 'true' : undefined}
                  aria-label={`跳转到 ${Math.floor(line.time / 60)} 分 ${Math.floor(line.time % 60)} 秒：${line.text}`}
                  onClick={() => seekTo(line.time)}
                  className={cn(
                    'my-2 block min-h-7 w-full rounded-md px-2 py-1.5 text-center text-sm leading-6 transition-colors',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--accent-ink)]',
                    lineIndex === activeLyricIndex
                      ? 'bg-white/[0.06] font-semibold text-[color:var(--accent-ink-strong)]'
                      : 'text-white/40 hover:bg-white/[0.03] hover:text-white/70',
                  )}
                >
                  {line.text}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}

      {listOpen ? (
        <div
          id="site-music-playlist"
          ref={listRef}
          role="dialog"
          aria-label="当前歌单"
          className={cn(
            'scrollbar-slim w-[280px] max-h-[min(420px,60vh)] overflow-y-auto overscroll-contain rounded-xl',
            'border border-[color:var(--hairline)] bg-[#121720]/85 shadow-2xl backdrop-blur-md',
          )}
        >
          {/* 上下占位靠 ul 的 padding 实现，避免额外 spacer 节点；+4 对应原先的 py-1 内边距 */}
          <ul
            className="flex flex-col"
            style={{
              paddingTop: vStart * ROW_HEIGHT + 4,
              paddingBottom: Math.max(0, (tracks.length - vEnd) * ROW_HEIGHT) + 4,
            }}
          >
            {tracks.slice(vStart, vEnd).map((track, i) => {
              const idx = vStart + i;
              const active = idx === index;
              return (
                <li key={`${track.ref?.id ?? track.src}-${idx}`} style={{ height: ROW_HEIGHT }}>
                  <button
                    type="button"
                    aria-current={active ? 'true' : undefined}
                    aria-label={`${track.title}${track.restricted ? '，会员专享，点击尝试解析' : ''}`}
                    disabled={resolvingIndex === idx}
                    onClick={() => switchTrack(idx, true)}
                    title={
                      track.restricted
                        ? '平台会员专享，点击尝试跨平台解析'
                        : track.alternate
                          ? `已使用${track.sourceServer ? ` ${track.sourceServer} ` : ''}替代音源`
                          : undefined
                    }
                    className={cn(
                      'flex h-full w-full items-center gap-2.5 px-2.5 text-left transition-colors',
                      active
                        ? 'bg-white/[0.06]'
                        : 'hover:bg-white/[0.04] focus-visible:bg-white/[0.06]',
                      'focus-visible:outline-none disabled:cursor-wait disabled:opacity-60',
                    )}
                  >
                    <span className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-md bg-white/[0.05] text-white/60">
                      {track.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={track.cover}
                          alt=""
                          decoding="async"
                          className="size-full object-cover"
                        />
                      ) : (
                        <MusicIcon />
                      )}
                      {active && playing ? (
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 grid place-items-center bg-black/50 text-[color:var(--accent-ink)]"
                        >
                          <PauseIcon />
                        </span>
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block truncate text-xs',
                          active
                            ? 'font-semibold text-[color:var(--accent-ink-strong)]'
                            : 'text-white/80',
                        )}
                      >
                        {track.title}
                      </span>
                      <span className="block truncate text-[10px] leading-tight text-white/45">
                        {track.artist || '未知歌手'}
                      </span>
                    </span>
                    {resolvingIndex === idx ? (
                      <span className="shrink-0 text-[10px] text-white/45">解析中</span>
                    ) : track.restricted ? (
                      <span className="shrink-0 rounded border border-white/15 px-1.5 py-0.5 text-[9px] text-white/45">
                        会员
                      </span>
                    ) : track.alternate ? (
                      <span className="shrink-0 rounded border border-white/15 px-1.5 py-0.5 text-[9px] text-white/45">
                        替代源
                      </span>
                    ) : null}
                    {active ? (
                      <span
                        aria-hidden="true"
                        className="h-6 w-[2px] shrink-0 rounded-full bg-[color:var(--accent-ink)]"
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div
        className={cn(
          'relative flex items-center overflow-hidden rounded-full',
          'transition-[max-width,height,padding,gap,border-color,background-color] duration-300 ease-out',
          expanded
            ? 'h-[2.875rem] max-w-[calc(100vw-2rem)] gap-2 border border-[color:var(--hairline)] bg-[#121720]/45 px-1.5 backdrop-blur-md'
            : 'h-[46px] max-w-[46px] gap-0 border border-transparent bg-transparent p-0',
        )}
      >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggle}
            aria-label={toggleLabel}
            disabled={resolvingCurrent}
            className={cn(
              'relative grid shrink-0 place-items-center overflow-hidden rounded-full',
              'bg-gradient-to-br from-[#37eff9]/20 via-[#0091e4]/20 to-[#64c6f4]/20',
              'text-[color:var(--accent-ink)] ring-1 ring-[color:var(--hairline)]',
              'transition-[width,height,transform,color] hover:scale-105 hover:text-[color:var(--accent-ink-strong)]',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--accent-ink)] disabled:cursor-wait',
              expanded ? 'size-9' : 'size-[44px]',
            )}
          >
            {playing && current.cover ? (
              <span
                aria-hidden="true"
                className="size-full animate-spin rounded-full bg-cover bg-center"
                style={{ backgroundImage: `url("${current.cover}")` }}
              />
            ) : (
              <MusicIcon spinning={playing} />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent sideOffset={12}>{toggleLabel}{!resolvingCurrent && !playing ? '（Shift + M）' : ''}</TooltipContent>
      </Tooltip>

      <button
        type="button"
        onClick={toggle}
        className={cn(
          'min-w-0 text-left transition-[max-width,opacity] duration-300 ease-out focus-visible:outline-none',
          expanded ? 'max-w-[8.5rem] opacity-100' : 'max-w-0 opacity-0',
        )}
        aria-label={playing ? `暂停 ${current.title}` : `播放 ${current.title}`}
        disabled={resolvingCurrent}
      >
        <span className="block max-w-[8.5rem] truncate text-xs font-semibold text-white/70">
          {current.title}
        </span>
        <span className="block max-w-[8.5rem] truncate text-[10px] leading-tight text-white/40">
          {current.artist || '未知歌手'}
        </span>
      </button>

      <div
        className={cn(
          'flex items-center gap-0.5 overflow-hidden transition-[max-width,opacity,margin] duration-300 ease-out',
          // 7 颗 size-7 按钮 + 6 × gap-0.5 + pl-1 + border-l 共需≈209px，预留到 224px。
          expanded ? 'ml-1 max-w-[14rem] border-l border-[color:var(--hairline)] pl-1 opacity-100' : 'ml-0 max-w-0 opacity-0',
        )}
      >
        <IconButton
          label="上一首"
          onClick={() => switchTrack(index - 1, playing)}
        >
          <PrevIcon />
        </IconButton>
        <IconButton label={resolvingCurrent ? '解析音源' : playing ? '暂停' : '播放'} onClick={toggle} disabled={resolvingCurrent}>
          {playing ? <PauseIcon /> : <PlayIcon />}
        </IconButton>
        <IconButton label="下一首" onClick={() => switchTrack(index + 1, playing)}>
          <NextIcon />
        </IconButton>
        <IconButton label={muted ? '取消静音' : '静音'} onClick={() => setMuted((value) => !value)}>
          <VolumeIcon muted={muted} />
        </IconButton>
        <IconButton
          label={listOpen ? '收起歌单' : '展开歌单'}
          aria-expanded={listOpen}
          aria-controls="site-music-playlist"
          onClick={() => {
            setListOpen((value) => !value);
            setLyricsOpen(false);
          }}
          className={cn(listOpen && 'bg-white/[0.08] text-[color:var(--accent-ink-strong)]')}
        >
          <ListIcon />
        </IconButton>
        <IconButton
          label={lyricsOpen ? '收起歌词' : '显示歌词'}
          aria-expanded={lyricsOpen}
          aria-controls="site-music-lyrics"
          onClick={() => {
            setLyricsOpen((value) => !value);
            setListOpen(false);
          }}
          className={cn(lyricsOpen && 'bg-white/[0.08] text-[color:var(--accent-ink-strong)]')}
        >
          <LyricsIcon />
        </IconButton>
        <IconButton
          label={MODE_LABEL[mode]}
          aria-label={`播放模式：${MODE_LABEL[mode]}，点击切换`}
          onClick={cycleMode}
          className={cn(mode !== 'list' && 'text-[color:var(--accent-ink-strong)]')}
        >
          <ModeLoopIcon mode={mode} />
        </IconButton>
      </div>

      <div
        className={cn(
          'pointer-events-none absolute bottom-0 h-px overflow-hidden rounded-full bg-[color:var(--hairline)] transition-[left,right,opacity] duration-300 ease-out',
          expanded ? 'left-3 right-3 opacity-100' : 'left-2 right-2 opacity-0',
        )}
      >
        <div
          className="h-full bg-gradient-to-r from-[#37eff9]/60 via-[#0091e4]/40 to-[#64c6f4]/60 transition-[width] duration-200"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      </div>
    </div>
  );
};
