# Dependabot 精确版本发布时间例外设计

## 目标

在不关闭 pnpm 24 小时最小发布时间保护的前提下，立即验证 Dependabot PR #35 和 #39。仅对阻塞这两个 PR 的明确版本临时放行，其他依赖继续执行原有供应链策略。

## 配置变更

在 `pnpm-workspace.yaml#minimumReleaseAgeExclude` 保留现有 `cos-nodejs-sdk-v5@3.0.0`，并临时加入：

- `next-intl@4.13.2`
- `icu-minify@4.13.2`
- `next-intl-swc-plugin-extractor@4.13.2`
- `use-intl@4.13.2`
- `eslint@10.7.0`

不改变 Node 24、pnpm 11.7.0、全局 minimum release age、lockfile 格式或 CodeQL 配置。

## 执行顺序

1. 通过独立 PR 合并精确版本例外，确认 `master` CI、CodeQL 和 Vercel 生产成功。
2. recreate #35，要求两次 GitHub Actions `verify` 和 Vercel Preview 成功后 squash merge，并验证 `master`。
3. recreate #39；若安装后完整 `pnpm check` 与 Vercel Preview 成功则 squash merge，否则确认真实 ESLint 10 兼容性错误并忽略该 major。
4. 等所有列出的版本自然满 24 小时后，通过独立清理 PR 删除这五项临时例外。

## 失败与回滚

- 不使用 `--force`，不扩大版本范围，也不手工修改 Dependabot lockfile。
- 例外 PR 自身若失败则不合并。
- #35 出现真实包级错误时拆分依赖；#39 出现 ESLint 生态不兼容时关闭并忽略 ESLint 10。
- 清理 PR 仅在所有例外版本均已超过 24 小时时执行，防止重新触发 lockfile 策略失败。

## 验收标准

- 例外仅包含上述五个精确版本。
- #35、#39 只有在完整 CI 和 Vercel Preview 成功后才合并。
- 每次合并后 `master` CI、CodeQL 和 Vercel 生产均成功。
- 当前工作区和用户本地文件不被隔离分支修改。
