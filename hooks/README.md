# hooks/

自定义 React Hooks。命名一律 `use*` camelCase，**默认 default export**，单职责优先。

## 现有 Hook 速查

| Hook | 来源/驱动 | 主要职责 |
|---|---|---|
| `useAnimationSequence` | 时间 + 状态机 | 首页加载序列：loading screen → 列展开 → HUD 入场。被 `AppContext` 组合 |
| `usePowerSystem` | localStorage + Tesseract 交互 | 电量、放电、反转模式；持久化到 `arsvine:power-system` |
| `useRealtimeStats` | `setInterval` | 实时时钟、系统在线时长、当前访问时长（纯前端，无网络） |
| `useTypingEffect` (`useFateTypingEffect` / `useEnvParamsTypingEffect`) | preset + `/api/hitokoto` | 打字机效果。Fate 行交替「预设 1 轮 + 一言 1 句」 |
| `useColumnHover` | 鼠标 hover | 主页五列 HUD 文案切换 |
| `useBlogPostState` | `lib/blog-post-state.ts` reducer | 博客详情页客户端状态机：authChecking → authRequired/granted → loadingVariant → ready。带两个曾出过 bug 的并发竞态防护 |
| `useRouteLoadingKind` | `router.events` + `router.pathname` | 决定 RouteLoadingOverlay 的 `'standalone'` vs `'default'` 版式 |
| `useLayoutRouteMode` | `router.pathname` | 解析当前是 home / content / standalone / 哪个 activeSection |
| `useStandalonePanelState` | 上一项 + leftPanelAnimated | 计算 standalone 页面下 LeftPanel 子组件应否动画 |
| `useDrawerNavigation` | `next-intl` + locale | 移动端抽屉菜单的链接、toggle 状态、a11y label |
| `useMediaQuery` / `useResponsive` | `matchMedia` | 响应式判定。`useResponsive()` 返回 `{ isMobile, isTablet, isDesktop }` |
| `useMobileTesseractCharge` | `setInterval` | 移动端跳过 WebGL，按定时给电池充电 |
| `useGalleryLightbox` | DOM ref + keyboard | 项目/Life 详情页图集 lightbox |
| `useCursorTargetRegistry` | DOM + MutationObserver | CustomCursor 内部使用，扫描 `data-cursor-*` 属性的元素 |
| `useLoadingSystem` | next/image priority | 关键图片预加载（首页 avatar、装饰图） |
| `useVisitorLanguageCode` | `<html data-country>` + `Intl` | 仅为 HUD「来访者语言代码」UI 微调，不参与权限决策 |

## 共同约束

- **不要在 effect 里 `setState` 触发新 effect 形成循环**。React Compiler 的 `set-state-in-effect` 警告就是为此存在；`useTypingEffect` / `useBlogPostState` 等已有的合法模式带 `// eslint-disable-next-line` + 原因注释，跟随同一风格。
- **窗口级监听器**（mousemove / scroll / visibilitychange）必须 `passive: true` 且在 cleanup 中 `removeEventListener`。`AbortController` 也是合法选择。
- **rAF 循环必须可取消**：把 `rafId = requestAnimationFrame(tick)` 的最新 id 存 ref，cleanup 调用 `cancelAnimationFrame(rafId)`。
- **直接写 DOM 而非 setState 是允许的，且推荐**用于 60fps 视觉跟踪（光标、视差、HUD 数字打字）。这是 CustomCursor / GlobalHud / LeftPanel 头像视差的统一模式，避免 React 重渲染开销与 React Compiler 警告。
- **需要 SSR 安全的 hook**（`useMediaQuery`）必须 lazy-init `useState`：`useState(() => typeof window === 'undefined' ? false : ...)`，否则 hydration 会跑 mismatch。
- **持久化** 走 `sessionStorage` / `localStorage`。常量 key 名集中在 `lib/document-bootstrap.ts`（如 `POWER_SYSTEM_STORAGE_KEY`）以便在 `_document.tsx` 的 inline bootstrap 脚本里也能读到。

## 当不该写新 Hook

- **跨多组件共享的状态** → 优先合到 `contexts/AppContext.tsx` 而不是新 hook。`AppContext` 已经组合了六个 hook，加第七个先看能不能复用既有的。
- **只在一个组件里用一次的 effect** → 留在组件里就行，没必要抽 hook；hooks/ 目录是给真正复用的逻辑准备的。
- **业务数据获取** → 进 `lib/`。hooks 只放 React 状态封装。

## 写新 Hook 时

1. 命名 `use<Verb><Noun>` 或 `use<Object>State`。
2. 文件名等于 hook 名，default export。
3. 如果会被 `AppContext` 组合，签名按既有 hook 模式：`(): { ... }` 或 `(opts): { ... }`，避免内部直接读 context（让组合方控制顺序）。
4. 写明返回值类型：宁可显式 interface，也别让 `AppContext.tsx` 处的推导链失控。
