# 配置与语言服务

## 配置入口

C++ HeadDoc 的设置前缀为 `cppHeadDoc`，可以写入用户设置或工作区 `.vscode/settings.json`。工作区配置示例：

```json
{
  "editor.codeLens": true,
  "cppHeadDoc.enabled": true,
  "cppHeadDoc.showInlineComments": true,
  "cppHeadDoc.inlineCommentsExpanded": false,
  "cppHeadDoc.inlineCommentTextSize": "medium",
  "cppHeadDoc.showCodeLens": true,
  "cppHeadDoc.showHover": true,
  "cppHeadDoc.summaryStyle": "briefAndTags",
  "cppHeadDoc.maxSummaryLength": 180,
  "cppHeadDoc.showParametersInCodeLens": true,
  "cppHeadDoc.showReturnValueInCodeLens": true,
  "cppHeadDoc.headerExtensions": [".h", ".hpp", ".hh", ".hxx"],
  "cppHeadDoc.sourceExtensions": [".c", ".cc", ".cpp", ".cxx"],
  "cppHeadDoc.maxCommentSearchLines": 40,
  "cppHeadDoc.debounceMs": 300,
  "cppHeadDoc.maxCacheEntries": 500,
  "cppHeadDoc.logLevel": "error"
}
```

`summaryStyle` 支持：

- `brief`：显示 `@brief` 或注释首段。
- `briefAndParams`：追加 `@param` 参数说明。
- `briefAndTags`：追加参数说明和 `@return` 内容。

数值设置会按贡献点中声明的范围校准。扩展名会转为小写、去重，并自动补充前导点。

`inlineCommentTextSize` 提供三档相对字号。内联文档使用紧凑的换行布局，参数按顺序显示不同颜色的标记，并随编辑器宽度自动换行。

## Doxygen 书写

块注释和行注释都可以放在头文件声明紧邻的上方：

```cpp
class DeviceController {
public:
    /**
     * @brief 启动数据采集
     * @param[in] sampleRate 采样频率，单位为 Hz
     * @param[in] channel 采集通道编号
     * @return 启动成功返回 true，否则返回 false
     */
    bool startAcquisition(int sampleRate, int channel);
};
```

解析器支持 `/**`、`/*!`、`///` 和 `//!` 注释。`maxCommentSearchLines` 控制从声明向上搜索的行数；声明上方的代码边界会结束本次查找。

## 语言服务连接

C++ HeadDoc 通过 VS Code 的两个标准命令获取数据：文档符号用于发现实现，声明提供程序用于选择头文件声明。因此，内联文档、CodeLens、Hover 和声明跳转的准确性取决于当前启用的语言服务。

### clangd

在工作区生成编译数据库后，将目录传给 clangd：

```json
{
  "clangd.arguments": [
    "--compile-commands-dir=${workspaceFolder}/build"
  ]
}
```

### Microsoft C/C++

使用 Microsoft C/C++ 扩展时，可直接指定编译数据库：

```json
{
  "C_Cpp.default.compileCommands": "${workspaceFolder}/build/compile_commands.json"
}
```

使用 MSVC 时，编译数据库应反映 MSVC 的包含目录、宏定义和语言标准。也可以使用该扩展的配置提供程序交付同等信息。

### CMake

```bash
cmake -S . -B build -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
cmake --build build
```

可运行的最小工程见 [`../examples/basic-cmake`](../examples/basic-cmake)。

## 远程工作区

Remote-SSH、WSL 和 Dev Containers 中，请在远程窗口安装 workspace 版本的 C++ HeadDoc，并在同一环境运行 clangd 或 Microsoft C/C++ 语言服务。CMake 构建目录和 `compile_commands.json` 应属于远程工作区，路径、编译器和系统头文件也应由远程环境解析。
