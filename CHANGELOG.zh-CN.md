# Changelog

本文件记录 C++ HeadDoc 的公开版本变化。[English](CHANGELOG.md)

## [0.2.3] - 2026-08-31

### Changed

- Marketplace 界面截图使用 jsDelivr 版本化 CDN，在 VS Code 中稳定显示。

## [0.2.2] - 2026-08-31

### Added

- 扩展命令、配置说明、消息和文档字段支持中文与英文，并跟随 VS Code 界面语言。
- 新增突出“头文件注释映射到 C++ 实现”特点的 Marketplace 图标。

### Changed

- Marketplace 默认说明改为英文，并提供独立的简体中文 README。
- README 界面截图使用 GitHub HTTPS 资源地址，适配 Marketplace 与 VS Code 扩展详情页。
- 展开文档的原生标题行直接显示函数签名，正文紧接文档摘要，整体布局更加紧凑。

## [0.2.1] - 2026-08-28

### Changed

- 声明位置在展开文档中集中显示一次，使线程标题更紧凑。
- Marketplace 扩展标识为 `TimZou.cpp-headdoc`。

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
