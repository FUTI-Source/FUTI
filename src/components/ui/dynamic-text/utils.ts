import { random } from 'underscore';

// CONSTANTS
export const NUMBER_AND_ENGLISH = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
// ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩ〇口甲乙丙丁戊己庚辛壬癸
export const HIRAGANA_AND_KATAKANA =
  'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩ〇口甲乙丙丁戊己庚辛壬癸'.split('');
export const SYLLABLES_AND_LOANWORDS =
  'あぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをんゔゕゖァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヵヶヷヸヹヺーヾ'.split(
    '',
  );
// END CONSTANTS

/** 等待指定毫秒 */
export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * 判断 code 是否落在 [min, max) 内。
 * 等价于 underscore 的 contains(range(min, max), code)，但不会创建临时数组。
 */
const inRange = (code: number | undefined, min: number, max: number): boolean =>
  code !== undefined && code >= min && code < max;

/** 判断 code 是否落在任意一个 [min, max) 内 */
const inRanges = (code: number | undefined, ranges: ReadonlyArray<readonly [number, number]>): boolean => {
  if (code === undefined) return false;
  for (const [min, max] of ranges) {
    if (code >= min && code < max) return true;
  }
  return false;
};

/** 插入符：动画中保持原样，不参与洗牌 */
const INSERTERS = new Set([' ', '-', '/', "'"]);
export const isInserter = (target: string) => INSERTERS.has(target);

export const getRandom = (texts: string[]) => texts[random(0, texts.length - 1)];

/** 单次取码点，避免重复调用 codePointAt */
const codeOf = (target: string) => target.codePointAt(0);

/** CJK 统一汉字 + CJK 兼容汉字 */
export const isCJK = (target: string) => {
  const code = codeOf(target);
  return inRange(code, 19_968, 40_907) || inRange(code, 63_744, 64_106);
};

export const isHiragana = (target: string) => inRange(codeOf(target), 12_353, 12_438);

export const isKatakana = (target: string) => inRange(codeOf(target), 12_448, 12_543);

/** 多字节字符（中日韩汉字、假名等），决定占位符用 `/` 还是 `//` */
const MULTIBYTE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [13_312, 19_893], // CJK 扩展 A
  [19_968, 40_907], // CJK 统一汉字
  [63_744, 64_106], // CJK 兼容汉字
  [12_353, 12_438], // 平假名
  [12_448, 12_543], // 片假名
];

export const isMultibyteText = (target: string) => inRanges(codeOf(target), MULTIBYTE_RANGES);
