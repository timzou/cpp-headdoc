# C++ Header DocLens

从 C/C++ 头文件中的 Doxygen 注释，为 `.cpp`/`.c` 实现提供就近的文档体验：CodeLens 摘要、Hover 详情、只读 Markdown 文档和声明跳转。

当前版本：`0.1.0`

## 功能概览

- 在函数、方法、构造函数和运算符实现上方显示头文件文档摘要。
- 悬停实现中的函数名，查看完整 Markdown 文档。
- 从 CodeLens 打开 `cpp-header-doc` 只读文档视图。
- 从文档视图跳转到选中的头文件声明。
- 解析 `/** ... */`、`/*! ... */`、`///` 和 `//!` 形式的 Doxygen 注释，并展示常用标签：`brief`、`param`、`tparam`、`return`、`retval`、`note`、`warning`、`throws`、`deprecated`、`see`。
- 通过 VS Code 的文档符号和声明提供程序连接 `clangd` 或 Microsoft C/C++ 扩展，适配本地与远程工作区。

## 环境要求

- VS Code `1.134.0` 或更高版本。
- 一个能提供 C/C++ 文档符号与声明跳转的语言服务：`clangd` 或 Microsoft C/C++ 扩展。
- 开发与打包需要 Node.js 24；仓库的 `.nvmrc` 固定了当前开发版本。
- CMake 示例需要 CMake 3.20 或更高版本，以及可用的 C++17 编译器。

DocLens 使用语言服务返回的结果定位实现和声明。它不负责解析编译器选项，也不替代 C/C++ 语言服务。

## 安装与打包

### 安装发布包

在项目根目录执行：

```powershell
code --install-extension release/cpp-header-doclens-0.1.0.vsix
```

也可以在 VS Code 的扩展视图中选择“从 VSIX 安装…”，打开 `release/cpp-header-doclens-0.1.0.vsix`。

### 从源码安装并打包

```powershell
npm ci
npm run package
```

打包结果为 `release/cpp-header-doclens-0.1.0.vsix`。本地安装：

```powershell
code --install-extension release/cpp-header-doclens-0.1.0.vsix
```

`npm run package` 会先生成 `dist/extension.js`，再使用仓库中的 `@vscode/vsce` 创建 VSIX。

## 快速开始

1. 安装并启用 `clangd` 或 Microsoft C/C++ 扩展。
2. 用 VS Code 打开包含头文件和实现文件的工作区。
3. 确认编辑器设置 `editor.codeLens` 为 `true`。
4. 在头文件声明上方添加 Doxygen 注释，在 `.cpp`/`.c` 中打开对应实现。
5. 点击实现上方的 CodeLens 摘要查看完整文档；悬停函数名也可查看文档。
6. 在只读 Markdown 文档的编辑器标题栏选择“Go to Header Declaration”，返回头文件声明。

示例工程位于 `examples/basic-cmake/`。

### 编辑器显示效果

头文件声明维护完整 Doxygen 后，实现上方会出现一条紧凑摘要：

```text
    $(chevron-right) $(book) 启动 FPGA 数据采集 · sampleRate：采样频率，单位为 Hz · channel：采集通道编号 · 返回：启动成功返回 true
bool DeviceController::startAcquisition(int sampleRate, int channel)
```

CodeLens 锚定函数名称列并沿用当前主题的原生样式，形成轻量的内嵌层级。完整段落、参数、返回状态和注意事项由 Hover 与只读 Markdown 文档承载。

VS Code 的公开 CodeLens API 提供单行命令区域，适合快速浏览和点击操作；Markdown 文档视图负责完整排版，使源码位置保持稳定。

## 配置

所有设置使用 `cppHeaderDocLens.*` 前缀，可在工作区或用户设置中配置。完整字段、默认值和取值范围如下：

