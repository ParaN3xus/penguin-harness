# 共享 UI 包有了测试框架，Web 样式守卫同时扫描两个源码根

- **Date:** 2026-09-16
- **Type:** process
- **Scope:** `ui`, `web`

[English](2026-09-16-theme-w0-guards.md)

主题系统的共享 UI 包（`@prismshadow/penguin-ui`）新增了一套只在 Node 中运行的测试，按主题文件的计算值来
检验主题；Web App 的样式守卫测试改为在 `packages/web/src` 之外同时扫描 `packages/ui/src`，任一源码根扫不到
文件时按名字报错，而不是在组件于两处之间迁移时对着空集静默通过。

## 包内测试

- `token-contract`：每个主题 × 明暗模式都在 `@layer ui-theme` 的规范选择器上，把 `tokens.ts` 中的每个名字
  各声明一次，且不含契约之外的名字；非默认主题还须重新指定全部十一级灰阶。
- `contrast`：从主题 CSS 解析出 WCAG 2 对比度——各表面上的正文（4.5:1）、页面表面上的色调墨色（3:1，
  `neutral` 除外）、色调底色上的色调文字与实心徽标文字（4.5:1）、主题强调色与每个用户预设上的强调色文字
  （4.5:1）。未达标项记入例外清单，某项一旦达标，测试即失败直到将其移除。
- `no-app-strings` 与 `no-theme-reads`：包内不从 Web App 的词典导入任何内容，主题机制之外也不读取主题 id。
- `demo-coverage`：每个组件目录都带有 `*.demo.tsx`，豁免清单初始为空。
- `font-licenses`：每个字体依赖的许可文本都镜像在 `src/fonts/LICENSES/` 下且与已安装包中的文本一致，
  样式表加载的每个字体文件都来自这样的依赖。
- `boot-script`：对存储偏好的每种组合，`BOOT_SCRIPT` 绘制出的结果都与 `applyThemeAttributes` 一致，
  且 `packages/web/index.html` 原样内联了它。
- 仍是桩文件的主题、尚无字体或组件的包、尚无内联脚本的 index.html，都以具名的跳过用例报告，而不算通过。

## 测试辅助

- `src/testing/` 新增：带每个根文件计数的源码根扫描器、CSS 规则读取器、沿主题层叠解析 `var()` 的主题文件
  分析器、颜色解析（十六进制、`rgb()`、`hsl()`、`oklch()`、`color-mix(in srgb, …)`）与 WCAG 对比度计算，
  以及静态渲染辅助函数。
- `packages/ui` 新增 `vitest.config.ts`；其 `test` 脚本不再在空测试集上通过。

## Web 守卫

- `packages/web/test/helpers/roots.ts` 列出两个源码根，并提供 `expectEveryRootScanned`、`sourceFile`
  与 `expectSingleHome`。
- 21 个样式守卫——`control-size`、`icon-scale`、`tone`、`disclosure-anchor`、`disclosure-body`、
  `company-click-targets`、`required-mark`、`info-popover`、`help-fold`、`title-reveal`、
  `session-activity`、`session-row-menu`、`company-beta`、`todo-notice`、`modal-focus`、`esc-layers`、
  `portal-panel-dismiss`、`context-menu`、`inner-html-stability`、`group-list`、`autofill`——都扫描两个根，
  断言每个根都扫到了文件，并断言所读的每个模块只存在于一处；文件以仓库相对路径命名。
- `GlyphIcon` 的描边改为读取 `--ui-icon-stroke`（回退值 1.7），`icon-scale` 断言这一点，并检查每个主题的
  该令牌取值属于线条族粗细 1.7 / 1.6 / 1.4。
