# 单域名 CDN 缓存与分流配置指南

本文档覆盖两件事：

1. **CDN / 浏览器缓存**：代码里如何设定缓存头、Service Worker 如何缓存资源；
2. **分流**：境内与境外共用同一个对外域名，分流只在 DNS 分线路完成。

所有代码侧开关集中在根目录 `site.config.ts`，改完需要**两个平台各自重新部署**才生效（配置在构建期求值）。DNS 记录在云解析控制台维护，与代码部署互不依赖。

---

## 1. 架构总览

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
  └─ 裸域 → www（308）；无地域判定、无跨域跳转
```

**单域名原则**：IGA 与 Vercel 绑定同一个主机名（`SITE_HOSTNAME`），DNS 决定由哪个平台承接请求，请求落到平台后就地服务。应用层不再有平台地址、地域头判定、`site-region` Cookie 或 `X-Site-Geo` 头——单域名下没有第二个跳转目标，任何跨域跳转都是错误配置。

---

## 2. CDN 缓存策略（代码侧）

### 2.1 配置入口

`site.config.ts` 的 `SITE_CDN_CACHE` 定义四档策略，`next.config.ts` 的 `headers()` 把它们写到对应路径。规则只按路径匹配，不区分线路与平台，因此两条部署链路上的同一域名表现一致：

| 路径 | 策略 | 响应头 | 说明 |
|------|------|--------|------|
| `/fonts/*`、`/launch/*` | `immutable` | `public, max-age=31536000, s-maxage=31536000, immutable` | 字体、iOS 启动图，内容不可变，浏览器和 CDN 都存一年 |
| `/live2d/*`、`/docs/*` | `static` | `public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400, stale-if-error=604800` | 模型、文档配图，可能随版本更新 |
| `/serwist/sw.js` | `serviceWorker` | `no-cache, no-store, must-revalidate, no-transform` | 永不缓存，否则新版本推不下去 |
| `/api/*` | `api` | `no-store, no-cache, must-revalidate, private` | 支付回调、订单查询、Webhook，禁止任何缓存 |
| 其他页面 | 无显式缓存头 | 由 Next.js 决定 | 页面由 Serwist 按 NetworkFirst 处理，离线时回退缓存 |

### 2.2 三个关键指令的解释

- **`s-maxage`**：只作用于共享缓存（CDN / 反向代理），优先级高于 `max-age`。让 CDN 可以缓存更久，而浏览器按自己的短周期回源校验，两者互不牵制。
- **`stale-while-revalidate=86400`**：缓存过期后的一天之内，CDN 可以先返回旧副本，同时在后台异步刷新。用户不等待回源，内容又能在后台更新。
- **`stale-if-error=604800`**：源站故障的一周内，继续用旧副本兜底，避免模型/配图在源站抖动时直接 502。

> `immutable` 档不需要 `stale-*`：文件名或内容确定不变，过期前不存在"旧副本"问题。

### 2.3 想让某个资源立即刷新怎么办

1. **换文件名**（最干净）：`immutable` 档资源改名后就是新 URL，立刻生效；
2. **调小 TTL**：把 `SITE_CDN_CACHE.static` 的 `max-age` / `s-maxage` 改小后，两个平台各重新部署一次；
3. **CDN 控制台手动刷新目录**：例如刷新 `/live2d/`。单域名下同一路径可能由两侧源站承接，两边都要确认刷新结果。

---

## 3. Service Worker（代码侧）

离线能力由 [Serwist](https://serwist.pages.dev/docs/next/turbo) 提供（Next 16 默认 Turbopack，使用 `@serwist/turbopack` 集成）：

- `src/app/sw.ts`：Service Worker 源码，使用 `defaultCache` 提供的 Next.js 推荐运行时策略（HTML/RSC 走 NetworkFirst，带 hash 的静态资源走 CacheFirst/StaleWhileRevalidate）；`/api/*` 被前置规则强制 NetworkOnly，不缓存支付与留言接口。
- `src/app/serwist/[path]/route.ts`：`createSerwistRoute` 在构建时用 esbuild 编译 `sw.ts`，注入 `.next/static`、`public` 与 `/~offline` 的预缓存清单，并从 `/serwist/sw.js` 提供。
- `src/app/~offline/page.tsx`：文档请求离线且无缓存时的兜底页。
- `src/features/pwa/pwa-registration.tsx`：`PwaRegistration` 先注销浏览器中残留的 `/sw.js` 注册并清理 `site-*` 旧缓存，再挂载 `SerwistProvider`；这解决了删除 `public/sw.js` 后旧注册仍尝试更新并报 404 的问题。
- `src/app/layout.tsx`：`SerwistProvider` 仅在生产环境注册 SW；关闭 `reloadOnOnline` 与 `cacheOnNavigation`，避免后台恢复/网络恢复时自动刷新造成白屏。
- `next.config.ts`：用 `withSerwist` 包装配置，把 esbuild 声明为 `serverExternalPackages`；为 `/serwist/:path*` 设置 `Content-Type`、永不缓存的 `Cache-Control` 与严格 CSP。

之前手写的 `CacheFirst / stale-cache` 逻辑、版本戳脚本、`public/sw.js` 和手动注册组件均已删除。页面从后台恢复的可见性处理仍由 `PageRestoreCoordinator` 统一广播，与 SW 解耦。`scripts/build/prepare-standalone.mjs` 会把 `BUILD_ID` 同步进 standalone 产物，保证本地 `npm run start:standalone` 与线上行为一致。

---

## 4. 单域名分流（DNS 层）

### 4.1 配置入口

分流**不在代码、不在环境变量、不在 `site.config.ts`**，而是在云解析 DNS 控制台给同一个主机名加分线路记录。IGA 与 Vercel 两侧都要绑定 `www.zhang-wentao.tech`（及裸域，如需分流裸域），平台侧预览域名不参与。

### 4.2 记录清单

| 主机记录 | 线路 | 记录类型 | 记录值 |
|----------|------|----------|--------|
| `www` | 中国内地 | CNAME | IGA Pages 分配的加速域名（`xxx.app.example.com.c.vedcdnlb.com`，以控制台为准） |
| `www` | 全球（不含中国内地） | CNAME / A | Vercel 项目 Domains 页给出的值 |
| `www` | 默认 | CNAME / A | 同上，指向 Vercel（兜底） |
| `@` | 中国内地 | CNAME | IGA 加速域名 |
| `@` | 全球（不含中国内地） | CNAME / A | Vercel |
| `@` | 默认 | CNAME / A | Vercel（再由应用 308 补 www） |

### 4.3 约束与注意事项

- 同一线路内不要同时放两个平台的值，那会变成按权重轮询，不是分流。
- 免费版 TTL 最小 600 秒，改记录后至少等 10 分钟再判定结果。
- 线路匹配优先级：自定义 > 运营商 > 中国内地 > 全球 > 默认；自定义线路一旦命中会盖掉下面几档。
- 加速区域包含中国大陆时域名必须完成 ICP 备案。
- 免费版 DNS 节点在境内（境外 NS `intl.volcengine-dns.com` 属付费能力）：「全球（不含中国内地）」线路虽可配置，但境外递归到境内 NS 时 ECS 容易仍判为内地 → 落到 IGA（慢但可用）。默认线路那条 Vercel 记录在这里是**解析不失败**的保证，不是**分流正确**的保证；要稳定分流需付费版境外节点或支持境外节点的 DNS 服务商。
- `@` 不要用「URL 转发」：转发走默认线路、需要备案，且无法配合分线路；用解析记录 + 应用层 308 归一化。

### 4.4 为什么不再做应用内跳转

旧版本的 `SITE_DEPLOY_TARGETS` / `SITE_GEO_ROUTING` 是为「两套平台各有独立域名」准备的跨域兜底。改为单域名后：

- 两条链路的主机名相同，不存在可跳转的第二个目标；
- DNS 已按线路把访客送到对应平台，应用层再读地域头只会多一次重定向与缓存污染风险；
- 火山 DCDN / IGA Pages 的回源头只有 uri、host、client_ip 等变量，**没有国家字段**，单靠请求头无法可靠判定。

因此这些配置与代码（`X-Site-Geo`、`site-region` Cookie、307 跳转）已全部移除。分流异常时先查 DNS 解析结果，不要试图在 `proxy.ts` 里补规则。

---

## 5. 平台侧配置清单

代码只负责"写头"和"裸域归一化"，真正的分流与缓存由平台完成。两个平台需要保持的配置：

### 5.1 火山 IGA Pages

- `iga.json` 固定 `installCommand: npm ci`、`buildCommand: npm run build`；
- Node.js 版本选 **24.x**（`package.json` 要求 ≥24）；
- 环境变量（密钥）在项目设置里配置，公开配置全部在 `site.config.ts`；
- 绑定自定义域名 `www.zhang-wentao.tech`，但 DNS 记录由云解析控制台统一管理，不要在 IGA 里另配跳转；
- 不需要额外指定输出目录，平台按 Next.js 模式处理 standalone 产物；
- 不要手工在控制台覆盖 `Cache-Control`，代码里的值已经过权衡。

### 5.2 Vercel

- `vercel.json` 声明 `framework: nextjs`、`buildCommand: npm run build`、`installCommand: npm ci --registry=https://registry.npmjs.org`；
- 环境变量在 Settings → Environment Variables 配置，Production / Preview / Development 三套都要覆盖；
- `next.config.ts` 在 `VERCEL === '1'` 时不设置 `output: 'standalone'`（Vercel 不支持该配置）；
- Domains 里绑定同一个主机名；单域名场景下回调地址按 `SITE_URL` 拼接即可，无需为境外链路另设域名。

---

## 6. 验证清单

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
```

浏览器侧再确认：

- DevTools → Application → Service Workers：`/serwist/sw.js` 处于 Activated 状态，Unsafe requests 为 0；
- DevTools → Application → Cache Storage：出现 Serwist 的预缓存及 `pages*` / `next-*` 缓存，旧的 `site-*` 缓存不再被写入；
- Network 面板：`/serwist/sw.js` 永远不是 from disk cache；断网刷新首页仍能渲染，未缓存路由显示 `/~offline` 兜底页；
- 境内/境外访问地址栏始终是同一个域名，没有 307 跨域跳转。

---

## 7. 常见问题

| 现象 | 排查方向 |
|------|----------|
| 换了模型但一直看到旧文件 | 检查 `/live2d/` 是否返回新的 `Cache-Control`；CDN 控制台刷新目录；必要时给模型文件换名 |
| `/serwist/sw.js` 命中缓存，新版本推不下去 | 确认响应头是 `no-cache, no-store`；检查平台控制台有没有覆盖缓存规则 |
| 境内访客被分到 Vercel（慢） | 用 `dig +subnet` 确认 DNS 中国内地线路是否命中 IGA；免费版 DNS 的境外 NS 节点可能导致 ECS 判断偏差 |
| 境外访客被分到 IGA | 检查「全球（不含中国内地）」与默认线路记录；免费版境内 NS 的 ECS 偏差见 4.3，单域名下代码不会纠正分流 |
| 出现跨域名跳转 | 当前代码已无地域跳转逻辑：检查平台控制台跳转规则、老版本产物是否仍在线，及 DNS 是否解析到旧部署 |
| 支付回调异常 | `proxy.ts` 的 matcher 已排除 `/api/*`；单域名下回调地址按 `SITE_URL` 拼接，确认两侧密钥一致 |
| DNS 改了不生效 | 免费版 TTL 最小 600 秒，等待至少 10 分钟再用 `dig +subnet` 复核 |
| 改了 `site.config.ts` 不生效 | 配置在构建期求值，IGA 与 Vercel 两条链路要分别重新部署 |
