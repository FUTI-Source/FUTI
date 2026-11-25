# 张文涛 · 个人主页

基于 **Next.js 16 + React 19 + TypeScript** 构建的独立个人主页。

- 线上地址：<https://www.zhang-wentao.tech>
- CDN 配置与 DNS 分流指南：[CDN-AND-GEO-ROUTING.md](docs/CDN-AND-GEO-ROUTING.md)

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

**运行环境要求 Node.js 24+**

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
├── app/                          # App Router 入口（api、serwist、~offline 均为路由契约）
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
├── lib/                          # 跨业务通用工具（http、logger、utils 等）
├── server/                       # 服务端专用逻辑（notify、dedupe）
├── styles/                       # 全局样式
└── types/                        # 第三方模块类型补丁
public/                           # Live2D 模型、字体、图标、运行时脚本
docs/                             # 部署与 CDN 配置文档
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

### DNS 智能解析（单域名分流）

同一套代码部署在两个平台，共用同一个对外域名：
- **境内**：解析到 IGA Pages 加速域名
- **境外**：解析到 Vercel
- **默认**：解析到 Vercel（兜底）

完整配置步骤见 [CDN-AND-GEO-ROUTING.md](docs/CDN-AND-GEO-ROUTING.md)。

## 常见问题

- **Webhook 返回 502**：检查 `NOTIFY_WEBHOOK_URL` 是否可访问、是否在 8 秒内返回 2xx
- **Live2D 不显示**：确认 `public/live2d/` 目录已完整部署，浏览器支持 WebGL
- **打赏下单 502**：检查密钥格式（`\n` 是否还原）、证书序列号、AppID 与商户号绑定
- **改了配置不生效**：配置在构建期求值，需要分别重新部署

## 许可协议

- **站点代码**：BSD-3-Clause License，详见 [LICENSE](LICENSE)
- **站点内容**：文字、图片、设计素材等采用 CC BY-NC 4.0，详见 [licenses/CONTENT-LICENSE.txt](licenses/CONTENT-LICENSE.txt)

代码与内容使用不同协议。二次使用、转载或商用前请分别查看对应协议条款。