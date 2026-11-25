# 张文涛 · 个人主页

基于 **Next.js 16 + React 19 + TypeScript** 构建的独立个人主页。

- 线上地址：<https://www.zhang-wentao.tech>
- CDN 配置与 DNS 分流指南：[CDN-AND-GEO-ROUTING.md](docs/CDN-AND-GEO-ROUTING.md)

## 功能特性

- **首页形象**：Live2D 看板形象（WebGL 检测 + SDK 动态加载）、视差背景、打字机式自我介绍、全局自定义光标、首屏加载进度圈
- **联系表单**：react-hook-form + zod 校验，POST JSON Webhook 通知，带 IP 限流与蜜罐反滥用
- **打赏**：微信支付、支付宝、PayPal，无状态订单令牌，扫码/跳转支付、回调验签通知站长
- **PWA**：可安装、离线页与静态资源缓存，适配 iOS 主屏幕与桌面 WCO
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
├── app/                          # App Router 入口
│   ├── api/                      # Route Handlers
│   │   ├── contact/              # 联系表单 → Webhook 通知
│   │   └── donate/               # 打赏接口（创建/查询/回调）
│   ├── layout.tsx / page.tsx     # 根布局与首页
│   └── manifest.ts / robots.ts   # PWA / SEO
├── components/                   # 通用 UI 组件
├── features/                     # 按业务域组织
│   ├── home/                     # 首页、视差背景、自定义光标
│   ├── avatar/                   # Live2D 头像
│   ├── profile/                  # 名称、描述、社交链接
│   ├── contact/                  # 联系表单
│   ├── donate/                   # 打赏
│   └── pwa/                      # Service Worker
├── hooks/                        # 通用 React hooks
├── lib/                          # 站点工具（日志、通知、限流）
└── styles/                       # 全局样式
public/                           # Live2D 模型、字体、图标、iOS 启动图
site.config.ts                    # 站点全局配置
```

## 站点配置

所有站点配置集中在 `site.config.ts`：

| 分区 | 导出 | 作用 |
|------|------|------|
| 域名 | `SITE_URL` | 唯一对外域名 |
| 文案 | `SITE_NAME` / `SITE_DESCRIPTION` | 标题、描述 |
| 打赏 | `DONATION_MIN_AMOUNT` / `DONATION_MAX_AMOUNT` | 单笔金额上下限 |
| 统计 | `SITE_ANALYTICS_URL` / `SITE_ANALYTICS_WEBSITE_ID` | Umami 配置 |
| CDN | `SITE_CDN_CACHE` | 缓存策略配置 |

**公开信息进文件，密钥进环境变量**。`site.config.ts` 被客户端组件引用，切勿写入任何密钥。

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