/**
 * In-session model switch (`Session.switchModel` over `ContextEngine.switchModel`).
 *
 * A switch is a compaction whose new context opens on the model the user picked: the running
 * context is summarized on the model it is on — always summarize, whatever the configured mode —
 * and the next context opens on the target. Its paired events carry `reason: "model_switch"`
 * and the target as `next_provider` / `next_model_id`; the completed `compaction_end` is the
 * durable record of the switch until the new context's first message, so a Session reloaded
 * from the Trace alone resumes on the new model, carrying the summary.
 *
 * Covered here with fake collaborators: the three engine shapes (completed turns / a context a
 * compaction just closed / an open context without a completed turn), the never-run Session,
 * the same-model and refused-target no-ops, the failure paths that keep the old model, the
 * summary-too-large guard, and — for every switch path — what `resumeTrace` recovers from the
 * file the switch left behind. The real Agent's composition (Project config, credentials,
 * spawn inheritance) is in agent.test.ts; `agent.resumeSession` on switched Traces is in
 * resume.test.ts.
 */
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  assistantText,
  imageUrlMessage,
  sessionMeta,
  tokenUsage,
  userText,
} from "../src/omnimessage/index.js";
import type {
  CompactionBeginPayload,
  CompactionEndPayload,
  OmniMessage,
  SessionMetaPayload,
  TextPayload,
} from "../src/omnimessage/index.js";
import type {
  ApproveFn,
  EnvironmentInterface,
  GenerativeModelParameters,
  LLMInterface,
  LLMOutcome,
} from "../src/interfaces/index.js";
import type { CompactionSettings, OpenContextOptions } from "../src/engine/context-engine.js";
import { Session } from "../src/session.js";
import type { ModelSwitchSupport, SessionConfig } from "../src/session.js";
import type { ModelRef } from "../src/state/project-config.js";
import { Writer, readTrace, resumeTrace } from "../src/trace/index.js";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

interface ScriptedResponse {
  messages: OmniMessage[];
  outcome?: LLMOutcome;
}

/** Fake LLM that responds according to a script, recording each input it receives. */
class ScriptedLLM implements LLMInterface {
  calls: OmniMessage[][] = [];
  constructor(
    private readonly responses: ScriptedResponse[],
    readonly label = "llm",
  ) {}

  async *streamGenerate(
    params: GenerativeModelParameters,
  ): AsyncGenerator<OmniMessage, LLMOutcome> {
    this.calls.push(params.newMessages);
    const next = this.responses.shift();
    if (!next) {
      return { status: "retryable", errorMessage: `${this.label}: no scripted response` };
    }
    for (const msg of next.messages) yield msg;
    return next.outcome ?? { status: "completed" };
  }
}

/** Fake Environment that never runs real commands. */
const fakeEnvironment: EnvironmentInterface = {
  async listTools() {
    return [];
  },
  async *executeTool() {
    throw new Error("no tool runs in these scenarios");
  },
  toolPermission() {
    return "rw";
  },
};

const allowAll: ApproveFn = async () => "allow";

const usage = (requestTotal: number, sessionTotal: number): OmniMessage =>
  tokenUsage(
    { cache_read: 0, cache_write: 0, output: 0, total: sessionTotal },
    { cache_read: 0, cache_write: 0, output: 0, total: requestTotal },
  );

const settings = (over: Partial<CompactionSettings> = {}): CompactionSettings => ({
  // High enough that no scenario compacts on its own unless it says so.
  maxContextLength: 1000,
  maxSessionTurns: -1,
  mode: "summarize",
  prompt: "COMPACT NOW",
  ...over,
});

const MODEL_A: ModelRef = { provider: "custom", model_id: "model-a" };
const MODEL_B: ModelRef = { provider: "custom", model_id: "model-b" };
const SESSION_ID = "sess_switch";

const metaFor = (model: ModelRef): SessionMetaPayload => ({
  session_id: SESSION_ID,
  provider: model.provider,
  model_id: model.model_id,
  model_context_window: 200000,
  system_prompt: "sp",
  agent_state: "/tmp/state",
  workspace: "/tmp/ws",
});

const SUMMARY_REPLY = "[summary]the distilled summary[/summary]";
const SUMMARY_TEXT = "[context_summary]\nthe distilled summary\n[/context_summary]";

