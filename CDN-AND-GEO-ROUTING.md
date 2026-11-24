# CDN 缓存与国内外分流配置指南

本文档覆盖两件事：

1. **CDN / 浏览器缓存**：代码里如何设定缓存头、Service Worker 如何缓存资源；
2. **国内外分流**：DNS 层如何分流、应用层兜底何时生效、如何排查。

所有代码侧开关集中在根目录 `site.config.ts`，改完需要**两个平台各自重新部署**才生效（配置在构建期求值）。

---

## 1. 架构总览

```
访客
  │
  ▼
火山云解析 DNS（智能解析）
  ├─ 中国内地线路 ──► 火山引擎 IGA Pages（境内源站，standalone）
  ├─ 全球(不含中国) ──► Vercel（境外源站）
  └─ 默认线路 ──────► Vercel（兜底）
  │
  ▼
平台 CDN / Edge
  ├─ Cache-Control 由 next.config.ts 统一写入
  └─ /sw.js 永不缓存
  │
  ▼
应用层 src/proxy.ts
  ├─ 裸域 → www（308，默认开）
  └─ 地域兜底跳转（307，默认关）
```

**优先级**：DNS 分流 > 应用层跳转。DNS 没有跳转开销、不会被浏览器缓存污染，是首选方案；`proxy.ts` 的地域跳转只用于 DNS 完全不可控的极端场景。

---

## 2. CDN 缓存策略（代码侧）

### 2.1 配置入口

`site.config.ts` 的 `SITE_CDN_CACHE` 定义四档策略，`next.config.ts` 的 `headers()` 把它们写到对应路径：

| 路径 | 策略 | 响应头 | 说明 |
|------|------|--------|------|
| `/fonts/*`、`/launch/*` | `immutable` | `public, max-age=31536000, s-maxage=31536000, immutable` | 字体、iOS 启动图，内容不可变，浏览器和 CDN 都存一年 |
| `/live2d/*`、`/docs/*` | `static` | `public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400, stale-if-error=604800` | 模型、文档配图，可能随版本更新 |
| `/sw.js` | `serviceWorker` | `no-cache, no-store, must-revalidate, no-transform` | 永不缓存，否则新版本推不下去 |
| `/api/*` | `api` | `no-store, no-cache, must-revalidate, private` | 支付回调、订单查询、Webhook，禁止任何缓存 |
| 其他页面 | 无显式缓存头 | 由 Next.js / SW 决定 | 首页走 SW 的 network-first |

### 2.2 三个关键指令的解释

- **`s-maxage`**：只作用于共享缓存（CDN / 反向代理），优先级高于 `max-age`。让 CDN 可以缓存更久，而浏览器按自己的短周期回源校验，两者互不牵制。
- **`stale-while-revalidate=86400`**：缓存过期后的一天之内，CDN 可以先返回旧副本，同时在后台异步刷新。用户不等待回源，内容又能在后台更新。
- **`stale-if-error=604800`**：源站故障的一周内，继续用旧副本兜底，避免模型/配图在源站抖动时直接 502。

> `immutable` 档不需要 `stale-*`：文件名或内容确定不变，过期前不存在"旧副本"问题。

### 2.3 想让某个资源立即刷新怎么办

1. **换文件名**（最干净）：`immutable` 档资源改名后就是新 URL，立刻生效；
2. **调小 TTL**：把 `SITE_CDN_CACHE.static` 的 `max-age` / `s-maxage` 改小后重新部署；
3. **CDN 控制台手动刷新目录**：例如刷新 `/live2d/`。

---

## 3. Service Worker（代码侧）

实现文件：`public/sw.js`。缓存名带版本号（`site-v11`），版本变化会在激活时清理旧缓存。

### 3.1 三类请求的处理

| 请求 | 策略 | 行为 |
|------|------|------|
| 页面导航 | 网络优先 + 8 秒超时 | 成功就写缓存并返回；超时或失败则依次回退到缓存页面 / `/` / `/offline.html` |
| 可变资源（`/live2d/`、`/docs/`） | stale-while-revalidate | 命中缓存立即返回，后台异步拉取新版本写回缓存 |
| 不可变资源（带哈希的 `/_next/static/`、字体、脚本等） | 缓存优先 | 命中缓存直接返回，不产生多余回源 |

### 3.2 两个重要保护

- **范围请求不缓存**：带 `Range` 头的请求（如 Live2D 模型分段加载）只返回部分内容，写入缓存会污染后续完整请求，因此代码里直接跳过缓存写入。
- **导航超时兜底**：弱网下导航最长等 8 秒，超时就用缓存渲染，避免白屏无限等待。

### 3.3 版本更新链路

