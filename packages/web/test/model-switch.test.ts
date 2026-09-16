/**
 * In-conversation model switch (model-switch.ts): the picker's gate, the two success shapes of
 * the switch request, the refetch watch that makes the Session DTO follow a completed switch, and
 * the compaction row's copy for `reason: "model_switch"` in both locales. (The Web suite runs in
 * a node environment and renders no React, so the pure helpers are what get exercised.)
 */
import { afterEach, describe, expect, it } from "vitest";
import type { SessionInfo } from "@prismshadow/penguin-server/api";
import { setActiveStrings, zh } from "../src/lib/strings";
import { en } from "../src/lib/strings-en";
import type { CompactionItem } from "../src/lib/omni/stream-model";
import {
  createModelSwitchWatch,
  modelSwitchBannerCopy,
  modelSwitchOutcome,
  modelSwitchRefetchDue,
  modelSwitchTally,
  sessionModelPick,
  sessionModelPickerDisabled,
} from "../src/features/chat/model-switch";

// S is a live binding shared across the suite: always hand it back the default.
afterEach(() => setActiveStrings(zh));

const A = { provider: "anthropic", modelId: "a-1" };
const B = { provider: "openai", modelId: "b-2" };

describe("sessionModelPickerDisabled", () => {
  it("disables the picker exactly while a compaction could not start", () => {
    expect(sessionModelPickerDisabled("running")).toBe(true);
    expect(sessionModelPickerDisabled("compacting")).toBe(true);
    expect(sessionModelPickerDisabled("idle")).toBe(false);
  });
});

describe("sessionModelPick", () => {
  it("does nothing for the model the conversation is already on", () => {
    expect(
      sessionModelPick({ current: A, picked: { ...A }, status: "idle", transcriptEmpty: false }),
    ).toEqual({ act: "none" });
  });

  it("does nothing while busy, even for another model", () => {
    for (const status of ["running", "compacting"] as const) {
      expect(sessionModelPick({ current: A, picked: B, status, transcriptEmpty: false })).toEqual({
        act: "none",
      });
    }
  });

  it("asks first, and says the switch is direct only for an empty transcript", () => {
    expect(
      sessionModelPick({ current: A, picked: B, status: "idle", transcriptEmpty: false }),
    ).toEqual({ act: "confirm", direct: false });
    expect(
      sessionModelPick({ current: A, picked: B, status: "idle", transcriptEmpty: true }),
    ).toEqual({
      act: "confirm",
      direct: true,
    });
    // Same provider, another model id is still another model.
    expect(
      sessionModelPick({
        current: A,
        picked: { provider: A.provider, modelId: "a-2" },
        status: "idle",
        transcriptEmpty: false,
      }).act,
    ).toBe("confirm");
  });
});

describe("modelSwitchOutcome", () => {
  it("tells the inline 200 (a SessionResponse) from the streaming 202 (a TaskCreateResponse)", () => {
    const session = { sessionId: "session-1", ...B } as unknown as SessionInfo;
    expect(modelSwitchOutcome({ session })).toEqual({ kind: "applied", session });
    expect(modelSwitchOutcome({ sessionId: "session-2" })).toEqual({
      kind: "streaming",
      sessionId: "session-2",
    });
  });
});

type Row = {
  kind: string;
  reason?: string;
  running?: boolean;
  status?: string;
  nextProvider?: string;
  nextModelId?: string;
};
const switchRow = (status: string | undefined, running = false, to = B): Row => ({
  kind: "compaction",
  reason: "model_switch",
  running,
  nextProvider: to.provider,
  nextModelId: to.modelId,
  ...(status !== undefined ? { status } : {}),
});

describe("modelSwitchTally", () => {
  it("counts only settled, completed model_switch compactions, and names the latest target", () => {
    const rows: Row[] = [
      { kind: "user_text" },
      switchRow("completed", false, B),
      switchRow(undefined, true, A),
      switchRow("fatal", false, A),
      switchRow("aborted", false, A),
      { kind: "compaction", reason: "manual", running: false, status: "completed" },
      switchRow("completed", false, { provider: "google", modelId: "c-3" }),
    ];
    expect(modelSwitchTally(rows)).toEqual({
      completed: 2,
      latestTarget: { provider: "google", modelId: "c-3" },
    });
    expect(modelSwitchTally([{ kind: "user_text" }])).toEqual({ completed: 0, latestTarget: null });
  });
});

