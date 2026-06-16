# ARSVINE REALM

ARSVINE REALM 是一个个人作品集与博客站点，基于后末日科幻 HUD 视觉语言构建。展示项目作品、经历、生活记录、博客文章、推文、友情链接与联系方式，同时保留音乐播放器、页面转场、WebGL/Three.js 氛围效果与受保护文章的 TOTP 访问门禁等交互能力。

![Preview](./docs/preview.png)

## 项目状态

- **项目性质**：个人站点（非模板）
- **站点名称**：`ARSVINE REALM`
- **作者**：`Arsvine Zhu`
- **技术基线**：Next.js 16 Pages Router、React 18、TypeScript、SCSS Modules、Three.js、GSAP、MDX、`next-intl` 4、Vitest、自定义 Node.js server
- **运行要求**：Node.js `24.x`（与 Vercel Project 设置保持一致；本地 Node 20.9+ 仍可运行，仅作为兼容下限）
- **三语 UI**：`zh-CN`（默认）、`zh-TW`、`en`，所有用户可见路由位于 `/<locale>/...` 之下
- **测试**：使用 Vitest（jsdom 环境），核心算法层（`lib/blog-client`、`lib/blog-post-state`、`lib/content/access-api`、`lib/tesseract-geometry`）有单元测试

## 功能概览

- **HUD 风格首页**：五列导航入口，进入 works、experience、blog、life、contact/about 等内容区。
- **动画页面转场**：`TransitionContext` 统一处理页面切换，导航必须使用 `useTransition().navigateTo()`，避免直接 `router.push()` 破坏转场。
- **内容聚合页**：`/<locale>/content` 把主要内容以 hash 分区方式集中展示。
- **作品/生活详情**：`/<locale>/web/[id]`、`/<locale>/life/[slug]` 支持图文详情与可复制关键词。
- **博客系统**：`/<locale>/blog/[slug]` 走 SSG + `fallback: 'blocking'` + ISR `revalidate: 300`。文章内容默认从私有 GitHub 仓库 (`GITHUB_OWNER/REPO`) 运行时加载；未配置环境变量时回落到仓库内 `content/blog/init/` 这篇兜底文章。
- **受保护文章（TOTP）**：文章可标记 `access: { mode: 'totp', group }`。详情页 SSG **不下发任何正文**（`mdxSource: null` + 脱敏 meta），客户端通过 `/api/grant-check` 探测授权，未授权则呈现 6 位验证码门禁；POST `/api/protected-verify` 通过后由 `/api/post-variant` 单独取正文。
- **推文（Tweets）**：`/<locale>/tweets` 从独立私有仓库分页拉取，按月归档。
- **多语言文章**：每篇文章可单独提供 `zh-CN | zh-TW | en | ja | ru | fr` 多版本，缺失时回落到 `defaultLocale` 并在页面顶部显示翻译状态横幅。
- **音乐播放器**：播放列表集中在 `data/music.ts`，音频托管在腾讯云 COS（`cdn.arsvine.com`）。
- **一言代理**：`/api/hitokoto` 服务端代理 `v1.hitokoto.cn`，进程内 60s 缓存、5s 超时；首页打字机以「1 轮预设 + 1 句一言」交替循环。
- **版权与许可页**：`/<locale>/copyright`（双语展示源码 MIT、内容 CC BY-NC-ND 4.0）；`/<locale>/license` 永久重定向到 `/copyright`。
- **SEO / 订阅文件**：`/sitemap.xml`、`/<locale>/rss.xml`、`/robots.txt` 根据站点配置动态生成。
- **桌面 3D 效果**：`RainMorimeEffect` 与 `TesseractExperience`（基于 `@react-three/cannon` 物理引擎）通过 dynamic import 禁用 SSR，仅在客户端运行。

## 快速开始

```bash
npm install
cp .env.example .env.local
npm run dev
```

打开 `http://localhost:3000` —— 中间件会按 cookie / Accept-Language 把根路径重定向到带 locale 前缀的页面（默认 `/zh-CN`）。

> 开发和生产都使用自定义 `server.js`（精简的 Next.js 包装器，含 graceful shutdown）。`npm run dev` / `npm start` 默认走 `server.js`；不要替换为 `next dev` / `next start`。

## 常用命令

