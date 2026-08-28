# Changelog

本文件记录 C++ HeadDoc 的公开版本变化。

## [0.2.1] - 2026-08-28

### Changed

- 声明位置在展开文档中集中显示一次，使线程标题更紧凑。

## [0.2.0] - 2026-08-28

### Added

- 在实现旁显示可折叠的原生只读内联文档，展开后随编辑器宽度自动换行。
- 提供 `small`、`medium`、`large` 三档相对字号。
- 使用稳定的彩色参数标记区分同一函数中的参数。
- 提供中英文 README 与实际界面截图。

### Changed

- 项目与扩展显示名称更新为 C++ HeadDoc。
- 内联文档采用紧凑排版，CodeLens 用于展开与折叠。
- Markdown 预览调整为按需打开的辅助命令。

## [0.1.0] - 2026-08-27

### Added

- 从头文件 Doxygen 注释生成实现位置的 CodeLens 摘要。
- 在 C/C++ 实现上提供完整 Hover 文档。
- 提供只读 `cpp-header-doc` Markdown 文档视图。
- 支持从文档视图跳转到头文件声明。
- 支持 `clangd` 与 Microsoft C/C++ 扩展提供的符号和声明结果。
- 提供工作区配置、刷新、启停切换与环境检查命令。
- 提供 Windows 与 Ubuntu 的 Node 24 CI，以及 VSIX 打包产物上传。
