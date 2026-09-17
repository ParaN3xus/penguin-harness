/**
 * In-conversation model switch (the active Session's toolbar model picker): the decisions the
 * chat page makes, kept pure so they are testable without a DOM.
 *
 * The switch is not the `/model` handoff. `/model` opens a NEW conversation on another model
 * and leaves this one as it is; this picker keeps the conversation and moves it onto the
 * picked model. That compacts on the current model first (`POST …/switch-model` answers 202 and
 * streams an ordinary compaction row, then the new context's `session_meta`), except for a
 * Session that never ran, which has no context to compact and switches inside the request (200
 * with the updated Session). Only that `session_meta` says the Session moved: the stream model
 * turns it into a model-change marker, and the page refetches the Session row when the row
 * names another model (see sessionRowStale). A compaction that fails streams no meta, and the
 * Session stays on the model it was on.
 */
import type {
  ModelRefDto,
  SessionInfo,
  SessionResponse,
  SessionStatus,
  TaskCreateResponse,
} from "@prismshadow/penguin-server/api";
import { sameModelRef } from "../models/model-grouping";

/**
 * Whether the picker is disabled: a switch compacts, and the server neither starts nor queues a
 * compaction while a Task runs or another compaction is under way.
 */
export function sessionModelPickerDisabled(status: SessionStatus): boolean {
  return status === "running" || status === "compacting";
}

/**
 * What a pick asks of the page:
 * - `"none"` — the current model (nothing to switch), or a pick that raced a Task starting
 *   (the picker is disabled then, and the server would refuse it anyway);
 * - `"confirm"` — open the confirm dialog. `direct` is true when the transcript is empty: there
 *   is nothing to compact, so the dialog says the switch is immediate.
 */
export type SessionModelPick = { act: "none" } | { act: "confirm"; direct: boolean };

export function sessionModelPick(opts: {
  current: ModelRefDto | null;
  picked: ModelRefDto;
  status: SessionStatus;
  /** No transcript items at all (the live tail and any backfilled window alike). */
  transcriptEmpty: boolean;
}): SessionModelPick {
  if (sameModelRef(opts.picked, opts.current)) return { act: "none" };
  if (sessionModelPickerDisabled(opts.status)) return { act: "none" };
  return { act: "confirm", direct: opts.transcriptEmpty };
}

/**
 * The two success shapes of `POST …/switch-model`, told apart by the body (the client does not
 * expose the status code): a {@link SessionResponse} carries `session` — the Session never ran
 * and already switched — while a {@link TaskCreateResponse} carries the (possibly self-healed)
 * `sessionId` of a switch that is now streaming.
 */
export type ModelSwitchOutcome =
  { kind: "applied"; session: SessionInfo } | { kind: "streaming"; sessionId: string };

export function modelSwitchOutcome(res: TaskCreateResponse | SessionResponse): ModelSwitchOutcome {
  if ("session" in res) return { kind: "applied", session: res.session };
  return { kind: "streaming", sessionId: res.sessionId };
}

/**
 * Whether the Session row on hand is stale: the running context's `session_meta` (the stream
 * model's `contextModel`) names another model than the row does — a switch completed, on this
 * tab or another one watching the Session, or the row was held from before a switch. The page
 * refetches the row once the Session is idle. False while no meta has been seen: a history
 * window that starts after the context's meta derives nothing, and the row stands.
 */
export function sessionRowStale(
  contextModel: ModelRefDto | null,
  current: ModelRefDto | null,
): boolean {
  return contextModel !== null && !sameModelRef(contextModel, current);
}