```bash
npm run dev        # 启动自定义开发服务器：node server.js
npm run build      # 生产构建：next build
npm start          # 生产服务器：cross-env NODE_ENV=production node server.js
npm run lint       # ESLint flat config：eslint .
npm run typecheck  # TypeScript 类型检查：tsc --noEmit
npm run test       # 单测：vitest run（一次性，无 watch script）
```

跑单个测试文件：`npx vitest run path/to/file.test.ts`，或按用例名筛选：`npx vitest run -t "name pattern"`。`vitest.config.ts` 用 `jsdom` 环境，匹配 `**/*.test.ts`。测试文件就近放在 `lib/` 下与源文件同级。

## 本地开发与 COS Referer

腾讯云 COS 的 Referer 白名单只放行 `arsvine.com` / `*.arsvine.com`，localhost 与空 Referer 均被拒绝。本地开发要让 `cdn.arsvine.com` 的媒体资源正常加载，需要将 `dev.arsvine.com` 映射到本机。

双击 [scripts/dev-host-setup.cmd](scripts/dev-host-setup.cmd)（支持参数 `-HostsOnly` / `-Remove`）会自动完成：

1. 自提升到管理员（UAC 弹窗）
2. 写 `127.0.0.1  dev.arsvine.com` 到 Windows hosts 文件（首次备份 `hosts.bak.<日期>`）
3. 如果系统代理已开启，临时把 `dev.arsvine.com` 加入当前用户的 `ProxyOverride`
4. 启动 `npm run dev`（端口 3000）
5. Ctrl+C 退出时自动停 dev server、恢复 proxy bypass、回退 hosts 条目、`ipconfig /flushdns`

手动单向操作：

```bash
.\scripts\dev-host-setup.cmd -HostsOnly    # 只写 hosts，不启动 dev server
.\scripts\dev-host-setup.cmd -Remove       # 清理 dev.arsvine.com hosts 条目
```

> ⚠️ 脚本会修改 `C:\Windows\System32\drivers\etc\hosts`，并在系统代理开启时临时更新当前用户的 `ProxyOverride`。必须管理员权限。被 X 强关导致 hosts / proxy bypass 残留时用 `-Remove` 清理。

浏览器打开 `http://dev.arsvine.com:3000` 后 Referer 变为 `dev.arsvine.com:3000`，COS 放行。

## 开发脚本

| 脚本 | 用途 |
|---|---|
| `scripts/dev-host-setup.cmd` / `.ps1` | 本地开发 hosts 管理 + dev server 启动（COS Referer 白名单适配）。双击 `.cmd` 使用，自提升 UAC。 |
| `scripts/convert-images.mjs` | 批量图片格式转换（webp/jpg/png/avif），输出到 `scripts/images/out/`。详见 [scripts/images/README.md](scripts/images/README.md)。 |
| `scripts/regen-favicons.mjs` | 从透明源图重新生成全套 favicon（替换 `public/` 中所有 icon 文件）。 |
| `scripts/jpg-to-transparent-png.mjs` | 去掉白底（alpha unmix 算法），把白底 jpg 转为透明 PNG。 |
| `scripts/make-white.mjs` | 把透明 PNG 平铺成白底（某些 OG / Twitter 卡片预览底色用）。 |
| `scripts/fetch-google-fonts.mjs` | 从 `data/site.ts` 读取 Google Fonts URL，抓取 CSS、下载所有 woff2、改写 url() 指向 `cdn.arsvine.com/fonts/`，输出到 `public/_fonts-staging/`（gitignored）。**生产分发用腾讯云 COS 网页控制台手动上传，不使用 coscli。** 详见下文「自托管 Google Fonts」。 |

## 自托管 Google Fonts（`cdn.arsvine.com/fonts/`）

国内访问 `fonts.googleapis.com` 不可达，所以全部访客统一走自有 CDN（腾讯云 COS 香港 Bucket `arsvine-cdn`，CNAME 为 `cdn.arsvine.com`）。流程：

1. **改字体配置**：编辑 [data/site.ts](data/site.ts) 中的 `siteConfig.fonts.googleStylesheet`（标准 Google Fonts URL，写入要用到的 family/weight）。
2. **本地抓取 + 改写 CSS**：
   ```bash
   node scripts/fetch-google-fonts.mjs
   ```
   脚本会用现代 Chrome User-Agent 拉 Google CSS（否则 Google 返回更大的 `.ttf`）→ 下载所有 `.woff2` → 把所有 `url()` 改写为 `cdn.arsvine.com/fonts/<family>/<file>` → 写入 `public/_fonts-staging/`（已 gitignore）。
