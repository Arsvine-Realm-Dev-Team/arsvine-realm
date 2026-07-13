# src/pages/

Next.js Pages Router。**不要换 App Router**。所有用户路由都在 `[locale]/` 下，由 `proxy.ts` 中间件保证。

## 顶层文件

| 文件 | 职责 |
|---|---|
| `_app.tsx` | Next/i18n 适配；Provider 组合在 `src/app/providers/`，Shell 在 `src/app/shell/` |
| `_document.tsx` | `<html lang>`、Open Graph、字体外链、`document-bootstrap` 内联脚本（先于 hydration 设置主题/反转与性能档位，避免闪烁） |
| `sitemap.xml.tsx` | 站点 sitemap（多 locale，hreflang），`getServerSideProps` |
| `robots.txt.tsx` | 动态 robots（指向 sitemap） |
| `rss.xml.tsx` | 顶层 RSS（重定向到默认 locale 的 `/<locale>/rss.xml`） |

## `[locale]/`

```text
[locale]/
├── index.tsx                      # 首页五列
├── content.tsx                    # 聚合页（hash 分区）
├── about.tsx, contact.tsx, ...    # 单页
├── friends.tsx, tweets.tsx, copyright.tsx
├── blog/[slug].tsx                # MDX 博客详情（SSG + ISR + TOTP）
├── web/[id].tsx                   # 作品详情
├── life/[slug].tsx                # 生活详情
├── access/[group].tsx             # 独立 TOTP 验证页
└── rss.xml.tsx                    # 当前 locale 的 RSS
```

## `api/`

只做 HTTP 适配（参数校验、响应码、`res.json`），业务逻辑下沉到 feature 或 `shared/lib/`。

| 路由 | 业务逻辑 |
|---|---|
| `hitokoto.ts` | 一言代理，60s in-process 缓存，5s timeout |
| `grant-check.ts` | `features/blog/server/grantCheckHandler.ts` |
| `post-variant.ts` | `features/blog/server/postVariantHandler.ts` |
| `protected-verify.ts` | `features/blog/server/protectedVerifyHandler.ts` |
| `tweet-months.ts` | `features/tweets/server/tweetMonthsHandler.ts` |
| `revalidate.ts`、`revalidate-content.ts` | ISR 触发，`REVALIDATE_SECRET` 守护 |

## 关键约束

- **路由结构是 `[locale]` 段必带的**。任何新页面（除非是 `_app` / `_document` / `api/*` / 顶层 sitemap/robots）都进 `[locale]/`，由 `proxy.ts` 把裸路径 308 跳进来。
- **`src/pages/` 里不能放测试文件**。这里只允许真实页面、API 路由和框架约定文件；`*.test.*` / `*.spec.*` 必须放在 `tests/` 或非路由源码目录，否则 `next build` 会把它们当成页面或 API 路由扫描。
- **导航通过 `useTransition().navigateTo()`**，不要 `router.push()`。后者会跳过转场动画与 home↔content 的列收展。
- **博客详情用 SSG + `fallback: 'blocking'` + ISR `revalidate: 300`**。新增类似动态详情页时遵循同模式（参考 `[locale]/blog/[slug].tsx`）。
- **保护文章的 `_next/data/.../[slug].json` 不能含正文**：`getStaticProps` 检测到 `access.mode !== 'public'` 时返回 `mdxSource: null` + 脱敏 meta；正文走 `/api/post-variant` 单独取（且服务端二次校验 cookie）。
- **`src/pages/api/*` 必须无副作用就能 build**。`hasContentRepoConfig()` 这样的 env 检查在 feature/server 或 shared/lib 层做，缺配置时返回降级响应而不是构建期 throw。
- **`getServerSideProps` 重定向是合法工具**：当前 `/works`、`/life`、`/about`、`/experience`、`/contact` 使用它进入内容中枢。不要在组件里跑 `useEffect` redirect。

## 添加新页面 / API

页面：

1. 在 `[locale]/` 下新建文件。文件名 = 路径段；动态参数用 `[param]`。
2. 测试按所有权放在 `tests/features/<feature>/`、`tests/app/` 或 `tests/shared/`。
3. 默认 export 是页面组件，按需添加 `getStaticProps` / `getStaticPaths` / `getServerSideProps`。
4. 多语言：用 `useTranslations()` 读 `src/app/locales/<locale>.json`，结构化数据走所属 feature 的 `contracts/data/`。
5. 如果是详情页（左侧 panel 应该隐藏），把 pathname 模板加进 `src/features/navigation/model/useLayoutRouteMode.ts` 与 `src/features/navigation/model/useRouteLoadingKind.ts` 的 standalone 列表 —— 否则 RouteLoadingOverlay 版式判定会错。
6. SEO：用 `<HreflangLinks>` 与 `<Head>`，按 `_app.tsx` 既有模式。

API：

1. `src/pages/api/<name>.ts`。
2. 顶部按方法白名单（GET/POST），未支持时设 `Allow` header + 405。
3. **业务逻辑放 `src/shared/lib/` 或所属 feature**，handler 只解析参数、调 service、序列化响应。
4. 涉及鉴权 → 用 `hasValidAccessGrant(req, group)`；涉及限流 → `src/shared/lib/content/rate-limit.ts` 的 `enforceRateLimit`。
5. `Cache-Control: no-store` 是默认，缓存策略明确才放开。
