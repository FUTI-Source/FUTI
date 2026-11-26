# 张文涛 · 个人主页

基于 **Next.js 16 + React 19 + TypeScript** 构建的独立个人主页。

- 线上地址：<https://www.zhang-wentao.tech>

## 功能特性

- **首页形象**：Live2D 看板形象（WebGL 检测 + SDK 动态加载）、视差背景、打字机式自我介绍、全局自定义光标、首屏加载进度圈
- **联系表单**：react-hook-form + zod 校验，POST JSON Webhook 通知，带 IP 限流与蜜罐反滥用
- **打赏**：微信支付、支付宝、PayPal，无状态订单令牌，扫码/跳转支付、回调验签通知站长
- **PWA**：可安装、离线页与静态资源缓存，适配 iOS 主屏幕与桌面 WCO
- **音乐胶囊**：右下角悬浮播放器，支持本地曲目与在线歌单（网易云 / QQ / 酷狗 / 酷我 / 咪咕）、会员曲目按需解析与跨平台找源、同步 LRC 歌词、列表循环 / 单曲循环 / 随机播放
- **统计**：Umami 自建统计（隐私友好），Vercel 部署时额外注入 Vercel Analytics
- **SEO**：Metadata API、robots.ts、sitemap.ts、OG 分享图与结构化数据

## 技术栈

| 领域 | 选型 |
|------|------|
| 框架 | Next.js 16（App Router / Turbopack）· React 19 · TypeScript 5 |
| 样式 | Tailwind CSS v4 · tw-animate-css · normalize.css |
| 动画/交互 | motion · parallax-js · pixi.js（Live2D 渲染） |
| UI 组件 | Radix UI · lucide-react |
| 表单 | react-hook-form · @hookform/resolvers · zod |
| 通知 | 通用 HTTP Webhook · 飞书/钉钉/企微机器人协议适配 |
| 打赏 | qrcode · 微信 APIv3 / 支付宝 RSA2 / PayPal Orders API v2 |
| 部署 | Vercel 单源站（GitHub 自动构建）· 火山引擎 DCDN 境内加速 |

**运行环境要求 Node.js 26.x**（`package.json` 的 `engines` 已锁 `26.x`，升级 major 请手动改）

## 快速开始

```bash
npm install
cp .env.local.example .env.local   # 填入真实凭证
npm run dev                        # http://localhost:3000
```

类型检查、代码检查与生产构建：

```bash
npm run type:check        # tsc --noEmit
npm run lint              # eslint .
npm run build             # next build
npm run start             # next start
```

## 项目结构

```
src/
├── app/                          # App Router 入口（api、serwist、offline-fallback、browser-unsupported 均为路由契约）
├── components/
│   ├── ui/                       # 基础 UI 与跨 feature 的通用 props 类型
│   └── site-interaction/         # 全局交互守卫与自定义光标
├── config/
│   ├── env.ts                    # 服务端环境变量（唯一密钥入口）
│   ├── seo/                      # Next Metadata / Viewport 装配
│   └── site/                     # 公开站点配置，按主题拆分
│       ├── identity.ts           # 域名、语言、文案、备案、社交链接
│       ├── seo.ts                # 图标、分享图、Apple 启动图
│       ├── analytics.ts          # Umami
│       ├── donation.ts           # 打赏 / PayPal 档位
│       ├── cdn.ts                # CDN 缓存头
│       ├── pwa.ts                # SW 路径、主题色、注册行为、CSP 白名单
│       ├── browser.ts            # 浏览器最低版本
│       ├── music.ts              # 音乐胶囊公开配置
│       └── index.ts              # 统一 re-export
├── features/                     # 按业务域组织
│   ├── home/ avatar/ profile/ contact/ donate/ music/ pwa/
├── hooks/                        # 通用 React hooks
├── lib/                          # 跨业务通用工具（http、logger、utils、proxy 等）
├── server/                       # 服务端专用逻辑（notify、dedupe）
├── styles/                       # 全局样式
└── types/                        # 第三方模块类型补丁
public/                           # Live2D 模型、字体、图标、运行时脚本
licenses/                         # 内容等非代码资产协议
scripts/                          # 构建与部署辅助脚本
tooling/postcss/                  # PostCSS 插件
LICENSE                           # 代码开源协议（BSD-3-Clause）
```

