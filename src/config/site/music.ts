/** 音乐胶囊的公开配置。Cookie 等敏感信息只走服务端环境变量。 */

export interface MusicTrack {
  title: string;
  artist?: string;
  /** 音频地址，本地文件建议放到 public/music/ 下 */
  src: string;
  /** 封面地址，留空时播放器显示默认音符图标 */
  cover?: string;
  /** 平台歌词 ID，用于打开歌词面板时按需获取 */
  lyricId?: string;
  /** 本地 LRC 歌词，配置后无需在线获取 */
  lyrics?: string;
}

export type MetingServer = 'netease' | 'tencent' | 'kugou' | 'baidu' | 'kuwo';
export type MetingType = 'song' | 'playlist' | 'album' | 'artist' | 'search';

export interface MusicPlaylistSource {
  /** 音乐平台 */
  server: MetingServer;
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
