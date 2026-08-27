# Changelog

本文件记录 C++ Header DocLens 的公开版本变化。

## [0.1.0] - 2026-08-27

### Added

- 从头文件 Doxygen 注释生成实现位置的 CodeLens 摘要。
- 在 C/C++ 实现上提供完整 Hover 文档。
- 提供只读 `cpp-header-doc` Markdown 文档视图。
- 支持从文档视图跳转到头文件声明。
- 支持 `clangd` 与 Microsoft C/C++ 扩展提供的符号和声明结果。
- 提供工作区配置、刷新、启停切换与环境检查命令。
- 提供 Windows 与 Ubuntu 的 Node 24 CI，以及 VSIX 打包产物上传。