1. `next.config.ts` 的 `generateBuildId` 每次构建写入唯一 `.next/BUILD_ID`；
2. 新版本 SW 安装后通过 `SKIP_WAITING` 立即接管；
3. 页面发现 RSC 响应里的 buildId 与当前页面不一致时，Next.js 自动降级为 MPA 导航，加载新 bundle。

`prepare-standalone.mjs` 会把 `BUILD_ID` 同步进 standalone 产物，保证本地 `npm run start:standalone` 与线上行为一致。

---

## 4. 国内外分流（代码侧）

### 4.1 配置入口

`site.config.ts` 的 `SITE_GEO_ROUTING`：

| 字段 | 默认值 | 作用 |
|------|--------|------|
| `enabled` | `false` | 总开关。保持关闭即可，DNS 分流已经够用 |
| `cnCountryCodes` | `['CN']` | 判定为境内的国家码；需要港澳台留在境内链路就加 `HK` / `MO` / `TW` |
| `countryHeaders` | 4 个头 | 按顺序读取地域信号，见下表 |
| `statusCode` | `307` | 临时重定向，随时可回滚 |
| `redirectCookie` | `site-region`，10 分钟 | 防回环：同一会话最多跳一次 |
| `debug` | `false` | 打开后每个经过判断的响应带 `X-Site-Geo` 头 |

### 4.2 地域头来源

| 请求头 | 来源 | 备注 |
|--------|------|------|
| `x-vercel-ip-country` | Vercel 官方注入 | 生产环境一定有，ISO 3166-1 alpha-2 |
| `cf-ipcountry` | Cloudflare | 未知地域返回 `XX`，代码按无信号处理 |
| `x-geo-country` | 自建边缘脚本注入 | 需要自己在 CDN 边缘按 IP 查库后注入 |
| `x-forwarded-country` | 多层代理叠加 | 支持逗号分隔列表，如 `"XX, CN"`，取首个有效项 |

> 火山 DCDN / IGA Pages 的回源头只有 uri、host、client_ip 等 11 个变量，**没有国家字段**。想让"境外访客落到 IGA"这个方向也生效，只能在边缘按 `client_ip` 查库后注入自定义头，再加进 `countryHeaders`。

### 4.3 判定流程

```
裸域 → www（308）
  │
  ▼
分流开关是否打开？目标地址是否都配置了？主机是否在白名单？
  │ 否 → 就地服务
  ▼
已有 site-region Cookie？ → 就地服务（防回环）
  │
  ▼
按 countryHeaders 顺序读取，跳过 XX / - / 空值
  │ 读不到 → 就地服务（fail-open）
  ▼
命中 cnCountryCodes → 跳 cn 目标；否则跳 overseas 目标
  │ 目标 == 当前主机 → 就地服务
  ▼
307 跳转 + 写 Cookie
```

**fail-open 是刻意设计**：任何一侧拿不到可信地域信号都不跳转，宁可慢一点也不要陷入 A→B→A 死循环。

### 4.4 调试模式

临时把 `SITE_GEO_ROUTING.debug` 改为 `true` 并部署，然后看响应头：

```bash
curl -sI -H "Host: www.zhang-wentao.tech" \
  -H "x-vercel-ip-country: CN" https://你的预览地址/ | grep -i "x-site-geo\|location"
```

`X-Site-Geo` 的取值含义：

| 值 | 含义 |
|----|------|
| `skip:cookie` | 会话内已经跳过一次，不再跳 |
| `skip:no-country` | 没拿到任何可信地域头 |
| `skip:same-host:cn:CN` | 判定为境内，但目标主机就是当前主机 |
| `redirect:overseas:US` | 判定为美国访客，跳境外目标 |
| `redirect:cn:CN` | 判定为境内访客，跳境内目标 |

排查完记得改回 `false` 并重新部署。

---

## 5. 平台侧配置清单

代码只负责"写头"和"兜底判断"，真正的分流与缓存由平台完成。以下是两个平台需要保持的配置。

### 5.1 火山云解析 DNS（分流核心）

在域名解析控制台给 `www` 和裸域 `@` 分别添加分线路记录：

| 主机记录 | 线路 | 记录类型 | 记录值 |
|----------|------|----------|--------|
| `www` | 中国内地 | CNAME | IGA Pages 分配的加速域名（`xxx.app.example.com.c.vedcdnlb.com`，以控制台为准） |
| `www` | 全球（不含中国内地） | CNAME / A | Vercel 项目 Domains 页给出的值 |
| `www` | 默认 | CNAME / A | 同上，指向 Vercel（兜底） |
| `@` | 中国内地 | CNAME | IGA 加速域名 |
| `@` | 默认 | CNAME / A | Vercel（再由应用 308 补 www） |

