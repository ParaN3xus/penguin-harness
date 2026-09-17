# NOTICE 文件载明 MiSans 字体的许可

- **Date:** 2026-09-17
- **Type:** process
- **Scope:** `tooling`, `ci`

[English](2026-09-17-notice-misans.md)

仓库根目录新增 `NOTICE` 文件，格式参照 Apache Arrow 与 Typst 的声明文件：先写本项目的版权与许可，再为每个第三方组件单列一节并附上适用的许可。第一节注明 MiSans（MiSans Light）：PenguinHarness 在渲染的页面与截图中以它作细字体；并按小米公布的原文收录《MiSans 字体知识产权许可协议》全文，即软件中须注明使用了 MiSans 字体、不得改编字体、不得单独分发字体文件。

## 细节

- 发布到 npm 的 `@prismshadow/penguin-core`、`@prismshadow/penguin-server` 与 `@prismshadow/penguin-cli` 在 `LICENSE` 旁一并附带 `NOTICE`：两者都在各包的 `files` 白名单中，发布流程把两者都复制进包目录，CI 的打包检查现在也要求 server 包含 `NOTICE`。
- `THIRD-PARTY-NOTICES.md` 与中英文 README 都指向 `NOTICE`；随发布包附带的 Node.js 运行时、MinGit 与 KaTeX 字体仍记录在 `THIRD-PARTY-NOTICES.md` 中。
