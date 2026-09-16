# 共享 UI 包新增模拟数据集与四个整页示意，供组件画廊使用

- **Date:** 2026-09-16
- **Type:** feature
- **Scope:** `ui`

[English](2026-09-16-theme-fixtures-screens.md)

`@prismshadow/penguin-ui` 新增 `fixtures/` 与 `screens/`：前者是一套中英双语的类型化模拟数据，后者是四个静态
整页组合，由主题画廊在 `/screens/:name` 渲染。Web App 不引用其中任何一个，应用外观与此前完全一致。

## 模拟数据

- 取自落地页截图所用的「构建 Claude Code 文档专家」会话，扩展为两轮运行：用户与助手轮次，已完成和流式输出中的
  思考与正文，以及工具调用——带输出的 `exec_command`、`read_file`、带 diff 的 `edit_file` 与 `write_file`、
  附带子会话记录的 `run_subagent`，还有一条等待审批的命令。
- 同一次运行的 Trace（文件列表、全局统计、每轮执行时间线与事件行）、取自内置模型目录的十个模型、Workspace
  文件树与文件预览、侧栏会话分组，以及一家公司：员工、覆盖全部列的工单和一周的日历事件。
- 界面文案取自 Web App 的两本词典；为字体页与排版基础页准备了混排中文、拉丁字母、代码与数字的字样文本。
- `en` 与 `zh` 由同一份结构（`fixtures/dataset.ts`）生成，只有文字不同；`fixturesFor(lang)` 返回对应语言。

## 整页示意

- `chat`：运行中的 Task，含侧栏、展开的 diff、运行中的子智能体、待审批命令、带附件标签的输入框，以及正在流式输出
  子会话回复的子智能体停靠面板。
- `traces`：轨迹观测停靠面板，含全局统计、单轮执行时间线、图例与事件行。
- `settings`：对话之上的分页设置对话框，停在「外观」页，并展开一个说明浮层。
- `login`：装饰画布上的登录卡片。
- 示意只使用令牌工具类与已声明的样式钩子，各主题通过自身令牌取值改变其外观；组件逐波迁入共享包后，替换其中的占位部件。
- 包以 `@prismshadow/penguin-ui/screens` 导出（`SCREENS`、`screenById`）。