注意事项：

- 同一线路内不要同时放两个平台的值，那会变成按权重轮询；
- 免费版 TTL 最小 600 秒，改记录后至少等 10 分钟再判定结果；
- 线路匹配优先级：自定义 > 运营商 > 中国内地 > 全球 > 默认；
- 加速区域包含中国大陆时域名必须完成 ICP 备案。

### 5.2 火山 IGA Pages

- `iga.json` 固定 `installCommand: npm ci`、`buildCommand: npm run build`；
- Node.js 版本选 **24.x**（`package.json` 要求 ≥24）；
- 环境变量（密钥）在项目设置里配置，公开配置全部在 `site.config.ts`；
- 不需要额外指定输出目录，平台按 Next.js 模式处理 standalone 产物；
- 不要手工在控制台覆盖 `Cache-Control`，代码里的值已经过权衡。

### 5.3 Vercel

- `vercel.json` 声明 `framework: nextjs`、`buildCommand: npm run build`、`installCommand: npm ci --registry=https://registry.npmjs.org`；
- 环境变量在 Settings → Environment Variables 配置，Production / Preview / Development 三套都要覆盖；
- `next.config.ts` 在 `VERCEL === '1'` 时不设置 `output: 'standalone'`（Vercel 不支持该配置）；
- 若套了 Cloudflare，`cf-ipcountry` 会自动出现在回源头里，可直接用于地域判定。

---

## 6. 验证清单

部署后逐项验证：

```bash
# 1. 缓存头是否生效（把域名换成实际域名）
curl -sI https://www.example.com/live2d/live2dcubismcore.min.js | grep -i "cache-control"
# 期望：含 s-maxage=604800, stale-while-revalidate=86400

curl -sI https://www.example.com/fonts/Ubuntu.woff2 | grep -i "cache-control"
# 期望：含 immutable

curl -sI https://www.example.com/sw.js | grep -i "cache-control"
# 期望：no-cache, no-store, must-revalidate

curl -sI https://www.example.com/api/donate/config | grep -i "cache-control"
# 期望：no-store

# 2. 裸域补 www
curl -sI -H "Host: example.com" http://127.0.0.1:3000/ | grep -i "^HTTP\|^location"
# 期望：308 → https://www.example.com/

# 3. DNS 分流是否按线路生效（用 EDNS Client Subnet 模拟不同视角）
dig +subnet=114.114.114.114 www.example.com @ns1.volcengine-dns.com +short  # 境内
dig +subnet=8.8.8.8 www.example.com @ns1.volcengine-dns.com +short          # 境外

# 4. 应用层分流（需临时打开 debug 并配置两个平台地址）
curl -sI -H "Host: www.example.com" -H "x-vercel-ip-country: CN" \
  https://你的预览地址/ | grep -i "x-site-geo\|^location"
```

浏览器侧再确认：

- DevTools → Application → Cache Storage：`site-v11` 之外的旧缓存应在新 SW 激活后被清除；
- Network 面板：`/sw.js` 永远不是 from disk cache；
- PWA 更新后软刷新能替换客户端 JS bundle（不再需要手动强刷）。

---

## 7. 常见问题

| 现象 | 排查方向 |
|------|----------|
| 换了模型但一直看到旧文件 | 检查 `/live2d/` 是否返回新的 `Cache-Control`；CDN 控制台刷新目录；必要时给模型文件换名 |
| `/sw.js` 命中缓存，新版本推不下去 | 确认响应头是 `no-cache, no-store`；检查平台控制台有没有覆盖缓存规则 |
| 境内访客被分到 Vercel（慢） | 用 `dig +subnet` 确认 DNS 中国内地线路是否命中 IGA；免费版 DNS 的境外 NS 节点可能导致 ECS 判断偏差 |
| 境外访客被分到 IGA | 火山 DCDN 不回传国家头，应用层兜底这一方向拿不到信号；需要在边缘注入 `x-geo-country` |
| 打开 `SITE_GEO_ROUTING` 却不跳 | 四个正常原因：`overseas` 地址为空、拿不到地域头、目标主机就是当前主机、会话内已有 `site-region` Cookie；用 `debug` 模式看 `X-Site-Geo` |
| 出现 A→B→A 反复跳转 | 确认 `redirectCookie` 正常写入；两平台共用域名时目标主机比较应能挡住 |
| 支付回调被跨域重定向 | `proxy.ts` 的 matcher 已排除 `/api/*`；不要把它改成匹配所有路径 |
| 改了 `site.config.ts` 不生效 | 配置在构建期求值，IGA 与 Vercel 两条链路要分别重新部署 |
