# Backward compatibility

- **Date:** 2026-09-16
- **Type:** process
- **Scope:** `server`, `core`, `model-catalog`
- **PR:** [#744](https://github.com/Prism-Shadow/penguin-harness/pull/744)
- **Breaking:** yes — a Project synced before this change keeps its discounted preset prices until Sync presets runs, and bills those rows at the old discount after the promotion ends

[中文版](2026-09-16-backward-compatibility.zh.md)

[Fixing a request's cost when it completes](2026-09-16-usage-cost-at-record-time.md) touched three things already on disk: the usage records in `web.db`, which held Tokens but no cost; each Project's `.project_config.toml`, whose preset rows on a promotion held the discounted price earlier builds wrote; and the Traces, whose `token_usage` events carry no rates.

## Usage records written before the upgrade

Chosen: **a one-time settle at startup.** Migration 9 adds `usage_records.cost` and `usage_records.cost_settled`, with every existing row unsettled. On boot, `UsageService.settleUnsettledCosts` costs each unsettled row once. It uses the price the row's Project stores at that moment and the rule the earlier builds billed by: the stored price as it stands, cut to the off-peak tier only for a row still at the catalog's peak price whose own timestamp fell off-peak. The cost center shows the same figures after the upgrade as before it, and from then on they do not move. The same settle costs any row an older build writes after a hot update rolls back to it.

Nothing is asked of the user.

**Removal:** `settleUnsettledCosts`, its `legacyRates` rule and the `Startup` call that runs it are removed in the release preparation of the second release after the one that ships this change. A `web.db` that upgrades past both releases in one step then keeps its old rows uncosted: they still count in Tokens and requests, not in cost. Migration 9 stays, as every migration does.

## Discounted prices already in a Project

Chosen: **no migration; the user runs Sync presets once.** Earlier builds wrote a promoted row's discounted price into the Project. That number is no longer the catalog's list price, so the row is treated like a price the user typed:

- it is billed as it stands, including after the promotion ends;
- the models page shows no discount badge on it;
- the Models entry's sync badge counts it among the presets that can be synced.

Running **Sync presets** once writes the list price back; from then on the row follows the catalog's promotions without further syncing. Rows the user priced by hand are unaffected either way. There is no compatibility code to remove.

## Traces without rates

`token_usage` gained an optional `pricing` field. Traces written before this change do not have it, and a consumer that needs a cost for such an event prices it by the same rule. No reader is required to find the field, so there is nothing to migrate and nothing to remove.

## Compatibility

Nothing is required for usage records or Traces. For Project configs, run **Sync presets** once on the Models page of every Project that synced presets before this change; until then its promoted rows bill the discounted number they store.
