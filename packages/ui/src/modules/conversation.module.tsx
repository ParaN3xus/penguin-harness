/**
 * Conversation: the transcript of the docs-expert Task, composed from the screens' transcript
 * (`screens/transcript.tsx`, W6's chat components until they exist) over the fixture turns:
 *
 * - Streaming: the user's second prompt with its attachment, a finished work group opened on the
 *   `edit_file` diff, and the reply still arriving behind its caret;
 * - Settled: the first turn condensed to prompt, work group, the answer (a tree, a table, inline
 *   code) and the per-turn stats line;
 * - Approval: the running work group — thinking, a subagent with its row, and a command waiting
 *   for approval;
 * - Failed: the test command failed, its output opened, and the reply that reads it.
 */
import type { ReactNode } from "react";
import { fixturesFor } from "../fixtures";
import type {
  AssistantTextItem,
  ChatItem,
  ChatTurn,
  FixtureLang,
  Fixtures,
  ToolCallItem,
} from "../fixtures";
import { defineModule } from "../module";
import { Turn } from "../screens/transcript";

/**
 * Local fixture (K3): the failed run of the citation test — the command's output and the reply
 * that reads it. Not part of K-redesign §4.6; it belongs beside the session in `fixtures/` if a
 * failed tool row joins the dataset.
 */
const FAILED_OUTPUT = `TAP version 13
# Subtest: every [n] citation opens a file under corpus/
not ok 1 - every [n] citation opens a file under corpus/
  ---
  error: 'expected 200, got 404 for /corpus/claude-code-docs/hooks.md'
  ...
ok 2 - a question with no match cites nothing
# tests 2 · pass 1 · fail 1`;

const FAILED_REPLY: Readonly<Record<FixtureLang, string>> = {
  en: "The test caught a real gap: `hooks.md` was renamed upstream to `hooks-guide.md`, so citation [2] points at a file the index still lists. Re-indexing the corpus, then running the suite again.",
  zh: "测试抓到了一个真实的问题：上游把 `hooks.md` 改名为 `hooks-guide.md`，而索引里还留着旧文件，所以引用 [2] 指向了不存在的文件。先重建语料索引，再重新跑一遍测试。",
};

function item<T extends ChatItem = ChatItem>(turn: ChatTurn, id: string): T {
  const found = turn.items.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`fixture item ${id} is missing`);
  return found as T;
}

function Transcript({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-3xl">{children}</div>;
}

function Streaming({ f }: { f: Fixtures }) {
  const turn2 = f.session.turns[1]!;
  const reply = item<AssistantTextItem>(turn2, "tx4");
  const turn: ChatTurn = {
    index: 2,
    running: true,
    items: [
      item(turn2, "u2"),
      item(turn2, "th3"),
      item(turn2, "tc3"),
      item(turn2, "tc4"),
      { ...reply, streaming: true },
    ],
  };
  return (
    <Transcript>
      <Turn turn={turn} f={f} expansion={{ groups: new Set(["th3"]), rows: new Set(["tc4"]) }} />
    </Transcript>
  );
}

function Settled({ f }: { f: Fixtures }) {
  const turn1 = f.session.turns[0]!;
  const turn: ChatTurn = {
    ...turn1,
    items: ["u1", "th1", "tc1", "th2", "tc2", "tx3"].map((id) => item(turn1, id)),
  };
  return (
    <Transcript>
      <Turn turn={turn} f={f} />
    </Transcript>
  );
}

function Approval({ f }: { f: Fixtures }) {
  return (
    <Transcript>
      <Turn turn={f.session.turns[1]!} f={f} from="tx4" />
    </Transcript>
  );
}

function Failed({ f }: { f: Fixtures }) {
  const turn2 = f.session.turns[1]!;
  const test = item<ToolCallItem>(turn2, "tc7");
  const reply = item<AssistantTextItem>(turn2, "tx4");
  const turn: ChatTurn = {
    index: 2,
    running: false,
    items: [
      item(turn2, "u2"),
      item(turn2, "th3"),
      item(turn2, "tc4"),
      { ...test, state: "failed", durationMs: 2_140, output: FAILED_OUTPUT },
      { ...reply, id: "tx-failed", markdown: FAILED_REPLY[f.lang] },
    ],
    stats: {
      toolCalls: 3,
      inputTokens: 24_920,
      cacheReadTokens: 21_310,
      cacheWriteTokens: 2_240,
      outputTokens: 1_352,
      costUsd: 0.011,
      elapsedMs: 46_300,
      outputTps: 64,
    },
  };
  return (
    <Transcript>
      <Turn turn={turn} f={f} expansion={{ groups: new Set(["th3"]), rows: new Set(["tc7"]) }} />
    </Transcript>
  );
}

const VARIANTS = {
  streaming: Streaming,
  settled: Settled,
  approval: Approval,
  failed: Failed,
} as const;

export const module = defineModule({
  id: "conversation",
  title: "Conversation",
  description:
    "A Task's transcript: a user message with its attachment, settled prose with a table and code, a work group with thinking and tool rows, an opened diff, a running subagent, a pending approval and the stats line.",
  width: "wide",
  variants: [
    { key: "streaming", title: "Streaming" },
    { key: "settled", title: "Settled" },
    { key: "approval", title: "Approval" },
    { key: "failed", title: "Failed" },
  ],
  parts: [
    "chat-message-bubble",
    "chat-assistant-text",
    "chat-work-group",
    "chat-tool-call-card",
    "chat-approval",
    "chat-subagent-chip",
    "chat-task-stats-line",
    "chat-changes-card",
    "layout-disclosure-row",
    "icons-status-icon",
    "icons-avatars",
    "content-prose",
    "content-code-block",
    "content-diff-viewer",
    "data-stat-chip",
  ],
  render: (variant, { lang }) => {
    const View = VARIANTS[variant as keyof typeof VARIANTS] ?? Streaming;
    return <View f={fixturesFor(lang)} />;
  },
});
