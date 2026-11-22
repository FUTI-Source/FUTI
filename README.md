# 个人主页（Next.js + Vercel 版）

从妙搭 NestJS + React 应用迁移而来的**独立 Next.js 项目**，可直接推送到 Git 并在 Vercel 部署。包含单页个人主页（Live2D 形象、视差背景、打字机介绍、社交链接）与「两封顺序发信」的邮件联系表单。

## 技术栈

- Next.js 15（App Router）+ React 19 + TypeScript
- Tailwind CSS v4（沿用原设计 Token，无 UI 重写）
- shadcn/ui（Radix）+ Motion + zod + react-hook-form
- Next.js Metadata API、robots.txt 与 sitemap.xml（SEO）
- 可安装 PWA，支持离线页面、静态资源缓存，以及兼容桌面浏览器的 WCO 窗口控件覆盖（其他终端回退 standalone）
- pixi.js + pixi-live2d-display（Live2D 形象）
- nodemailer + 139 邮箱 SMTP（Node Runtime Route Handler）

## PWA 与 iOS 主屏幕

### iOS 26 起：添加到主屏幕默认以 Web 应用打开

- iOS 26 / iPadOS 26 改变了主屏幕图标的启动方式：WebKit 在 Safari 26.0 说明中明确，**默认每个添加到主屏幕的网站都以 Web 应用打开**（独立的应用切换器条目、无 Safari 工具栏）；用户在添加面板中关闭「Open as Web App」才会存为书签，即使站点已配置为 Web 应用。
- Safari 26 起「可安装性」要求为零：不再要求 manifest 或 Service Worker，也不检查 HTTPS。manifest 不再决定「是否」以应用方式打开，但仍决定**外观**：图标、名称、启动图、主题色、`start_url` / `scope` 照旧生效。
- 旧系统兼容仍然保留：manifest 的 `display: standalone` 与 `<meta name="apple-mobile-web-app-capable" content="yes">` 在 iOS 16.4 至 18（及更早）决定是否以独立模式打开。本项目两者都保留，见 `public/manifest.webmanifest` 与 `src/lib/seo.ts`。
- 检测方式不变：页面只能在启动后根据显示上下文判断，本项目用 `matchMedia('(display-mode: standalone)')` 或 `navigator.standalone === true`（`src/app/layout.tsx` 首屏脚本），命中时添加 `.ios-standalone` 并校正 `--app-height`。
- Web 页面无法拦截或探测「添加到主屏幕」动作；iOS 各版本均不触发 `beforeinstallprompt`。

### viewport-fit=cover 的用法

