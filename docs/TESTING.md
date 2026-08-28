# Testing

## 验证环境

- Node.js 24，版本参考仓库 `.nvmrc`。
- VS Code 测试运行版本 `1.134.0`。
- Ubuntu 集成测试需要 `xvfb-run` 提供虚拟显示器。
- CMake 示例使用 CMake 3.20+ 和 C++17 编译器。

## 标准顺序

在项目根目录安装依赖后，按以下顺序执行：

```bash
npm ci
npm run check
npm run lint
npm run test:unit
npm run compile
npm run test:integration
npm run package
```

Ubuntu 执行集成测试：

```bash
xvfb-run -a npm run test:integration
```

## 测试层次

### 类型检查与 Lint

- `npm run check` 使用 `tsc -p tsconfig.json --noEmit` 检查源码和测试的 TypeScript 类型。
- `npm run lint` 使用 ESLint 检查 TypeScript 代码风格、类型规则和 Promise 使用方式。

### 单元测试

`npm run test:unit` 使用 Mocha 和 `tsx`，覆盖：

- Doxygen 注释清理、标签解析和注释边界提取。
- 紧凑内联渲染、彩色参数标记、三档字号、摘要与 Markdown 安全处理。
- LRU 缓存和并发信号量。

### 集成测试

`npm run test:integration` 会编译扩展与集成测试，然后启动 VS Code Extension Host。测试 fixture 提供模拟的文档符号和声明服务，验证：

- 扩展激活。
- 从头文件生成内联文档、CodeLens 摘要和 Hover。
- 按需打开只读 Markdown 预览。
- 声明跳转、头文件编辑刷新、多声明候选排序和环境检查命令。

测试入口为 `test/runIntegration.mjs`，集成用例位于 `test/integration/index.ts`。

### 打包验证

`npm run package` 先编译扩展，再生成 `release/cpp-headdoc-0.2.0.vsix`。VSIX 可用以下命令安装验证：

```bash
code --install-extension release/cpp-headdoc-0.2.0.vsix
```

## CI 矩阵

`.github/workflows/ci.yml` 在 `windows-latest` 与 `ubuntu-latest` 上使用 Node 24，按 `check`、`lint`、`unit`、`compile`、`integration`、`package` 顺序执行。Ubuntu 的 integration 步骤使用 `xvfb-run -a`，每个平台都上传 `release/*.vsix`。

## CMake 示例检查

示例工程可在 WSL/Linux 中执行：

```bash
cmake -S examples/basic-cmake -B /tmp/cpp-headdoc-build -DCMAKE_BUILD_TYPE=Debug -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
cmake --build /tmp/cpp-headdoc-build
```

该工程同时验证头文件 Doxygen、实现定义和 `compile_commands.json` 的工作区布局。
