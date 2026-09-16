# 请求成本在请求完成时定格

- **Date:** 2026-09-16
- **Type:** feature
- **Scope:** `core`, `server`, `web`, `model-catalog`, `docs`
- **PR:** [#744](https://github.com/Prism-Shadow/penguin-harness/pull/744)
- **Breaking:** yes — 改价不再重算已记录的用量；此前同步过预置的 Project 在执行「同步预置」之前，仍保留预置时写入的折后价

[English](2026-09-16-usage-cost-at-record-time.md)

每个请求的成本在它完成的那一刻按当时生效的价格算出，此后不再重算。改价、执行**同步预置**、促销开始或结束，都只影响之后的请求。

## 细节

- core 把一次请求完成时所用的单价写进它的 `token_usage` 事件（`pricing` 字段；未配置价格的模型为 `null`）。单价取 Project 在那一刻存于磁盘的价格，再扣除当时生效的目录折扣，因此会话中途改价，从下一个请求起生效。
- 服务端在写入每条用量记录时一并存下成本（`usage_records.cost` 与 `usage_records.cost_settled`，迁移 9）。成本中心、对话页工具栏、`penguin cost` 与公司模式预算都加总存下的成本，查询时不再按分时段档位拆分，也不再取价。
- 预置与**同步预置**一律写入目录牌价（分时段计费的行写高峰价）。固定促销与分时段折扣都在请求完成时计入，且只对存的仍是目录牌价的行生效。
- 目录促销可带截止时刻 `discountUntil`，过了即不再生效。Gemini 3.6 / 3.7 / 3.8 Flash 的首发折扣截止于 2027-01-01 08:00 UTC；OpenRouter 上 `z-ai/glm-5.3-flash` 的促销已于 2026-09-09 16:00 UTC 结束，该行按牌价计费。
- OpenRouter 分组的条目与其他分组一样记录牌价，正在进行的促销以 `discount` 声明：`openai/gpt-5.6-sol` 存 $0.50 / $6.25 / $30，并带 `discount: 0.5`。
- 模型页的折扣徽标改为与牌价比对，促销结束后即不再显示。对话页的实时费用估算按此刻的实际计费价计算。
- Trace 页的逐轮成本仍按 Project 当前价格、以每个请求自己的时间戳推导，因此改价之后可能与成本中心不同。

## 兼容性

见[向后兼容](2026-09-16-backward-compatibility.zh.md)：升级前的用量记录在启动时补算一次成本；预置里存着折后价的 Project 需要执行一次**同步预置**。