- 本项目在 `src/lib/seo.ts` 的 `siteViewport` 中设置 `viewportFit: 'cover'`，输出：

  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  ```

- 作用：让布局视口铺满屏幕，包含圆角、刘海/灵动岛与底部 Home 指示条区域。不设置时 Safari 会自行内缩，`env(safe-area-inset-*)` 恒为 `0`。
- 必须配合安全区变量使用，否则内容会被遮挡。本项目在 `src/styles/index.css` 定义 `--safe-top`、`--safe-bottom`（取值 `env(safe-area-inset-top/bottom, 0px)`），页头、页脚与邮件弹窗据此留白；满屏背景铺在 `html` 画布上，内容用 padding 避让。
- 在 iOS 上单独使用 `viewport-fit=cover` 只延伸底部安全区；要让页面画到状态栏之下、并获得非零的 `env(safe-area-inset-top)`，还需 `apple-mobile-web-app-status-bar-style` 为 `black-translucent`（本项目由 `siteMetadata.appleWebApp.statusBarStyle` 输出）。
- 桌面 WCO（`window-controls-overlay`）模式会覆盖 `--safe-top: 0`，改用 `env(titlebar-area-*)` 计算标题栏与拖拽区，见 `src/styles/index.css` 的对应媒体查询。

参考：[OpenPWA · iOS 添加到主屏幕](https://openpwa.net/zh/reference/installation/ios-add-to-home-screen/)、[OpenPWA · iOS 18.6.2 主屏 Web 应用真机实测](https://openpwa.net/zh/news/testing-home-screen-web-apps-on-ios-18-6-2/)、[WebKit Features in Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)。

## 目录结构

```
nextjs-site/
├── app/
│   ├── layout.tsx            # 根布局（metadata 与全局字体）
│   ├── page.tsx              # 首页（客户端组件，迁移自原 Home）
│   ├── globals.css           # 样式入口
│   ├── error.tsx             # 渲染错误边界
│   ├── not-found.tsx         # 404
│   └── api/mail/send/route.ts  # 邮件接口（Node Runtime，两封顺序 await）
├── components/               # 页面与 UI 组件（已去除妙搭平台依赖）
├── hooks/ lib/ utils/ types/
├── public/                   # 静态资源（live2d 模型、字体、favicon、og 图）
├── .env.local.example        # 环境变量样例
└── next.config.ts / postcss.config.mjs / tsconfig.json
```

## 本地开发

```bash
cd nextjs-site
npm install
cp .env.local.example .env.local   # 然后填入真实 139 邮箱凭证
npm run dev                        # http://localhost:3000
```

类型检查与生产构建：

```bash
npm run type:check
npm run build
npm run start
```

## 环境变量

在 `.env.local`（本地）或 Vercel → Settings → Environment Variables（线上）配置：

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `MAIL_USER` | 是 | 139 发件邮箱地址，同时是 SMTP 登录账号 |
| `MAIL_PASS` | 是 | 139 邮箱 **SMTP 授权码**（不是邮箱登录密码） |
| `MAIL_TO` | 否 | 站长收信地址，留空时默认发给 `MAIL_USER` |
| `MAIL_SMTP_HOST` | 否 | 默认 `smtp.139.com` |
| `MAIL_SMTP_PORT` | 否 | 默认 `465` |
| `MAIL_SMTP_SECURE` | 否 | 默认 `true`（465 implicit TLS） |

真实授权码切勿提交到 Git，`.env.local` 已在 `.gitignore` 中。打赏支付的微信、支付宝与订单签名变量见下文「打赏支付接入」。

## 邮件工作原理与 Vercel 约束

提交联系表单后，`app/api/mail/send/route.ts` 顺序执行：

1. 第一封发给站长（`MAIL_TO`），`replyTo` 设为顾客邮箱；**失败则整体返回错误，不发确认信**。
2. 第一封成功后，第二封「留言提交成功」确认信发给顾客邮箱；第二封失败不推翻第一封结果，仅在响应里把 `confirmationSent` 置为 `false`。

接口包含基础反滥用措施：每个来源 IP 10 分钟最多提交 5 次，超限返回 `429` 和 `Retry-After`；表单包含隐藏蜜罐字段，另限制请求体为 24 KiB。速率记录保存在 Node 进程内存中，Serverless 多实例间不共享；若需要全局精确限流，应接入共享存储（如 Redis）或使用部署平台的 WAF 限流规则。

Vercel Serverless 的关键约束（已在代码中落实）：

- 使用 `export const runtime = 'nodejs'`（nodemailer 不能跑在 Edge Runtime）。
- 两封邮件都 `await` 发送完成后才 `return Response`，避免函数提前冻结丢信。
- Nodemailer 启用最多 2 条 SMTP 连接的连接池，复用连接发送站长邮件与确认邮件，并在实例温热时减少重复 TLS/SMTP 握手；冷启动仍需建立新连接。
- Vercel 仅封出站 25 端口，465/587 开放，139 的 465 可直连。
- 显式设置较短的连接/握手/套接字超时（8s/8s/10s），控制在函数超时预算内。
- 保留 EHLO `name`（发件域名）与 `tls.servername`，规避 139 反垃圾 `550 Mail rejected score`。
- 已移除原妙搭沙箱专属的 DNS 解析 hack（Vercel DNS 正常，无需手动解析 IPv4）。

## 部署到 Vercel

1. 把 `nextjs-site/` 作为独立 Git 仓库根目录推送（GitHub / GitLab / Bitbucket）。
2. Vercel → Add New → Project → 导入仓库，框架自动识别为 Next.js，构建命令保持默认。
3. 在项目 Settings → Environment Variables 录入上表变量（Production / Preview 按需）。
4. 推送 `main` 触发部署；完成后用真实邮箱在联系表单提交，核对站长与顾客各收到一封、响应含两个 messageId。
5. 如需自定义域名，在 Vercel 项目 Domains 中绑定。

> 若上线后出现冷启动超时或连接不稳，可将 `lib/mailer.ts` 内部替换为 Resend / SendGrid 等 HTTP 邮件 API（走 443，无 SMTP 连接生命周期问题），路由与前端无需改动。

## 打赏支付接入（微信支付 / 支付宝）

站点内置微信支付与支付宝打赏，均为**无状态订单**：服务端不保存订单，下单时把订单号、渠道、金额签成 `statusToken`（HMAC-SHA256，1 小时有效），查单时验签后直接向支付平台查询。支付平台回调只做验签，不落库、不改变订单状态。

### 接口一览

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/donate/config` | GET | 返回 `channels.alipay`、`channels.wechat` 是否已配置，以及微信内能否走 JSAPI |
| `/api/donate/create` | POST | 创建支付，Body：`{ channel, amount, mode? }` |
| `/api/donate/status?token=...` | GET | 用 `statusToken` 查单，返回订单号、渠道、金额与状态 |
| `/api/donate/notify/wechat` | POST | 微信支付回调（验签 + 解密，仅确认收到） |
| `/api/donate/notify/alipay` | POST | 支付宝回调（验签并校验应用信息，仅确认收到） |
| `/api/donate/wechat/oauth` | GET | 微信内 JSAPI 支付的网页授权入口 |
| `/api/donate/wechat/oauth/callback` | GET | 微信网页授权回调，换取 openid 后写 Cookie |