3. **上传到 COS（腾讯云控制台网页操作，不使用 coscli）**：
   - 控制台 → 桶 `arsvine-cdn` → 进入 `fonts/` 目录
   - 用「文件夹上传」把 `public/_fonts-staging/` 下的 `google-fonts.css` 与 woff2 子目录上传，保持目录结构
   - 给 `google-fonts.css` 设置自定义 Header（文件详情 → 编辑元数据）：
     - **Key**：`Content-Type` **Value**：`text/css; charset=utf-8`
     - **Key**：`Cache-Control` **Value**：`public, max-age=86400, must-revalidate`
   - 批量选中所有 woff2 → 编辑元数据：
     - **Key**：`Content-Type` **Value**：`font/woff2`
     - **Key**：`Cache-Control` **Value**：`public, max-age=31536000, immutable`

⚠ **必须避开的坑（曾经踩过）**：自定义 Header 的 **Value 字段只写值**，不要带 `Cache-Control: ` 这种前缀。否则 COS 实际响应头会变成 `Cache-Control: Cache-Control: public, ...`，Firefox 拒绝渲染字体，繁体或低频简体字会 fallback 到系统字体显示为方块。

✅ **Variable Font 复用是正确行为**：Google Fonts 复合请求（如 `wght@300;400;500`）返回的 CSS 里多个 `@font-face` 块的 `font-weight:` 值不同但 `src` 都指向**同一个 woff2 文件** —— 这是 Variable Font，单个文件的 `wght` 轴覆盖 200–900 之类的连续范围，浏览器按声明 weight 实时插值。`fetch-google-fonts.mjs` 的 dedup 是按这个机制设计的，**不要**为了"每个 weight 一个文件"去改这个脚本。

校验上传是否成功：

```bash
curl -I -H "Referer: https://arsvine.com/" https://cdn.arsvine.com/fonts/google-fonts.css
# Content-Type 和 Cache-Control 必须各只出现一次
```

## 配置与内容维护

日常维护优先修改 `data/`、`content/`、`public/` 与环境变量，而不是直接改组件逻辑。

### 站点配置

`data/site.ts` 是站点级配置的主要入口（`SiteConfig`），包含：

- 站点名称、作者、邮箱、版权起始年份
- `metaTitle`、`metaDescription`、RSS 描述
- 首页打字机签名（与一言交替循环显示）
- 社交链接
- favicon、Open Graph image、Twitter image
- Google Fonts 链接、preconnect 目标
- `htmlLang`、`og:locale`、RSS language
- `/content`、`/friends`、`/copyright`、`/access` 等页面级 SEO 与标题文案

要让 sitemap、RSS、robots、Open Graph 使用正式域名，请设置：

```env
NEXT_PUBLIC_SITE_URL=https://你的域名
```

也可以在 `data/site.ts` 的 `url` 字段写入默认值；环境变量优先级更高。

### 三语数据

按主题拆分目录，每个主题下三语并列：

```text
data/
  projects/{index.ts, en.ts, zh-TW.ts}
  experience/{index.ts, en.ts, zh-TW.ts}
  life/{index.ts, en.ts, zh-TW.ts}
  skills/{index.ts, en.ts, zh-TW.ts}
  friendLinks/{index.ts, en.ts, zh-TW.ts}
  music.ts
  site.ts
```

`index.ts` 即简中（`zh-CN`），是默认 fallback。`lib/i18n-data.ts` 用显式静态 registry 把每个 (主题, locale) 映射到对应模块——新增 locale 必须同时更新 `i18n/config.ts`、`locales/<locale>.json`、所有 `data/<topic>/<locale>.ts` 与 `lib/i18n-data.ts` 的 registry。**不要**改用动态 `require`，会触发 Critical dependency 告警。

UI 文案集中在 `locales/{zh-CN,zh-TW,en}.json`，由 `next-intl` 通过 `useTranslations()` 调用。

### 字体使用规范

样式中字体通过 CSS 变量调用，定义在 [styles/globals.scss](styles/globals.scss)：