describe("modelSwitchRefetchDue", () => {
  /** One reading of the page: the loaded transcript's tally and the DTO's model. */
  const reading = (
    over: Partial<{
      sessionId: string | null;
      loading: boolean;
      idle: boolean;
      completed: number;
      latestTarget: typeof A | null;
      current: typeof A | null;
    }>,
  ) => {
    const r = {
      sessionId: "s" as string | null,
      loading: false,
      idle: true,
      completed: 0,
      latestTarget: null as typeof A | null,
      current: A as typeof A | null,
      ...over,
    };
    return {
      sessionId: r.sessionId,
      loading: r.loading,
      idle: r.idle,
      tally: { completed: r.completed, latestTarget: r.latestTarget },
      current: r.current,
    };
  };

  it("baselines on the first loaded reading, so switches the DTO already reflects refetch nothing", () => {
    const w = createModelSwitchWatch();
    expect(modelSwitchRefetchDue(w, reading({ loading: true }))).toBe(false);
    // History holds two switches, the latest onto A — the model the DTO names.
    expect(modelSwitchRefetchDue(w, reading({ completed: 2, latestTarget: A }))).toBe(false);
    expect(modelSwitchRefetchDue(w, reading({ completed: 2, latestTarget: A }))).toBe(false);
  });

  it("refetches once when the history's latest switch disagrees with a row held from before it", () => {
    const w = createModelSwitchWatch();
    // Not idle yet: held.
    expect(
      modelSwitchRefetchDue(w, reading({ idle: false, completed: 1, latestTarget: B, current: A })),
    ).toBe(false);
    expect(modelSwitchRefetchDue(w, reading({ completed: 1, latestTarget: B, current: A }))).toBe(
      true,
    );
    // Answered once, even if the server row still disagrees.
    expect(modelSwitchRefetchDue(w, reading({ completed: 1, latestTarget: B, current: A }))).toBe(
      false,
    );
  });

  it("refetches a switch that completed while watching once the Session is idle, in either order", () => {
    // Row first, idle later: held until idle.
    const w = createModelSwitchWatch();
    modelSwitchRefetchDue(w, reading({}));
    expect(modelSwitchRefetchDue(w, reading({ idle: false, completed: 1, latestTarget: B }))).toBe(
      false,
    );
    expect(modelSwitchRefetchDue(w, reading({ completed: 1, latestTarget: B }))).toBe(true);
    expect(modelSwitchRefetchDue(w, reading({ completed: 1, latestTarget: B, current: B }))).toBe(
      false,
    );

    // Idle first, row later: due on the row.
    const v = createModelSwitchWatch();
    modelSwitchRefetchDue(v, reading({ idle: false }));
    expect(modelSwitchRefetchDue(v, reading({}))).toBe(false);
    expect(modelSwitchRefetchDue(v, reading({ completed: 1, latestTarget: B }))).toBe(true);
  });

  it("re-baselines on a shorter rebuilt window and on another Session without refetching", () => {
    const w = createModelSwitchWatch();
    modelSwitchRefetchDue(w, reading({ completed: 3, latestTarget: A }));
    // A resync rebuilt a shorter tail window.
    expect(modelSwitchRefetchDue(w, reading({ completed: 1, latestTarget: A }))).toBe(false);
    // A new switch on top of that window is still seen.
    expect(modelSwitchRefetchDue(w, reading({ completed: 2, latestTarget: B }))).toBe(true);
    // Another Session whose DTO matches its history.
    expect(
      modelSwitchRefetchDue(w, reading({ sessionId: "t", completed: 5, latestTarget: A })),
    ).toBe(false);
    // No Session (draft).
    expect(modelSwitchRefetchDue(w, reading({ sessionId: null, completed: 9 }))).toBe(false);
  });
});

