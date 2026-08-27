# 贡献指南

感谢参与 C++ Header DocLens。提交问题、改进文档或贡献代码时，请围绕“让头文件 Doxygen 更快到达实现位置”这一目标展开。

## 开发环境

- VS Code `1.134.0` 或更高版本。
- Node.js 24；仓库 `.nvmrc` 提供当前版本参考。
- `npm ci` 安装锁定的开发依赖。
- 集成测试需要可用的 VS Code 测试运行环境；Ubuntu 需要 `xvfb`。

## 修改流程

1. 从项目根目录安装依赖：

   ```bash
   npm ci
   ```

2. 修改 TypeScript、文档或示例，并保持配置字段与 `package.json` 的贡献点一致。
3. 按以下顺序验证：

   ```bash
   npm run check
   npm run lint
   npm run test:unit
   npm run compile
   npm run test:integration
   npm run package
   ```

   Ubuntu 执行集成测试时使用：

   ```bash
   xvfb-run -a npm run test:integration
   ```

4. 提交时说明用户可感知的行为变化、验证命令和相关文档位置。

## 代码与文档约定

- 使用现有 VS Code API、TypeScript 类型和缓存/刷新流程。
- 文档示例应能在 Windows PowerShell 与 Linux shell 中找到对应执行方式。
- C++ 示例保持 CMake 可配置、可构建，并包含能展示 Doxygen 到实现映射的头文件声明。
- 配置说明应同时记录默认值、有效范围和依赖的语言服务。
- 变更保持小而聚焦，避免引入与用户场景无关的依赖。

## 提交问题

请包含：

- VS Code、Node.js、语言服务和操作系统版本。
- 使用的文件扩展名、构建系统及 `compile_commands.json` 位置。
- `C++ Header DocLens: Check Setup` 输出中的关键状态。
- 可复现的头文件声明、实现签名和 Doxygen 标签示例；请先移除私密路径、密钥及业务数据。

## Pull Request

Pull Request 应保持范围清晰，更新用户可见行为对应的 README、变更日志或专门文档，并通过 GitHub Actions 的 Windows 与 Ubuntu 检查。