| 设置 | 默认值 | 说明 |
| --- | --- | --- |
| `cppHeaderDocLens.enabled` | `true` | 启用工作区功能。 |
| `cppHeaderDocLens.showCodeLens` | `true` | 显示实现上方的文档摘要。 |
| `cppHeaderDocLens.showHover` | `true` | 悬停函数名时显示完整文档。 |
| `cppHeaderDocLens.summaryStyle` | `briefAndTags` | `brief`、`briefAndParams` 或 `briefAndTags`。 |
| `cppHeaderDocLens.maxSummaryLength` | `180` | CodeLens 摘要最大 Unicode 字符数，范围 `40`–`500`。 |
| `cppHeaderDocLens.showParametersInCodeLens` | `true` | 在支持参数的摘要样式中显示参数说明。 |
| `cppHeaderDocLens.showReturnValueInCodeLens` | `true` | 在支持标签的摘要样式中显示返回值。 |
| `cppHeaderDocLens.headerExtensions` | `.h`, `.hpp`, `.hh`, `.hxx` | 头文件扩展名；填写时可省略前导点。 |
| `cppHeaderDocLens.sourceExtensions` | `.c`, `.cc`, `.cpp`, `.cxx` | 实现文件扩展名；填写时可省略前导点。 |
| `cppHeaderDocLens.maxCommentSearchLines` | `40` | 向上查找头文件注释的最大行数，范围 `5`–`500`。 |
| `cppHeaderDocLens.debounceMs` | `300` | 文件变化后刷新 CodeLens 的延迟毫秒数，范围 `50`–`5000`。 |
| `cppHeaderDocLens.maxCacheEntries` | `500` | 内存文档缓存最大条目数，范围 `20`–`5000`。 |
| `cppHeaderDocLens.logLevel` | `error` | `off`、`error`、`info` 或 `debug`。输出位于 `C++ Header DocLens` 通道。 |

常用工作区设置示例：

```json
{
  "editor.codeLens": true,
  "cppHeaderDocLens.enabled": true,
  "cppHeaderDocLens.summaryStyle": "briefAndTags",
  "cppHeaderDocLens.maxSummaryLength": 180,
  "cppHeaderDocLens.logLevel": "error"
}
```

命令面板提供以下命令：

| 命令 | 用途 |
| --- | --- |
| `C++ Header DocLens: Refresh` | 立即清空缓存并刷新 CodeLens 与文档视图。 |
| `C++ Header DocLens: Enable/Disable` | 切换当前工作区启用状态。 |
| `C++ Header DocLens: Show Documentation` | 显示光标所在实现的头文件文档。 |
| `C++ Header DocLens: Go to Header Declaration` | 跳转到头文件声明。 |
| `C++ Header DocLens: Check Setup` | 检查当前文件、CodeLens 和语言服务状态。 |

## clangd、Microsoft C/C++ 与 `compile_commands.json`

### 生成编译数据库

CMake 工程建议生成 `compile_commands.json`，让语言服务获得与实际构建一致的编译器、宏和包含目录：

```powershell
cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
cmake --build build --config Debug
```

使用 Ninja 时命令相同；生成器需要由 CMake 和本机工具链共同支持。数据库通常位于 `build/compile_commands.json`。

### clangd

安装 `clangd` 及 VS Code 的 clangd 扩展，并将编译数据库目录传给 clangd：

```json
{
  "clangd.arguments": [
    "--compile-commands-dir=${workspaceFolder}/build"
  ]
}
```

若当前 VS Code 环境没有展开工作区变量，请将该值改为实际的绝对路径。打开实现文件后，可运行 `C++ Header DocLens: Check Setup` 查看语言、函数符号和声明候选数量。

### Microsoft C/C++ 扩展与 MSVC

安装 Microsoft 的 C/C++ 扩展，并将编译数据库或配置提供程序交给它：

```json
{
  "C_Cpp.default.compileCommands": "${workspaceFolder}/build/compile_commands.json"
}
```

如果项目由 Visual Studio 工具链管理，也可以使用该扩展的配置提供程序。编译数据库需要包含 MSVC 实际使用的编译器参数；CMake 的 Ninja 生成器适合生成该文件。DocLens 会使用 Microsoft C/C++ 扩展返回的符号和声明结果。

语言服务就绪后，DocLens 的检查路径是：源文件扩展名受支持 → 找到实现符号 → 声明提供程序返回头文件候选 → 头文件声明上方找到 Doxygen 注释。

