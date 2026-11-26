/** 音乐胶囊的公开配置。Cookie 等敏感信息只走服务端环境变量。 */

export type MusicServer = 'netease' | 'tencent' | 'kugou' | 'kuwo' | 'migu';
export type MetingServer = Exclude<MusicServer, 'migu'>;
export type MetingType = 'song' | 'playlist' | 'album' | 'artist' | 'search';

/** 在线资源的坐标，用于按需重新解析音源 */
export interface MusicTrackRef {
  server: MusicServer;
  /** 单曲 ID（各平台歌曲主键） */
  id: string;
}

export interface MusicTrack {
  title: string;
  artist?: string;
  /** 音频地址，本地文件建议放到 public/music/ 下；空串表示暂未取到可播放音源 */
  src: string;
  /** 封面地址，留空时播放器显示默认音符图标 */
  cover?: string;
  /** 平台歌词 ID，用于打开歌词面板时按需获取 */
  lyricId?: string;
  /** 本地 LRC 歌词，配置后无需在线获取 */
  lyrics?: string;
  /** 音源所在平台，跨平台兜底时与歌单平台不同 */
  sourceServer?: MusicServer;
  /** 命中的替代版本：原唱在所有平台都取不到音源时的同名翻唱/现场版 */
  alternate?: boolean;
  /** 平台会员专享或受限，尚未取到可播放音源；ref 用于按需重新解析 */
  restricted?: boolean;
  /** 按需重新解析音源所需的信息 */
  ref?: MusicTrackRef;
}

export interface MusicPlaylistSource {
  /** 音乐平台 */
  server: MusicServer;
  /** 资源类型 */
  type: MetingType;
  /** 资源 ID，从歌单/歌曲分享链接里取 */
  id: string;
}

/**
 * 外部 Meting API 地址。留空时使用内置 @meting/core 自建解析；
 * 这里只能放公开地址，不要放 Cookie 或密钥。
 */
export const SITE_MUSIC_API_BASE = '';

/** 本地曲目。配置在线歌单后，在线歌单会覆盖这里的内容。 */
export const SITE_MUSIC_TRACKS: readonly MusicTrack[] = [];

/** 在线歌单来源 */
export const SITE_MUSIC_PLAYLIST: MusicPlaylistSource = {
  server: 'netease',
  type: 'playlist',
  id: '8152976493',
};

/** 音质回退链：按顺序尝试，高音质被平台限制时自动降到低音质 */
export const SITE_MUSIC_QUALITIES: readonly number[] = [320, 192, 128];

/** 跨平台兜底：原平台取不到音源时，到这些平台找同名可播放版本 */
export interface MusicFallbackConfig {
  enabled: boolean;
  /** 参与兜底的平台，按顺序尝试 */
  servers: readonly MusicServer[];
}

export const SITE_MUSIC_FALLBACK: MusicFallbackConfig = {
  enabled: true,
  servers: ['tencent', 'kugou', 'migu'],
};