`create` 返回：

- `codeUrl`：扫码支付链接，前端渲染二维码；
- `redirectUrl`：跳转式支付地址（支付宝手机网站、微信 H5）；
- `payment`：微信 JSAPI 收银台参数，前端直接拉起微信支付；
- `statusToken`：查单令牌，前端轮询与回跳确认时使用。

### 支付方式选择

| 渠道 | 环境 | 使用能力 |
| --- | --- | --- |
| 微信 | 桌面浏览器 | Native 扫码支付 |
| 微信 | 微信外手机浏览器 | H5 支付，支付完成回跳 `/?donate=success&token=...` |
| 微信 | 微信内置浏览器 | JSAPI 支付（需要 `WECHAT_APP_SECRET` 完成网页授权） |
| 支付宝 | 桌面浏览器 | 当面付预下单，返回二维码 |
| 支付宝 | 手机浏览器 | 手机网站支付，同步回跳站点 |

金额范围由 `src/lib/site.ts` 的 `DONATION_MIN_AMOUNT` / `DONATION_MAX_AMOUNT` 控制，默认 1–10000 元；订单标题取 `DONATION_SUBJECT`。

### 环境变量

在 `.env.local` 或 Vercel → Settings → Environment Variables 配置，修改后需重新部署。

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DONATION_ORDER_SECRET` | 是 | 订单令牌签名密钥，随机 32 位以上字符串；缺失时所有支付渠道显示为未配置 |
| `WECHAT_MCH_ID` | 微信必填 | 微信支付商户号 |
| `WECHAT_APP_ID` | 微信必填 | 与商户号绑定的 AppID（公众号或开放平台应用） |
| `WECHAT_API_V3_KEY` | 微信必填 | 32 位 APIv3 密钥，用于回调报文解密 |
| `WECHAT_CERT_SERIAL_NO` | 微信必填 | 商户 API 证书序列号 |
| `WECHAT_PRIVATE_KEY` | 微信必填 | `apiclient_key.pem` 内容，换行可写成 `\n` |
| `WECHAT_PUBLIC_KEY_ID` | 微信必填 | 微信支付公钥 ID（公钥模式） |
| `WECHAT_PUBLIC_KEY` | 微信必填 | 微信支付公钥内容，用于回调验签 |
| `WECHAT_APP_SECRET` | 可选 | 公众号 AppSecret，仅微信内 JSAPI 支付需要 |
| `WECHAT_NOTIFY_URL` | 可选 | 回调地址，默认 `${SITE_URL}/api/donate/notify/wechat` |
| `ALIPAY_APP_ID` | 支付宝必填 | 开放平台应用 AppID |
| `ALIPAY_PRIVATE_KEY` | 支付宝必填 | 应用私钥（RSA2），换行可写成 `\n` |
| `ALIPAY_PUBLIC_KEY` | 支付宝必填 | 支付宝公钥，用于回调验签 |
| `ALIPAY_GATEWAY` | 可选 | 默认 `https://openapi.alipay.com/gateway.do` |
| `ALIPAY_NOTIFY_URL` | 可选 | 回调地址，默认 `${SITE_URL}/api/donate/notify/alipay` |

`SITE_URL` 在 `src/lib/site.ts` 中配置；两个回调地址必须是公网可访问的 HTTPS 地址。

