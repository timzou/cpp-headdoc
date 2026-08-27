# Limitations

## 语言服务依赖

DocLens 使用 VS Code 的文档符号提供程序和声明提供程序。符号缺失、声明候选不完整或编译配置未被 clangd/Microsoft C/C++ 扩展识别时，CodeLens、Hover 和声明跳转会受到影响。扩展不替代 C/C++ 语言服务，也不自行实现完整 C++ 语义分析。

## 文件与注释范围

- 默认处理 `.c`、`.cc`、`.cpp`、`.cxx` 实现文件，以及 `.h`、`.hpp`、`.hh`、`.hxx` 头文件；可通过配置扩展名。
- 当前实现符号限定为函数、方法、构造函数和运算符，并要求语言服务返回的范围包含函数体。
- Doxygen 注释需要使用 `/**`、`/*!`、`///` 或 `//!` 形式，并位于声明上方的搜索窗口内。
- 支持的结构化标签包括 `brief`、`param`、`tparam`、`return`、`returns`、`retval`、`note`、`warning`、`throws`、`exception`、`deprecated` 和 `see`。
- 复杂宏展开、模板实例化、生成代码和跨编译配置的声明选择由语言服务决定。

## 配置与刷新

CodeLens 还需要 VS Code 的 `editor.codeLens` 设置开启。文档解析使用内存缓存；文件和配置变化会触发带 debounce 的刷新，缓存条目数受 `maxCacheEntries` 控制。虚拟 Markdown 文档适合阅读和跳转，不作为工作区文件保存。

## 构建数据库

DocLens 不生成或维护 `compile_commands.json`。建议使用 CMake、Ninja 或项目配置提供程序向 clangd/Microsoft C/C++ 扩展提供与实际构建一致的编译器参数、宏和包含目录。Remote、WSL 和 Container 环境需要使用语言服务运行环境中的路径和工具链。

## 文档表达

CodeLens 使用摘要样式和长度上限展示内容；完整信息可从 Hover 或只读 Markdown 文档查看。Markdown 会按安全展示策略渲染，原始注释中的复杂 HTML、交互式内容和依赖特定渲染器的扩展语法不保证保持原样。

## 规模与资源

解析并发数、缓存容量和注释搜索行数由扩展内部或配置控制。大型工作区的符号数量、语言服务响应时间和远程文件系统延迟会影响首次展示速度；可使用 `Check Setup` 和输出通道定位语言服务状态。
