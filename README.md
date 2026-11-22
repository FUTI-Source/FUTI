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

站点内置微信支付与支付宝打赏，均采用**无状态订单**：服务端不落库、不依赖 Redis，下单时把订单号、渠道、金额签成 `statusToken`，查单时验签还原后直接向支付平台查询。支付平台回调只做验签/解密，不写库、不改变订单状态。本章节是完整对接文档，按「设计 → 令牌 → 接口 → 渠道实现 → 开通 → 排查」组织。

---

### 1. 设计概览

```
前端 ──POST /api/donate/create──> 服务端 ──下单──> 微信/支付宝网关
前端 <──statusToken + (codeUrl|redirectUrl|payment)── 服务端
前端 ──轮询 GET /api/donate/status?token──> 服务端 ──查单──> 网关
前端 <──{ status: pending|paid|closed }── 服务端
网关 ──异步回调──> /api/donate/notify/[channel] ──验签/解密──> Bark + 邮件通知站长
```

关键决策：

- **不落库**：订单信息（订单号、渠道、金额）以签名令牌形式发给前端，查单时再还原，省去数据库与 Redis。
- **查单为准**：支付结果以前端携带令牌主动查询网关为准，回调仅用于触发通知，即使回调丢失也不影响结果确认。
- **密钥边界**：所有商户密钥只在服务端环境变量中读取，客户端只持有 `statusToken`，无法篡改金额。

### 2. 无状态订单令牌 `statusToken`

