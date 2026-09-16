# 本地组件画廊：在每套主题下渲染共享 UI 包

- **Date:** 2026-09-16
- **Type:** process
- **Scope:** `ui-gallery`, `ui`, `tooling`, `ci`

[English](2026-09-16-theme-gallery.md)

新增私有包 `@prismshadow/penguin-ui-gallery`：一个 Vite + React 应用，把共享 UI 包的令牌、组件演示与整页合成
分别在三套主题（Primer、Frost、Console）、浅色与深色、16 / 18 / 20 px 三档根字号、中英文下展示出来。它是本地开发
工具，用 `pnpm dev:gallery` 在 7372 端口启动，不随产品发布。Web App 没有任何改动。

## 画廊

- 单页长滚动，按组件划分排序：左侧吸顶栏含主题、明暗、字号与语言切换，三主题并排对比、减弱动效开关，以及随滚动
  高亮的目录；右侧是编号分区，每个分区有预览卡片、变体胶囊与令牌 / 代码抽屉。
- 每个视图都有地址。URL 记录主题、明暗、字号、语言与每个分区选中的变体；每张卡片下方显示可直接引用的路径，
  如 `Console › Actions › Button › danger · sm · dark`，每个分区都有复制链接按钮。
- 基础页由 `tokens.ts` 生成：颜色（色块、解析后的取值与 WCAG 对比度，可看当前主题，也可看六组主题 × 明暗的
  矩阵）、带中英文字样的排版、形状、层次与毛玻璃、带实测控件高度的间距与密度、动效、按主题描边绘制的 Web App
  线形图标、焦点与选区、挂在配方所需结构上的样式钩子，以及层级。顶部的覆盖条统计每个主题与明暗定义了多少令牌。
- 组件演示从 `packages/ui/src/**/*.demo.tsx` 收集；组件还没有演示时，分区显示计划中的导出、属性、波次与它将替代的
  Web 代码。`/embed` 单独渲染一个分区，`/screens/<name>` 展示 `packages/ui/src/screens` 中的整页合成，`/fonts`
  展示各主题的字体族、已声明的字体与许可文本。
- 画廊界面文案有中英文两份，只属于画廊本身。

## 包内新增

- `packages/ui/src/catalog.ts` 列出画廊的分组与分区，`packages/ui/src/demo.ts` 定义演示契约（`defineDemo`）。

## 工具

- `pnpm --filter @prismshadow/penguin-ui-gallery shots` 经 `/embed` 为任意分区 × 主题 × 明暗 × 语言拍摄 Playwright
  截图。
- 根目录新增 `pnpm dev:gallery` 启动画廊；manual-test 技能收录该入口；CI 在 `rest` 分片运行画廊的单元测试，
  `pnpm -r build` 会构建画廊。