## 站点配置

所有公开配置集中在 `src/config/site/`，统一从 `@/config/site` 引入：

| 模块 | 导出示例 | 作用 |
|------|----------|------|
| `identity.ts` | `SITE_URL` / `SITE_NAME` | 域名、语言、文案、备案 |
| `seo.ts` | `SITE_ICON_PATH` / `SITE_APPLE_SPLASH_SCREENS` | 图标、分享图、启动图 |
| `analytics.ts` | `SITE_ANALYTICS_URL` | Umami 配置 |
| `donation.ts` | `DONATION_MIN_AMOUNT` | 打赏 / PayPal 档位 |
| `cdn.ts` | `SITE_CDN_CACHE` | CDN 缓存策略 |
| `pwa.ts` | `SITE_PWA` | SW 路径、主题色、注册行为、CSP 白名单 |
| `browser.ts` | `SITE_BROWSER_MINIMUMS` | 浏览器最低版本 |
| `music.ts` | `SITE_MUSIC_PLAYLIST` | 音乐胶囊公开配置 |

**公开信息进文件，密钥进环境变量**。`src/config/site` 会被客户端组件引用，切勿写入任何密钥。

## 环境变量

### 通知 Webhook

| 变量 | 必填 | 说明 |
|------|------|------|
| `NOTIFY_WEBHOOK_URL` | 是 | 接收 POST JSON 的地址 |
| `NOTIFY_WEBHOOK_SECRET` | 否 | Authorization: Bearer \<secret\> |
| `NOTIFY_WEBHOOK_FALLBACK_URL` | 否 | 主 Webhook 失败时的备用地址 |

### 打赏

| 变量 | 必填 | 说明 |
|------|------|------|
| `WECHAT_MCH_ID` | 微信必填 | 商户号 |
| `WECHAT_APP_ID` | 微信必填 | AppID |
| `WECHAT_API_V3_KEY` | 微信必填 | 32 位 APIv3 密钥 |
| `WECHAT_CERT_SERIAL_NO` | 微信必填 | 商户 API 证书序列号 |
| `WECHAT_PRIVATE_KEY` | 微信必填 | apiclient_key.pem 内容 |
| `WECHAT_PUBLIC_KEY_ID` | 微信必填 | 微信支付公钥 ID |
| `WECHAT_PUBLIC_KEY` | 微信必填 | 微信支付公钥内容 |
| `ALIPAY_APP_ID` | 支付宝必填 | 应用 AppID |
| `ALIPAY_PRIVATE_KEY` | 支付宝必填 | 应用私钥（RSA2） |
| `ALIPAY_PUBLIC_KEY` | 支付宝必填 | 支付宝公钥 |
| `PAYPAL_CLIENT_ID` | PayPal 必填 | Client ID |
| `PAYPAL_CLIENT_SECRET` | 必填 | 对应 Secret |

### 音乐胶囊

音乐胶囊的全部公开配置集中在 `src/config/site/music.ts`。浏览器不直连任何音乐平台，资源解析统一在服务端完成，前端只拿到 HTTPS 音链、封面与歌词。

| 导出 | 类型 | 说明 |
|------|------|------|
| `SITE_MUSIC_TRACKS` | `readonly MusicTrack[]` | 本地曲目列表；配置在线歌单后会被在线歌单覆盖 |
| `SITE_MUSIC_PLAYLIST` | `MusicPlaylistSource` | 在线歌单来源：平台 / 资源类型 / 资源 ID |
| `SITE_MUSIC_API_BASE` | `string` | 外部 Meting API 地址，留空即用项目内置解析 |
| `SITE_MUSIC_QUALITIES` | `readonly number[]` | 原平台音质降级顺序，默认 320 / 192 / 128 kbps |
| `SITE_MUSIC_FALLBACK` | `MusicFallbackConfig` | 受限曲目的跨平台找源开关与平台顺序 |

