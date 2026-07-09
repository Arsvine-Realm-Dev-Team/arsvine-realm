`cos-workspace/` 是本地 COS 资产工作区。

- `public-root/`：公开资源本地根目录。推荐放 `realm/images/...`、`realm/audio/...`、`shared/fonts/...`
- `private-root/`：私有 catalog 的本地镜像根目录；通常由 `pnpm assets:build` 生成
- `_meta/realm/`：项目元数据输入，不上传 COS

运行：

```bash
pnpm assets:build
```

默认输出：

```text
dist/cos-upload/public-root/
dist/cos-upload/private-root/
dist/local-manifest/manifest.generated.json
```