async function collect<R>(gen: AsyncGenerator<OmniMessage, R>): Promise<OmniMessage[]> {
  const all: OmniMessage[] = [];
  for (;;) {
    const res = await gen.next();
    if (res.done) return all;
    all.push(res.value);
  }
}

/** Like collect, but also captures the generator's return value. */
async function collectWithReturn<R>(
  gen: AsyncGenerator<OmniMessage, R>,
): Promise<{ all: OmniMessage[]; result: R }> {
  const all: OmniMessage[] = [];
  for (;;) {
    const res = await gen.next();
    if (res.done) return { all, result: res.value };
    all.push(res.value);
  }
}

type CompactionEventPayload = CompactionBeginPayload | CompactionEndPayload;

const compactionEvents = (msgs: OmniMessage[]): CompactionEventPayload[] =>
  msgs
    .filter((m) => {
      const t = (m.payload as { type?: string }).type ?? "";
      return t === "compaction_begin" || t === "compaction_end";
    })
    .map((m) => m.payload as CompactionEventPayload);

/** Each record's kind: the payload type, or `session_meta` for the file head (whose payload carries no type). */
const payloadTypes = (msgs: OmniMessage[]): (string | undefined)[] =>
  msgs.map((m) =>
    m.type === "session_meta" ? "session_meta" : (m.payload as { type?: string }).type,
  );

const textOf = (m: OmniMessage): string => (m.payload as TextPayload).text;

const NEXT_B = { next_provider: MODEL_B.provider, next_model_id: MODEL_B.model_id };

/**
 * The composition layer's half, as fakes that record what they were asked: which model each
 * opened context was asked for, which targets were validated, and which ref a never-run
 * Session's first context was re-assembled on. `llms` maps a model id to the LLM the next
 * context on that model gets (a plain compaction keeps the model, so it takes the current one's
 * next object); `vision` maps a model id to its vision answer (default: views images).
 */
interface Harness {
  opens: (ModelRef | undefined)[];
  validated: ModelRef[];
  reassembled: ModelRef[];
  written: OmniMessage[];
  trace: Writer;
  session: Session;
}

function harness(
  traces: string,
  args: {
    llmA: LLMInterface;
    /** LLM objects for contexts opened on each model id, taken in order. */
    llms: Record<string, LLMInterface[]>;
    compaction?: CompactionSettings;
    vision?: Record<string, boolean>;
    windows?: Record<string, number | undefined>;
    modelHasVision?: boolean;
    extras?: Partial<SessionConfig>;
  },
): Harness {
  const opens: (ModelRef | undefined)[] = [];
  const validated: ModelRef[] = [];
  const reassembled: ModelRef[] = [];
  const written: OmniMessage[] = [];
  let current = MODEL_A;
  const trace = new Writer({ tracesDir: traces, sessionId: SESSION_ID });
  const sink = {
    write: async (msg: OmniMessage) => {
      written.push(msg);
      await trace.write(msg);
    },
    rotate: () => trace.rotate(),
    currentPath: () => trace.currentPath(),
  };
  const modelSwitch: ModelSwitchSupport = {
    async validate(ref) {
      validated.push(ref);
      if (ref.model_id === "unknown") {
        throw new Error(`Model is not in the Project config: ${ref.model_id}`);
      }
      const windows = args.windows ?? {};
      return { contextWindow: ref.model_id in windows ? windows[ref.model_id] : 200000 };
    },
    async reassembleInitialContext(ref) {
      reassembled.push(ref);
      current = ref;
      return {
        sessionMeta: sessionMeta(metaFor(ref)),
        ...(args.vision?.[ref.model_id] !== undefined
          ? { modelHasVision: args.vision[ref.model_id]! }
          : {}),
      };
    },
  };
  const session = new Session({
    meta: metaFor(MODEL_A),
    bootstrap: async () => ({ llm: args.llmA }),
    environment: fakeEnvironment,
    trace: sink,
    compaction: args.compaction ?? settings(),
    openNextContext: ({ modelRef }: OpenContextOptions) => {
      opens.push(modelRef);
      const model = modelRef ?? current;
      current = model;
      const llm = args.llms[model.model_id]?.shift();
      if (!llm) throw new Error(`no LLM prepared for a context on ${model.model_id}`);
      return {
        llm,
        sessionMeta: sessionMeta(metaFor(model)),
        ...(args.vision?.[model.model_id] !== undefined
          ? { modelHasVision: args.vision[model.model_id]! }
          : {}),
      };
    },
    modelSwitch,
    imagesDir: join(traces, "scratch"),
    modelHasVision: args.modelHasVision ?? true,
    ...args.extras,
  });
  return { opens, validated, reassembled, written, trace, session };
}

