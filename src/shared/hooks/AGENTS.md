# hooks/

这里仅保留跨 feature 复用的 React hooks 与浏览器交互工具。领域状态应归属对应 feature 的 `model/`：HUD 状态在 `features/hud/model/`，导航状态在 `features/navigation/model/`，博客状态在 `features/blog/model/`。

- 保持 SSR 安全：访问 `window`、`document` 或 `matchMedia` 前必须有客户端守卫。
- 全局事件、计时器和 rAF 都必须在 cleanup 中释放。
- 高频视觉更新优先使用 ref 与 DOM 写入，避免不必要的 React 重渲染。
- 不要将新的跨页面状态加入已删除的 `contexts/`；创建 feature provider 或局部 hook，并由 `app/providers/AppProviders.tsx` 组合。