## Remote、WSL 与 Container

DocLens 的扩展类型为 workspace。使用 Remote-SSH、WSL 或 Dev Containers 时：

- 在远程窗口中将 DocLens 安装到对应的远程扩展主机。
- 在同一个远程环境安装并运行 `clangd` 或 Microsoft C/C++ 语言服务。
- 将 `compile_commands.json`、头文件和实现文件放在远程工作区可访问的位置。
- 让语言服务使用远程环境中的编译器、系统头文件和包含目录；Windows 与 Linux 的路径不要混用。
- 在容器中重新配置 CMake，确保数据库记录的是容器内可访问的路径。

典型流程是先在目标环境中打开项目目录，再执行 CMake 配置和构建，最后在该远程窗口运行 `Check Setup`。不同远程扩展对 `clangd` 路径和容器挂载方式的配置由对应语言服务负责。

## 隐私与安全

0.1.0 的扩展代码使用 VS Code 工作区、文档、语言服务和内存缓存完成解析；代码路径不包含网络请求、遥测上报或远程文档上传。文档缓存和虚拟 Markdown 内容保存在当前扩展主机的内存中，扩展停用后释放。

头文件内容会被当前 VS Code 语言服务读取，以完成符号和声明解析；`compile_commands.json` 可能包含本机路径、宏和编译参数，建议按项目敏感级别管理工作区和构建目录权限。扩展不会把这些内容发送到外部服务。

Hover 和 Markdown 文档将内容作为不受信任的 Markdown 展示，禁用 HTML 支持和主题图标信任；文档视图通过 `cpp-header-doc` 内容提供程序生成，适合阅读和跳转。

请仅在信任的工作区中运行编译器、语言服务和构建脚本，并遵循团队对源代码、编译参数及远程工作区的访问控制策略。语言服务扩展自身的行为和遥测策略由其供应方负责。

## 开发与验证

开发环境使用 Node.js 24：

```powershell
npm ci
```

按 CI 顺序执行：

```powershell
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

GitHub Actions 在 Windows 与 Ubuntu 上使用 Node 24，按 `check`、`lint`、`unit`、`compile`、`integration`、`package` 顺序执行，并上传 `release/*.vsix`。

更多配置与排查建议见 `docs/configuration.md`、`docs/troubleshooting.md` 和 `docs/release.md`。

架构、测试矩阵和兼容边界分别见 `docs/ARCHITECTURE.md`、`docs/TESTING.md`、`docs/LIMITATIONS.md`。

## 常见问题

### 实现上方没有出现 CodeLens

确认 `editor.codeLens` 和 `cppHeaderDocLens.enabled` 为 `true`，当前文件扩展名位于 `sourceExtensions`，然后运行 `C++ Header DocLens: Check Setup`。输出通道会给出函数符号和声明候选数量。

### 语言服务尚未就绪

等待 clangd 或 Microsoft C/C++ 完成索引，并确认它可以从实现执行“转到声明”。配置 `compile_commands.json` 后运行 Refresh 或重新打开实现文件即可再次解析。

### 头文件注释更新后摘要仍是旧内容

保存或继续编辑头文件会触发自动刷新；也可以运行 `C++ Header DocLens: Refresh` 立即清理内存缓存。

### 哪些 C++ 场景依赖语言服务

重载、模板、宏生成函数、运算符和条件编译的声明定位以语言服务返回结果为准。DocLens 对候选位置进行确定性排序，再解析选中声明上方的文档。

## 已知限制

- CodeLens 展示紧凑单行摘要，完整内容位于 Hover 和 Markdown 文档。
- 复杂宏展开、模板实例化和生成代码的可见性取决于语言服务索引结果。
- Doxygen 注释需位于声明上方配置的搜索窗口内。
- 头文件位于工作区外时可以读取语言服务返回的 URI；外部文件系统的变化检测能力由对应 VS Code 文件系统提供程序决定。

## 卸载

在扩展视图中卸载 “C++ Header DocLens”，或执行：

```powershell
code --uninstall-extension timzou93.cpp-header-doclens
```

## 许可证

本项目采用 MIT License，详见 `LICENSE`。