| 变量 | 字体 | 用途 |
|---|---|---|
| `--font-display` | `ZELDA Free` | 装饰性英文 HUD 标题。**仅支持基础拉丁字母，不含 CJK、不完整支持带音标拉丁（法语 é è à 等）**。绝不要用在博客标题、用户内容、需要国际化的位置。 |
| `--font-hud` | `Dosis` | HUD 数字、标签、博客标题等通用无衬线场景。Variable Font，wght 轴覆盖 200–800。 |
| `--font-reading` | `Noto Serif SC` 栈 | MDX 博客正文。Variable Font，wght 轴覆盖 200–900。 |
| `--font-typewriter` | Courier 栈 | 打字机效果、等宽场景。 |

> 历史教训：博客标题原本用 `--font-display`（ZELDA Free），后来发现法语字符（`é`、`à` 等）都成方块，遂迁回 `--font-hud` 500 字重。新增任何接收任意语言内容的标题/正文，**不要**直接用 `--font-display`。

### 博客与 Posts 系统

博客文章默认从**外置私有 GitHub 仓库**运行时加载（通过 GitHub Contents API + `Accept: application/vnd.github.raw`），见 [lib/content/github.ts](lib/content/github.ts)。所需环境变量：

```env
GITHUB_OWNER=ArsvineZhu
GITHUB_REPO=arsvine-content
GITHUB_BRANCH=main
GITHUB_READ_TOKEN=github_pat_xxx
```

外置仓库结构：

```text
arsvine-content/
├── blog/
│   ├── index.json                  # ContentBlogIndex（slug、tags、access、availableLocales、variants）
│   └── <slug>/
│       ├── zh-CN.mdx
│       ├── zh-TW.mdx
│       ├── en.mdx
│       ├── ja.mdx                  # 仅文章可见的语言（可选）
│       ├── ru.mdx                  # 同上
│       └── fr.mdx                  # 同上
└── ...
```

未配置上述环境变量时，仓库会回落到仓库内 `content/blog/init/` 这一篇兜底文章。新仓库克隆下来不需要外置仓库即可看到完整首页 + 一篇示例文章。

UI 三语 `zh-CN | zh-TW | en` 在 [i18n/config.ts](i18n/config.ts) 定义；当请求的 UI 语言下没有对应 mdx 时，[lib/blog.ts](lib/blog.ts) 会回落到 `zh-CN` 并把 `translationStatus` 标为 `'fallback'`，详情页顶部出现回落提示横幅。`ja | ru | fr` 是仅文章可见的语言，详情页里通过文章语言切换器手动切换；UI 仍保持用户当前选择。

frontmatter 字段：

```mdx
---
title: "文章标题"
date: "2026-01-01"
updated: "2026-01-05"   # 可选；RSS / sitemap 用 updated ?? date
excerpt: "一段简短摘要"
tags: ["tag-a", "tag-b"]
pinned: false           # 可选；置顶到列表最前
originLocale: zh-CN     # 可选；该 locale 文件是否为「源语言原文」
---

正文使用 Markdown / MDX 编写。
```

> **不要**手写 `readingTime`：[lib/blog.ts](lib/blog.ts) 在解析时调用内置 `estimateReadingMinutes()`（CJK 200 cpm + 拉丁 115 wpm 慢读节奏）。**不要**重新引入 `reading-time` npm 包，它按空格分词，CJK 文章一律返回 `1 min`。

#### 受保护文章（TOTP 门禁）

在 `blog/index.json` 的某篇 `access` 字段里设置 `{ mode: 'totp', group: 'friends-a' }`，并在 `.env.local` 注册对应分组的 TOTP 配置：

```env
ACCESS_GRANT_SECRET=<长随机串>
TOTP_GROUPS_JSON={"friends-a":{"current":"JBSWY3DPEHPK3PXP","period":30,"digits":6,"window":1}}
```

`current` 是 base32 编码的 TOTP secret；`previous` 是过去 secret 的数组（用于密钥轮换期内宽限），`period`/`digits`/`window` 默认 30/6/1。

授权流程：

1. 用户访问受保护文章 → SSG 只下发脱敏 meta + `mdxSource: null`，详情页显示「正在解码」 loading shell。
2. 客户端请求 `/api/grant-check?group=...` 检查 cookie 授权。
3. 已授权 → 请求 `/api/post-variant?slug=&locale=` 拿正文（仍由服务端 `hasValidAccessGrant` 二次校验）。
4. 未授权 → 详情页就地呈现 6 位 TOTP 输入；POST `/api/protected-verify` 验证通过后写入 access cookie（HMAC 签名，HttpOnly，1h TTL），客户端原地继续加载正文。