实现见 [token.ts](file:///workspace/src/features/donate/server/token.ts)。

- **算法**：HMAC-SHA256，密钥为 `DONATION_ORDER_SECRET`。
- **结构**：`<base64url(payload)>.<base64url(signature)>`。
- **载荷（短字段，缩短 URL 长度）**：

| 字段 | 含义 |
| --- | --- |
| `v` | 令牌版本，固定 `1` |
| `e` | 过期时间（Unix 秒），签发时 = 当前时间 + 3600 |
| `o` | 订单号 `orderId` |
| `c` | 渠道，`wechat` / `alipay` |
| `a` | 金额，单位分（`amountFen`） |

- **签名串**：对 `base64url(payload)` 计算 HMAC-SHA256。
- **校验**：用 `timingSafeEqual` 防时序攻击；同时校验版本、过期时间、渠道枚举、订单号非空、金额为正整数，任一不通过即返回 `null`。
- **影响**：修改 `DONATION_ORDER_SECRET` 会使所有已签发但未支付的令牌立即失效（仅影响进行中的订单，不影响已完成支付）。

### 3. 接口契约

所有路由位于 [src/app/api/donate/](file:///workspace/src/app/api/donate)，运行时 `nodejs`、`force-dynamic`。成功响应为 JSON，错误响应统一为 `{ "error": { "code": "...", "message": "..." } }`。

#### `GET /api/donate/config`

返回各渠道是否已配置（必填环境变量是否齐备）。前端据此决定渠道按钮是否可用。

```json
{
  "channels": { "alipay": true, "wechat": true },
  "wechatJsapi": true
}
```

`wechatJsapi` 为 `true` 当且仅当微信必填项齐备 **且** 设置了 `WECHAT_APP_SECRET`。

#### `POST /api/donate/create`

请求体（金额单位为元，必须为整数）：

```json
{ "channel": "wechat", "amount": 10, "mode": "native" }
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `channel` | `alipay` \| `wechat` | 是 | 支付渠道 |
| `amount` | number | 是 | 整数元，范围由 `DONATION_MIN_AMOUNT` / `DONATION_MAX_AMOUNT` 决定（默认 1–10000） |
| `mode` | `native` \| `jsapi` | 否 | 仅微信有效；微信内传 `jsapi`，其余不传 |

成功返回 `201`，字段：

```json
{
  "orderId": "D...",
  "channel": "wechat",
  "codeUrl": "weixin://wxpay/bizpayurl?pr=...",
  "redirectUrl": "https://...",
  "payment": { "appId": "...", "timeStamp": "...", "nonceStr": "...", "package": "prepay_id=...", "signType": "RSA", "paySign": "..." },
  "statusToken": "eyJ...<sig>"
}
```

- 桌面扫码：返回 `codeUrl`（微信 Native / 支付宝当面付）。
- 手机跳转：返回 `redirectUrl`（微信 H5 / 支付宝手机网站）。
- 微信 JSAPI：返回 `payment`，前端直接调 `WeixinJSBridge.invoke('getBrandWCPayRequest', payment, ...)`。
- 三种返回字段互斥，但 `statusToken` 始终存在，供后续查单。

服务端按请求 UA 与 `mode` 选择能力（见第 4 节）；openid 从 `wx_openid` Cookie 读取（仅 JSAPI 下单需要）。

#### `GET /api/donate/status?token=<statusToken>`

用令牌查单，验签后向对应网关查询真实状态。

```json
{ "orderId": "D...", "channel": "wechat", "amount": 10, "status": "paid" }
```

`status` 取值：`pending`（待支付）、`paid`（已支付）、`closed`（已关闭/撤销）。

#### `POST /api/donate/notify/wechat` 与 `POST /api/donate/notify/alipay`

支付平台异步回调。验签/解密通过后：

- 微信返回 `{ "code": "SUCCESS", "message": "成功" }`（HTTP 200）；失败返回非 2xx 让微信重试。
- 支付宝返回纯文本 `success`（HTTP 200）；失败返回 `failure`。
- 成功事件触发站长通知（Bark 推送 + 邮件），见第 8 节。
- 回调体上限 64 KB，超限直接拒绝。

#### `GET /api/donate/wechat/oauth` 与 `GET /api/donate/wechat/oauth/callback`

仅微信内 JSAPI 使用：

1. `/oauth?redirect=<站内路径>` 构造微信网页授权地址（`scope=snsapi_base`，静默获取 openid）并 302 跳转。
2. 微信回跳 `/oauth/callback?code=...&state=...`，服务端用 `code` 换取 `openid`，写入 `wx_openid = <openid>.<HMAC-SHA256(appSecret, openid)>` Cookie（防篡改），再 302 回原始站内路径。
3. 后续 `/api/donate/create` 读取该 Cookie 校验后作为 JSAPI 下单的 `payer.openid`。

#### 错误码对照

| HTTP | code | 触发场景 |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | 请求体非 JSON / 参数校验失败 / 查单缺少 token |
| 401 | `WECHAT_OAUTH_REQUIRED` | 微信内 JSAPI 下单但未授权（无合法 `wx_openid` Cookie） |
| 404 | `INVALID_ORDER` | `statusToken` 验签失败或已过期 |
| 502 | `GATEWAY_FAILED` | 向微信/支付宝网关下单或查单失败 |
| 503 | `GATEWAY_NOT_CONFIGURED` | 渠道必填环境变量缺失（含 `DONATION_ORDER_SECRET`） |
| 501 | `GATEWAY_NOT_IMPLEMENTED` / 兜底 | 未实现或未知错误 |

### 4. 支付方式选择

| 渠道 | 运行环境 | 判定依据 | 调用能力 | 返回字段 |
| --- | --- | --- | --- | --- |
| 微信 | 桌面浏览器 | UA 不含移动端关键字 | `POST /v3/pay/transactions/native` | `codeUrl` |
| 微信 | 微信外手机浏览器 | UA 含 `Android/iPhone/iPad/iPod/Mobile/HarmonyOS` 且非微信内 | `POST /v3/pay/transactions/h5` | `redirectUrl` |
| 微信 | 微信内置浏览器 + 已配置 `WECHAT_APP_SECRET` | 请求带 `mode=jsapi` 且有合法 openid | `POST /v3/pay/transactions/jsapi` | `payment` |
| 支付宝 | 桌面浏览器 | UA 不含移动端关键字 | `alipay.trade.precreate`（当面付） | `codeUrl` |
| 支付宝 | 手机浏览器 | UA 含移动端关键字 | `alipay.trade.wap.pay`（手机网站支付） | `redirectUrl` |

> 微信内未配置 JSAPI 时，前端会提示「请在浏览器中打开后支付」并禁用下单（微信 WebView 会拦截 H5 支付）。

订单号规则：`D` + 时间戳 base36 + 6 字节随机 hex，满足微信 `out_trade_no` 6–32 位、仅字母数字 `_-|*` 的约束。金额提交给微信时单位为分，支付宝按元（保留两位小数）。

### 5. 环境变量

在 `.env.local` 或 Vercel → Settings → Environment Variables 配置，**修改后必须重新部署**才生效。

| 变量 | 必填 | 说明 / 获取位置 |
| --- | --- | --- |
| `DONATION_ORDER_SECRET` | 是 | 订单令牌签名密钥，随机 32 位以上；缺失时所有渠道显示未配置 |
| `WECHAT_MCH_ID` | 微信必填 | 微信支付商户号，商户平台首页 |
| `WECHAT_APP_ID` | 微信必填 | 与商户号绑定的 AppID（公众号 / 开放平台应用） |
| `WECHAT_API_V3_KEY` | 微信必填 | 32 位 APIv3 密钥，商户平台「账户中心 → API 安全」设置，用于回调解密 |
| `WECHAT_CERT_SERIAL_NO` | 微信必填 | 商户 API 证书序列号，API 安全页下载证书后可见 |
| `WECHAT_PRIVATE_KEY` | 微信必填 | `apiclient_key.pem` 内容，换行写成 `\n`；用于请求签名与 JSAPI 二次签名 |
| `WECHAT_PUBLIC_KEY_ID` | 微信必填 | 微信支付公钥 ID（公钥模式），API 安全页获取 |
| `WECHAT_PUBLIC_KEY` | 微信必填 | 微信支付公钥内容，换行写成 `\n`；用于回调验签（本项目用公钥模式，不用平台证书） |
| `WECHAT_APP_SECRET` | 可选 | 公众号 AppSecret；仅此变量存在时微信内才走 JSAPI，否则提示改用浏览器 |
| `WECHAT_NOTIFY_URL` | 可选 | 自定义回调地址，默认 `${SITE_URL}/api/donate/notify/wechat` |
| `ALIPAY_APP_ID` | 支付宝必填 | 开放平台应用 AppID |
| `ALIPAY_PRIVATE_KEY` | 支付宝必填 | 应用私钥（RSA2），换行写成 `\n`；开放平台密钥工具生成 |
| `ALIPAY_PUBLIC_KEY` | 支付宝必填 | 支付宝公钥（非应用公钥），用于回调验签 |
| `ALIPAY_GATEWAY` | 可选 | 默认 `https://openapi.alipay.com/gateway.do`，沙箱可改 `https://openapi-sandbox.dl.alipaydev.com/gateway.do` |
| `ALIPAY_NOTIFY_URL` | 可选 | 自定义回调地址，默认 `${SITE_URL}/api/donate/notify/alipay` |

`SITE_URL` 在 [src/lib/site.ts](file:///workspace/src/lib/site.ts) 中配置；两个回调地址必须是公网可达的 HTTPS 地址。订单标题取 `DONATION_SUBJECT`（默认「打赏支持」），金额范围取 `DONATION_MIN_AMOUNT` / `DONATION_MAX_AMOUNT`（默认 1–10000 元）。

### 6. 微信支付接入详解

实现见 [server/wechat/](file:///workspace/src/features/donate/server/wechat)。所有请求发往 `https://api.mch.weixin.qq.com`，使用 APIv3 接口。

#### 6.1 请求签名（Authorization 头）

每次请求都带 `Authorization` 头，格式：

```
WECHATPAY2-SHA256-RSA2048 mchid="...",nonce_str="...",signature="...",timestamp="...",serial_no="..."
```

签名串为 `METHOD\nURL_PATH\nTIMESTAMP\nNONCE\nBODY\n`，用商户私钥 `WECHAT_PRIVATE_KEY` 做 `RSA-SHA256` 后 base64。`serial_no` 为 `WECHAT_CERT_SERIAL_NO`。私钥/公钥中的 `\n` 会被还原为真实换行。

#### 6.2 下单

- **Native**：`POST /v3/pay/transactions/native`，体含 `appid/mchid/description/out_trade_no/notify_url/amount{total,currency:'CNY'}`，返回 `code_url` 渲染二维码。
- **H5**：`POST /v3/pay/transactions/h5`，额外带 `scene_info{payer_client_ip, h5_info:{type:'Wap'}}`，返回 `h5_url`；服务端再追加 `redirect_url=${SITE_URL}/?donate=success&token=...` 后返回前端，支付完成回跳站点。`payer_client_ip` 取自 `x-forwarded-for` / `x-real-ip`。
- **JSAPI**：`POST /v3/pay/transactions/jsapi`，体含 `payer.openid`，返回 `prepay_id`；随后用**二次签名**生成前端调起参数：

  ```
  签名串 = appId\n timeStamp\n nonceStr\n package(prepay_id=...)\n
  返回  = { appId, timeStamp, nonceStr, package, signType:'RSA', paySign }
  ```

#### 6.3 查单

`GET /v3/pay/transactions/out-trade-no/{out_trade_no}?mchid=...`，按 `trade_state` 映射：

| `trade_state` | 本系统状态 |
| --- | --- |
| `SUCCESS` / `REFUND` | `paid` |
| `CLOSED` / `REVOKED` / `PAYERROR` | `closed` |
| 其他（含 `NOTPAY`） | `pending` |

#### 6.4 回调验签与解密

1. 取请求头 `wechatpay-serial`，必须等于 `WECHAT_PUBLIC_KEY_ID`，否则 401。
2. 校验 `wechatpay-timestamp` 与当前时间差 ≤ 300 秒。
3. 用 `WECHAT_PUBLIC_KEY` 对 `timestamp\nnonce\nbody\n` 做 `RSA-SHA256` 验签，失败 401。
4. 解析 body 的 `resource`，用 `WECHAT_API_V3_KEY` 做 `AEAD_AES_256_GCM` 解密（nonce + 16 字节 authTag + 可选 associated_data），得到 `out_trade_no/trade_state/amount.total` 等。
5. 若 `trade_state === 'SUCCESS'`，触发站长通知；返回 `{ "code": "SUCCESS" }`。
6. 任一步失败返回非 2xx，微信会按策略重试。

### 7. 支付宝接入详解

实现见 [server/alipay/](file:///workspace/src/features/donate/server/alipay)。所有请求走 `ALIPAY_GATEWAY`（默认 `https://openapi.alipay.com/gateway.do`），使用 RSA2 签名、`application/x-www-form-urlencoded` 提交。

#### 7.1 公共参数与签名

每次请求携带：`app_id`、`method`、`format=JSON`、`charset=utf-8`、`sign_type=RSA2`、`timestamp`（`yyyy-MM-dd HH:mm:ss`）、`version=1.0`、`notify_url`（可选）、`biz_content`（JSON）。签名：参数按键名 ASCII 升序拼接成 `k=v&...`（剔除空值与 `sign`），用应用私钥 `ALIPAY_PRIVATE_KEY` 做 `SHA256withRSA` 后 base64，作为 `sign` 一并提交。

#### 7.2 下单

- **当面付（桌面）**：`alipay.trade.precreate`，`biz_content` 含 `out_trade_no/total_amount/subject/product_code:'FACE_TO_FACE_PAYMENT'/timeout_express:'30m'`，返回 `qr_code` 渲染二维码。
- **手机网站支付（手机）**：`alipay.trade.wap.pay`，构造签名后的完整网关 URL（含 `return_url=${SITE_URL}/?donate=success&token=...` 与 `quit_url=${SITE_URL}/`）直接返回前端跳转，`product_code='QUICK_WAP_WAY'`。

#### 7.3 查单

`alipay.trade.query`，按 `trade_status` 映射：

| `trade_status` | 本系统状态 |
| --- | --- |
| `TRADE_SUCCESS` / `TRADE_FINISHED` | `paid` |
| `TRADE_CLOSED` | `closed` |
| `WAIT_BUYER_PAY` / 其他 | `pending` |

#### 7.4 回调验签

支付宝以 `application/x-www-form-urlencoded` 表单 POST 回调：

1. 用 `ALIPAY_PUBLIC_KEY` 对收到的参数（剔除 `sign` 与 `sign_type`）做 RSA2 验签，失败返回 `failure`（401）。
2. 校验 `app_id` 等于 `ALIPAY_APP_ID`，失败 401。
3. 校验 `out_trade_no/trade_status/total_amount` 非空，缺失 400。
4. `trade_status` 为 `TRADE_SUCCESS` / `TRADE_FINISHED` 时触发站长通知；返回纯文本 `success`（200）。

### 8. 回调之后的站长通知

支付成功回调验签通过后，调用 [notify.ts](file:///workspace/src/features/donate/server/notify.ts) 的 `notifyDonationSuccess`，并行执行：

- **Bark 推送**（[lib/bark.ts](file:///workspace/src/lib/bark.ts)）：需配置 `BARK_DEVICE_KEY`，点击通知打开 `${SITE_URL}/api/mail/open`（iPhone 唤起 139 邮箱 App，桌面打开网页版）。
- **邮件通知**（[mailer.ts](file:///workspace/src/features/mail/server/mailer.ts)）：向 `MAIL_TO` 发送含渠道、金额、订单号的邮件。

任一通知失败只记日志，不影响回调返回成功，避免支付平台重复投递。未配置 Bark/邮件时自动跳过。

### 9. 前端支付流程

实现见 [client/donate-dialog.tsx](file:///workspace/src/features/donate/client/donate-dialog.tsx) 与 [client/revenue.ts](file:///workspace/src/features/donate/client/revenue.ts)：

1. 打开弹窗 → `GET /api/donate/config` 决定可用渠道。
2. 输入金额 → `POST /api/donate/create`：
   - 扫码：用 `codeUrl` 渲染二维码，前端每 3 秒轮询 `/api/donate/status`，最长 5 分钟。
   - 跳转：打开 `redirectUrl`，支付完成后回跳 `/?donate=success&token=...`，页面解析 token 后查单确认。
   - JSAPI：用 `payment` 调起微信收银台，支付后同样轮询确认。
3. 状态变 `paid` → 前端上报 Umami 收入事件（`revenue` 事件带金额/渠道/订单号），并用内存 `Set` + `sessionStorage` 按订单号去重。
4. 微信内未配置 JSAPI 时，弹窗显示「请在浏览器中打开后支付」提示并禁用下单按钮。

### 10. 开通步骤

#### 微信支付

1. 商户平台开通 **Native 支付**、**H5 支付**、**JSAPI 支付**（按需）。
2. 「产品中心 → 开发配置 → H5 支付域名」添加站点域名（H5 必做）。
3. 「账户中心 → API 安全」设置 APIv3 密钥（32 位），下载商户 API 证书，记录证书序列号与 `apiclient_key.pem`。
4. 切换到**公钥模式**：获取微信支付公钥 ID 与公钥，填入 `WECHAT_PUBLIC_KEY_ID` / `WECHAT_PUBLIC_KEY`（本项目按公钥模式验签，不下载平台证书）。
5. 微信内 JSAPI：公众号后台设置「网页授权域名」「JS 接口安全域名」为站点域名，配置支付授权目录，并填入 `WECHAT_APP_SECRET`；同时完成站点根目录域名所有权验证（如 `a192651...txt`）。
6. 确保回调地址（`WECHAT_NOTIFY_URL` 或默认）公网 HTTPS 可达。

#### 支付宝

1. 开放平台创建应用，签约 **当面付** 与 **手机网站支付** 并上线。
2. 用密钥工具生成 RSA2 应用私钥/公钥，上传应用公钥，保存平台返回的**支付宝公钥**。
3. 填入 `ALIPAY_APP_ID` / `ALIPAY_PRIVATE_KEY` / `ALIPAY_PUBLIC_KEY`。
4. 异步通知地址在下单时传入（默认 `${SITE_URL}/api/donate/notify/alipay`），无需在开放平台单独配置；自定义则填 `ALIPAY_NOTIFY_URL`。
5. 确认应用已上线且签约能力生效，否则 `precreate` / `wap.pay` 会返回网关错误（`code !== 10000`）。

### 11. 验证与排查

1. 访问 `/api/donate/config`，确认目标渠道为 `true`、`wechatJsapi` 符合预期。
2. 桌面端用 1 元走扫码，确认二维码生成且扫码后 `/api/donate/status` 最终返回 `paid`。
3. 手机端（非微信）确认能跳转到对应 App 支付并回跳站点确认成功。
4. 微信内：已配置 JSAPI 则直接调起收银台；未配置则提示改用浏览器。
5. 支付成功后检查站长是否收到 Bark 推送与邮件；Vercel 日志搜 `[donate]` 与 `[bark]`。
6. 常见失败：
   - **下单 502 / 网关错误**：密钥格式（`\n` 未还原）、证书序列号、AppID 与商户号未绑定、支付宝应用未上线。
   - **回调 401**：微信公钥 ID/公钥错误或时间戳偏差；支付宝公钥填成了应用公钥。
   - **查单 404**：`statusToken` 过期或 `DONATION_ORDER_SECRET` 被更换。
   - **H5 被拦截**：微信 WebView 内走了 H5，应配置 JSAPI 或提示改用浏览器。

### 12. 注意事项

- 所有密钥只放服务端环境变量，切勿写入 `site.ts`、客户端组件或提交到 Git；`.env.local` 已在 `.gitignore`。
- 回调只负责验签与触发通知；即使回调丢失，前端查单仍能确认支付结果。
- `statusToken` 有效期 1 小时，超时无法查单，但支付平台侧订单不受影响。
- 收入统计由前端在确认支付后上报；用户支付后直接关闭页面则不会产生该次统计。
- 更换 `DONATION_ORDER_SECRET`、微信/支付宝密钥后必须重新部署；进行中的令牌与未完成授权会失效。

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