const row = (over: Partial<CompactionItem>): CompactionItem => ({
  kind: "compaction",
  id: 1,
  reason: "model_switch",
  mode: "summarize",
  running: false,
  ...over,
});

describe("modelSwitchBannerCopy", () => {
  it("reads as the design's copy in zh", () => {
    setActiveStrings(zh);
    expect(
      modelSwitchBannerCopy(row({ running: true, prevModelId: "a-1", nextModelId: "b-2" })),
    ).toEqual({ title: "切换模型：压缩中", detail: "a-1 → b-2" });
    expect(
      modelSwitchBannerCopy(row({ status: "completed", prevModelId: "a-1", nextModelId: "b-2" })),
    ).toEqual({ title: "已切换模型", detail: "a-1 → b-2" });
    expect(
      modelSwitchBannerCopy(
        row({ status: "fatal", prevModelId: "a-1", nextModelId: "b-2", errorMessage: "too large" }),
      ),
    ).toEqual({ title: "切换模型失败", detail: "仍使用 a-1：too large" });
  });

  it("names the switch in en, and never reuses the plain compaction titles", () => {
    setActiveStrings(en);
    const running = modelSwitchBannerCopy(
      row({ running: true, prevModelId: "a-1", nextModelId: "b-2" }),
    );
    expect(running).toEqual({ title: "Switching model: compacting", detail: "a-1 → b-2" });
    expect(running.title).not.toBe(en.chat.compactionRunning("summarize"));
    expect(modelSwitchBannerCopy(row({ status: "completed", nextModelId: "b-2" }))).toEqual({
      title: "Switched model",
      detail: "→ b-2",
    });
    expect(modelSwitchBannerCopy(row({ status: "aborted", prevModelId: "a-1" }))).toEqual({
      title: "Model switch failed",
      detail: "aborted, still on a-1",
    });
  });

  it("degrades without the model it left: the pair drops it and a failure names the previous model generically", () => {
    for (const dict of [zh, en]) {
      setActiveStrings(dict);
      const failed = modelSwitchBannerCopy(row({ status: "retryable", nextModelId: "b-2" }));
      expect(failed.title).toBe(dict.chat.modelSwitchFailed);
      expect(failed.detail).toBe(dict.chat.modelSwitchKept("retryable"));
      expect(failed.detail).not.toContain("undefined");
      // A discard-mode switch (nothing to summarize) says so while it runs.
      expect(modelSwitchBannerCopy(row({ running: true, mode: "discard" })).title).toBe(
        dict.chat.modelSwitchRunning("discard"),
      );
    }
  });
});

describe("/model copy", () => {
  it("says in both locales that /model opens a new conversation, and points at the toolbar picker", () => {
    expect(zh.chat.switchModel).toContain("新会话");
    expect(zh.chat.switchModel).toContain("本会话保持不变");
    expect(zh.chat.switchModelTitle).toContain("新会话");
    expect(zh.chat.modelSwitchTargetTitle("b-2")).toContain("新开");
    expect(zh.chat.switchModelNote).toContain("工具栏");
    expect(en.chat.switchModel).toMatch(/new session/);
    expect(en.chat.switchModelTitle).toMatch(/New conversation/);
    expect(en.chat.modelSwitchTargetTitle("b-2")).toMatch(/new conversation on b-2/);
    expect(en.chat.switchModelNote).toMatch(/toolbar/);
  });

  it("the confirm dialog uses the design's zh body and a two-choice label", () => {
    expect(zh.chat.modelSwitchInSessionBody("A", "B")).toBe(
      "将先用当前模型「A」压缩上下文，成功后以「B」继续本对话；压缩失败则保持「A」。",
    );
    expect(zh.chat.modelSwitchInSessionConfirm).toBe("压缩并切换");
    expect(zh.chat.modelSwitchInSessionDirectBody("B")).toContain("直接切换到「B」");
    expect(en.chat.modelSwitchInSessionBody("A", "B")).toContain('"B"');
  });
});