直链 `/api/post-variant?slug=<protected>` 在无 cookie 时返回 403；`_next/data/.../<slug>.json` 中**永远**不含正文。

#### 文中注释组件（`<Term>` / `<Explain>`）

[components/mdx/MDXComponents.tsx](components/mdx/MDXComponents.tsx) 注入了两个内联注释组件：

| 组件 | 渲染 | 用途 |
|---|---|---|
| `<Term note="...">word</Term>` | 原生 `<ruby><rt>` —— 注释**永远**显示在词上方 | 专有名词、外语术语、缩写、自造词等需要"小字注音"的场景 |
| `<Explain note="...">phrase</Explain>` | 触发器带虚线下划线 —— 鼠标悬停 / 触屏点击展开浮层 | 句级解释，注释较长、不希望永远占视觉空间时使用 |

```mdx
他在 <Term note="高考语文国卷一">全国 I 卷</Term> 上读到这段材料。

那段时间他成了 <Explain note="一种长期被自我评价过度驱动的精神状态">永远在燃烧的恒星</Explain>。
```

`<Term>` 在不支持 ruby 的浏览器和复制纯文本时退化为 `word(note)`；`<Explain>` 在移动端转为底部固定面板（避免被下方段落遮挡），桌面端就近浮在词的上方/下方。

### 推文（Tweets）

`/<locale>/tweets` 从独立私有仓库分页拉取，按月归档。环境变量：

```env
TWEETS_GITHUB_OWNER=ArsvineZhu
TWEETS_GITHUB_REPO=arsvine-tweets
TWEETS_GITHUB_BRANCH=main
TWEETS_GITHUB_TOKEN=github_pat_xxx
```

可选的 dev 压测开关（用合成数据填满分页 UI，不读真实仓库）：

```env
TWEETS_STRESS_TEST=1
TWEETS_STRESS_YEARS=6
TWEETS_STRESS_MONTHS_PER_YEAR=12
TWEETS_STRESS_TWEETS_PER_MONTH=24
```

### Favicon

图标文件分布在 `public/`：

- `public/favicon.ico` / `public/apple-touch-icon.png` — **留在根目录**，浏览器会盲探这两个路径（书签、社交卡片回退、iOS 添加到主屏幕）
- `public/icons/` — 其余图标（`favicon-16x16.png`、`favicon-32x32.png`、`android-chrome-192x192.png`、`android-chrome-512x512.png`、`site.webmanifest`）

全部从 `public/avatar_transparent.webp`（透明底）重新生成。更换头像后运行：

```bash
node scripts/regen-favicons.mjs
```

如果源文件是白底 jpg，先转透明：

```bash
node scripts/jpg-to-transparent-png.mjs path/to/source.jpg public/favicon-source-transparent.png
# 然后修改 scripts/regen-favicons.mjs 中的 SRC 指向上面这个 png，再运行
```

### 音乐播放器

播放列表位于 `data/music.ts`：

```ts
export const musicPlaylist = [
  {
    title: 'Song Title',
    artist: 'Artist Name',
    src: '/music/example.m4a',
  },
];
```

音频文件托管在**腾讯云 COS**（香港 Bucket `arsvine-cdn`，地域 `ap-hongkong`，公有读私有写），生产通过 `cdn.arsvine.com` 子域直出（DNSPod CNAME → COS 源站，不经腾讯云 CDN）。`data/music.ts` 用 `NEXT_PUBLIC_MEDIA_CDN` 作为前缀拼出最终 `src`：

```env
NEXT_PUBLIC_MEDIA_CDN=https://cdn.arsvine.com
```

环境变量**未设置**时（默认本地 dev），`src` 退回到 `/music/<文件名>`，从 `public/music/` 读取本地文件 —— 把同名音频拖进 `public/music/` 即可离线测试。详见 [public/music/README.md](public/music/README.md)。

> 音频文件已按项目约定不纳入 Git 跟踪。

### 图片远程域名

Next.js `<Image>` 的远程图片白名单集中在：

```text
config/image-hosts.js
```

新增图床或 CDN 域名时，只改这个文件，然后重启 dev server / 重新构建。当前默认放行 `cdn.arsvine.com`（自有图床，腾讯云 COS 香港 Bucket）、`placehold.co`（占位图）以及 `images.unsplash.com` / `source.unsplash.com`。

