# 排查指南

## 没有 CodeLens

依次确认：

1. 当前文件扩展名属于 `sourceExtensions`，语言 ID 为 `cpp` 或 `c`。
2. `cppHeadDoc.enabled`、`cppHeadDoc.showInlineComments` 和 `cppHeadDoc.showCodeLens` 为 `true`。
3. `editor.codeLens` 为 `true`。
4. 语言服务能返回当前实现的文档符号。
5. 函数实现对应的声明位于受支持的头文件扩展名中。
6. 声明上方的 Doxygen 注释在 `maxCommentSearchLines` 范围内。

执行命令面板中的 `C++ HeadDoc: Check Setup`，并查看 `C++ HeadDoc` 输出通道。检查结果会显示当前语言、扩展是否启用、CodeLens 状态、实现符号数量和声明候选数量。

## 有符号但没有文档

C++ HeadDoc 需要声明提供程序返回头文件位置，然后在该声明上方找到可解析的 Doxygen 注释。请检查：

- 头文件已被语言服务纳入当前工作区。
- `compile_commands.json` 中的源文件、包含目录和宏定义与实际构建一致。
- clangd 或 Microsoft C/C++ 扩展的诊断中没有路径或配置错误。
- 注释使用 `/**`、`/*!`、`///` 或 `//!` 开头。
- 标签写作 `@brief`/`\\brief`、`@param`/`\\param` 等受支持形式。

## clangd 找不到头文件

先生成或更新编译数据库：

```bash
cmake -S . -B build -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
```

然后将 `--compile-commands-dir` 指向包含数据库的目录，并重新加载 VS Code 窗口。Remote、WSL 和 Container 场景中，确认该路径位于语言服务实际运行的环境中。

## MSVC 项目状态不完整

确认 Microsoft C/C++ 扩展选择了正确的配置提供程序或 `C_Cpp.default.compileCommands` 文件。Visual Studio 生成器与 CMake 编译数据库的支持取决于 CMake 版本和生成器；使用 Ninja 生成器通常更直接。完成配置后重新打开实现文件并再次执行 `Check Setup`。

## 文档视图没有更新

编辑头文件后，扩展会按 `debounceMs` 延迟清空缓存并刷新内联文档、CodeLens 与已打开的预览。需要立即更新时运行 `C++ HeadDoc: Refresh`。

## 日志级别

将 `cppHeadDoc.logLevel` 临时设为 `info` 或 `debug`，查看 `C++ HeadDoc` 输出通道。排查完成后可恢复 `error`，减少输出量。
