# 项目深度重塑与性能优化计划

## Context

当前项目功能稳定，但存在固定文本却加载完整 Shiki/WASM、图片组件携带无用平台逻辑、依赖与组件残留、页面/领域代码边界混杂、Service Worker 预缓存冗余，以及光标永久 RAF 等问题。用户已明确接受深度目录和模块边界调整，目标是减少无用代码与依赖、提升可维护性，并以测量数据验证构建和加载性能收益。

约束：保留现有视觉与交互、生产浏览器 Source Map、完整离线主页、Live2D、邮件、Motion 动画和页脚 Radix Tooltip；不升级 Next.js/React major，不把目录搬迁本身当作性能收益。

## 1. 建立可比较基线

- 从最新 `main` 建立独立工作分支，确认依赖和既有图片资源完整。
- 在同机执行冷/热生产构建各 3 次并取中位数，记录类型检查、构建耗时、First Load JS、主要 chunk gzip、`.map` 体积。
- 用生产服务分别记录无 Service Worker 冷启动、首次安装、受控回访的请求字节数及 LCP/CLS/INP，作为优化对照。

## 2. 删除无用依赖、组件和死代码

- 从 `package.json` 与锁文件移除已交叉确认无引用的 `@radix-ui/react-scroll-area`、`swr`、`underscore`、`@types/underscore`、`@shikijs/transformers`。
- 将 `text-developer.tsx` 的固定 `<Developer />` 改为保留现有配色的静态 token 渲染，保留打字机时序；删除 `components/ui/highlighter/` 及 `@shikijs/core`、`@shikijs/types`、`shiki`，消除高亮运行时代码、语法、主题和 Oniguruma WASM 的构建与网络开销。
- 三个静态图片调用直接使用 `next/image`，保留尺寸、priority/lazy、渐变背景和解码行为；删除 `components/ui/image.tsx` 中平台图片服务、WebP canvas 探测和无用 srcSet 逻辑。
- 删除仅被 Service Worker 预缓存的 `public/fonts/MonaspaceNeon.woff` 及缓存项；清理已确认无外部引用的字标裁剪路径组件、`DialogClose`、`FormDescription` 等死导出。
- 利用 Tailwind v4 内置导入和前缀能力，将 PostCSS 收敛为 `@tailwindcss/postcss`，移除 `postcss-import`、`autoprefixer`；通过构建和视觉回归确认无样式差异。
- 保留 `pixi.js`、Tooltip、表单、Motion 等实际使用依赖，不按“未直接 import”误判间接运行时依赖。

## 3. 按领域重组架构与模块边界

目标结构：

- `src/features/home/`：首页编排、页头页脚、背景、时钟、自定义光标、交互限制。
- `src/features/profile/`：头像框、名称、简介、动态文字、社交链接。
- `src/features/live2d/`：延迟入口、SDK 加载、Pixi core、事件类型和 Loading。
- `src/features/mail/`：`client/` 表单与 API client、`server/` 邮件发送和限流、共享 schema 与类型。
- `src/features/pwa/`：Service Worker 注册与更新策略；运行时 `/sw.js` 仍保留在 `public/`。
- `src/components/ui/` 只保留跨领域复用的通用原语；`src/app/` 只保留路由、metadata 和领域组合。

实施规则：

- 先迁移并统一修正 import，再进行 API 收敛；保留邮件、Parallax、Live2D、Motion、Web Vitals 的现有懒加载边界。
- Profile 通过回调暴露 Email 动作，由 Home 懒加载 Mail，避免 Profile 反向依赖邮件实现。
- 邮件前后端共用包含 254/5000 字长度限制的 schema；API client 改用具名输入和明确错误类型，route 只负责 HTTP 解析、状态码及调用 `mail/server`。
- 保持 Live2D 状态回调和资源销毁边界，避免形成 Home ↔ Profile ↔ Live2D 循环依赖。
- 不用完整客户端壳包裹伪 Server Component；只有能真正缩小水合边界的静态内容才拆分。

## 4. 优化运行时与网络

- **Service Worker**：保留 `/`、manifest、必要图标/字体、`offline.html` 和 `_next/static`、`/live2d` 运行时缓存，继续支持完整离线主页；仅从预缓存移除未使用字体、OG 图和非必要 512 图标，不删除这些在线资源。
- 集中管理缓存版本并清理旧版本；取消 `skipWaiting + controllerchange` 造成的强制刷新，让更新在旧客户端关闭后激活，避免打断邮件提交；`/api/` 继续永不缓存。
- 将自定义光标定位从 `left/top` 改为 `transform`，仅在鼠标移动且页面可见时运行 RAF，静止、隐藏和卸载时停止，保留 hover/active 状态与 reduced-motion 行为。
- 保留实际使用的字体字重和 Source Map；先依据基线判断字体带宽，不做可能改变字形显示的激进子集化。
- 不重复改造已验证的邮件、背景、Live2D、Motion、Web Vitals 懒加载，不为“优化”增加新的运行时抽象。

## 关键文件

- `package.json`、锁文件、`postcss.config.mjs`、`next.config.ts`（仅验证 Source Map 保持不变）
- `src/app/page.tsx`、`src/app/layout.tsx`、`src/app/api/mail/send/route.ts`
- `src/features/{home,profile,live2d,mail,pwa}/`（迁移后的领域入口）
- `src/components/page/profile/introduction/description/text-developer.tsx`
- `src/components/ui/{image,highlighter}`（删除）
- `src/utils/customCursor.ts`（迁移后优化）
- `public/sw.js`、`public/fonts/`

## 验证与验收

1. **静态与构建**：全库搜索无已删除引用；干净安装依赖；类型检查和生产构建通过；重复冷/热构建并与基线比较。
2. **产物**：确认 Shiki/WASM 请求和产物消失，First Load JS 不增加；生产 `.map` 仍生成且可定位源码，`productionBrowserSourceMaps: true` 不变。
3. **页面**：桌面/移动端检查排版、字体、图片、背景、动态文字、进入/退出动画、页脚 Tooltip 键盘与触屏行为。
4. **邮件**：覆盖首次点击打开、长度/格式校验、成功、部分成功、失败、429、重复提交，确认 SW 更新不触发中途刷新。
5. **Live2D**：验证 WebGL 初始化、静态头像回退、页面隐藏/恢复、context lost/restored 和资源销毁。
6. **PWA**：验证首次访问后离线主页、受控回访、缓存升级、旧缓存清理和 API 不缓存。
7. **性能**：对比首屏与累计流量、构建耗时、LCP/CLS/INP；任何功能或核心指标回归都先修复，再提交最终变更。