> 文章 / 内容图片建议走 `next/image` + `unoptimized={true}` 直链 `cdn.arsvine.com`，绕开 Vercel Hobby 的 Image Optimization 配额（1000 张/月），同时避免被 `/_next/image` 二次抓取触发 COS 出站流量。COS 流量包不是限额器，10GB 用完会按量计费，记得到费用中心配预算告警。

### 服务端接口

| 路由 | 用途 |
|---|---|
| `GET /api/hitokoto` | 服务端代理 `v1.hitokoto.cn`；进程内 60s 缓存、5s 超时；上游失败时返回 `502 { error: 'upstream_unavailable' }` |
| `GET /api/grant-check?group=` | 检查访问授权 cookie，返回 `{ ok, granted }` |
| `GET /api/post-variant?slug=&locale=` | 拿单篇文章某个 locale 的正文（保护文章无 cookie 返回 403） |
| `POST /api/protected-verify` | 验证 6 位 TOTP，签发授权 cookie。每 (client-ip, group) 限流 5 次/分钟 |
| `GET /api/tweet-months?offset=&limit=` | 推文按月分页 |
| `POST /api/revalidate` / `/api/revalidate-content` | 由 `REVALIDATE_SECRET` 守护的 ISR 触发器 |

## 环境变量

完整说明见 `.env.example`。常用项：

```env
PORT=3000
NEXT_PUBLIC_SITE_URL=https://example.com

# Umami（可选）
# NEXT_PUBLIC_UMAMI_SRC=https://cloud.umami.is/script.js
# NEXT_PUBLIC_UMAMI_WEBSITE_ID=your-website-id
# NEXT_PUBLIC_UMAMI_DOMAINS=your-domain.com,www.your-domain.com

# 媒体 CDN（可选）
# NEXT_PUBLIC_MEDIA_CDN=https://cdn.arsvine.com

# 私有内容仓库（博客文章；服务器侧）
# GITHUB_OWNER=ArsvineZhu
# GITHUB_REPO=arsvine-content
# GITHUB_BRANCH=main
# GITHUB_READ_TOKEN=github_pat_xxx
# ACCESS_GRANT_SECRET=<长随机串>
# TOTP_GROUPS_JSON={"friends-a":{"current":"JBSWY3DPEHPK3PXP"}}

# 私有推文仓库（服务器侧）
# TWEETS_GITHUB_OWNER=ArsvineZhu
# TWEETS_GITHUB_REPO=arsvine-tweets
# TWEETS_GITHUB_BRANCH=main
# TWEETS_GITHUB_TOKEN=github_pat_xxx

# ISR 触发密钥
# REVALIDATE_SECRET=<长随机串>
```

说明：

- `PORT`：自定义 server 监听端口，默认 `3000`。
- `NEXT_PUBLIC_SITE_URL`：sitemap、RSS、robots、Open Graph URL 都用它。
- `NEXT_PUBLIC_UMAMI_*`：可选 Umami 统计；仅当 `SRC` 存在时才注入 `<script>`。脚本注入位置在 `pages/_document.tsx`，固定附带 `defer` / `data-do-not-track="true"` / `data-exclude-search="true"`。
- `NEXT_PUBLIC_UMAMI_DOMAINS`：可选，逗号分隔的域名白名单（不带协议）。设置后 Umami tracker 只在这些域名下上报，`localhost` 与 Vercel preview 自动跳过。
- `NEXT_PUBLIC_MEDIA_CDN`：未设置时音乐播放器从 `/public/music/` 读取本地文件。
- `GITHUB_*` / `ACCESS_GRANT_SECRET` / `TOTP_GROUPS_JSON`：博客系统三件套，缺任何一个就会回落到仓库内 init 文章。
- `TWEETS_GITHUB_*`：推文系统；未配置时 `/tweets` 显示 unavailable 文案。
- `REVALIDATE_SECRET`：未设置时 `/api/revalidate*` 返回 401，等同关闭 ISR 触发。

### Umami 事件埋点（可选）

注入脚本后页面浏览（pageview）会自动统计。若需要记录自定义事件，直接在元素上加 `data-umami-event` 属性即可：

```tsx
<a
  href={siteConfig.social.github}
  data-umami-event="Click Social"
  data-umami-event-platform="github"
>
  GitHub
</a>
```

也可以在脚本里手动调用：

