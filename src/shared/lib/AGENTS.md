# lib/

业务逻辑、SSR/SSG 数据访问、客户端状态机、纯函数工具。**没有 React hooks**（hooks 在 `hooks/`），**没有 UI 组件**（在 `features/` 或 `shared/ui/`）。

## 文件清单

### 博客系统

| 文件 | 职责 |
|---|---|
| `blog.ts` | 服务端：从外置内容仓库读 `blog-index.json` 与 `blog/<slug>/<locale>.mdx`，解析 frontmatter，估算阅读时长 |
| `blog-client.ts` | 客户端 + 服务端共用类型与 URL 构造（`buildBlogPostHref`、`buildPostVariantApiPath`、`getRequestedContentLocaleFromPath` 等） |
| `blog-post-state.ts` | 客户端状态机 reducer + `BlogPostViewState` 联合类型。**所有变体都被 `useBlogPostState` 消费**，不要在组件里直接 `dispatch` |
| `format-reading-time.ts` | 把 `readingMinutes: number` 渲染为 locale-aware UI 字符串（`约 N 分钟` / `約 N 分鐘` / `N min read`） |

### 内容仓库 + 鉴权

| 文件 | 职责 |
|---|---|
| `content/github.ts` | GitHub Contents API 客户端（`Accept: application/vnd.github.raw`）+ 60s in-process 缓存 |
| `content/types.ts` | `ContentBlogIndex`、`ContentPostAccess`、`TotpGroupConfig` 等共享类型 |
| `content/access-grant.ts` | HMAC-签名授权 cookie：`createAccessGrant` / `verifyAccessGrant` / `setAccessGrantCookie`（HttpOnly, 1h TTL） |
| `content/access-api.ts` | `/api/protected-verify` / `/api/grant-check` 的 response 类型 |
| `content/totp.ts` | RFC 6238 TOTP 校验，支持 previous secret window（密钥轮换期内宽限） |
| `content/rate-limit.ts` | in-process 滑动窗口限流，由 `/api/protected-verify` 按 (client-ip, group) 调用 |

### 推文

| 文件 | 职责 |
|---|---|
| `tweets/github.ts` | 共享内容仓库 `tweets/*` 分页拉取 + dev 压测合成数据 |
| `tweets/types.ts` | 推文相关类型 |
| `tweets/parse-explain.tsx` | 推文文本中的 `<Explain>` 标记解析（注意是 `.tsx`，会渲染 React） |
| `tweets/resolve.ts` | 文本翻译/原文展开等的解析逻辑 |

### i18n / 内容数据

| 文件 | 职责 |
|---|---|
| `i18n-data.ts` | 显式静态 registry：(主题 × locale) → 模块。**新增 locale 时必须改这里**。避免动态 `require` 触发 webpack Critical dependency 警告 |
| `cdn.ts` | `cover()` / `gallery()` / `post()` / `avatar()` / `music()` / `font()` helper —— 把对象 key 拼成 `cdn.arsvine.com` 完整 URL，未配置 CDN 时返回相对路径，本地 `public/` 镜像可作为可选 fallback |
| `region-visibility.ts` | 基于访客所在地的 UI 微调（X / Bilibili 等被屏蔽地区隐藏对应外链）。**仅 UI**，不参与权限决策 |
| `document-bootstrap.ts` | `_document.tsx` 注入的内联脚本：在首次绘制前从 storage 读 power state / theme，避免无主题闪烁。包含持久化 key 常量 |
| `ui-timings.ts` | 跨组件共享的动画时长常量（如 `CONTENT_DETAIL_EXIT_DELAY_MS = 1800`） |

### 几何/算法

| 文件 | 职责 |
|---|---|
| `tesseract-geometry.ts` | 4D → 3D 投影几何，`TesseractExperience` 用 |

## 测试

测试位于仓库根目录的 `tests/lib/`。当前覆盖包括：

- `tests/features/blog/blog-client.test.ts` — URL / locale 解析
- `tests/features/blog/blog-post-state.test.ts` — reducer 状态转移（**两个并发竞态修复在这里有回归测试**：`authResolved` 在 granted 分支必须清 activeRequestKey；resetArticle 必须把 authState 拉回 checking）
- `tests/lib/content/access-api.test.ts` — protected-verify response 形状
- `tests/lib/tesseract-geometry.test.ts` — 4D 投影矩阵

`vitest.config.ts` 使用 `jsdom`，匹配 `**/*.test.{ts,tsx}`。运行：

```bash
pnpm test
pnpm vitest run tests/features/blog/blog-post-state.test.ts
pnpm vitest run -t "authResolved"
```

## 写新文件时

- **服务端代码**（读 GitHub、解析 MDX、签 cookie、调外部 API）放这里 ——**不要**进 `pages/api/*` 直接堆，`pages/api` 只做 HTTP 适配（参数校验、响应码、`res.json`），业务逻辑下沉到 `lib/`。
- **跨页面/组件复用的常量**（动画时长、storage key、配额）抽到 `lib/ui-timings.ts` 或新建专用模块；不要在组件文件里散落 magic number。
- **不要把 React hooks 写在这里**。hooks 在 `hooks/`，UI 在 `features/` 或 `shared/ui/`。lib 是非 React 的。
- **测试边界**：算法层（reducer、解析、URL 构造、几何）必须测；I/O 边界（GitHub API、TOTP）按 fixture 思路测；UI 不在 lib 范围内。
