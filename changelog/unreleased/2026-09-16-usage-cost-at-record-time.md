# A request's cost is fixed when it completes

- **Date:** 2026-09-16
- **Type:** feature
- **Scope:** `core`, `server`, `web`, `model-catalog`, `docs`
- **Breaking:** yes — a price change no longer re-prices usage already recorded, and a Project synced before this change keeps its discounted preset prices until Sync presets runs

[中文版](2026-09-16-usage-cost-at-record-time.zh.md)

Each request's cost is computed the moment the request completes, at the price in force then, and is never re-priced. Editing a price, running **Sync presets**, or a promotion starting or ending changes only what later requests cost.

## Details

- Core stamps the rates a completed request was billed at on its `token_usage` event, as `pricing` (`null` for a model with no price). The rates come from the Project's price as it is on disk at that moment, less any catalog discount live at that instant, so a price edited mid-session bills the next request.
- The server stores each usage record's cost when it writes the row (`usage_records.cost` and `usage_records.cost_settled`, migration 9). The cost center, the conversation toolbar, `penguin cost` and company-mode budgets sum the stored costs; their queries no longer split by off-peak tier or look prices up.
- Presets and **Sync presets** write every catalog row's list price (the peak price for a row on an off-peak schedule). Flat promotions and off-peak tiers are applied when a request completes, and only while the stored price is still the catalog's.
- A catalog promotion can carry `discountUntil`, the instant it stops applying. The Gemini 3.6 / 3.7 / 3.8 Flash launch discounts end at 2027-01-01 08:00 UTC; OpenRouter's `z-ai/glm-5.3-flash` promotion ended at 2026-09-09 16:00 UTC, so the row bills its list price.
- OpenRouter rows record the list price and declare a running promotion in `discount`, as every other group does: `openai/gpt-5.6-sol` stores $0.50 / $6.25 / $30 with `discount: 0.5`.
- The models page's discount badge compares a row against the list price and disappears once a promotion has ended. The conversation's live cost estimate uses the rate billed at that moment.
- The Trace page's per-turn cost is still derived from the Project's current price at each request's own timestamp, so after a price change it can differ from the cost center.

## Compatibility

See [backward compatibility](2026-09-16-backward-compatibility.md): usage records from before the upgrade are costed once at startup, and a Project whose presets hold discounted prices needs **Sync presets** run once.