```ts
window.umami?.track('Open Life Item', { item: 'arknights' });
```

事件名长度上限 50 字符；属性是任意键值。本仓库未在组件中预置任何事件标签，按需追加即可。

## 路由结构

| 路由 | 说明 |
|---|---|
| `/<locale>` | 首页五列导航 |
| `/<locale>/content` | 聚合内容页，hash 分区（`#works`、`#experience`、`#blog`、`#life`） |
| `/<locale>/{works,experience,life,friends,about,contact}` | 主题分区/独立页 |
| `/<locale>/tweets` | 推文按月归档（私有仓库分页拉取） |
| `/<locale>/blog` | 307-replace 到 `/<locale>/content#blog` |
| `/<locale>/blog/[slug]` | MDX 博客详情（SSG + ISR；保护文章走 TOTP 门禁） |
| `/<locale>/posts` / `/<locale>/posts/[slug]` | `getServerSideProps` 重定向到 `/content#blog` 与 `/blog/[slug]`（旧 URL 别名） |
| `/<locale>/web/[id]` | 作品详情 |
| `/<locale>/life/[slug]` | 生活详情 |
| `/<locale>/access/[group]` | 独立 TOTP 验证页（重定向后回原 `next` 路径） |
| `/<locale>/copyright` | 版权与许可（MIT + CC BY-NC-ND 4.0） |
| `/<locale>/license` | 永久重定向到 `/copyright` |
| `/<locale>/rss.xml` | 当前 locale 的 RSS（`getServerSideProps`） |
| `/sitemap.xml` | 站点 sitemap（多 locale） |
| `/robots.txt` | 动态生成 robots |

裸路径（`/`、`/contact` 等）由 [proxy.ts](proxy.ts) 中间件根据 `NEXT_LOCALE` cookie / `Accept-Language` / 默认 locale 308 跳到带前缀的 URL。**不要**改成 IP-based 地理映射。

## 项目结构

```text
├── components/          # 页面组件、布局、交互组件、视觉效果
│   ├── cards/           # 各类卡片
│   ├── detail/          # 详情页内嵌块
│   ├── effects/         # WebGL/Three.js（RainMorimeEffect、TesseractExperience）
│   ├── interactive/     # CustomCursor、MusicPlayer、ActivationLever 等
│   ├── layout/          # MainLayout、LeftPanel、GlobalHud、RouteLoadingOverlay
│   ├── mdx/             # MDXComponents、Term、Explain
│   ├── posts/           # 文章相关 UI 块
│   ├── sections/        # 内容聚合页的各分区组件
│   └── shared/          # 跨页面共享
├── config/              # Next.js 等运行配置外置片段（image-hosts 等）
├── content/blog/init/   # 仓库内兜底文章（外置仓库不可用时显示）
├── contexts/            # AppContext / TransitionContext / LayoutAnchorsContext
├── data/                # 三语数据 + 站点配置 + 音乐播放列表
├── docs/                # 设计文档 / 交接稿（不在日常维护链路上）
├── hooks/               # 自定义 hooks
├── i18n/                # next-intl 配置
├── lib/                 # 业务逻辑
│   ├── blog*.ts         # 博客解析 / 客户端状态 reducer
│   ├── content/         # 外置内容仓库访问 + TOTP + 授权 cookie + 限流
│   ├── tweets/          # 外置推文仓库访问 + 解析
│   └── ...              # 其他工具
├── locales/             # next-intl 三语 UI 文案
├── pages/               # Next.js Pages Router
│   ├── api/             # 服务端接口
│   └── [locale]/        # 用户可见路由
├── proxy.ts             # Next.js 中间件（locale + geo）
├── public/              # 静态资源、图片、音乐目录、字体 staging（gitignored）
├── scripts/             # 开发脚本（图片处理、字体抓取、hosts 管理、favicon 生成）
├── styles/              # SCSS Modules 与共享 partials
├── types/               # TypeScript 类型定义
└── server.js            # 自定义 Next.js server（精简包装器，含 graceful shutdown）
```

## 技术栈

- Next.js 16（Pages Router）
- React 18
- TypeScript
- SCSS Modules / Sass
- next-intl 4（三语 UI）
- Three.js / `@react-three/fiber` / `@react-three/drei`
- `@react-three/cannon` + `cannon-es`（Tesseract 物理模拟）
- GSAP
- MDX / `next-mdx-remote`
- Vitest（jsdom）
- Node.js custom server（精简的 Next.js 包装器）
- ESLint flat config + `eslint-config-next/core-web-vitals`

