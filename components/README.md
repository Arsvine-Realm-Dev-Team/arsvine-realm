# components/

UI 组件层。**默认 `default export` + 同名命名 export**（pages 全部默认导出，components 内可以混用，详见各组件首行）。SCSS Module 与组件同名同目录。

## 子目录分类

| 目录 | 内容 | 何时往这放 |
|---|---|---|
| `layout/` | `MainLayout`、`LeftPanel`、`GlobalHud`、`NavigationColumns`、`RouteLoadingOverlay`、`SectionPageLayout` | 全站级版式骨架；持久存在、不属于具体内容分区 |
| `sections/` | `WorksSection`、`ExperienceSection`、`BlogSection`、`LifeSection`、`AboutSection`、`ContactSection`、`TweetsSection` | `/<locale>/content` 聚合页的分区块；hash 导航锚点的所有者 |
| `cards/` | `ProjectCard`、`SimpleImageCard` | 列表卡片（必须接受外部 `onClick`、不内嵌路由跳转） |
| `detail/` | `ExperienceDetailView`、`LifeDetailView`、`WorkDetailView` | 进入详情页后的"内容主体"，受 `MainLayout` 的 `isStandalone` 模式管控 |
| `interactive/` | `CustomCursor`、`MusicPlayer`、`ActivationLever`、`Lightbox` | 长生命周期、强交互、对鼠标/触摸/键盘有持续监听的组件 |
| `effects/` | `RainMorimeEffect`、`Tesseract`、`TesseractExperience`、`Noise` | WebGL / Canvas / 装饰特效。**全部** dynamic import + `ssr: false`，且 latched-once（一旦挂载不再卸载） |
| `mdx/` | `MDXComponents`、`Term`、`Explain` | 给 `<MDXRemote components={...}>` 用；不在普通页面内直接调用 |
| `shared/` | `AnimatedTitleChars`、`HreflangLinks`、`LanguageSwitcher`、`LocaleFallbackBanner`、`LazyImage`、`ShinyText` 系列、`Timeline`、`SkillTree`、`HomeLoadingScreen` | 跨多个上层目录复用、无明显"分区/详情/卡片"归属 |
| `posts/` | （目前空，已纳入构建） | 预留给独立文章/Posts 系统的专用 UI；新增前先确认是否属于 `sections/` 或 `shared/` |

## 共享约束

- **导航必须用 `useTransition().navigateTo()`**，不要直接 `router.push()`。详情页的 BACK 行为通过 `useTransition().setBackOverride()` 注册，卸载时清空。
- **WebGL / Three.js 组件**（`effects/`）使用 `dynamic(() => import(...), { ssr: false })`，且通过 `MainLayout` 的 `webglReady` latch 实现"挂载后不卸载"，避免转场时 GPU 上下文销毁。
- **响应式 gate**：通过 `useResponsive()` 的 `isMobile` / `isTablet` / `isDesktop`。需要在 SCSS 里再加一道 `@media (hover: none), (pointer: coarse)` 的 belt-and-suspenders 兜底（典型例子：`LeftPanel` avatar 视差）。
- **Cursor labels**：交互元素通过 `data-cursor-label="..."` 把悬停时 CustomCursor 显示的文本绑定上去；某些状态会动态切换（例如 discharge 拉杆 `FULL CHARGE REQUIRED` ↔ `DISCHARGE`）。
- **Cursor target registry**：动态出现的可交互元素（modal、lightbox、新挂载的 sections）需要触发 `window.dispatchEvent(new Event('arsvine:cursor-targets-dirty'))` 让 `CustomCursor` 重新扫描 hover 目标。`MainLayout` 已在 `router.asPath` 变化时自动派发；自行新建容器时再手动派发。
- **MDX 注解组件**（`Term` / `Explain`）只在 MDX 上下文里通过 `MDXComponents` 注入 — 不要在普通组件中直接 `import` 然后渲染。
- **倒置（inverted）模式**：拉杆触发 `MainLayout` 顶层 `.inverted` 类，子组件通过 `:global(.inverted) &` 选择器或 `useApp().isInverted` 读取。CSS 变量层（`--ark-inverted-*`）优先于在组件里写 if/else。

## 添加新组件

1. 决定属于哪个子目录（参考上表；模糊地带优先 `shared/`）。
2. 文件名 PascalCase，与其 `.module.scss` 同名。
3. 默认导出，命名 export 仅在跨组件复用 helper / 类型时追加。
4. 如属于 `effects/` / `interactive/`，先评估是否需要 SSR-disabled dynamic import。
5. 涉及鼠标 hover label 的，加 `data-cursor-label`，不要 fork CustomCursor 的逻辑。
