# 会话内切换模型

- **Date:** 2026-09-16
- **Type:** feature
- **Scope:** `core`, `server`, `web`, `cli`, `docs`

[English](2026-09-16-in-session-model-switch.md)

此前一个 Session 只能使用一个模型：模型引用在创建 Session 时固定，要换模型只能用 `/model` 新开一个会话。现在 Session 可以就地切换模型：先用当前模型压缩上下文，压缩完成后才在目标模型上开启下一个模型上下文，并带上摘要，于是同一个 Session 可以先后使用多个模型。调节思考等级时是否先压缩仍由用户决定；切换模型则必定先压缩。

## Core

- `Session.switchModel({ provider, modelId, signal })` 流式产出切换过程，返回 `{ status, previous, next }`。目标先按磁盘上的 Project 配置校验并构造其客户端，之后才产出事件，因此模型或凭据缺失时直接拒绝、不触碰 Trace；切换到当前模型不做任何事。
- 模型引用从 Session 移到模型上下文：上下文装配时解析该上下文所用的模型条目，`Session.provider` / `Session.modelId` 读取运行中上下文的 `session_meta`。切换后派生的子会话继承新模型；图片折叠与 `read_file` 的视觉描述跟随当前条目；SDK 显式传入的凭据只作用于创建时的模型。
- 切换一律 summarize，无视 `compaction.mode`。没有可总结内容的上下文照样可以切换：刚压缩过时带上已持有的摘要；首个请求未完成的上下文以 discard 模式收尾，并带上其尚未送达的文本；从未运行过的 Session 直接在目标模型上重新装配，不写任何记录。
- `compaction_begin` / `compaction_end` 新增 `reason: "model_switch"` 与 `next_provider` / `next_model_id`。`resumeSession` 以已完成切换的收尾事件为准开启下一个上下文，因此在新模型写下任何记录之前恢复的 Session 仍运行在新模型上并保留摘要。
- 摘要超出目标模型上下文窗口时以 `fatal` 结束切换，并点出两个数值。切换失败或被中断时 Session 保持原模型。

## Server

- 新增 `POST /api/sessions/:sessionId/switch-model`（`{ provider, modelId }`）：答 202 并像 `/compact` 一样流式推送（状态 `compacting`）；Session 从未运行过时答 200 并带回更新后的 Session。拒绝一律 409：`task_in_progress`、`compacting`、`same_model`、`model_not_configured`、`model_unavailable`、`compaction_not_configured`。
- Session 行的 `provider` / `model_id` 改为当前模型：切换完成时更新，并在加载 Session 时按其实际模型校正。切换所用的压缩请求计入旧模型，此后的请求计入新模型。fork 取所截分片的模型，Trace 索引取 Session 最新分片的模型。

## Web

- 进行中对话的模型标识改为模型选择器：选择其他模型时弹出确认（压缩并切换 / 取消），空对话则直接切换；对话运行或压缩中选择器不可用。切换在对话中显示为单独一行（「切换模型：压缩中」「已切换模型 · A → B」「切换模型失败 · 仍使用 A」），切换完成后页面随之改用新模型。
- `/model` 仍是换模型开新会话；其描述、选择器、标签与横幅都写明这一点，并指向工具栏的模型选择器用于会话内切换。

## CLI

- `penguin chat` 新增 `/switch-model <provider> <model_id>`；不带参数时打印当前模型。REPL 渲染切换的压缩行，完成后打印 `模型：A → B`。`--resume` 仍不接受模型参数，并提示改用 `/switch-model`。