## 开发注意事项

- 项目使用 Pages Router，不使用 App Router。
- `server.js` 是运行入口；不要改成 `next dev` / `next start`。
- 全局状态主要来自 `contexts/AppContext.tsx` 与 `contexts/TransitionContext.tsx`。
- 动画、3D、打字机、鼠标交互区域可能触发 React Compiler lint warnings；除非有明确问题，不要为了消除 warning 大范围重写工作交互。
- 修改可配置内容时优先找 `data/*.ts`、`config/*.js`、`.env.example`、`locales/*.json`。
- 提交前至少跑 `npm run lint`、`npm run typecheck`、`npm run test`。Vitest 覆盖了核心算法层（博客状态机、阅读时长估算、Tesseract 几何、TOTP 授权 API 边界）；UI 层无单测。

### 已知的坑（曾踩过，不要再来一遍）

- **`--font-display`（ZELDA Free）只支持基础拉丁字母**。法语带音标字符、中文都会丢字成方块。新增标题、列表项、博客字段、用户输入文案，一律用 `--font-hud` 或 `--font-reading`。
- **COS 自定义 Header 的 Value 字段只写值**，不要加 `Cache-Control: ` 这种前缀。否则响应头变成 `Cache-Control: Cache-Control: ...`，Firefox 拒绝字体并 fallback 到系统字体，繁体/低频字成方块。
- **不要重新引入 `reading-time` npm 包**。它按空格分词，CJK 全部估算为 1 分钟。已用内置 `estimateReadingMinutes()` 替代。
- **Variable Font 复用是 Google Fonts 的设计行为**，不是 bug。`fetch-google-fonts.mjs` 的 dedup 逻辑按此设计。看到不同 `font-weight:` 块指向同一个 woff2 文件不要"修"。
- **本项目不使用 `coscli`**。任何说"运行 `coscli sync`"的旧文档/旧脚本注释都是过时的。CDN 上传一律走腾讯云 COS 网页控制台。
- **导航必须用 `useTransition().navigateTo()`**，不要直接 `router.push()`，否则页面转场动画会被破坏。
- **移动端 section anchor 必须有 `scroll-margin-top: var(--mobile-section-scroll-offset)`**，否则 hash 跳转或 `scrollIntoView` 标题会被顶部 HUD 遮挡。已在 [styles/_sections.scss](styles/_sections.scss) 给主要 section 加好；新增分区别忘了。
- **根路径语言判定顺序**：`NEXT_LOCALE cookie > Accept-Language > zh-CN`。不要改成基于 IP 的地理映射。
- **保护文章导航路径下两个独立的竞态都要保留修复**（详见 [CLAUDE.md](CLAUDE.md) 的「Common Gotchas」段）：(1) `useBlogPostState.ts` 的 auth-probe `useEffect` 必须 `state.authState` 入依赖且只在 `'checking'` 时执行；(2) `lib/blog-post-state.ts` 的 `authResolved` 必须在 *granted* 与 *required* 两个分支都清掉 `activeRequestKey` / `loadingLocale`。
- **首页 `RouteLoadingOverlay` 版式按源页面判定，不按目标页面**。`useRouteLoadingKind(router)` 读 `router.pathname` 决定 `'standalone'` vs `'default'`。home → blog 用 default（左侧 nav 仍可见），blog → blog 用 standalone（左侧 panel 已隐藏）。改成 target-based 必然破坏其中一个方向。
- **Avatar 视差 transform 必须用 `!important`**。`revealLogo` keyframe 用 `forwards` 锁住了 `transform: scale(1)`；mousemove rAF 通过 `style.setProperty('transform', ..., 'important')` 才能盖住它。

## 部署

```bash
npm run build
npm start
```

或使用进程管理器：

```bash
pm2 start server.js --name arsvine-realm
```

部署时建议设置：

```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://你的域名
```

## 许可证与来源

本项目基于 RainMorime 风格作品集代码演进，并已调整为 ARSVINE REALM 个人站点。

- **源代码**：[MIT License](./LICENSE)
- **原创内容**（文章、图片、笔记、设计等）：[CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/)

完整双语条款见站内 [`/copyright`](https://arsvine.com/copyright)。
