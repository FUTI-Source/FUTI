import { NextResponse } from 'next/server';

/**
 * 浏览器版本过低提示页。
 *
 * 原先是 public/browser-unsupported.html 独立静态文件，现内置为 Route Handler：
 * 直接返回纯 HTML + 内联 CSS，不套 root layout、不注入 Next 运行时脚本，
 * 因此仍满足「零 JS、零框架」——被跳过来的旧内核也能正常解析显示。
 *
 * 由两处链路跳入（路径需保持一致）：
 *  - src/proxy.ts        服务端按 UA 拦截页面导航
 *  - public/scripts/browser-check.js  客户端语法能力兜底
 *
 * 注意：下方「支持的最低版本」文案需与 src/config/site 的 SITE_BROWSER_MINIMUMS
 * 保持一致（本页不引用运行时配置）。
 */
const UNSUPPORTED_HTML = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="robots" content="noindex" />
    <meta name="theme-color" content="#0b0f16" />
    <meta name="color-scheme" content="dark" />
    <title>浏览器版本过低 · 张文涛</title>
    <style>
      @font-face {
        font-family: 'Nunito Variable';
        font-style: normal;
        font-weight: 200 1000;
        font-display: swap;
        src: url('/fonts/nunito-latin-variable.woff2') format('woff2-variations');
        unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC,
          U+2000-206F, U+20AC, U+2122, U+2190-21FF, U+2212, U+2215, U+FEFF, U+FFFD;
      }
      @font-face {
        font-family: 'ZCOOL KuaiLe';
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        src: url('/fonts/zcool-kuaile-sc.woff2') format('woff2');
        unicode-range: U+2E80-2FFF, U+3000-303F, U+3040-30FF, U+3400-4DBF, U+4E00-9FFF,
          U+F900-FAFF, U+FF00-FFEF;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        min-height: 100%;
      }

      body {
        margin: 0;
        padding: 32px 18px;
        color: #f4f7fb;
        font-family: 'Nunito Variable', 'ZCOOL KuaiLe', 'PingFang SC', 'Hiragino Sans GB',
          'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif;
        background:
          radial-gradient(circle at 15% 18%, rgba(2, 149, 229, 0.2), transparent 34%),
          radial-gradient(circle at 86% 82%, rgba(111, 66, 222, 0.18), transparent 32%),
          linear-gradient(155deg, #0b0f16 0%, #141a24 52%, #090c12 100%);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .card {
        position: relative;
        width: 100%;
        max-width: 760px;
        margin: 0 auto;
        padding: 40px 34px 30px;
        overflow: hidden;
        text-align: center;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 22px;
        background: rgba(18, 23, 33, 0.9);
        box-shadow:
          0 24px 70px rgba(0, 0, 0, 0.45),
          inset 0 1px 0 rgba(255, 255, 255, 0.04);
      }

      .card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #0295e5 0%, #6f42e0 100%);
      }

      .eyebrow {
        margin: 0 0 20px;
        color: #7f8da3;
        font-size: 12px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
      }

      .icon {
        width: 66px;
        height: 66px;
        margin: 0 auto 22px;
        padding: 15px;
        border-radius: 18px;
        color: #72c8f6;
        background: linear-gradient(145deg, rgba(2, 149, 229, 0.2), rgba(111, 66, 222, 0.16));
        border: 1px solid rgba(114, 200, 246, 0.25);
        box-shadow: 0 16px 40px rgba(2, 149, 229, 0.12);
      }

      h1 {
        margin: 0 0 12px;
        font-size: 32px;
        line-height: 1.25;
        letter-spacing: 0.03em;
        color: rgba(255, 255, 255, 0.94);
      }

      .lead {
        max-width: 560px;
        margin: 0 auto;
        color: #a9b2c2;
        font-size: 15px;
        line-height: 1.85;
      }

      .minimum {
        display: inline-block;
        margin-top: 24px;
        padding: 9px 15px;
        border-radius: 999px;
        border: 1px solid rgba(2, 149, 229, 0.28);
        background: rgba(2, 149, 229, 0.08);
        color: #9edcff;
        font-size: 12px;
        letter-spacing: 0.02em;
      }

      .browsers {
        margin-top: 30px;
        text-align: left;
      }

      .browser {
        position: relative;
        display: block;
        min-height: 76px;
        padding: 17px 58px 17px 72px;
        border: 1px solid rgba(255, 255, 255, 0.09);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.035);
        color: rgba(255, 255, 255, 0.9);
        text-decoration: none;
        transition: border-color 0.2s, background-color 0.2s, transform 0.2s;
      }

      .browser + .browser {
        margin-top: 12px;
      }

      .browser:hover,
      .browser:focus {
        outline: none;
        border-color: rgba(2, 149, 229, 0.55);
        background: rgba(2, 149, 229, 0.09);
        transform: translateY(-1px);
      }

      .mark {
        position: absolute;
        top: 19px;
        left: 18px;
        width: 38px;
        height: 38px;
        border-radius: 11px;
        text-align: center;
        line-height: 36px;
        font-size: 16px;
        font-weight: 800;
      }

      .edge .mark {
        color: #6fd0ff;
        border: 1px solid rgba(2, 149, 229, 0.34);
        background: rgba(2, 149, 229, 0.15);
      }

      .chrome .mark {
        color: #ff9d8a;
        border: 1px solid rgba(234, 67, 53, 0.3);
        background: rgba(234, 67, 53, 0.14);
      }

      .firefox .mark {
        color: #ffbd6b;
        border: 1px solid rgba(255, 145, 0, 0.3);
        background: rgba(255, 145, 0, 0.14);
      }

      .name {
        display: block;
        font-size: 15px;
        font-weight: 700;
        line-height: 1.4;
      }

      .recommend {
        display: inline-block;
        margin-left: 8px;
        padding: 2px 7px;
        border-radius: 999px;
        color: #71c9f6;
        background: rgba(2, 149, 229, 0.14);
        font-size: 11px;
        font-weight: 600;
        vertical-align: 1px;
      }

      .note {
        display: block;
        margin-top: 5px;
        color: #7f8b9f;
        font-size: 12px;
        line-height: 1.5;
      }

      .arrow {
        position: absolute;
        top: 25px;
        right: 22px;
        color: #6e7b90;
        font-size: 18px;
      }

      .footer {
        margin-top: 24px;
        color: #69758a;
        font-size: 12px;
        line-height: 1.7;
      }

      @media (min-width: 40rem) {
        body {
          padding: 40px 24px;
        }

        .card {
          padding: 46px 42px 34px;
        }

        h1 {
          font-size: 38px;
        }

        .browsers {
          overflow: hidden;
        }

        .browser {
          float: left;
          width: calc((100% - 24px) / 3);
        }

        .browser + .browser {
          margin-top: 0;
          margin-left: 12px;
        }

        .browser {
          min-height: 112px;
          padding: 22px 34px 18px 20px;
        }

        .mark {
          position: static;
          margin-bottom: 14px;
        }

        .arrow {
          top: 21px;
          right: 16px;
        }
      }
    </style>
  </head>
  <body>
    <main class="card">
      <p class="eyebrow">Browser Upgrade Required</p>

      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3.5 9.5h17M3.5 14.5h17" />
        <path d="M12 3c2.4 2.4 3.6 5.5 3.6 9s-1.2 6.6-3.6 9c-2.4-2.4-3.6-5.5-3.6-9S9.6 5.4 12 3Z" />
      </svg>

      <h1>浏览器版本过低</h1>
      <p class="lead">
        当前浏览器无法完整展示本站内容。<br />
        请升级到新版浏览器，或选择下面的现代浏览器后重新访问。
      </p>

      <p class="minimum">支持的最低版本：Chrome / Edge ≥ 125　·　Firefox ≥ 126　·　Safari ≥ 17.5</p>

      <div class="browsers">
        <a class="browser edge" href="https://www.microsoft.com/zh-cn/edge/download" target="_blank" rel="noopener noreferrer">
          <span class="mark">E</span>
          <span class="name">Microsoft Edge <span class="recommend">推荐</span></span>
          <span class="note">Windows / macOS 官方下载</span>
          <span class="arrow">↗</span>
        </a>
        <a class="browser chrome" href="https://www.google.com/chrome/" target="_blank" rel="noopener noreferrer">
          <span class="mark">C</span>
          <span class="name">Google Chrome</span>
          <span class="note">Chromium 内核，功能完整</span>
          <span class="arrow">↗</span>
        </a>
        <a class="browser firefox" href="https://www.mozilla.org/zh-CN/firefox/" target="_blank" rel="noopener noreferrer">
          <span class="mark">F</span>
          <span class="name">Firefox</span>
          <span class="note">独立内核，轻量安全</span>
          <span class="arrow">↗</span>
        </a>
      </div>

      <p class="footer">升级完成后，请刷新或重新打开本站。</p>
    </main>
  </body>
</html>
`;

// 内容为常量、与请求无关：静态化后由服务端直接吐出，避免每次进 runtime。
export const dynamic = 'force-static';

export function GET() {
  return new NextResponse(UNSUPPORTED_HTML, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // 无指纹的固定页：短缓存即可，改动随下次构建生效
      'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
