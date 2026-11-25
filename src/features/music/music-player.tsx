'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { cn } from '@/lib/utils';

import { SITE_MUSIC_PLAYLIST, SITE_MUSIC_TRACKS, type MusicTrack } from '@/config/site';

const STORAGE_KEY = 'site-music-index';

/** 列表行高： size-8 封面 32px + button 上下内边距 12px = 44px，与渲染时的 li 高度保持同步 */
const ROW_HEIGHT = 44;
/** 虚拟列表上下缓冲行数：避免快速滞回时露白 */
const OVERSCAN = 4;

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

export const MusicPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingPlayRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);

  const [isDesktop, setIsDesktop] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  // 虚拟滞回：只渲染 [scrollTop, scrollTop + viewportH] 内的行 ± OVERSCAN 缓冲，
  // 避免长歌单一次挂几十个 <img> 触发 Edge LazyLoad intervention。
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(0);
  const [tracks, setTracks] = useState<readonly MusicTrack[]>(SITE_MUSIC_TRACKS);
  const [index, setIndex] = useState(() => readSavedIndex(SITE_MUSIC_TRACKS.length));
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const current = tracks[index] ?? tracks[0];

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

  const switchTrack = useCallback(
    (nextIndex: number, autoplay: boolean) => {
      if (tracks.length === 0) return;
      const normalized = ((nextIndex % tracks.length) + tracks.length) % tracks.length;

      // 同一首（点到当前行）：src 不会变，[current?.src] 效应不会重跑，
      // 必须手动接同一下行逻辑，避免乐观 playing 与真实 audio 状态失同步。
      if (normalized === index) {
        const audio = audioRef.current;
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
    },
    [tracks.length, index],
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;

    if (audio.paused) {
      // 乐观翻转：胶囊与列表行里的图标立刻变，play() 失败时 catch 回平。
      setPlaying(true);
      void audio.play().catch(() => setPlaying(false));
    } else {
      setPlaying(false);
      audio.pause();
    }
  }, [current]);

  useEffect(() => {
    if (!isDesktop || typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, String(index));
  }, [isDesktop, index]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;

    audio.load();
    if (!pendingPlayRef.current) return;

    pendingPlayRef.current = false;
    void audio.play().catch(() => setPlaying(false));
  }, [current?.src]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

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
      }}
      className="fixed bottom-5 right-[var(--desktop-edge-inset)] z-40 flex flex-col items-end gap-2"
    >
      <audio
        ref={audioRef}
        src={current.src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => switchTrack(index + 1, true)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onError={() => setPlaying(false)}
      />

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
                <li key={`${track.src}-${idx}`} style={{ height: ROW_HEIGHT }}>
                  <button
                    type="button"
                    aria-current={active ? 'true' : undefined}
                    onClick={() => switchTrack(idx, true)}
                    className={cn(
                      'flex h-full w-full items-center gap-2.5 px-2.5 text-left transition-colors',
                      active
                        ? 'bg-white/[0.06]'
                        : 'hover:bg-white/[0.04] focus-visible:bg-white/[0.06]',
                      'focus-visible:outline-none',
                    )}
                  >
                    <span className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-md bg-white/[0.05] text-white/60">
                      {track.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={track.cover}
                          alt=""
                          loading="lazy"
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
            aria-label={playing ? '暂停音乐' : '播放音乐'}
            className={cn(
              'relative grid shrink-0 place-items-center overflow-hidden rounded-full',
              'bg-gradient-to-br from-[#37eff9]/20 via-[#0091e4]/20 to-[#64c6f4]/20',
              'text-[color:var(--accent-ink)] ring-1 ring-[color:var(--hairline)]',
              'transition-[width,height,transform,color] hover:scale-105 hover:text-[color:var(--accent-ink-strong)]',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--accent-ink)]',
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
        <TooltipContent sideOffset={12}>{playing ? '暂停音乐' : '播放音乐（Shift + M）'}</TooltipContent>
      </Tooltip>

      <button
        type="button"
        onClick={toggle}
        className={cn(
          'min-w-0 text-left transition-[max-width,opacity] duration-300 ease-out focus-visible:outline-none',
          expanded ? 'max-w-[8.5rem] opacity-100' : 'max-w-0 opacity-0',
        )}
        aria-label={playing ? `暂停 ${current.title}` : `播放 ${current.title}`}
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
          // 5 个 size-7 按钮 + gap-0.5 + pl-1 + border-l 共需≈153px，预留到 160px，
          // 否则最后一颗「展开歌单」会被 overflow-hidden 削掉。
          expanded ? 'ml-1 max-w-[10rem] border-l border-[color:var(--hairline)] pl-1 opacity-100' : 'ml-0 max-w-0 opacity-0',
        )}
      >
        <IconButton
          label="上一首"
          onClick={() => switchTrack(index - 1, playing)}
        >
          <PrevIcon />
        </IconButton>
        <IconButton label={playing ? '暂停' : '播放'} onClick={toggle}>
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
          onClick={() => setListOpen((value) => !value)}
          className={cn(listOpen && 'bg-white/[0.08] text-[color:var(--accent-ink-strong)]')}
        >
          <ListIcon />
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
