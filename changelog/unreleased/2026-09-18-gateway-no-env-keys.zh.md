# 没有 key 的模型条目只在发往厂商自己的端点时才借用环境变量

- **Date:** 2026-09-18
- **Type:** fix
- **Scope:** `core`, `server`, `web`, `docs`
- **PR:** [#794](https://github.com/Prism-Shadow/penguin-harness/pull/794)
- **Breaking:** yes — 网关分组（TokenDance、OpenRouter、Fireworks AI、SiliconFlow、Qwen Pay-As-You-Go、Qwen Token Plan）、`custom`、`vllm` 或自建分组里没有 `api_key` 的模型条目，以及自带 `base_url` 的厂商条目，不再从服务端环境读取 `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY`（或任何厂商变量）；会话、连通性测试、分组测速、视觉探测、协议检测与端点导入一律拒绝

[English](2026-09-18-gateway-no-env-keys.md)

AgentHub 的客户端只要没拿到 key，就会读取厂商的环境变量，无论被指向哪个 base URL。网关分组里没有
key 的条目因此把用户自己的 OpenAI 或 Anthropic key 发给了网关：对一个混合协议网关做一次分组测速会发出
27 个请求，其中 7 个带着 Anthropic key、20 个带着 OpenAI key；而只要任何一条 Anthropic 条目证明过该变量
已设置，模型弹窗的 key 输入框就会对网关条目提示「留空则使用环境变量 ANTHROPIC_API_KEY」。现在由
PenguinHarness 自己在构建任何客户端之前判定没有 key 的条目能否倚赖环境变量，判据是**目的地**而不是
分组名：环境里的 key 只去环境把它放在的地方。

## 细节

- core 的 `resolveModelCredential` 是唯一的判定处，harness 构建的每个客户端都经过它：会话创建与恢复、
  视觉代读、连通性与测速探测、视觉探测、工具性补全与端点列举。没有 key 的条目在以下情形被允许使用其
  客户端的变量：没有 base URL（客户端缺省端点即厂商自己的端点，或用户在 key 旁一并设置的
  `*_BASE_URL`）；base URL 是该厂商自己的官方端点之一（目录里 DeepSeek 与 MiniMax 条目即这样钉住）。其余
  一律拒绝，报「Model
  `<provider>/<id>` has no API key … set the API key on the model entry」，服务端将其与 SDK 自身的凭据缺失
  错误一样归入 `model_credential_missing`。
- 允许回退时客户端依旧拿不到 key、自己读取变量，与此前完全一致——厂商条目没有任何损失，包括没有
  `ANTHROPIC_API_KEY` 的 Bedrock `ANTHROPIC_BASE_URL`。Penguin Go 中转专属的 `PENGUIN_GO_API_KEY` 没有
  任何 AgentHub 客户端认识，由 harness 读取并显式传给该分组的每一条；未设置时拒绝，而不是交给客户端去读
  厂商变量。这同时补上了没有 key 的中转条目在会话里的同一漏洞（探测路径此前已有守卫）。
- 模型接口只对规则允许回退的条目报告 `envKey` 与掩码预览 `envKeyMasked`，卡片的「已配置 key」与弹窗
  提示因此与拒绝一致。弹窗按草稿中的行——分组、id、协议与 base URL——实时解析提示；分组级「手动设置
  密钥」弹窗只为厂商分组与 Penguin Go 点名变量。
- 协议检测与新增分组的端点列举按同一口径把协议变量借给裸端点：只借给厂商自己的 URL。网关或私有服务器
  一律匿名探测（协议格式的 401 照样能识别路由），没有可用 key 的列举在构建客户端之前即被拒绝。
- `custom` 分组的预置模型 Atria Dawn Preview 此前读取 `ANTHROPIC_API_KEY`，现在与其他 custom 条目一样
  需要自己的 key。

## 兼容性

不再可用的情形：对一个没有 `api_key`、且指向厂商自身端点之外任何地址的条目发起会话、连通性测试、
测速、视觉探测、协议检测或模型导入——所有网关分组的条目、所有带自己 base URL 的 `custom`、`vllm` 或自建
分组条目、以及被改指到代理的厂商条目——现在以「has no API key」失败，而此前它们靠服务端环境里的
`OPENAI_API_KEY`、`ANTHROPIC_API_KEY` 或 `GEMINI_API_KEY` 运行。接受任意 bearer token 的自托管服务器同样
受影响：环境里的 `OPENAI_API_KEY=dummy` 不再覆盖它。

需要做的事：把 key 放到条目上——**模型配置 → API key**、组头的**手动设置密钥**，或 `penguin config
model add … --api-key <key>`。此前靠环境里的 `OPENAI_API_KEY` + `OPENAI_BASE_URL` 运行、而条目又自带
base URL 的自托管或自定义服务器正是这种情形：环境变量里的 key 只用于官方端点，这把 key 要写到条目上。
**没有** base URL 的条目不受影响，仍按 AgentHub 自己的环境配对（`*_API_KEY` 与 `*_BASE_URL`）工作。磁盘
上的数据形态不变、不运行任何迁移；已带 key 的条目不受影响。

本批次没有兼容代码，因此不设 `backward-compatibility` 条目。