#### 本地曲目

```ts
export const SITE_MUSIC_TRACKS: readonly MusicTrack[] = [
  {
    title: '曲目标题',
    artist: '歌手',
    src: '/music/example.mp3',
    cover: '/music/example.jpg',
    lyricId: undefined,
    lyrics: '[00:00.00]第一行歌词',
  },
];
```

- `src` / `cover` 建议放到 `public/music/` 下，站内相对路径即可；
- `cover` 留空时播放器显示默认音符图标；
- `lyrics` 填 LRC 原文后无需联网取歌词；`lyricId` 用于在线取歌词（对应平台的歌词 ID）。

#### 在线歌单

```ts
export const SITE_MUSIC_PLAYLIST: MusicPlaylistSource = {
  server: 'netease', // netease | tencent | kugou | kuwo | migu
  type: 'playlist', // song | playlist | album | artist | search
  id: '8152976493',
};
```

| 平台 | `server` | 实现方式 |
|------|----------|----------|
| 网易云音乐 | `netease` | 内置 `@meting/core` 自建解析 |
| QQ 音乐 | `tencent` | 内置 `@meting/core` 自建解析 |
| 酷狗音乐 | `kugou` | 内置 `@meting/core` 自建解析 |
| 酷我音乐 | `kuwo` | 内置 `@meting/core` 自建解析 |
| 咪咕音乐 | `migu` | 项目内服务端适配器 `src/features/music/server/migu.ts` |

> 百度音乐已移除，不再支持。

`id` 取自对应平台的分享链接：`playlist` 用歌单 ID、`song` 用歌曲 ID、`album` 用专辑 ID、`artist` 用歌手 ID、`search` 用搜索关键词。单次最多取 40 首。

#### 会员歌曲与跨平台找源

原平台没有返回音链的歌曲不会从列表中消失，而是保留并显示 `会员`。使用项目内置解析时，点击后播放器才请求 `/api/music/track`：先按配置的音质顺序重试原平台，再依次到 QQ、酷狗、咪咕搜索同名歌曲，优先使用同歌手的原唱，匹配到不同版本时才允许替代录音。跨平台音源会显示 `替代源`；所有平台都无可用音源时提示原因并暂停，不会卡在加载状态。

可在 `src/config/site/music.ts` 调整策略：

```ts
export const SITE_MUSIC_QUALITIES: readonly number[] = [320, 192, 128];

export const SITE_MUSIC_FALLBACK: MusicFallbackConfig = {
  enabled: true,
  servers: ['tencent', 'kugou', 'migu'], // 按顺序尝试
};
```

跨平台匹配不能保证每首歌都有可用录音。需要播放原平台会员歌曲时，最可靠的方式仍是配置带有合法账号登录态的平台 Cookie；`METING_*_COOKIE` 只在服务端使用，不会下发给浏览器。

#### 咪咕音乐

咪咕对接基于非官方协议，代码在 `src/features/music/server/migu.ts`（协议参考 MIT 项目 Domdkw/miguMusic-api-enhanced 后独立实现）：**不安装第三方 SDK，也不依赖外部 API 服务**。支持歌单 / 单曲 / 专辑 / 歌手 / 搜索五类资源，匿名态解析音链与 LRC 歌词；请求带单请求 10 秒、总预算 25 秒的超时，限制响应体大小与并发数，音链只接受 HTTPS 且保留签名参数。

#### 歌词

点击播放器的歌词按钮展开同步歌词面板：LRC 按时间戳逐行高亮并自动滚动。歌词在面板打开时才请求 `/api/music/lyrics?id=<lyricId>&server=<歌单平台>`（平台取 `SITE_MUSIC_PLAYLIST.server`），结果按「平台 + 歌词 ID」缓存，切回已加载的歌曲不重复拉取。

#### 接口

