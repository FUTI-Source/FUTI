import { useEffect, useState } from 'react';

import { createHighlighterCore } from '@shikijs/core';
import type { HighlighterCore } from '@shikijs/types';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';

import { SHIKI_LANGS } from './langs';
import { SHIKI_THEME } from './themes';

export const languageMap = SHIKI_LANGS.map(({ name }) => name);

const FALLBACK_LANG = 'txt';

let highlighterPromise: Promise<HighlighterCore> | undefined;

const initHighlighter = (): Promise<HighlighterCore> => {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      langs: SHIKI_LANGS,
      themes: SHIKI_THEME,
      engine: createOnigurumaEngine(() => import('shiki/wasm')),
    }).catch((error: unknown) => {
      highlighterPromise = undefined;
      throw error;
    });
  }

  return highlighterPromise;
};

export const useHighlight = (text: string, lang: string, theme = 'one-dark-pro') => {
  const language = lang.toLowerCase();
  const key = [language, theme, text].join('-');
  const [result, setResult] = useState<{ key: string; html: string }>();

  useEffect(() => {
    let cancelled = false;

    void initHighlighter()
      .then((highlighter) => {
        const html = highlighter.codeToHtml(text, {
          lang: languageMap.includes(language as any) ? language : FALLBACK_LANG,
          theme,
        });
        if (!cancelled) setResult({ key, html });
      })
      .catch(() => {
        if (!cancelled) setResult({ key, html: '' });
      });

    return () => {
      cancelled = true;
    };
  }, [key, language, text, theme]);

  const data = result?.key === key ? result.html : undefined;
  return { data, isLoading: data === undefined };
};
