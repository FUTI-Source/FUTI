import { useEffect, useState } from 'react';

export interface CountryCodeOption {
  code: string;
  label: string;
}

const CACHE_KEY = 'futi.country-codes.v1';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const SOURCE_URL = 'https://restcountries.com/v3.1/all?fields=name,idd,cca2';

const FALLBACK: CountryCodeOption[] = [
  { code: '+86', label: '+86 中国大陆' },
  { code: '+852', label: '+852 中国香港' },
  { code: '+853', label: '+853 中国澳门' },
  { code: '+886', label: '+886 中国台湾' },
  { code: '+1', label: '+1 美国/加拿大' },
  { code: '+44', label: '+44 英国' },
  { code: '+81', label: '+81 日本' },
  { code: '+82', label: '+82 韩国' },
  { code: '+65', label: '+65 新加坡' },
  { code: '+61', label: '+61 澳大利亚' },
  { code: '+49', label: '+49 德国' },
  { code: '+33', label: '+33 法国' },
];

interface RestCountry {
  cca2?: string;
  name?: { common?: string };
  idd?: { root?: string };
}

function isOption(value: unknown): value is CountryCodeOption {
  const item = value as CountryCodeOption;
  return Boolean(
    item &&
      typeof item.code === 'string' &&
      item.code.startsWith('+') &&
      typeof item.label === 'string',
  );
}

function readCache(allowExpired: boolean): CountryCodeOption[] | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { savedAt?: number; options?: unknown };
    if (!parsed || !Array.isArray(parsed.options)) return null;

    const options = parsed.options.filter(isOption);
    if (!options.length) return null;
    if (
      !allowExpired &&
      typeof parsed.savedAt === 'number' &&
      Date.now() - parsed.savedAt > CACHE_TTL
    ) {
      return null;
    }

    return options;
  } catch {
    return null;
  }
}

function writeCache(options: CountryCodeOption[]) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), options }),
    );
  } catch {
    // 隐私模式下 localStorage 可能不可写，忽略即可
  }
}

function normalize(data: unknown): CountryCodeOption[] {
  if (!Array.isArray(data)) return [];

  const display =
    typeof Intl !== 'undefined' && 'DisplayNames' in Intl
      ? new Intl.DisplayNames(['zh-CN'], { type: 'region' })
      : null;

  const seen = new Set<string>();
  const options: CountryCodeOption[] = [];

  for (const raw of data) {
    const item = raw as RestCountry;
    const code = item.idd?.root;
    if (typeof code !== 'string' || !/^\+\d{1,4}$/.test(code)) continue;

    const iso = item.cca2?.toUpperCase();
    const localized = iso && display ? display.of(iso) : undefined;
    const name =
      (localized && localized !== iso ? localized : undefined) ||
      item.name?.common ||
      code;

    const key = `${code}|${name}`;
    if (seen.has(key)) continue;
    seen.add(key);

    options.push({ code, label: `${code} ${name}` });
  }

  return options.sort(
    (a, b) =>
      a.code.localeCompare(b.code, 'en', { numeric: true }) ||
      a.label.localeCompare(b.label, 'zh-CN'),
  );
}

/** 打开表单时拉取最新国家/地区区号，失败时回退内置常用列表 */
export function useCountryCodes(enabled: boolean): CountryCodeOption[] {
  const [options, setOptions] = useState<CountryCodeOption[]>(
    () => readCache(true) ?? FALLBACK,
  );

  useEffect(() => {
    if (!enabled) return;

    const cached = readCache(false);
    if (cached) {
      setOptions(cached);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);

    (async () => {
      try {
        const response = await fetch(SOURCE_URL, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(String(response.status));

        const next = normalize(await response.json());
        if (!cancelled && next.length) {
          setOptions(next);
          writeCache(next);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('[contact] 区号列表拉取失败，使用内置列表', error);
        }
      } finally {
        clearTimeout(timer);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [enabled]);

  return options;
}
