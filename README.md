# 张文涛 · 个人博客

基于 Next.js（App Router）+ UnoCSS 的个人博客，内容为随笔、生活与影像。全站中文使用思源宋体（本地化分片加载），支持深浅色主题、站内搜索、RSS 与自动生成的 Open Graph 分享卡。

## 目录结构

```
├── app/                      # App Router 路由与页面
│   ├── [slug]/               # 文章页（含 opengraph-image 自动分享卡）
│   ├── api/wechat-sign/      # 微信 JS-SDK 签名接口（可选启用）
│   ├── page/[page]/          # 文章分页
│   ├── tags/                 # 标签页
│   ├── fonts.css             # 本地化字体的 @font-face（由脚本生成）
│   ├── layout.tsx            # 根布局与全局元数据
│   └── uno.css               # 全站样式（Menca 主题迁移 + 设计令牌）
├── components/
│   ├── layout/               # 页头页脚、主题切换、搜索、滚动/分享等布局组件
│   ├── post/                 # 文章卡片、列表、分页、相关阅读
│   └── ui/                   # 图片、Markdown、灯箱、空状态等通用组件
├── content/posts/            # 文章（Markdown + front matter）
├── lib/                      # 内容读取、格式化、OG 字体加载等
├── public/
│   ├── assets/posts/         # 文章配图
│   └── fonts/noto-serif-sc/  # 本地化的思源宋体分片
├── scripts/
│   ├── fetch-fonts.mjs       # 下载思源宋体分片并生成 fonts.css
│   └── gen-static.ts         # 构建前生成 search.json 与 feed.xml
└── types/                    # 第三方库类型补充
```

## 开发

```bash
bun install
bun run dev          # http://localhost:3000
```

## 构建与部署

```bash
bun run build        # 构建前自动生成 search.json 与 feed.xml
```

部署到 Vercel 时站点地址自动识别（`VERCEL_URL`）；使用自定义域名时设置环境变量 `NEXT_PUBLIC_SITE_URL`。

## 写文章

在 `content/posts/` 新建 `YYYY-MM-DD-slug.md`：

```markdown
---
title: 文章标题
date: 2026-01-01
description: 摘要（用于列表与 SEO）
image: /assets/posts/xxx.jpg
tags: [标签1, 标签2]
video_embed: https://player.bilibili.com/...   # 可选，视频文章
---

正文使用 Markdown……
```

## 字体

全站中文使用思源宋体（400/700/900），字体分片已本地化至 `public/fonts/`，运行时零外部请求。更换字重或字体时编辑 `scripts/fetch-fonts.mjs` 顶部配置并重新运行：

```bash
bun scripts/fetch-fonts.mjs
```

## 环境变量（全部可选）

| 变量 | 说明 |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | 自定义域名（留空自动识别） |
| `WECHAT_APPID` / `WECHAT_APPSECRET` | 微信 JS-SDK 分享（需公众号 + JS 安全域名） |

配置模板见 `.env.example`。
