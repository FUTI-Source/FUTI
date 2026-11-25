# 张文涛 · 个人主页

基于 **Next.js 16 + React 19 + TypeScript** 构建的独立个人主页。

- 线上地址：<https://www.zhang-wentao.tech>

## 功能特性

- **首页形象**：Live2D 看板形象（WebGL 检测 + SDK 动态加载）、视差背景、打字机式自我介绍、全局自定义光标、首屏加载进度圈
- **联系表单**：react-hook-form + zod 校验，POST JSON Webhook 通知，带 IP 限流与蜜罐反滥用
- **打赏**：微信支付、支付宝、PayPal，无状态订单令牌，扫码/跳转支付、回调验签通知站长
- **PWA**：可安装、离线页与静态资源缓存，适配 iOS 主屏幕与桌面 WCO
- **音乐胶囊**：右下角悬浮播放器，支持本地曲目与 Meting 在线歌单
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
| 部署 | 火山引擎 IGA Pages · Vercel（GitHub 镜像自动构建） |

**运行环境要求 Node.js 24.x**（`package.json` 的 `engines` 已锁 `24.x`，升级 major 请手动改）

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
npm run build             # next build（standalone 输出）
npm run start             # next start
npm run start:standalone  # 按 standalone 产物启动
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

### 在线歌单

所有公开的音乐配置统一写在 `src/config/site/music.ts`：本地曲目 `SITE_MUSIC_TRACKS`、在线歌单 `SITE_MUSIC_PLAYLIST`、外部 API 地址 `SITE_MUSIC_API_BASE`。在线歌单使用 HeoMusic / MetingJS 相同参数：`server`、`type`、`id`。

项目已内置 `@meting/core` 自建解析，`SITE_MUSIC_API_BASE` 留空时不依赖外部公共 API。浏览器只请求 `/api/music/playlist`，由服务端解析并统一转换为播放器数据。

以下 Cookie 属于敏感信息，只走服务端环境变量，不会写进 `src/config/site`：

| 变量 | 必填 | 说明 |
|------|------|------|
| `METING_NETEASE_COOKIE` | 否 | 网易云 Cookie，可提高会员/受限歌曲解析成功率 |
| `METING_TENCENT_COOKIE` | 否 | QQ 音乐 Cookie，可提高会员/受限歌曲解析成功率 |
| `METING_KUGOU_COOKIE` | 否 | 酷狗 Cookie |
| `METING_BAIDU_COOKIE` | 否 | 百度音乐 Cookie |
| `METING_KUWO_COOKIE` | 否 | 酷我 Cookie |

前端不会直接访问任何第三方 API，也不会接触这些 Cookie。

---

## 架构总览：单域名 CDN 缓存与分流

境内与境外共用同一个对外域名，分流只在 DNS 分线路完成；代码侧负责写缓存头、Service Worker 缓存与裸域归一化。

```
访客（始终访问 https://www.zhang-wentao.tech）
  │
  ▼
火山云解析 DNS（智能解析，单域名分线路）
  ├─ 中国内地线路 ──► 火山引擎 IGA Pages（境内源站，standalone）
  ├─ 全球(不含中国) ─► Vercel（境外源站）
  └─ 默认线路 ──────► Vercel（兜底）
  │
  ▼
平台 CDN / Edge（两个平台按同一套路径规则写 Cache-Control）
  ├─ /serwist/sw.js 永不缓存；/api/* 永不缓存
  └─ 静态资源按 immutable / static 两档缓存
  │
  ▼
应用层 src/proxy.ts
  └─ 裸域 → www（308）；UA 过旧兜底跳转（307 + no-store）；无地域判定、无跨域跳转
```

**单域名原则**：IGA 与 Vercel 绑定同一个主机名（`SITE_HOSTNAME`），DNS 决定由哪个平台承接请求，请求落到平台后就地服务。应用层不再有平台地址、地域头判定、`site-region` Cookie 或 `X-Site-Geo` 头——单域名下没有第二个跳转目标，任何跨域跳转都是错误配置。所有代码侧开关集中在 `src/config/site`，改完需要**两个平台各自重新部署**才生效（配置在构建期求值）；DNS 记录在云解析控制台维护，与代码部署互不依赖。

## CDN 缓存策略

### 配置入口

`src/config/site` 的 `SITE_CDN_CACHE` 定义四档策略，`next.config.ts` 的 `headers()` 把它们写到对应路径。规则只按路径匹配，不区分线路与平台，因此两条部署链路写入的**响应头字符串完全一致**；但 Vercel Edge 与火山 DCDN 对 `s-maxage` / `stale-*` 的实际生效（尤其 SWR 窗口上限）可能不同，最终 TTL 以各平台规则为准。

