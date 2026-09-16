/**
 * In-conversation model switch (the active Session's toolbar model picker): the decisions the
 * chat page and the compaction row make, kept pure so they are testable without a DOM.
 *
 * The switch is not the `/model` handoff. `/model` opens a NEW conversation on another model
 * and leaves this one as it is; this picker keeps the conversation and moves it onto the
 * picked model. That always compacts on the current model first (`POST …/switch-model` answers
 * 202 and streams a compaction row with `reason: "model_switch"`), except for a Session that
 * never ran, which has no context to compact and switches inside the request (200 with the
 * updated Session). Only a completed row means the Session moved; any other end leaves it on
 * the model it was on.
 */
import type {
  ModelRefDto,
  SessionInfo,
  SessionResponse,
  SessionStatus,
  TaskCreateResponse,
} from "@prismshadow/penguin-server/api";
import { S } from "../../lib/strings";
import type { CompactionItem } from "../../lib/omni/stream-model";
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

/** The transcript items this module reads: the compaction rows' reason, outcome and target. */
export interface ModelSwitchRowLike {
  kind: string;
  reason?: string;
  running?: boolean;
  status?: string;
  nextProvider?: string;
  nextModelId?: string;
}

/** The transcript's completed model switches: how many, and the target of the latest one that names it. */
export interface ModelSwitchTally {
  completed: number;
  latestTarget: ModelRefDto | null;
}

export function modelSwitchTally(items: ReadonlyArray<ModelSwitchRowLike>): ModelSwitchTally {
  let completed = 0;
  let latestTarget: ModelRefDto | null = null;
  for (const item of items) {
    if (
      item.kind !== "compaction" ||
      item.reason !== "model_switch" ||
      item.running === true ||
      item.status !== "completed"
    ) {
      continue;
    }
    completed++;
    if (item.nextProvider !== undefined && item.nextModelId !== undefined) {
      latestTarget = { provider: item.nextProvider, modelId: item.nextModelId };
    }
  }
  return { completed, latestTarget };
}

/**
 * Watch over completed switch rows, per Session. The Session DTO is what the model badge, the
 * context window and the header price read, and nothing on the stream updates it — so a
 * completed switch row is the page's cue to refetch it. `seen` is the count already answered
 * for; `pending` holds a refetch until the Session is idle again, because the server rewrites
 * the Session row after the switch's compaction ends and only then reports idle — a read taken
 * on the row's arrival alone could still return the model it left.
 */
export interface ModelSwitchWatch {
  sessionId: string | null;
  seen: number;
  pending: boolean;
}

export function createModelSwitchWatch(): ModelSwitchWatch {
  return { sessionId: null, seen: 0, pending: false };
}

/**
 * Advances the watch over the loaded transcript and says whether to refetch the Session now.
 *
 * - The first reading for a Session (once its history has loaded) sets the watermark. Rows
 *   already in the history need no refetch — unless the latest one's target disagrees with the
 *   DTO on hand: a Session row held since before the switch (the page was left while it ran,
 *   and the list kept the old row) is refetched once rather than shown on the model it left.
 * - A later increase is a switch that completed while watching.
 * - Either is answered once the Session is idle, in whichever order the row and the idle state
 *   arrive, and only once.
 * - A decrease re-baselines without refetching: a stream resync rebuilds the tail window, and a
 *   shorter one can hold fewer rows.
 */
export function modelSwitchRefetchDue(
  watch: ModelSwitchWatch,
  now: {
    sessionId: string | null;
    loading: boolean;
    idle: boolean;
    tally: ModelSwitchTally;
    /** The model the Session DTO on hand names. */
    current: ModelRefDto | null;
  },
): boolean {
  if (now.sessionId === null || now.loading) return false;
  const { completed, latestTarget } = now.tally;
  if (watch.sessionId !== now.sessionId) {
    watch.sessionId = now.sessionId;
    watch.pending = latestTarget !== null && !sameModelRef(latestTarget, now.current);
  } else if (completed > watch.seen) {
    watch.pending = true;
  }
  watch.seen = completed;
  if (!watch.pending || !now.idle) return false;
  watch.pending = false;
  return true;
}

/** A model switch row's banner copy: a title naming the switch and its state, and a detail line naming the models. */
export interface ModelSwitchBannerCopy {
  title: string;
  detail?: string;
}

/**
 * Copy for a compaction row with `reason: "model_switch"`. Model ids, not display names: the
 * row renders from the Trace alone, and a model removed from the configuration since must still
 * read correctly. The `A → B` pair drops the `A` it cannot name (a window loaded after the
 * context's `session_meta`), and a failed row names the model it stayed on.
 */
export function modelSwitchBannerCopy(item: CompactionItem): ModelSwitchBannerCopy {
  const pair =
    item.nextModelId !== undefined
      ? item.prevModelId !== undefined
        ? `${item.prevModelId} → ${item.nextModelId}`
        : `→ ${item.nextModelId}`
      : undefined;
  if (item.running) {
    return {
      title: S.chat.modelSwitchRunning(item.mode),
      ...(pair !== undefined ? { detail: pair } : {}),
    };
  }
  if (item.status === "completed") {
    return { title: S.chat.modelSwitchDone, ...(pair !== undefined ? { detail: pair } : {}) };
  }
  return {
    title: S.chat.modelSwitchFailed,
    detail: S.chat.modelSwitchKept(item.status ?? "failed", item.prevModelId, item.errorMessage),
  };
}
