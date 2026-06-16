# contexts/

React Context Providers。当前只有 3 个，**不要随意新增** —— 跨组件共享状态先看能不能合到既有 context。

## 现有 Context

### `AppContext.tsx` — 全局应用状态

`<AppProvider>` 在 `_app.tsx` 里包住整个站点，组合 6 个 hook：

- `useAnimationSequence` — 加载序列
- `usePowerSystem` — 电量、放电、反转模式
- `useRealtimeStats` — 时钟 / 在线时长 / 访问时长
- `useFateTypingEffect` / `useEnvParamsTypingEffect` — 打字机
- `useColumnHover` — 五列 HUD hover

外部消费：`const { powerLevel, isInverted, ... } = useApp();`

**新增全站状态首选合到这里**，而不是新建 context。组合的 6 个 hook 顺序按依赖关系排列，加新依赖前看清楚 hook 之间是否有引用。

### `TransitionContext.tsx` — 页面转场 + BACK 行为

提供：

```ts
{
  navigateTo(url, options?),       // 替代 router.push，带转场动画
  setBackOverride(handler | null), // 详情页/lightbox 注册自定义 BACK
  handleBack(),                    // 触发 BACK：先尝试 override，否则回 home
  isDetailOpen(),                  // 判断当前是否有 BACK override
}
```

**所有内部跳转必须走 `navigateTo`**：

- 直接 `router.push` 跳过转场动画与 home↔content 的列收展，会造成视觉跳变。
- 浏览器原生前进/后退（popstate）由 router 自己处理；`TransitionProvider` 内部监听 `routeChangeComplete` 自动 expand 列。

详情页（lightbox / gallery / Explain 浮层）通过 `setBackOverride(() => closeMe())` 接管 BACK；卸载或关闭时务必 `setBackOverride(null)`。

#### 转场分支（`navigateTo` 内部）

按当前页 vs 目标页选不同动画：

- home → 非 home：列收回 → 透明度 0 → push → 滑入。
- 非 home → home：滑出 → push → 列展开。
- → blog 详情：透明度 0 → push → routeChangeComplete 后透明度 1（**特殊路径**：blog 详情页本身有进入动画，不要再叠滑动）。
- 其余：标准滑出 → push → 滑入。

加新页面/新分支前先评估能不能复用既有路径，避免转场动画矩阵爆炸。

### `LayoutAnchorsContext.tsx` — 锁定布局下的滚动容器登记

`MainLayout` 把内容区固定为锁定高度（防止整页溢出），所以 `scrollIntoView` 等需要明确滚动容器。`registerScrollContainer(el)` 由滚动主体注册，`getScrollContainer()` 由想触发滚动的子组件读取。

> 不要直接调 `document.scrollingElement` —— 在锁定布局里它不是真正在滚动的元素。

## 不该新建 Context 的情况

- **只在某个组件子树里用** → 用普通 prop drill 或就近抽 hook。Context 强制重渲染整个 consumer 树，开销不低。
- **频繁更新的高频值（鼠标位置、电量百分比的 60fps tick）** → 走 ref + 直接写 DOM，参考 `CustomCursor` / `LeftPanel` 头像视差模式。塞进 context 会触发整树重渲。
- **存储型数据（持久化偏好）** → 加到 `usePowerSystem` / 新建一个 hook 然后合到 `AppContext`，不要再开 context。

## 添加新 Provider

如果确认必须新建（极少见）：

1. 文件 `contexts/<Name>Context.tsx`，命名 `<Noun>Context` + `use<Noun>` hook。
2. Default value 必须是合法的 fallback（不是 `null!` / undefined），让消费者在没 Provider 时也不崩。
3. 在 `_app.tsx` 里嵌套到 `AppProvider` 与 `TransitionProvider` 之间还是外面，按依赖关系决定。
4. Provider 内部如果要管副作用（监听、轮询），cleanup 一定要写完整。
