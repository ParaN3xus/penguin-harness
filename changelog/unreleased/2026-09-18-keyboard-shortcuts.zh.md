# 快捷键随平台而定，统一出自一张注册表

- **Date:** 2026-09-18
- **Type:** feature
- **Scope:** `web`

[English](2026-09-18-keyboard-shortcuts.md)

Web App 的快捷键改为出自一张注册表（`lib/shortcuts/`），取代此前四处手写的修饰键判断，修饰键随平台：macOS 用 ⌘，其余平台用 Ctrl。终端标签页在 Mac 上以 ⌘W 关闭，Ctrl+W 改为原样送 shell（readline 的删词）；Windows 与 Linux 仍用 Ctrl+W。文件面板与手册的编辑器以 ⌘S / Ctrl+S 保存，不再两者都接受。显示 / 隐藏终端在所有平台都保持 Ctrl+`（⌘` 是 macOS 自己的窗口切换）。组合按物理键位（`KeyboardEvent.code`）匹配，中文输入法、Shift、Caps Lock 与 macOS 的 Option 组合不再改变一个键的含义；浏览器暴露键盘布局时，缺省组合会移到实际敲出该字母的键上。

## 细节

- 注册表：`palette.toggle`（⌘P / Ctrl+P，为命令面板预留）、`terminal.toggle`（Ctrl+`）、`terminal.close`（⌘W / Ctrl+W）、`editor.save`（⌘S / Ctrl+S）。每条命令有作用域（全局、终端、编辑器）；同一组合下焦点作用域优先于全局，其次按注册顺序。
- 覆盖项读自浏览器镜像 `penguin.keybindings`（带版本号、按平台分节、只存与缺省不同的行），改动即刻同步到已打开的全部标签页。写入它的设置页与按账号保存的服务端副本在后续改动中跟上。
- 所有显示快捷键的位置——终端标签 × 的提示、面板选单的 kbd、保存按钮的标题、手册编辑器的提示——都从注册表按平台写法格式化（`⌘W`、`⌃\``；`Ctrl+W`），并随绑定变化更新。
- macOS 终端剪贴板：⌘C 与 ⌘V 为系统原生复制粘贴；Ctrl+C 一律送 SIGINT，Ctrl+V 原样送 shell。Windows 与 Linux 沿用 Ctrl+Shift+C / Ctrl+Insert / 有选区时 Ctrl+C 复制，以及 Ctrl+V / Shift+Insert 粘贴。
- 新增守卫测试：`lib/shortcuts/` 之外任何读取 `ctrlKey` / `metaKey` 的代码都会使其失败。