| 路由 | 参数 | 说明 |
|------|------|------|
| `GET /api/music/playlist` | `server`、`type`（默认 `playlist`）、`id` | 返回 `{ tracks }`；歌单为空或没有可解析曲目时返回 502 `EMPTY_PLAYLIST` |
| `GET /api/music/track` | `server`、`id` | 按需解析单曲；受限曲目会尝试音质降级与跨平台找源 |
| `GET /api/music/lyrics` | `id`、可选 `server`（默认取 `SITE_MUSIC_PLAYLIST.server`） | 返回 `{ lyric }`；无歌词返回 404 `LYRIC_NOT_FOUND` |

两个接口都只在服务端解析平台资源并统一转换成播放器数据。`/api/music/playlist` 在配置了 `SITE_MUSIC_API_BASE` 时，非咪咕平台改走该外部接口；咪咕始终走项目内置适配器。

#### 环境变量

以下 Cookie 属于敏感信息，只走服务端环境变量，不会写进 `src/config/site`（读取入口：`src/config/env.ts` 的 `getMetingCookie`）：

| 变量 | 必填 | 说明 |
|------|------|------|
| `METING_NETEASE_COOKIE` | 否 | 网易云 Cookie，可提高会员/受限歌曲解析成功率 |
| `METING_TENCENT_COOKIE` | 否 | QQ 音乐 Cookie，可提高会员/受限歌曲解析成功率 |
| `METING_KUGOU_COOKIE` | 否 | 酷狗 Cookie |
| `METING_KUWO_COOKIE` | 否 | 酷我 Cookie |

前端不会直接访问任何第三方 API，也不会接触这些 Cookie。

咪咕对接基于非官方协议，仅供学习研究；音乐资源版权归原平台所有，请勿用于商业或大规模抓取。

---

## 架构总览：Vercel 单源站 + 火山 DCDN 境内加速

全站只有一个源站（Vercel），只构建、部署一次。境内访客由 DNS 中国内地线路导入火山引擎 DCDN，DCDN 回源 Vercel；境外访客直连 Vercel。代码侧负责写缓存头、Service Worker 缓存、裸域归一化与回源后的真实 IP 识别。

```
访客（始终访问 https://www.zhang-wentao.tech）
  │
  ▼
火山云解析 DNS（智能解析，单域名分线路）
  ├─ 中国内地线路 ──► 火山引擎 DCDN（境内节点：静态缓存 + 动态加速）
  │                     │  回源 HTTPS，Host / SNI = www.zhang-wentao.tech
  │                     │  回源头追加 x-dcdn-client-ip / x-dcdn-origin-auth
  │                     ▼
  ├─ 全球(不含中国) ─► Vercel（唯一源站）
  └─ 默认线路 ──────► Vercel（兜底，同时保证 Vercel 证书签发校验可达）
  │
  ▼
应用层 src/proxy.ts
  └─ 裸域 → www（308）；UA 过旧兜底跳转（307 + no-store）；无地域判定、无跨域跳转
```

**单源站原则**：只有 Vercel 一个部署产物，DCDN 只是境内的缓存/加速层，不运行代码。`src/config/site` 改完**只需重新部署 Vercel 一次**，境内外同时生效（DCDN 上已缓存的静态资源按 TTL 过期或手动刷新）。DCDN 回源保留原 Host，所以应用看到的主机名与直连时完全一致，不存在第二个域名或跨域跳转。

## CDN 缓存策略

### 配置入口

`src/config/site` 的 `SITE_CDN_CACHE` 定义四档策略，`next.config.ts` 的 `headers()` 把它们写到对应路径。

**为什么可缓存档位要同时写 `CDN-Cache-Control`**：响应里只有 `Cache-Control` 时，Vercel 会消费并剥掉 `s-maxage` / `stale-*`，回源的 DCDN 只能拿到浏览器那部分。加上同值的 `CDN-Cache-Control` 后，Vercel 会把 `Cache-Control` 原样透传，DCDN「跟随源站」时就能读到完整指令。页面 HTML / RSC 仍由 Next.js 决定（Vercel 对外返回 `max-age=0, must-revalidate`），DCDN 跟随源站即不缓存。

