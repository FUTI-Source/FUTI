import { createHighlighterCore } from '@shikijs/core';
import { transformerNotationDiff, transformerNotationErrorLevel, transformerNotationFocus, transformerNotationHighlight, transformerNotationWordHighlight } from '@shikijs/transformers';
import type { HighlighterCore } from '@shikijs/types';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import useSWR from 'swr';

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

export const useHighlight = (text: string, lang: string, theme = 'one-dark-pro') =>
  useSWR(
    [lang.toLowerCase(), theme, text].join('-'),
    async () => {
      try {
        const language = lang.toLowerCase();
        const highlighter = await initHighlighter();
        return highlighter.codeToHtml(text, {
          lang: languageMap.includes(language as any) ? language : FALLBACK_LANG,
          theme,
          transformers: [transformerNotationDiff(), transformerNotationHighlight(), transformerNotationWordHighlight(), transformerNotationFocus(), transformerNotationErrorLevel()],
        });
      } catch {
        return '';
      }
    },
    { revalidateOnFocus: false },
  );
