/**
 * 跨平台同名匹配。
 *
 * 各平台搜索结果里混着翻唱、现场版、钢琴版，标题相同但录音不同，
 * 匹配时先剥掉「(Live)」「【高音质】」这类版本注记再比标题，
 * 并单独判断歌手是否一致，用来区分「原唱」与「替代版本」。
 */

const BRACKETED = /[[(（【][^\]）】]*[\]）】]/g;
const BRACKETED_TEST = /[[(（【][^\]）】]*[\]）】]/;
const NOISE = /[\s·・\-–—_,.。!！?？'"“”‘’《》]/g;

/** 归一化标题：去掉版本注记与标点，只保留可比对的字面 */
export function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(BRACKETED, ' ')
    .replace(NOISE, '')
    .trim();
}

/** 标题里是否带版本注记（现场版、伴奏、翻唱等） */
export function hasVersionNote(value: string): boolean {
  return BRACKETED_TEST.test(value);
}

/** 归一化歌手列表：拆分多种分隔符，便于逐个比对 */
export function normalizeArtists(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[/、,&]|feat\.|featuring/gi)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export interface TrackIdentity {
  title: string;
  artist?: string;
}

export interface MatchResult {
  /** 综合得分，越高越可能是同一首歌 */
  score: number;
  /** 标题是否完全一致（忽略版本注记） */
  sameTitle: boolean;
  /** 歌手是否一致 */
  sameArtist: boolean;
}

/** 标题完全一致的基础分，其余按包含关系降级 */
const TITLE_EXACT = 100;
const TITLE_PARTIAL = 60;
/** 歌手全部命中 / 部分命中的加分 */
const ARTIST_ALL = 40;
const ARTIST_SOME = 20;
/** 无版本注记更可能是录音室版 */
const STUDIO_BONUS = 5;

export function matchScore(target: TrackIdentity, candidate: TrackIdentity): MatchResult {
  const targetTitle = normalizeTitle(target.title);
  const candidateTitle = normalizeTitle(candidate.title);
  const empty: MatchResult = { score: 0, sameTitle: false, sameArtist: false };
  if (!targetTitle || !candidateTitle) return empty;

  let titleScore = 0;
  if (targetTitle === candidateTitle) titleScore = TITLE_EXACT;
  else if (candidateTitle.includes(targetTitle) || targetTitle.includes(candidateTitle)) {
    titleScore = TITLE_PARTIAL;
  } else {
    return empty;
  }
  const sameTitle = titleScore === TITLE_EXACT;

  const targetArtists = normalizeArtists(target.artist);
  const candidateArtists = normalizeArtists(candidate.artist);
  let artistScore = 0;
  let sameArtist = false;
  if (targetArtists.length > 0 && candidateArtists.length > 0) {
    const matched = targetArtists.filter((artist) =>
      candidateArtists.some((item) => item.includes(artist) || artist.includes(item)),
    );
    if (matched.length === targetArtists.length) {
      artistScore = ARTIST_ALL;
      sameArtist = true;
    } else if (matched.length > 0) {
      artistScore = ARTIST_SOME;
      sameArtist = true;
    }
  }

  const score =
    titleScore + artistScore + (hasVersionNote(candidate.title) ? 0 : STUDIO_BONUS);
  return { score, sameTitle, sameArtist };
}