| 路径 | 策略 | 响应头 | 说明 |
|------|------|--------|------|
| `/fonts/*`、`/launch/*` | `immutable` | `Cache-Control` 与 `CDN-Cache-Control` 均为 `public, max-age=31536000, s-maxage=31536000, immutable` | 字体、iOS 启动图，内容不可变，浏览器和 CDN 都存一年 |
| `/live2d/*` | `static` | `Cache-Control` 与 `CDN-Cache-Control` 均为 `public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400, stale-if-error=604800` | Live2D 运行时与模型，可能随版本更新 |
| `/_next/static/*` | Next.js 内置 | `public, max-age=31536000, immutable` | 带 hash 的构建产物，DCDN 可长期缓存 |
| `/serwist/sw.js` | `serviceWorker` | `no-cache, no-store, must-revalidate, no-transform` | 永不缓存，否则新版本推不下去 |
| `/api/*` | `api` | `no-store, no-cache, must-revalidate, private` | 支付回调、订单查询、Webhook，禁止任何缓存 |
| 其他页面 | 无显式缓存头 | 由 Next.js 决定 | 页面由 Serwist 按 NetworkFirst 处理，离线时回退缓存 |

### 三个关键指令

- **`s-maxage`**：只作用于共享缓存（CDN / 反向代理），优先级高于 `max-age`。让 CDN 可以缓存更久，而浏览器按自己的短周期回源校验，两者互不牵制。
- **`stale-while-revalidate=86400`**：缓存过期后的一天之内，CDN 可以先返回旧副本，同时在后台异步刷新。用户不等待回源，内容又能在后台更新。
- **`stale-if-error=604800`**：源站故障的一周内，继续用旧副本兜底，避免模型文件在源站抖动时直接 502。

> `immutable` 档不需要 `stale-*`：文件名或内容确定不变，过期前不存在“旧副本”问题。

### 想让某个资源立即刷新

1. **换文件名**（最干净）：`immutable` 档资源改名后就是新 URL，立刻生效；
2. **调小 TTL**：把 `SITE_CDN_CACHE.static` 的 `max-age` / `s-maxage` 改小后重新部署 Vercel；
3. **手动刷新缓存**：Vercel 部署时会自动清空自身 CDN 缓存，但火山 DCDN 不会——需要在 DCDN 控制台「刷新预热」里刷新目录（例如 `/live2d/`）。

## Service Worker 与离线

