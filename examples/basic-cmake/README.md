# basic-cmake 示例

这个最小工程展示头文件 Doxygen 到 `.cpp` 定义的完整路径，并默认生成 `compile_commands.json`。

## 配置与构建

PowerShell：

```powershell
cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
cmake --build build --config Debug
```

Linux shell：

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
cmake --build build
```

运行示例：

```bash
./build/basic-demo
```

Visual Studio 多配置生成器的可执行文件通常位于 `build/Debug/basic-demo.exe`。

## 在 VS Code 中查看文档

1. 在本目录打开 VS Code 工作区。
2. 将 clangd 的 `--compile-commands-dir` 指向 `build`，或将 Microsoft C/C++ 的 `C_Cpp.default.compileCommands` 指向 `build/compile_commands.json`。
3. 打开 `src/basic.cpp`，确认 `editor.codeLens` 为 `true`。
4. 查看 `add` 和 `isPositive` 定义上方的 CodeLens，或悬停函数名查看文档。
5. 从文档视图的编辑器标题栏运行声明跳转，返回 `include/basic.hpp`。
