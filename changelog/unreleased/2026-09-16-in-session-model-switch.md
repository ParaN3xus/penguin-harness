# Switching the model inside a Session

- **Date:** 2026-09-16
- **Type:** feature
- **Scope:** `core`, `server`, `web`, `cli`, `docs`

[中文版](2026-09-16-in-session-model-switch.zh.md)

A Session could run on only one model: the model reference was fixed when the Session was created, and changing it meant `/model`, which opens a new conversation. A Session can now switch models in place. The switch compacts the context on the current model first, and only when that compaction completes does the next model context open on the target model, carrying the summary. One Session can therefore run several models over its life. Changing the thinking level still leaves compacting first to the user; a model switch always compacts.

## Core

- `Session.switchModel({ provider, modelId, signal })` streams the switch and returns `{ status, previous, next }`. The target is checked against the Project config on disk and its client is constructed before any event, so a missing model or credential is refused without touching the Trace. Switching to the current model does nothing.
- The model reference moved from the Session to the model context. Context assembly resolves the entry each context opens on, and `Session.provider` / `Session.modelId` read the running context's `session_meta`. Subagents spawned after a switch inherit the new model; the image fold and `read_file`'s vision describer follow the current entry; explicit SDK credentials apply only to the model the Session was created with.
- A switch always summarizes, whatever `compaction.mode` says. A context with nothing to summarize still switches: right after a compaction the held summary is carried over; an open context whose first request never completed is closed in discard mode with its pending text carried over; a Session that never ran is re-assembled on the target without writing anything.
- `compaction_begin` / `compaction_end` gained `reason: "model_switch"` and `next_provider` / `next_model_id`. A completed switch end is what `resumeSession` opens the next context on, so a Session resumed before the new model wrote anything still runs on the new model and keeps its summary.
- A summary too large for the target's context window ends the switch `fatal`, naming both numbers. A failed or aborted switch leaves the Session on its model.

## Server

- `POST /api/sessions/:sessionId/switch-model` with `{ provider, modelId }`. It answers 202 and streams like `/compact` (status `compacting`), or 200 with the updated Session when the Session had never run. Refusals are 409 `task_in_progress`, `compacting`, `same_model`, `model_not_configured`, `model_unavailable` and `compaction_not_configured`.
- The Session row's `provider` / `model_id` became the current model: they move when a switch completes and are reconciled from the loaded Session. The switch's compaction request is billed to the old model and later requests to the new one. A fork takes its model from the shard it cuts, and the trace index reads a Session's model from its latest shard.

## Web

- The model badge of an open conversation became a model picker. Picking another model asks for confirmation (compact and switch, or cancel); an empty conversation switches directly. The picker is disabled while the conversation runs or compacts. The conversation shows the switch as its own row ("Switching model: compacting", "Switched model · A → B", "Model switch failed · still on A"), and the page picks up the new model when the switch completes.
- `/model` keeps opening a new conversation on another model; its description, picker, chip and banner now say so, and point to the toolbar picker for switching inside the conversation.

## CLI

- `penguin chat` gained `/switch-model <provider> <model_id>`; bare `/switch-model` prints the current model. The REPL renders the switch's compaction lines and prints `model: A → B` when it completes. `--resume` still rejects model flags and points to `/switch-model`.
