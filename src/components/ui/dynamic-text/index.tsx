import React, { memo, useEffect, useRef, useState } from 'react';
import { DOMMotionComponents, motion, MotionProps } from 'motion/react';
import { isEmpty } from 'underscore';
import { AsComp, BasicsProps } from '@/components/type.ts';
import useMemoizedFn from '@/hooks/use-memoized-fn.ts';
import { cn } from '@/lib/utils';
import {
  getRandom,
  HIRAGANA_AND_KATAKANA,
  isCJK,
  isHiragana,
  isInserter,
  isKatakana,
  isMultibyteText,
  NUMBER_AND_ENGLISH,
  SYLLABLES_AND_LOANWORDS,
  wait,
} from './utils';

type IFUTIDynamicTextProps = BasicsProps<'h1', 'children'> &
  Omit<MotionProps, 'onAnimationComplete'> & {
    text?: string;
    insertPlaceholderDuration?: number; // 插入占位符持续时间（毫秒）
    characterRevealDuration?: number; // 每个字符显示持续时间（毫秒）
    shuffleCount?: number; // 洗牌次数
    pauseBeforeReveal?: number; // 显示真实字符前的暂停时间（毫秒）
    onAnimationComplete?: () => void; // 动画完成回调
    onPlaceholderComplete?: () => void; // 插入占位符完成回调
    /** 为 true 时跳过打字机动画，text 变化直接替换。适合时钟等高频更新内容 */
    instant?: boolean;
    as?: AsComp;
  };

export const FUTIDynamicText: React.FC<IFUTIDynamicTextProps> = memo(
  ({
    text,
    children,
    className,
    style,
    insertPlaceholderDuration = 100,
    characterRevealDuration = 20,
    shuffleCount = 14,
    pauseBeforeReveal = 50,
    instant = false,
    onAnimationComplete,
    onPlaceholderComplete,
    as: Element = motion.h1,
    ...rest
  }) => {
    Element = Element as DOMMotionComponents['h1'];

    const [visibleText, setVisibleText] = useState('');
    const prevTextRef = useRef<string | null>(null);
    // 动画版本号：每开一个新动画 +1，旧动画发现版本不符就自行退出
    const runIdRef = useRef(0);

    // 把目标文本提到外面，作为 effect 的稳定依赖
    const target = text || children?.toString() || '';

    const handleAnimation = useMemoizedFn(async () => {
      const runId = ++runIdRef.current;
      const isStale = () => runId !== runIdRef.current;

      if (!target || isEmpty(target)) return;
      prevTextRef.current = target;

      const texts = target.split('');
      const insertInterval = insertPlaceholderDuration / texts.length; // 100ms / 100 字符

      // 阶段一：插入占位符
      for (const chunk of texts) {
        if (isStale()) return;
        if (isInserter(chunk)) {
          setVisibleText((prev) => prev + chunk);
        } else if (isMultibyteText(chunk)) {
          setVisibleText((prev) => prev + '//');
        } else {
          setVisibleText((prev) => prev + '/');
        }
        await wait(insertInterval);
      }

      // 阶段二：停顿
      if (isStale()) return;
      await wait(pauseBeforeReveal);
      if (isStale()) return; // await 之后必须重新校验
      onPlaceholderComplete?.();

      // 阶段三：洗牌揭示
      let index = 0;
      const temp: Record<number, number> = {};
      let finalText = '';

      while (finalText !== target) {
        if (isStale()) return;
        finalText = texts
          .map((it, i) => {
            if (isInserter(it)) {
              return it;
            } else if (i >= index) {
              return isMultibyteText(it) ? '//' : '/';
            } else {
              void (void 0 === temp[i] && (temp[i] = shuffleCount));
              if (temp[i]) {
                temp[i]--;
                if (isCJK(it)) {
                  return getRandom(HIRAGANA_AND_KATAKANA);
                } else if (isHiragana(it) || isKatakana(it)) {
                  return getRandom(SYLLABLES_AND_LOANWORDS);
                } else {
                  return getRandom(NUMBER_AND_ENGLISH);
                }
              } else {
                return it;
              }
            }
          })
          .join('');
        setVisibleText(finalText);
        index++;
        await wait(characterRevealDuration);
      }

      if (isStale()) return;
      onAnimationComplete?.();
    });

    // instant 模式：直接同步文本，不跑任何动画
    useEffect(() => {
      if (!instant) return;
      runIdRef.current++; // 让可能还在跑的旧动画立刻失效
      prevTextRef.current = target;
      setVisibleText(target);
    }, [instant, target]);

    // 动画模式：保持原有行为（text 变化时重播动画）
    useEffect(() => {
      if (instant) return;
      if (prevTextRef.current) {
        setVisibleText('');
        void handleAnimation();
      }
      // 依赖变化 / 卸载时，让正在跑的动画失效
      return () => {
        runIdRef.current++;
      };
    }, [instant, handleAnimation, target]);

    return (
      <Element
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1, transition: { duration: 0.016 } }}
        onAnimationStart={instant || visibleText === target ? undefined : handleAnimation}
        className={cn('inline-block leading-tight font-bold', className)}
        style={style ?? {}}
        {...rest}
      >
        {visibleText}
      </Element>
    );
  },
);
FUTIDynamicText.displayName = 'FUTI-DynamicText';