const switchTo = (session: Session, model: ModelRef, signal?: AbortSignal) =>
  session.switchModel({
    provider: model.provider,
    modelId: model.model_id,
    ...(signal ? { signal } : {}),
  });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("in-session model switch", () => {
  let traces: string;
  const sessions: Session[] = [];

  beforeEach(async () => {
    traces = await mkdtemp(join(tmpdir(), "penguin-model-switch-"));
  });

  afterEach(async () => {
    for (const s of sessions.splice(0)) s.dispose();
    await rm(traces, { recursive: true, force: true });
  });

  it("after completed turns: summarizes on the old model whatever the configured mode, opens the next context on the target, and the closing end alone resumes it", async () => {
    const llmA = new ScriptedLLM(
      [
        { messages: [assistantText("answer one"), usage(50, 50)] },
        { messages: [assistantText(SUMMARY_REPLY), usage(60, 110)] },
      ],
      "A",
    );
    const llmB = new ScriptedLLM(
      [{ messages: [assistantText("answer two"), usage(20, 130)] }],
      "B",
    );
    const h = harness(traces, {
      llmA,
      llms: { [MODEL_B.model_id]: [llmB] },
      // The user's rule: a switch summarizes even when the Agent compacts by discarding.
      compaction: settings({ mode: "discard" }),
    });
    sessions.push(h.session);
    const oldPath = h.trace.currentPath();

    await collect(h.session.run([userText("task one")], { approve: allowAll }));
    expect(h.session.compactability()).toBe("ok");

    const { all, result } = await collectWithReturn(switchTo(h.session, MODEL_B));

    expect(result).toEqual({ status: "completed", previous: MODEL_A, next: MODEL_B });
    // The target was validated before anything else happened.
    expect(h.validated).toEqual([MODEL_B]);
    // Paired events: a summarize compaction whose reason is the switch, both naming the target.
    const events = compactionEvents(all);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      type: "compaction_begin",
      reason: "model_switch",
      mode: "summarize",
      context: 50,
      turns: 1,
      ...NEXT_B,
    });
    expect(events[1]).toMatchObject({
      type: "compaction_end",
      reason: "model_switch",
      mode: "summarize",
      status: "completed",
      ...NEXT_B,
    });
    // The compaction request went to the OLD model; the opener was told the target.
    expect(llmA.calls).toHaveLength(2);
    expect(llmA.calls[1]!.map(textOf)).toEqual(["COMPACT NOW"]);
    expect(h.opens).toEqual([MODEL_B]);
    // The Session answers with the new model from here.
    expect(h.session.provider).toBe(MODEL_B.provider);
    expect(h.session.modelId).toBe(MODEL_B.model_id);
    expect((h.session.metaMessage.payload as SessionMetaPayload).model_id).toBe(MODEL_B.model_id);
    expect(h.session.compactability()).toBe("just_compacted");

    // Durability: nothing has been written on the new model yet — the rotation is deferred,
    // so the old file is still the only one — and its last record is the switch's end. A
    // Session rebuilt from that file alone opens on the target, carrying the summary.
    expect(await readdir(dirname(oldPath))).toEqual([`${SESSION_ID}_001.jsonl`]);
    const closed = await readTrace(oldPath);
    expect(closed.at(-1)!.payload).toMatchObject({
      type: "compaction_end",
      reason: "model_switch",
      status: "completed",
      ...NEXT_B,
    });
    const resumed = resumeTrace(closed);
    expect(resumed.contextClosed).toBe(true);
    expect(resumed.nextModel).toEqual(MODEL_B);
    expect(textOf(resumed.pendingSummary!)).toBe(SUMMARY_TEXT);
    expect(resumed.carryOver).toEqual([]);

    // The summary leads the new model's first input; its file opens with the target's meta.
    await collect(h.session.run([userText("task two")], { approve: allowAll }));
    expect(llmB.calls).toHaveLength(1);
    expect(llmB.calls[0]!.map(textOf)).toEqual([SUMMARY_TEXT, "task two"]);
    expect(h.trace.currentPath()).not.toBe(oldPath);
    const fresh = await readTrace(h.trace.currentPath());
    expect(fresh[0]!.type).toBe("session_meta");
    expect((fresh[0]!.payload as SessionMetaPayload).model_id).toBe(MODEL_B.model_id);
    expect(textOf(fresh[1]!)).toBe(SUMMARY_TEXT);
  });

  it("right after a compaction: carries the held summary without a request, appending its pair to the closed file", async () => {
    const llmA = new ScriptedLLM(
      [
        // Over the threshold at the task's wrap-up round: the Agent's own compaction fires.
        { messages: [assistantText("answer one"), usage(150, 150)] },
        { messages: [assistantText(SUMMARY_REPLY), usage(160, 310)] },
      ],
      "A",
    );
    // The context the compaction opens stays on A; the switch then moves off it unused.
    const llmA2 = new ScriptedLLM([], "A2");
    const llmB = new ScriptedLLM(
      [{ messages: [assistantText("answer two"), usage(20, 330)] }],
      "B",
    );
    const h = harness(traces, {
      llmA,
      llms: { [MODEL_A.model_id]: [llmA2], [MODEL_B.model_id]: [llmB] },
      compaction: settings({ maxContextLength: 100 }),
    });
    sessions.push(h.session);
    const oldPath = h.trace.currentPath();

    await collect(h.session.run([userText("task one")], { approve: allowAll }));
    expect(h.opens).toEqual([undefined]);
    expect(h.session.compactability()).toBe("just_compacted");

    const { all, result } = await collectWithReturn(switchTo(h.session, MODEL_B));

    expect(result.status).toBe("completed");
    // No model was asked anything: the summary is already held.
    expect(llmA.calls).toHaveLength(2);
    expect(llmA2.calls).toHaveLength(0);
    // The pair says what travels: a summary.
    expect(compactionEvents(all)).toEqual([
      expect.objectContaining({
        type: "compaction_begin",
        reason: "model_switch",
        mode: "summarize",
        ...NEXT_B,
      }),
      expect.objectContaining({
        type: "compaction_end",
        reason: "model_switch",
        mode: "summarize",
        status: "completed",
        ...NEXT_B,
      }),
    ]);
    expect(h.opens).toEqual([undefined, MODEL_B]);
    expect(h.session.modelId).toBe(MODEL_B.model_id);

    // Durability: the pair went to the CLOSED file (still the only one) — the context the
    // compaction had opened on A was never written and simply never exists on disk — and the
    // file's last completed request is the compaction's, so the summary is recoverable.
    expect(await readdir(dirname(oldPath))).toEqual([`${SESSION_ID}_001.jsonl`]);
    const closed = await readTrace(oldPath);
    expect(payloadTypes(closed).slice(-3)).toEqual([
      "compaction_end",
      "compaction_begin",
      "compaction_end",
    ]);
    const resumed = resumeTrace(closed);
    expect(resumed.contextClosed).toBe(true);
    expect(resumed.nextModel).toEqual(MODEL_B);
    expect(textOf(resumed.pendingSummary!)).toBe(SUMMARY_TEXT);

    await collect(h.session.run([userText("task two")], { approve: allowAll }));
    expect(llmB.calls[0]!.map(textOf)).toEqual([SUMMARY_TEXT, "task two"]);
    const fresh = await readTrace(h.trace.currentPath());
    expect((fresh[0]!.payload as SessionMetaPayload).model_id).toBe(MODEL_B.model_id);
    expect(textOf(fresh[1]!)).toBe(SUMMARY_TEXT);
  });

  it("right after a discard compaction: the pair is a discard one, and nothing travels", async () => {
    const llmA = new ScriptedLLM(
      [{ messages: [assistantText("answer one"), usage(150, 150)] }],
      "A",
    );
    const llmA2 = new ScriptedLLM([], "A2");
    const llmB = new ScriptedLLM(
      [{ messages: [assistantText("answer two"), usage(20, 170)] }],
      "B",
    );
    const h = harness(traces, {
      llmA,
      llms: { [MODEL_A.model_id]: [llmA2], [MODEL_B.model_id]: [llmB] },
      compaction: settings({ maxContextLength: 100, mode: "discard" }),
    });
    sessions.push(h.session);
    const oldPath = h.trace.currentPath();

    await collect(h.session.run([userText("task one")], { approve: allowAll }));
    expect(h.session.compactability()).toBe("just_compacted");
    const { all, result } = await collectWithReturn(switchTo(h.session, MODEL_B));

    expect(result.status).toBe("completed");
    expect(compactionEvents(all).map((e) => e.mode)).toEqual(["discard", "discard"]);
    expect(compactionEvents(all)[1]).toMatchObject({ reason: "model_switch", ...NEXT_B });
    const resumed = resumeTrace(await readTrace(oldPath));
    expect(resumed.contextClosed).toBe(true);
    expect(resumed.nextModel).toEqual(MODEL_B);
    expect(resumed.pendingSummary).toBeUndefined();
    expect(resumed.carryOver).toEqual([]);

    await collect(h.session.run([userText("task two")], { approve: allowAll }));
    expect(llmB.calls[0]!.map(textOf)).toEqual(["task two"]);
  });

  it("an open context whose first request never completed is discarded: its text carry-over follows to the new model, and a resume reclaims it", async () => {
    const llmA = new ScriptedLLM([], "A");
    const llmB = new ScriptedLLM([{ messages: [assistantText("answer"), usage(20, 20)] }], "B");
    const h = harness(traces, { llmA, llms: { [MODEL_B.model_id]: [llmB] } });
    sessions.push(h.session);
    const oldPath = h.trace.currentPath();

    // Aborted before the request went out: the input is written and held as carry-over.
    const controller = new AbortController();
    controller.abort();
    await collect(h.session.run([userText("task one")], { signal: controller.signal }));
    expect(llmA.calls).toHaveLength(0);
    expect(h.session.compactability()).toBe("empty");

    const { all, result } = await collectWithReturn(switchTo(h.session, MODEL_B));

    expect(result.status).toBe("completed");
    expect(compactionEvents(all)).toEqual([
      expect.objectContaining({ reason: "model_switch", mode: "discard", ...NEXT_B }),
      expect.objectContaining({ reason: "model_switch", mode: "discard", status: "completed" }),
    ]);
    expect(llmA.calls).toHaveLength(0);
    expect(h.session.modelId).toBe(MODEL_B.model_id);

    // Durability: the file closes on the switch; the message the old context never answered
    // is owed by the new one and comes back as carry-over.
    const closed = await readTrace(oldPath);
    expect(payloadTypes(closed)).toEqual([
      "session_meta",
      "text",
      "abort",
      "compaction_begin",
      "compaction_end",
    ]);
    const resumed = resumeTrace(closed);
    expect(resumed.contextClosed).toBe(true);
    expect(resumed.nextModel).toEqual(MODEL_B);
    expect(resumed.pendingSummary).toBeUndefined();
    expect(resumed.carryOver.map(textOf)).toEqual(["task one"]);

    // In-process the carry-over rides the same way.
    await collect(h.session.run([userText("task two")], { approve: allowAll }));
    expect(llmB.calls[0]!.map(textOf)).toEqual(["task one", "task two"]);
  });

  it("a just-compacted context the user already wrote on is discarded the same way, and the summary written there is reclaimed", async () => {
    const llmA = new ScriptedLLM(
      [
        { messages: [assistantText("answer one"), usage(150, 150)] },
        { messages: [assistantText(SUMMARY_REPLY), usage(160, 310)] },
      ],
      "A",
    );
    const llmA2 = new ScriptedLLM([], "A2");
    const llmB = new ScriptedLLM([{ messages: [assistantText("answer"), usage(20, 330)] }], "B");
    const h = harness(traces, {
      llmA,
      llms: { [MODEL_A.model_id]: [llmA2], [MODEL_B.model_id]: [llmB] },
      compaction: settings({ maxContextLength: 100 }),
    });
    sessions.push(h.session);

    await collect(h.session.run([userText("task one")], { approve: allowAll }));
    // The next run rotates the Trace (summary + prompt land in the new file) and then never
    // issues its request: the context on A2 is open, with the summary as carry-over.
    const controller = new AbortController();
    controller.abort();
    await collect(h.session.run([userText("task two")], { signal: controller.signal }));
    const openPath = h.trace.currentPath();
    expect(payloadTypes(await readTrace(openPath))).toEqual([
      "session_meta",
      "text",
      "text",
      "abort",
    ]);
    expect(h.session.compactability()).toBe("just_compacted");

    const { all, result } = await collectWithReturn(switchTo(h.session, MODEL_B));

    expect(result.status).toBe("completed");
    expect(compactionEvents(all).map((e) => e.mode)).toEqual(["discard", "discard"]);
    expect(llmA2.calls).toHaveLength(0);

    const resumed = resumeTrace(await readTrace(openPath));
    expect(resumed.contextClosed).toBe(true);
    expect(resumed.nextModel).toEqual(MODEL_B);
    expect(resumed.carryOver.map(textOf)).toEqual([SUMMARY_TEXT, "task two"]);

    await collect(h.session.run([userText("task three")], { approve: allowAll }));
    // In-process the aborted input is carried as-is (it never reached a request).
    expect(llmB.calls[0]!.map(textOf)).toEqual([SUMMARY_TEXT, "task two", "task three"]);
  });

  it("a Session that never ran is re-assembled on the target: no events, nothing written, and its first run opens on it", async () => {
    const llmB = new ScriptedLLM([{ messages: [assistantText("answer"), usage(20, 20)] }], "B");
    const h = harness(traces, { llmA: llmB, llms: {}, vision: { [MODEL_B.model_id]: false } });
    sessions.push(h.session);

    const { all, result } = await collectWithReturn(switchTo(h.session, MODEL_B));

    expect(result).toEqual({ status: "completed", previous: MODEL_A, next: MODEL_B });
    expect(all).toEqual([]);
    expect(h.written).toEqual([]);
    expect(h.validated).toEqual([MODEL_B]);
    expect(h.reassembled).toEqual([MODEL_B]);
    expect(h.opens).toEqual([]);
    expect(h.session.provider).toBe(MODEL_B.provider);
    expect(h.session.modelId).toBe(MODEL_B.model_id);
    expect(h.session.compactability()).toBe("empty");

    // The first run writes the re-assembled context's meta at the file's head, and the
    // re-assembled model's vision answer governs the Prompt fold from the start.
    await collect(
      h.session.run([userText("look"), imageUrlMessage("https://images.invalid/pic.png")], {
        approve: allowAll,
      }),
    );
    const file = await readTrace(h.trace.currentPath());
    expect(file[0]!.type).toBe("session_meta");
    expect((file[0]!.payload as SessionMetaPayload).model_id).toBe(MODEL_B.model_id);
    expect(llmB.calls[0]!.map((m) => (m.payload as { type: string }).type)).toEqual(["text"]);
    expect(textOf(llmB.calls[0]![0]!)).toContain(
      "[attached image: https://images.invalid/pic.png]",
    );
  });

  it("the same model completes with no events", async () => {
    const llmA = new ScriptedLLM([{ messages: [assistantText("answer one"), usage(50, 50)] }], "A");
    const h = harness(traces, { llmA, llms: {} });
    sessions.push(h.session);
    await collect(h.session.run([userText("task one")], { approve: allowAll }));

    const { all, result } = await collectWithReturn(switchTo(h.session, MODEL_A));

    expect(result).toEqual({ status: "completed", previous: MODEL_A, next: MODEL_A });
    expect(all).toEqual([]);
    expect(llmA.calls).toHaveLength(1);
    expect(h.session.compactability()).toBe("ok");
  });

  it("a target that fails validation is refused before anything is produced", async () => {
    const llmA = new ScriptedLLM([{ messages: [assistantText("answer one"), usage(50, 50)] }], "A");
    const h = harness(traces, { llmA, llms: {} });
    sessions.push(h.session);
    await collect(h.session.run([userText("task one")], { approve: allowAll }));
    const writtenBefore = h.written.length;

    await expect(
      collect(switchTo(h.session, { provider: "custom", model_id: "unknown" })),
    ).rejects.toThrow(/is not in the Project config/);

    expect(llmA.calls).toHaveLength(1);
    expect(h.written).toHaveLength(writtenBefore);
    expect(h.session.modelId).toBe(MODEL_A.model_id);
  });

  it("a compaction that fails keeps the old model: the end names the target, nothing rotates, and the next run stays put", async () => {
    const llmA = new ScriptedLLM(
      [
        { messages: [assistantText("answer one"), usage(50, 50)] },
        { messages: [], outcome: { status: "fatal", errorCode: "auth", errorMessage: "nope" } },
        { messages: [assistantText("answer two"), usage(60, 110)] },
      ],
      "A",
    );
    const llmB = new ScriptedLLM([], "B");
    const h = harness(traces, { llmA, llms: { [MODEL_B.model_id]: [llmB] } });
    sessions.push(h.session);
    const oldPath = h.trace.currentPath();
    await collect(h.session.run([userText("task one")], { approve: allowAll }));

    const { all, result } = await collectWithReturn(switchTo(h.session, MODEL_B));

    expect(result).toEqual({ status: "fatal", previous: MODEL_A, next: MODEL_B });
    expect(compactionEvents(all)[1]).toMatchObject({
      type: "compaction_end",
      reason: "model_switch",
      status: "fatal",
      error_code: "auth",
      error_message: "nope",
      ...NEXT_B,
    });
    expect(h.opens).toEqual([]);
    expect(h.session.modelId).toBe(MODEL_A.model_id);
    expect(h.session.compactability()).toBe("ok");
    // A resume of the file reads an open context on A: the failed end closes nothing.
    const resumed = resumeTrace(await readTrace(oldPath));
    expect(resumed.contextClosed).toBe(false);
    expect(resumed.nextModel).toBeUndefined();

    await collect(h.session.run([userText("task two")], { approve: allowAll }));
    expect(llmA.calls).toHaveLength(3);
    expect(llmB.calls).toHaveLength(0);
    expect(h.trace.currentPath()).toBe(oldPath);
  });

  it("an aborted compaction request keeps the old model too", async () => {
    const llmA = new ScriptedLLM(
      [
        { messages: [assistantText("answer one"), usage(50, 50)] },
        { messages: [], outcome: { status: "aborted" } },
      ],
      "A",
    );
    const h = harness(traces, { llmA, llms: { [MODEL_B.model_id]: [new ScriptedLLM([], "B")] } });
    sessions.push(h.session);
    await collect(h.session.run([userText("task one")], { approve: allowAll }));

    const { all, result } = await collectWithReturn(switchTo(h.session, MODEL_B));

    expect(result.status).toBe("aborted");
    expect(compactionEvents(all)[1]).toMatchObject({ status: "aborted", ...NEXT_B });
    expect(h.session.modelId).toBe(MODEL_A.model_id);
    expect(h.opens).toEqual([]);
  });

  it("a summary the target's window cannot hold ends the switch fatal, naming both numbers, and the Session stays on its model", async () => {
    const longSummary = `[summary]${"x".repeat(12000)}[/summary]`;
    const llmA = new ScriptedLLM(
      [
        { messages: [assistantText("answer one"), usage(50, 50)] },
        { messages: [assistantText(longSummary), usage(3100, 3150)] },
      ],
      "A",
    );
    const llmB = new ScriptedLLM([], "B");
    const h = harness(traces, {
      llmA,
      llms: { [MODEL_B.model_id]: [llmB] },
      // The smallest window taken at face value: 4096 − prefix − 2048 headroom leaves ~2k.
      windows: { [MODEL_B.model_id]: 4096 },
    });
    sessions.push(h.session);
    await collect(h.session.run([userText("task one")], { approve: allowAll }));

    const { all, result } = await collectWithReturn(switchTo(h.session, MODEL_B));

    expect(result.status).toBe("fatal");
    const end = compactionEvents(all)[1] as CompactionEndPayload;
    expect(end).toMatchObject({ status: "fatal", error_code: "unsupported", ...NEXT_B });
    expect(end.error_message).toMatch(/about 3000 tokens/);
    expect(end.error_message).toMatch(/4096 tokens/);
    expect(end.error_message).toMatch(/stays on its current model/);
    expect(h.opens).toEqual([]);
    expect(h.session.modelId).toBe(MODEL_A.model_id);
    // The compaction exchange is committed on the old object, like any failed-after-commit
    // compaction; the context is still compactable (and switchable to a roomier model).
    expect(h.session.compactability()).toBe("ok");
  });

  it("a target without a usable window is not guarded", async () => {
    const longSummary = `[summary]${"x".repeat(12000)}[/summary]`;
    const llmA = new ScriptedLLM(
      [
        { messages: [assistantText("answer one"), usage(50, 50)] },
        { messages: [assistantText(longSummary), usage(3100, 3150)] },
      ],
      "A",
    );
    const h = harness(traces, {
      llmA,
      llms: { [MODEL_B.model_id]: [new ScriptedLLM([], "B")] },
      windows: { [MODEL_B.model_id]: undefined },
    });
    sessions.push(h.session);
    await collect(h.session.run([userText("task one")], { approve: allowAll }));

    const { result } = await collectWithReturn(switchTo(h.session, MODEL_B));
    expect(result.status).toBe("completed");
    expect(h.session.modelId).toBe(MODEL_B.model_id);
  });

  it("the vision answer follows the model: a switch to a model without vision folds the next Prompt's images", async () => {
    const llmA = new ScriptedLLM(
      [
        { messages: [assistantText("answer one"), usage(50, 50)] },
        { messages: [assistantText(SUMMARY_REPLY), usage(60, 110)] },
      ],
      "A",
    );
    const llmB = new ScriptedLLM(
      [{ messages: [assistantText("answer two"), usage(20, 130)] }],
      "B",
    );
    const h = harness(traces, {
      llmA,
      llms: { [MODEL_B.model_id]: [llmB] },
      vision: { [MODEL_B.model_id]: false },
    });
    sessions.push(h.session);
    await collect(h.session.run([userText("task one")], { approve: allowAll }));
    await collect(switchTo(h.session, MODEL_B));

    await collect(
      h.session.run([userText("look"), imageUrlMessage("https://images.invalid/pic.png")], {
        approve: allowAll,
      }),
    );

    const types = llmB.calls[0]!.map((m) => (m.payload as { type: string }).type);
    expect(types).toEqual(["text", "text"]);
    expect(textOf(llmB.calls[0]![1]!)).toContain(
      "[attached image: https://images.invalid/pic.png]",
    );
  });

  it("a Session resumed after a restart builds its engine first, so the switch compacts the real conversation", async () => {
    // What agent.resumeSession derives from a Trace: real history, no engine yet.
    const resumedLLM = new ScriptedLLM(
      [{ messages: [assistantText(SUMMARY_REPLY), usage(90, 90)] }],
      "A",
    );
    const llmB = new ScriptedLLM([], "B");
    const h = harness(traces, {
      llmA: resumedLLM,
      llms: { [MODEL_B.model_id]: [llmB] },
      extras: {
        metaAlreadyWritten: true,
        initialEngineState: { sessionTurns: 3, lastRequestTotal: 80 },
      },
    });
    sessions.push(h.session);
    expect(h.session.compactability()).toBe("ok");

    const { all, result } = await collectWithReturn(switchTo(h.session, MODEL_B));

    expect(result.status).toBe("completed");
    expect(resumedLLM.calls).toHaveLength(1);
    expect(compactionEvents(all)[0]).toMatchObject({ reason: "model_switch", turns: 3, ...NEXT_B });
    expect(h.session.modelId).toBe(MODEL_B.model_id);
  });

  it("switching is refused when compaction is not configured and there is a context to close", async () => {
    const llmA = new ScriptedLLM([{ messages: [assistantText("answer one"), usage(50, 50)] }], "A");
    const written: OmniMessage[] = [];
    const session = new Session({
      meta: metaFor(MODEL_A),
      bootstrap: async () => ({ llm: llmA }),
      environment: fakeEnvironment,
      trace: { write: async (m) => void written.push(m) },
      modelSwitch: {
        validate: async () => ({ contextWindow: undefined }),
        reassembleInitialContext: async () => ({}),
      },
      imagesDir: join(traces, "scratch"),
      modelHasVision: true,
    });
    sessions.push(session);
    await collect(session.run([userText("task one")], { approve: allowAll }));

    await expect(collect(switchTo(session, MODEL_B))).rejects.toThrow(
      /Context compaction is not configured/,
    );
    expect(session.modelId).toBe(MODEL_A.model_id);
  });

  it("switching is unavailable without the composition layer's support", async () => {
    const session = new Session({
      meta: metaFor(MODEL_A),
      bootstrap: async () => ({ llm: new ScriptedLLM([], "A") }),
      environment: fakeEnvironment,
      imagesDir: join(traces, "scratch"),
      modelHasVision: true,
    });
    sessions.push(session);
    await expect(collect(switchTo(session, MODEL_B))).rejects.toThrow(
      /Switching the model is not available/,
    );
  });
});