| 路径 | 策略 | 响应头 | 说明 |
|------|------|--------|------|
| `/fonts/*`、`/launch/*` | `immutable` | `public, max-age=31536000, s-maxage=31536000, immutable` | 字体、iOS 启动图，内容不可变，浏览器和 CDN 都存一年 |
| `/live2d/*` | `static` | `public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400, stale-if-error=604800` | Live2D 运行时与模型，可能随版本更新 |
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
2. **调小 TTL**：把 `SITE_CDN_CACHE.static` 的 `max-age` / `s-maxage` 改小后，两个平台各重新部署一次；
3. **CDN 控制台手动刷新目录**：例如刷新 `/live2d/`。单域名下同一路径可能由两侧源站承接，两边都要确认刷新结果。

## Service Worker 与离线

离线能力由 [Serwist](https://serwist.pages.dev/docs/next/turbo) 提供（Next 16 默认 Turbopack，使用 `@serwist/turbopack` 集成）。所有 PWA 配置集中在 `src/config/site` 的 `SITE_PWA`：路径、主题色、图标、注册行为、SW 生命周期与 CSP 白名单都从这里读取，其他文件不再写死这些常量。

- `src/app/sw.ts`：Service Worker 源码，使用 `defaultCache` 提供的 Next.js 推荐运行时策略（HTML/RSC 走 NetworkFirst，带 hash 的静态资源走 CacheFirst/StaleWhileRevalidate）；`/api/*` 被前置规则强制 NetworkOnly，不缓存支付与留言接口。
- `src/app/serwist/[path]/route.ts`：`createSerwistRoute` 在构建时用 esbuild 编译 `sw.ts`，注入 `.next/static`、`public` 与 `/offline-fallback` 的预缓存清单，并从 `/serwist/sw.js` 提供。
- `src/app/offline-fallback/page.tsx`：文档请求离线且无缓存时的兜底页。
- `src/features/pwa/pwa-registration.tsx`：`PwaRegistration` 先注销浏览器中残留的 `/sw.js` 注册并清理 `site-*` 旧缓存，再挂载 `SerwistProvider`；这解决了删除 `public/sw.js` 后旧注册仍尝试更新并报 404 的问题。
- `src/app/layout.tsx`：`SerwistProvider` 仅在生产环境注册 SW；关闭 `reloadOnOnline` 与 `cacheOnNavigation`，避免后台恢复/网络恢复时自动刷新造成白屏。
- `next.config.ts`：用 `withSerwist` 包装配置，把 esbuild 声明为 `serverExternalPackages`；为 `/serwist/:path*` 设置 `Content-Type`、永不缓存的 `Cache-Control` 与 SW 专用 CSP。SW 的 CSP 除 `default-src 'self'`、`script-src 'self'` 外，还必须显式放行 `connect-src`（统计域名、Vercel、PayPal 与音乐 CDN），否则 Serwist 在 worker 内 fetch 跨域资源时会被 CSP 回退规则拦截。同名 CSP 头由 SW 专用规则后写覆盖通用页规则，最终只发一条。

之前手写的 `CacheFirst / stale-cache` 逻辑、版本戳脚本、`public/sw.js` 和手动注册组件均已删除。页面从后台恢复的可见性处理仍由 `PageRestoreCoordinator` 统一广播，与 SW 解耦。`scripts/build/prepare-standalone.mjs` 会把 `public`、`.next/static` 与 `BUILD_ID` 同步进 standalone 产物，保证本地 `npm run start:standalone` 与线上行为一致。

## DNS 智能解析（单域名分流）

分流**不在代码、不在环境变量、不在 `src/config/site`**，而是在云解析 DNS 控制台给同一个主机名加分线路记录。IGA 与 Vercel 两侧都要绑定 `www.zhang-wentao.tech`（及裸域，如需分流裸域），平台侧预览域名不参与。

### 记录清单

| 主机记录 | 线路 | 记录类型 | 记录值 |
|----------|------|----------|--------|
| `www` | 中国内地 | CNAME | IGA Pages 分配的加速域名（`xxx.app.example.com.c.vedcdnlb.com`，以控制台为准） |
| `www` | 全球（不含中国内地） | CNAME / A | Vercel 项目 Domains 页给出的值 |
| `www` | 默认 | CNAME / A | 同上，指向 Vercel（兜底） |
| `@` | 中国内地 | CNAME | IGA 加速域名 |
| `@` | 全球（不含中国内地） | CNAME / A | Vercel |
| `@` | 默认 | CNAME / A | Vercel（再由应用 308 补 www） |

### 约束与注意事项

- 同一线路内不要同时放两个平台的值，那会变成按权重轮询，不是分流。
- 免费版 TTL 最小 600 秒，改记录后至少等 10 分钟再判定结果。
- 线路匹配优先级：自定义 > 运营商 > 中国内地 > 全球 > 默认；自定义线路一旦命中会盖掉下面几档。
- 加速区域包含中国大陆时域名必须完成 ICP 备案。
- 免费版 DNS 节点在境内（境外 NS `intl.volcengine-dns.com` 属付费能力）：「全球（不含中国内地）」线路虽可配置，但境外递归到境内 NS 时 ECS 容易仍判为内地 → 落到 IGA（慢但可用）。默认线路那条 Vercel 记录在这里是**解析不失败**的保证，不是**分流正确**的保证；要稳定分流需付费版境外节点或支持境外节点的 DNS 服务商。
- `@` 不要用「URL 转发」：转发走默认线路、需要备案，且无法配合分线路；用解析记录 + 应用层 308 归一化。

### 为什么不做应用内跳转

旧版本的 `SITE_DEPLOY_TARGETS` / `SITE_GEO_ROUTING` 是为「两套平台各有独立域名」准备的跨域兜底。改为单域名后：

- 两条链路的主机名相同，不存在可跳转的第二个目标；
- DNS 已按线路把访客送到对应平台，应用层再读地域头只会多一次重定向与缓存污染风险；
- 火山 DCDN / IGA Pages 的回源头只有 uri、host、client_ip 等变量，**没有国家字段**，单靠请求头无法可靠判定。

因此这些配置与代码（`X-Site-Geo`、`site-region` Cookie、307 跨域跳转）已全部移除。分流异常时先查 DNS 解析结果，不要试图在 `proxy.ts` 里补规则。

> 应用层保留的两类跳转都与地域无关：① 裸域 → www 的 308（按 host 归一化，确定且可缓存）；② UA 过旧时跳 `/browser-unsupported` 的 307（显式 `Cache-Control: no-store`，避免共享缓存把跳转错发给其它 UA 的访客）。被误判的用户可点兜底页「仍要继续访问」逃生。

## 部署

### IGA Pages

```bash
npm install -g @iga-pages/cli
iga login
iga pages link
iga pages deploy -l
```

### Vercel

```bash
npx vercel login
npx vercel deploy --prod --yes
```

项目已接入 GitHub 镜像仓库的 Git 集成，`main` 分支每次 push 自动触发构建。

### 平台侧配置要点

代码只负责“写头”和“裸域归一化”，真正的分流与缓存由平台完成。两个平台需要保持的配置：

**火山 IGA Pages**
- `iga.json` 固定 `installCommand: npm ci`、`buildCommand: npm run build`；
- Node.js 版本选 **24.x**（`package.json` 的 `engines` 已锁 `24.x`，防止 Vercel 自动升到新 major）；
- 环境变量（密钥）在项目设置里配置，公开配置全部在 `src/config/site`；
- 绑定自定义域名 `www.zhang-wentao.tech`，但 DNS 记录由云解析控制台统一管理，不要在 IGA 里另配跳转；
- 不需要额外指定输出目录，平台按 Next.js 模式处理 standalone 产物；
- 不要手工在控制台覆盖 `Cache-Control`，代码里的值已经过权衡。

**Vercel**
- `vercel.json` 声明 `framework: nextjs`、`buildCommand: npm run build`、`installCommand: npm ci --registry=https://registry.npmjs.org`；
- 环境变量在 Settings → Environment Variables 配置，Production / Preview / Development 三套都要覆盖；
- `next.config.ts` 在 `VERCEL === '1'` 时不设置 `output: 'standalone'`（Vercel 不支持该配置）；
- Domains 里绑定同一个主机名；单域名场景下回调地址按 `SITE_URL` 拼接即可，无需为境外链路另设域名。

## 验证清单

部署后逐项验证（把域名换成实际域名）：

```bash
# 1. 缓存头是否生效
curl -sI https://www.example.com/live2d/live2dcubismcore.min.js | grep -i "cache-control"
# 期望：含 s-maxage=604800, stale-while-revalidate=86400

curl -sI https://www.example.com/fonts/nunito-latin-variable.woff2 | grep -i "cache-control"
# 期望：含 immutable

curl -sI https://www.example.com/serwist/sw.js | grep -i "cache-control"
# 期望：no-cache, no-store, must-revalidate

curl -sI https://www.example.com/api/donate/config | grep -i "cache-control"
# 期望：no-store

# 2. 裸域补 www
curl -sI -H "Host: example.com" http://127.0.0.1:3000/ | grep -i "^HTTP\|^location"
# 期望：308 → https://www.example.com/

# 3. DNS 分流是否按线路生效（用 EDNS Client Subnet 模拟不同视角）
dig +subnet=114.114.114.114 www.example.com @ns1.volcengine-dns.com +short  # 境内
dig +subnet=8.8.8.8 www.example.com @ns1.volcengine-dns.com +short          # 境外

# 4. 单域名就地服务：即使带地域头也不应跳转
curl -sI -H "Host: www.example.com" -H "x-vercel-ip-country: CN" \
  https://你的预览地址/ | grep -i "^HTTP\|^location\|^x-site-geo"
# 期望：200，无 location、无 x-site-geo

# 5. SW 响应只有一个 CSP 头（确认通用页 CSP 与 SW 专用 CSP 没有同时发出）
curl -sI https://www.example.com/serwist/sw.js | grep -ci "^content-security-policy:"
# 期望：1

# 6. UA 兜底跳转不可被共享缓存（用一个过旧的 UA 触发）
curl -sI -A "Mozilla/5.0 (Windows NT 6.1) Chrome/90.0 Safari/537.36" https://www.example.com/ | grep -i "^HTTP\|^location\|^cache-control"
# 期望：307 → /browser-unsupported，且 Cache-Control: no-store
```

浏览器侧再确认：

- DevTools → Application → Service Workers：`/serwist/sw.js` 处于 Activated 状态，Unsafe requests 为 0；
- DevTools → Application → Cache Storage：出现 Serwist 的预缓存及 `pages*` / `next-*` 缓存，旧的 `site-*` 缓存不再被写入；
- Network 面板：`/serwist/sw.js` 永远不是 from disk cache；断网刷新首页仍能渲染，未缓存路由显示 `/offline-fallback` 兜底页；
- 境内/境外访问地址栏始终是同一个域名，没有跨域跳转。

## 常见问题

- **Webhook 返回 502**：检查 `NOTIFY_WEBHOOK_URL` 是否可访问、是否在 8 秒内返回 2xx
- **Live2D 不显示**：确认 `public/live2d/` 目录已完整部署，浏览器支持 WebGL
- **打赏下单 502**：检查密钥格式（`\n` 是否还原）、证书序列号、AppID 与商户号绑定
- **改了配置不生效**：配置在构建期求值，需要分别重新部署

### CDN 缓存与分流

| 现象 | 排查方向 |
|------|----------|
| 换了模型但一直看到旧文件 | 检查 `/live2d/` 是否返回新的 `Cache-Control`；CDN 控制台刷新目录；必要时给模型文件换名 |
| `/serwist/sw.js` 命中缓存，新版本推不下去 | 确认响应头是 `no-cache, no-store`；检查平台控制台有没有覆盖缓存规则 |
| 境内访客被分到 Vercel（慢） | 用 `dig +subnet` 确认 DNS 中国内地线路是否命中 IGA；免费版 DNS 的境外 NS 节点可能导致 ECS 判断偏差 |
| 境外访客被分到 IGA | 检查「全球（不含中国内地）」与默认线路记录；免费版境内 NS 的 ECS 偏差见「DNS 智能解析」，单域名下代码不会纠正分流 |
| 出现跨域名跳转 | 当前代码已无地域跳转逻辑：检查平台控制台跳转规则、老版本产物是否仍在线，及 DNS 是否解析到旧部署 |
| 明明是新浏览器却被“版本过低”拦住 | 点兜底页底部的「仍要继续访问」（带 `?browser-check-continue=1`，`proxy.ts` 会种一个 `browser-check-continue` 会话 Cookie 并放行）；若是大量同类误判，需调 `SITE_BROWSER_MINIMUMS` 或补 `browser-support.ts` 的 UA 解析 |
| 支付回调异常 | `proxy.ts` 的 matcher 已排除 `/api/*`；单域名下回调地址按 `SITE_URL` 拼接，确认两侧密钥一致 |
| DNS 改了不生效 | 免费版 TTL 最小 600 秒，等待至少 10 分钟再用 `dig +subnet` 复核 |
| 改了 `src/config/site` 不生效 | 配置在构建期求值，IGA 与 Vercel 两条链路要分别重新部署 |

## 许可协议

- **站点代码**：BSD-3-Clause License，详见 [LICENSE](LICENSE)
- **站点内容**：文字、图片、设计素材等采用 CC BY-NC 4.0，详见 [licenses/CONTENT-LICENSE.txt](licenses/CONTENT-LICENSE.txt)

代码与内容使用不同协议。二次使用、转载或商用前请分别查看对应协议条款。
