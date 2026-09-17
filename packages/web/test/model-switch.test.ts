/**
 * In-conversation model switch (model-switch.ts): the picker's gate, the two success shapes of
 * the switch request, the stale-row predicate that makes the Session DTO follow the running
 * context's `session_meta`, and the copy of the `/model` handoff, the confirm dialog and the
 * model-change marker in both locales. (The Web suite runs in a node environment and renders no
 * React, so the pure helpers are what get exercised.)
 */
import { afterEach, describe, expect, it } from "vitest";
import type { SessionInfo } from "@prismshadow/penguin-server/api";
import { setActiveStrings, zh } from "../src/lib/strings";
import { en } from "../src/lib/strings-en";
import {
  modelSwitchOutcome,
  sessionModelPick,
  sessionModelPickerDisabled,
  sessionRowStale,
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

describe("sessionRowStale", () => {
  it("is never stale before a session_meta was seen", () => {
    expect(sessionRowStale(null, A)).toBe(false);
    expect(sessionRowStale(null, null)).toBe(false);
  });

  it("is not stale while the row names the running context's model", () => {
    expect(sessionRowStale({ ...A }, A)).toBe(false);
  });

  it("is stale when the running context's model differs from the row's, by either half", () => {
    expect(sessionRowStale(B, A)).toBe(true);
    expect(sessionRowStale({ provider: A.provider, modelId: "a-2" }, A)).toBe(true);
    expect(sessionRowStale({ provider: "other", modelId: A.modelId }, A)).toBe(true);
    // A row not loaded yet disagrees with any model the stream names.
    expect(sessionRowStale(B, null)).toBe(true);
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

  it("the model-change marker names both model ids in both locales", () => {
    expect(zh.chat.modelChanged("a-1", "b-2")).toBe("模型已切换 · a-1 → b-2");
    expect(en.chat.modelChanged("a-1", "b-2")).toBe("Model switched · a-1 → b-2");
  });
});