### 微信支付开通步骤

1. 在微信支付商户平台开通 Native 支付、H5 支付、JSAPI 支付。
2. H5 支付需在「产品中心 → 开发配置 → H5 支付域名」添加站点域名。
3. 在「账户中心 → API 安全」设置 APIv3 密钥，下载商户 API 证书，记录证书序列号并保存 `apiclient_key.pem`。
4. 使用公钥模式：在商户平台获取「微信支付公钥 ID」与公钥内容，分别填入 `WECHAT_PUBLIC_KEY_ID`、`WECHAT_PUBLIC_KEY`（本项目按公钥模式验签，不使用平台证书）。
5. 微信内 JSAPI：公众号后台把「网页授权域名」与「JS 接口安全域名」设为站点域名，配置好支付授权目录，并填入 `WECHAT_APP_SECRET`。
6. 确保 `WECHAT_NOTIFY_URL`（或默认地址）可公网访问，微信会向该地址推送支付结果。

### 支付宝开通步骤

1. 在支付宝开放平台创建应用，签约「当面付」与「手机网站支付」。
2. 使用 RSA2 生成应用私钥，上传应用公钥，保存平台返回的支付宝公钥。
3. 分别填入 `ALIPAY_APP_ID`、`ALIPAY_PRIVATE_KEY`、`ALIPAY_PUBLIC_KEY`。
4. 异步通知地址由下单时传入，默认 `${SITE_URL}/api/donate/notify/alipay`，无需在开放平台单独配置；若使用自定义地址，填入 `ALIPAY_NOTIFY_URL`。
5. 确认应用已上线且签约能力生效，否则下单会返回网关错误。

### 验证与排查

1. 配置完成后访问 `/api/donate/config`，确认目标渠道为 `true`。
2. 打开打赏弹窗，用最小金额（1 元）走一遍支付，确认二维码或跳转正常。
3. 支付成功后前端会轮询 `/api/donate/status`，状态变为 `paid` 后上报收入事件。
4. 若下单失败，查看服务端日志中的 `[donate]` 输出；常见原因是密钥格式、证书序列号、AppID 与商户号不匹配，或回调域名不可达。
5. 修改 `DONATION_ORDER_SECRET` 会使已签发但未支付的令牌立即失效，只影响进行中的订单。

### 注意事项

- 所有密钥只放在服务端环境变量中，切勿写入 `site.ts`、客户端组件或提交到 Git。
- 回调只负责验签；即使回调丢失，前端查单仍能确认支付结果。
- `statusToken` 有效期 1 小时，超时后无法再查单，但支付平台侧订单不受影响。
- 打赏成功后会向站长发送 Bark 推送与通知邮件（配置见 `.env.local.example`），未配置时自动跳过，不影响支付流程。
- 收入统计由前端在确认支付后上报 Umami，并使用 `sessionStorage` 去重；用户支付后直接关闭页面则不会产生该次统计。

## 验证边界说明

本项目在妙搭工作区中以**独立隔离子目录**形式产出，未改动妙搭原有 NestJS/React 工程，两者互不影响。受妙搭沙箱限制（包管理器只作用于妙搭根工程、无法在子目录安装 `next`），`npm install` 与 `next build` 需在本地或 Vercel 构建环境执行。当前已完成的核查：

- 全部 `@/` 路径别名可解析、无 `@lark-apaas` / `@client` / `CLIENT_BASE_PATH` 等平台残留。
- 所有第三方依赖均在 `package.json` 声明。
- 全局 `window/document/navigator` 访问均位于 effect、事件回调或显式 SSR 守卫内，无模块顶层裸露。
- 前端错误读取契约与 Route Handler 返回结构一致。

## 常见问题

- **`EAUTH` 认证失败**：检查 `MAIL_USER` 与 SMTP 授权码，授权码需在 139 邮箱后台单独生成。
- **`550 Mail rejected score`**：确认 `lib/mailer.ts` 中 `name` 与 `tls.servername` 未被删除；更换发信网络或改用 HTTP 邮件 API。
- **函数超时 / 邮件偶发丢失**：检查 Vercel 套餐函数超时限制，必要时升级或迁移 HTTP 邮件 API。
- **Live2D 不显示**：确认 `public/live2d/` 目录（含 `live2dcubismcore.min.js` 与 `character/` 模型）已完整部署。
