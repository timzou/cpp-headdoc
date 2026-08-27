# 发布与 CI

## 本地验证顺序

项目使用 Node.js 24。安装依赖后按以下顺序执行：

```bash
npm ci
npm run check
npm run lint
npm run test:unit
npm run compile
npm run test:integration
npm run package
```

Ubuntu 的 VS Code 集成测试需要虚拟显示器：

```bash
xvfb-run -a npm run test:integration
```

## VSIX

```bash
npm run package
```

脚本会编译扩展、创建 `release` 目录，并生成 `release/cpp-header-doclens-0.1.0.vsix`。安装验证：

```bash
code --install-extension release/cpp-header-doclens-0.1.0.vsix
```

## GitHub Actions

`.github/workflows/ci.yml` 在 `windows-latest` 与 `ubuntu-latest` 上使用 Node 24，并依次执行：

1. `npm run check`
2. `npm run lint`
3. `npm run test:unit`
4. `npm run compile`
5. `npm run test:integration`（Ubuntu 通过 `xvfb-run -a`）
6. `npm run package`

每个矩阵任务都会上传 `release/*.vsix`，产物名称包含运行平台，便于下载对应构建包。