离线能力由 [Serwist](https://serwist.pages.dev/docs/next/turbo) 提供（Next 16 默认 Turbopack，使用 `@serwist/turbopack` 集成）。所有 PWA 配置集中在 `src/config/site` 的 `SITE_PWA`：路径、主题色、图标、注册行为、SW 生命周期与 CSP 白名单都从这里读取，其他文件不再写死这些常量。

- `src/app/sw.ts`：Service Worker 源码，使用 `defaultCache` 提供的 Next.js 推荐运行时策略（HTML/RSC 走 NetworkFirst，带 hash 的静态资源走 CacheFirst/StaleWhileRevalidate）；`/api/*` 被前置规则强制 NetworkOnly，不缓存支付与留言接口。
- `src/app/serwist/[path]/route.ts`：`createSerwistRoute` 在构建时用 esbuild 编译 `sw.ts`，注入 `.next/static`、`public` 与 `/offline-fallback` 的预缓存清单，并从 `/serwist/sw.js` 提供。
- `src/app/offline-fallback/page.tsx`：文档请求离线且无缓存时的兜底页。
- `src/features/pwa/pwa-registration.tsx`：`PwaRegistration` 先注销浏览器中残留的 `/sw.js` 注册并清理 `site-*` 旧缓存，再挂载 `SerwistProvider`；这解决了删除 `public/sw.js` 后旧注册仍尝试更新并报 404 的问题。
- `src/app/layout.tsx`：`SerwistProvider` 仅在生产环境注册 SW；关闭 `reloadOnOnline` 与 `cacheOnNavigation`，避免后台恢复/网络恢复时自动刷新造成白屏。
- `next.config.ts`：用 `withSerwist` 包装配置，把 esbuild 声明为 `serverExternalPackages`；为 `/serwist/:path*` 设置 `Content-Type`、永不缓存的 `Cache-Control` 与 SW 专用 CSP。SW 的 CSP 除 `default-src 'self'`、`script-src 'self'` 外，还必须显式放行 `connect-src`（统计域名、Vercel、PayPal 与音乐 CDN），否则 Serwist 在 worker 内 fetch 跨域资源时会被 CSP 回退规则拦截。同名 CSP 头由 SW 专用规则后写覆盖通用页规则，最终只发一条。

之前手写的 `CacheFirst / stale-cache` 逻辑、版本戳脚本、`public/sw.js` 和手动注册组件均已删除。页面从后台恢复的可见性处理仍由 `PageRestoreCoordinator` 统一广播，与 SW 解耦。

## DNS 智能解析（境内走 DCDN）

分流**不在代码、不在环境变量、不在 `src/config/site`**，而是在云解析 DNS 控制台给同一个主机名加分线路记录：中国内地线路指向火山 DCDN 的 CNAME，其余线路指向 Vercel。

### 记录清单

| 主机记录 | 线路 | 记录类型 | 记录值 |
|----------|------|----------|--------|
| `www` | 中国内地 | CNAME | DCDN 加速域名分配的 CNAME（`www.zhang-wentao.tech.xxx.vedcdnlb.com` 之类，以控制台为准） |
| `www` | 全球（不含中国内地） | CNAME | Vercel 项目 Domains 页给出的值（通常是 `cname.vercel-dns.com`） |
| `www` | 默认 | CNAME | 同上，指向 Vercel（兜底） |
| `@` | 中国内地 | CNAME | DCDN 为裸域分配的 CNAME（需在 DCDN 另加一个加速域名） |
| `@` | 全球（不含中国内地） | A | Vercel 给出的 A 记录 |
| `@` | 默认 | A | 同上（再由应用 308 补 www） |

### 约束与注意事项

- **默认线路必须指向 Vercel**：Vercel 签发 / 续期证书时从境外校验域名，如果默认线路也指到 DCDN，校验可能失败导致证书过期。
- 同一线路内不要同时放两个值，那会变成按权重轮询，不是分流。
- 免费版 TTL 最小 600 秒，改记录后至少等 10 分钟再判定结果。
- 线路匹配优先级：自定义 > 运营商 > 中国内地 > 全球 > 默认；自定义线路一旦命中会盖掉下面几档。
- 加速区域包含中国大陆时域名必须完成 ICP 备案。
- 免费版 DNS 节点在境内：境外递归时 ECS 偶尔仍判为内地 → 走 DCDN 再回源 Vercel，多绕一跳但内容一致。单源站下分流偏差只影响速度，不影响正确性。
- `@` 不要用「URL 转发」：转发走默认线路、需要备案，且无法配合分线路；用解析记录 + 应用层 308 归一化。

### 为什么不做应用内跳转

DNS 已按线路决定访客走 DCDN 还是直连，两条路径最后都落在同一个 Vercel 部署、同一个主机名上，不存在可跳转的第二个目标。DCDN 的回源头也只有 uri、host、client_ip 等变量，**没有国家字段**。因此 `X-Site-Geo`、`site-region` Cookie、跨域跳转都不存在；分流异常先查 DNS，不要在 `proxy.ts` 里补规则。

> 应用层保留的两类跳转都与地域无关：① 裸域 → www 的 308（按 host 归一化，确定且可缓存）；② UA 过旧时跳 `/browser-unsupported` 的 307（显式 `Cache-Control: no-store`，避免共享缓存把跳转错发给其它 UA 的访客）。被误判的用户可点兜底页「仍要继续访问」逃生。

## 部署

```bash
npx vercel login
npx vercel deploy --prod --yes
```

项目已接入 GitHub 的 Git 集成，`main` 分支每次 push 自动构建并发布。境内无需单独部署——DCDN 回源的就是这个 Vercel 生产部署。

### Vercel 配置要点

- `vercel.json` 声明 `framework: nextjs`、`buildCommand: npm run build`、`installCommand: npm ci --registry=https://registry.npmjs.org`；
- Node.js 版本 **26.x**（`package.json` 的 `engines` 已锁定，防止自动升到新 major）；
- 环境变量在 Settings → Environment Variables 配置，Production / Preview / Development 都要覆盖；新增 `DCDN_ORIGIN_SECRET`（见下）；
- Domains 里绑定 `www.zhang-wentao.tech` 与裸域，回调地址按 `SITE_URL` 拼接。

### 火山引擎 DCDN 配置要点

DCDN 不跑代码，只做境内节点的缓存与动态加速。在 DCDN 控制台新增加速域名 `www.zhang-wentao.tech`（裸域同理再加一个），加速区域选「中国内地」：

| 配置项 | 值 | 说明 |
|--------|----|------|
| 源站类型 | 域名 | 填 `cname.vercel-dns.com`（或 Vercel 给出的 CNAME 目标） |
| 回源协议 | HTTPS，端口 443 | Vercel 只在 HTTPS 上服务正式域名 |
| 回源 Host | `www.zhang-wentao.tech` | **必须**是正式域名，否则 Vercel 不知道路由到哪个项目 |
| 回源 SNI | 开启，值同回源 Host | Vercel 按 SNI 选择证书，缺失会握手失败 |
| HTTPS 证书 | 在 DCDN 上传或申请 `www.zhang-wentao.tech` 证书，开启强制 HTTPS | DCDN 节点直接面对境内访客 |
| 回源 HTTP 请求头 | `x-dcdn-client-ip` = `${client_ip}`；`x-dcdn-origin-auth` = 与 `DCDN_ORIGIN_SECRET` 相同的随机串 | 让应用拿到访客真实 IP（限流、微信下单 IP） |
| 缓存规则 | 「遵循源站」；兜底规则对 `/api/*`、`/serwist/sw.js` 设为不缓存 | 源站已按路径写好 `Cache-Control` / `CDN-Cache-Control` |
| 缓存键 | 保留完整查询参数 | RSC 请求依赖 `?_rsc=` 区分 |
| 智能压缩 | 开启 Gzip / Brotli | 与源站压缩不冲突 |
| 动态加速 | 开启 | 页面 HTML / RSC / API 不缓存，走动态加速链路回源 |

**生成回源鉴权串**：`openssl rand -hex 32`，同时填进 Vercel 环境变量 `DCDN_ORIGIN_SECRET` 与 DCDN 回源头 `x-dcdn-origin-auth`，然后重新部署 Vercel。不配置时功能照常，只是境内访客的 IP 会被识别为 DCDN 节点 IP（限流会按节点合并）。

## 验证清单

部署后逐项验证（把域名换成实际域名）：

```bash
# 1. 源站缓存头
curl -sI https://www.example.com/live2d/live2dcubismcore.min.js | grep -i "cache-control"
# 期望：Cache-Control 含 s-maxage=604800, stale-while-revalidate=86400

curl -sI https://www.example.com/fonts/nunito-latin-variable.woff2 | grep -i "cache-control"
# 期望：含 immutable

curl -sI https://www.example.com/serwist/sw.js | grep -i "cache-control"
# 期望：no-cache, no-store, must-revalidate

curl -sI https://www.example.com/api/donate/config | grep -i "cache-control"
# 期望：no-store

# 2. 境内链路是否经过 DCDN（在境内机器上执行）
curl -sI https://www.example.com/fonts/nunito-latin-variable.woff2 | grep -i "^server\|^via\|^age"
# 期望：出现火山节点标识（server / via 头），重复请求后 age 递增

# 3. 裸域补 www
curl -sI -H "Host: example.com" http://127.0.0.1:3000/ | grep -i "^HTTP\|^location"
# 期望：308 → https://www.example.com/

# 4. DNS 分流（用 EDNS Client Subnet 模拟不同视角）
dig +subnet=114.114.114.114 www.example.com @ns1.volcengine-dns.com +short  # 境内：DCDN CNAME
dig +subnet=8.8.8.8 www.example.com @ns1.volcengine-dns.com +short          # 境外：cname.vercel-dns.com

# 5. SW 响应只有一个 CSP 头
curl -sI https://www.example.com/serwist/sw.js | grep -ci "^content-security-policy:"
# 期望：1

# 6. UA 兜底跳转不可被共享缓存
curl -sI -A "Mozilla/5.0 (Windows NT 6.1) Chrome/90.0 Safari/537.36" https://www.example.com/ | grep -i "^HTTP\|^location\|^cache-control"
# 期望：307 → /browser-unsupported，且 Cache-Control: no-store
```

浏览器侧再确认：

- DevTools → Application → Service Workers：`/serwist/sw.js` 处于 Activated 状态；
- DevTools → Application → Cache Storage：出现 Serwist 的预缓存及 `pages*` / `next-*` 缓存；
- Network 面板：`/serwist/sw.js` 永远不是 from disk cache；断网刷新首页仍能渲染，未缓存路由显示 `/offline-fallback` 兜底页；
- 境内/境外访问地址栏始终是同一个域名，没有跨域跳转。

## 常见问题

- **Webhook 返回 502**：检查 `NOTIFY_WEBHOOK_URL` 是否可访问、是否在 8 秒内返回 2xx
- **Live2D 不显示**：确认 `public/live2d/` 目录已完整部署，浏览器支持 WebGL
- **打赏下单 502**：检查密钥格式（`\n` 是否还原）、证书序列号、AppID 与商户号绑定
- **改了配置不生效**：配置在构建期求值，需要重新部署 Vercel；境内还要等 DCDN 缓存过期或手动刷新

### CDN 缓存与分流

| 现象 | 排查方向 |
|------|----------|
| 境内访问 421 / 404 / 证书错误 | DCDN 回源 Host 与 SNI 必须是 `www.zhang-wentao.tech`；源站填 Vercel CNAME 目标，协议 HTTPS |
| 换了模型境内一直看到旧文件 | Vercel 部署会清自身缓存，DCDN 不会：在 DCDN「刷新预热」里刷新 `/live2d/` 目录，必要时给模型文件换名 |
| 境内页面内容滞后于境外 | DCDN 缓存了 HTML：检查缓存规则是否「遵循源站」，不要对 `/*` 设强制 TTL |
| `/serwist/sw.js` 命中缓存，新版本推不下去 | 确认响应头是 `no-cache, no-store`；DCDN 对该路径加「不缓存」兜底规则 |
| 境内限流误伤 / 微信下单 IP 是节点 IP | `DCDN_ORIGIN_SECRET` 未配置或与回源头不一致，或缺少 `x-dcdn-client-ip: ${client_ip}` |
| Vercel 证书续期失败 | DNS 默认线路必须指向 Vercel，不能也指向 DCDN |
| 境外访客走了 DCDN（慢） | 免费版境内 NS 的 ECS 偏差，见「DNS 智能解析」；内容一致，仅多绕一跳 |
| 明明是新浏览器却被“版本过低”拦住 | 点兜底页底部的「仍要继续访问」（带 `?browser-check-continue=1`，`proxy.ts` 会种一个 `browser-check-continue` 会话 Cookie 并放行）；若是大量同类误判，需调 `SITE_BROWSER_MINIMUMS` 或补 `browser-support.ts` 的 UA 解析 |
| 支付回调异常 | `proxy.ts` 的 matcher 已排除 `/api/*`；DCDN 对 `/api/*` 不缓存；回调地址按 `SITE_URL` 拼接 |
| DNS 改了不生效 | 免费版 TTL 最小 600 秒，等待至少 10 分钟再用 `dig +subnet` 复核 |

## 许可协议

- **站点代码**：BSD-3-Clause License，详见 [LICENSE](LICENSE)
- **站点内容**：文字、图片、设计素材等采用 CC BY-NC 4.0，详见 [licenses/CONTENT-LICENSE.txt](licenses/CONTENT-LICENSE.txt)

代码与内容使用不同协议。二次使用、转载或商用前请分别查看对应协议条款。
