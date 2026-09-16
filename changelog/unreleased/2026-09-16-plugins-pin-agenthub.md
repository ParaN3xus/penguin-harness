# Plugins pin the exact agenthub version their content is written for

- **Date:** 2026-09-16
- **Type:** feature
- **Scope:** `core`, `server`, `web`, `skills`, `docs`
- **PR:** [#756](https://github.com/Prism-Shadow/penguin-harness/pull/756)

[中文版](2026-09-16-plugins-pin-agenthub.zh.md)

`plugin.json` gained an optional `libraries` field: the external libraries a plugin's content is written for, each at an exact version (`{ "@prismshadow/agenthub": "0.4.15" }`). The loader refuses a range or a tag, and core's plugin test holds the pin and the prose together — a plugin whose files mention a pinned library must declare the pin, and every install command, dependency spec and `name@version` mention in its files must name that version.

## Details

- `agent-development` pins `@prismshadow/agenthub` at `0.4.15` (plugin version `2026.09.16.1`): `unified-llm-api` installs `@prismshadow/agenthub@0.4.15` and states that the shapes it documents — the client constructor, the streaming events and content items, the config parameters, the registry — are that release's. Its and `penguin-sdk`'s references to the skill's former name `agenthub-models` were corrected to `unified-llm-api`.
- `GET /api/plugins` carries each plugin's `libraries`, and the plugin detail dialog shows them as `name@version` badges beside the hook points.
- The pin is the plugin's, not the harness's: `packages/core`'s own `@prismshadow/agenthub` range was left unchanged.
