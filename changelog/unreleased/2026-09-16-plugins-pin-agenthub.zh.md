# 插件钉住其内容所针对的 agenthub 精确版本

- **Date:** 2026-09-16
- **Type:** feature
- **Scope:** `core`, `server`, `web`, `skills`, `docs`

[English](2026-09-16-plugins-pin-agenthub.md)

`plugin.json` 新增可选字段 `libraries`：插件内容所针对的外部库及其精确版本（`{ "@prismshadow/agenthub": "0.4.15" }`）。loader 拒绝范围与标签写法，core 的插件测试把钉住的版本与正文绑在一起——文件里提到某个受钉库的插件必须声明该钉，其文件中每条安装命令、依赖声明与 `name@version` 写法都必须写这个版本。

## 细节

- `agent-development` 把 `@prismshadow/agenthub` 钉在 `0.4.15`（插件版本 `2026.09.16.1`）：`unified-llm-api` 改为安装 `@prismshadow/agenthub@0.4.15`，并注明其描述的形状——客户端构造、流式事件与内容项、配置参数、模型注册表——都是该版本的。它与 `penguin-sdk` 中对该 Skill 旧名 `agenthub-models` 的引用改为 `unified-llm-api`。
- `GET /api/plugins` 带回各插件的 `libraries`，插件详情对话框在钩子点旁以 `name@version` 徽标显示。
- 钉住的是插件的版本，不是 harness 的：`packages/core` 自己的 `@prismshadow/agenthub` 依赖范围未改。
