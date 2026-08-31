# Changelog

This file records public C++ HeadDoc releases. [简体中文](CHANGELOG.zh-CN.md)

## [0.2.3] - 2026-08-31

### Changed

- The Marketplace interface screenshot is served through jsDelivr's versioned CDN for reliable rendering in VS Code.

## [0.2.2] - 2026-08-31

### Added

- English and Simplified Chinese commands, settings, messages, and documentation labels that follow the VS Code display language.
- A Marketplace icon that illustrates header documentation flowing into a C++ implementation.

### Changed

- The Marketplace uses the English README by default and links to a dedicated Simplified Chinese README.
- The interface screenshot is served from a public HTTPS GitHub asset for Marketplace and VS Code rendering.
- Expanded documentation places the function signature in the native title row and starts the body with the documentation summary for a tighter layout.

## [0.2.1] - 2026-08-28

### Changed

- Declaration location is shown once in expanded documentation for a compact thread header.
- The Marketplace extension identifier is `TimZou.cpp-headdoc`.

## [0.2.0] - 2026-08-28

### Added

- Collapsible native readonly inline documentation beside implementations, with automatic wrapping.
- `small`, `medium`, and `large` relative text-size tiers.
- Stable colored markers that distinguish parameters within a function.
- English and Simplified Chinese documentation with an interface screenshot.

### Changed

- The project and extension display name are C++ HeadDoc.
- Inline documentation uses compact formatting with CodeLens expand and collapse controls.
- Markdown preview is available as an optional command.

## [0.1.0] - 2026-08-27

### Added

- CodeLens summaries generated from header Doxygen documentation.
- Full Hover documentation over C/C++ implementations.
- Readonly `cpp-header-doc` Markdown documents.
- Navigation from documentation to header declarations.
- Symbol and declaration results from clangd and Microsoft C/C++.
- Workspace settings, refresh, enable/disable, and setup-check commands.
- Windows and Ubuntu Node 24 CI with VSIX packaging artifacts.
