# 共享 UI 包打包字体，并定义 Frost 与 Console 两套主题

- **Date:** 2026-09-16
- **Type:** feature
- **Scope:** `ui`
- **PR:** [#761](https://github.com/Prism-Shadow/penguin-harness/pull/761)

[English](2026-09-16-theme-fonts-frost-console.md)

`@prismshadow/penguin-ui` 加入了三套主题的字体，以及两套新主题的令牌取值：Frost（`modern`，圆角磨砂，
参照 sierra.ai）与 Console（`geek`，直角细线、等宽标签，参照 e2b.dev）。Web App 中尚无任何地方引用新主题
或新字体，应用外观与此前完全一致。

## 字体

- 八个 fontsource 包，全部为 SIL Open Font License 1.1：Mona Sans 与 JetBrains Mono（Primer，为后续的
  Primer 打磨预先声明）、Geist 与 Geist Mono（Frost）、IBM Plex Sans、IBM Plex Sans Condensed 与 Commit
  Mono（Console），以及所有主题共用的中文字体 Noto Sans SC。
- `fonts/github.css`、`modern.css`、`geek.css` 手写各主题的拉丁字形，只含 latin 与 latin-ext 子集、只用
  woff2；`fonts/cjk.css` 直接引入 fontsource 的 Noto Sans SC 样式表，共 101 个 `unicode-range` 分片。页面
  只下载当前主题引用的字形，以及文字实际用到的 Noto 分片。
- 构建产物中拉丁字形约 0.44 MB，Noto Sans SC 约 4.5 MB。
- `scripts/sync-font-licenses.mjs` 把各字体包的许可文本镜像到 `fonts/LICENSES/`（`--check` 报告不一致），
  `penguinUi()` Vite 插件把这些文本以 `fonts-licenses/<包名>.txt` 输出到每个构建产物中。

## 主题

- `themes/modern.css` 与 `themes/geek.css` 在明暗两种模式下定义全部 187 个令牌，并重新指向灰阶与白色，
  让应用现有的调色板类落到各主题自己的中性色上。
- Frost：暖米白画布配白色卡片，圆角 4–24 px，控件为胶囊形，绿色强调色，标题用常规字重，浮层半透明磨砂。
  sierra.ai 没有暗色模式，Frost 的暗色是自拟的暖调近黑配色。
- Console：黑色（或白色）画布、1 px 线条、处处零圆角、橙色强调色、窄体大写标题、等宽大写按钮标签，层次
  靠线条而非阴影表达。
- 两套主题都包含 `done` 与 `info` 色调。每个色调在自身底色上作为文字对比度达 4.5:1，在所有表面上作为标记
  对比度达 3:1。
- 每套主题实现已声明的样式钩子（`.ui-glass`、`.ui-wash`、`.ui-grid`、`.ui-ticks`、`.ui-eyebrow`、
  `.ui-display`、`.ui-live`、`.ui-frame`、`.ui-pill-hover`、`.ui-underline-nav`），不使用的钩子保持空操作。
