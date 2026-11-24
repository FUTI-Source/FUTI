# 张文涛 · 个人主页

基于 **Next.js 16 + React 19 + TypeScript** 的独立个人主页，部署于火山引擎 IGA Pages，也可手动发布到 Vercel。

- 线上地址：<https://www.zhang-wentao.tech>

## 功能特性

- **首页形象**：Live2D 看板形象（WebGL 检测 + SDK 动态加载）、视差背景、打字机式自我介绍、全局自定义光标、首屏加载进度圈
- **联系表单**：react-hook-form + zod 校验，POST JSON Webhook 通知，带 IP 限流与蜜罐反滥用
- **打赏**：微信支付（Native/H5/JSAPI）与支付宝（当面付/手机网站），无状态订单令牌，扫码二维码、轮询查单、回调验签后通知站长
- **PWA**：可安装、离线页与静态资源缓存，适配 iOS 主屏幕与桌面 WCO
- **统计**：Umami 自建统计（隐私友好），Vercel 部署时额外注入 Vercel Analytics 与 Speed Insights
- **SEO**：Metadata API、robots.ts、sitemap.ts、OG 分享图与结构化数据

## 技术栈

| 领域 | 选型 |
|------|------|
| 框架 | Next.js 16（App Router / Turbopack）· React 19 · TypeScript 5 |
| 样式 | Tailwind CSS v4 · tw-animate-css · normalize.css |
| 动画/交互 | motion · parallax-js · pixi.js（Live2D 渲染） |
| UI 组件 | Radix UI · lucide-react · @icons-pack/react-simple-icons |
| 表单 | react-hook-form · @hookform/resolvers · zod |
| 通知 | 通用 HTTP Webhook · 飞书/钉钉/企微机器人协议适配 |
| 打赏 | qrcode · 微信 APIv3 / 支付宝 RSA2 |
| 部署 | 火山引擎 IGA Pages（standalone）· Vercel（CLI 手动发布） |

**运行环境要求 Node.js 24+**（见 `package.json` 的 `engines`）

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
├── app/                          # App Router 入口
│   ├── api/                      # Route Handlers
│   │   ├── contact/              # 联系表单 → Webhook 通知
│   │   └── donate/               # 打赏接口（创建/查询/回调）
│   ├── layout.tsx / page.tsx     # 根布局与首页
│   ├── globals.css               # 样式入口
│   └── manifest.ts / robots.ts   # PWA / SEO
├── components/                   # 通用 UI（shadcn 风格）
├── features/                     # 按业务域组织
│   ├── home/                     # 首页、视差背景、自定义光标
│   ├── avatar/                   # Live2D 头像（PixiJS）
│   ├── profile/                  # 名称、描述、社交链接
│   ├── contact/                  # 联系表单
│   ├── donate/                   # 打赏
│   └── pwa/                      # Service Worker
├── hooks/                        # 通用 React hooks
├── lib/                          # 站点工具（日志、通知、限流）
├── proxy.ts                      # 裸域自动补 www + 国内外分流
└── styles/                       # 全局样式与 Tailwind 主题
public/                           # Live2D 模型、字体、图标、iOS 启动图
site.config.ts                    # 站点全局配置
```

## 站点配置

所有站点配置集中在 `site.config.ts`：

```ts
import { SITE_URL, SITE_GEO_ROUTING } from '~/site.config';
```

| 分区 | 导出 | 作用 |
|------|------|------|
| 域名 | `SITE_URL` | 站点正式地址，canonical、metadataBase、sitemap 等派生 |
| 部署与分流 | `SITE_DEPLOY_TARGETS` | IGA Pages 与 Vercel 平台地址 |
| 文案 | `SITE_NAME` / `SITE_DESCRIPTION` / `SITE_SIGNATURE` | 标题、描述、打字机副标题 |
| 打赏 | `DONATION_MIN_AMOUNT` / `DONATION_MAX_AMOUNT` | 单笔金额上下限 |
| 统计 | `SITE_ANALYTICS_URL` / `SITE_ANALYTICS_WEBSITE_ID` | Umami 配置 |
| CDN | `SITE_CDN_CACHE` | 缓存策略（immutable/static/serviceWorker） |

**公开信息进文件，密钥进环境变量**。`site.config.ts` 被客户端组件引用，切勿写入任何密钥。

## 环境变量

密钥类变量放在 `.env.local`（本地）或部署平台后台，**不要提交到 Git**。

### 通知 Webhook

| 变量 | 必填 | 说明 |
|------|------|------|
| `NOTIFY_WEBHOOK_URL` | 是 | 接收 POST JSON 的地址 |
| `NOTIFY_WEBHOOK_SECRET` | 否 | Authorization: Bearer \<secret\> |
| `NOTIFY_WEBHOOK_FALLBACK_URL` | 否 | 主 Webhook 失败时的备用地址 |

### 打赏

| 变量 | 必填 | 说明 |
|------|------|------|
| `DONATION_ORDER_SECRET` | 可选 | 订单令牌签名密钥，留空自动从支付私钥派生 |
| `WECHAT_MCH_ID` | 微信必填 | 商户号 |
| `WECHAT_APP_ID` | 微信必填 | AppID |
| `WECHAT_API_V3_KEY` | 微信必填 | 32 位 APIv3 密钥 |
| `WECHAT_CERT_SERIAL_NO` | 微信必填 | 商户 API 证书序列号 |
| `WECHAT_PRIVATE_KEY` | 微信必填 | apiclient_key.pem 内容 |
| `WECHAT_PUBLIC_KEY_ID` | 微信必填 | 微信支付公钥 ID |
| `WECHAT_PUBLIC_KEY` | 微信必填 | 微信支付公钥内容 |
| `WECHAT_APP_SECRET` | 可选 | 公众号 AppSecret，微信内 JSAPI 必填 |
| `ALIPAY_APP_ID` | 支付宝必填 | 应用 AppID |
| `ALIPAY_PRIVATE_KEY` | 支付宝必填 | 应用私钥（RSA2） |
| `ALIPAY_PUBLIC_KEY` | 支付宝必填 | 支付宝公钥 |

## 部署

### IGA Pages

```bash
npm install -g @iga-pages/cli
iga login
iga pages link
iga pages deploy -l
```

控制台方式：创建项目 → 设置 Node.js 版本为 24.x → 添加环境变量 → 构建部署

### Vercel（CLI 手动发布）

```bash
npx vercel login
npx vercel deploy --prod --yes
```

首次部署会自动创建项目，后续用相同命令发布。

### DNS 智能解析（推荐）

同一套代码部署在两个平台，正确的分流位置是 DNS：

1. **境内**：解析到 IGA Pages 加速域名
2. **境外**：解析到 Vercel
3. **默认**：解析到 Vercel（兜底）

境内解析需完成 ICP 备案。详细配置见完整文档。

## 常见问题

- **Webhook 返回 502**：检查 `NOTIFY_WEBHOOK_URL` 是否可访问、是否在 8 秒内返回 2xx
- **Live2D 不显示**：确认 `public/live2d/` 目录已完整部署，浏览器支持 WebGL
- **打赏下单 502**：检查密钥格式（`\n` 是否还原）、证书序列号、AppID 与商户号绑定
- **改了配置不生效**：配置在构建期求值，需要分别重新部署

---

详细文档（含微信/支付宝接入图解、环境变量获取方式、CLI 用法）见原始 README。