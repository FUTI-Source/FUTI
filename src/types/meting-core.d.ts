declare module '@meting/core' {
  export interface MetingTrack {
    id?: string | number;
    name?: string;
    artist?: string | string[];
    album?: string;
    pic_id?: string | number;
    url_id?: string | number;
    lyric_id?: string | number;
    source?: string;
  }

  export interface MetingUrlInfo {
    url?: string;
    size?: number;
    br?: number;
  }

  export interface MetingPicInfo {
    url?: string;
  }

  export default class Meting {
    constructor(server?: string);

    site(server: string): this;
    cookie(cookie: string): this;
    format(enable?: boolean): this;

    search(keyword: string, options?: { type?: number; page?: number; limit?: number }): Promise<string>;
    song(id: string | number): Promise<string>;
    album(id: string | number): Promise<string>;
    artist(id: string | number, limit?: number): Promise<string>;
    playlist(id: string | number): Promise<string>;
    url(id: string | number, bitrate?: number): Promise<string>;
    lyric(id: string | number): Promise<string>;
    pic(id: string | number, size?: number): Promise<string>;
  }
}
