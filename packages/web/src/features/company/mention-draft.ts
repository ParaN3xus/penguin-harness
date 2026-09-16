/**
 * The channel composer's draft (pure, unit tested): the text the box shows, with a picked
 * mention written as `@<display name>`, and the mentions tracked as ranges over that text so
 * the message that is sent still carries the token the server resolves (`@ceo`,
 * `@user:alice`, `@all` — see channel-mentions.ts).
 *
 * Why ranges rather than matching names on send: names are not unique and may hold spaces or
 * CJK, so `@Alice Chen` cannot be read back to an id from the text alone. A range remembers
 * which candidate was picked; the text only has to still say what was inserted.
 *
 * The rules:
 *
 * - An edit that touches a mention's characters — typing inside it, deleting part of it,
 *   replacing a selection across it — drops the range, and what is left goes out as plain
 *   text. Nothing tries to repair a half-edited name.
 * - Text typed or pasted anywhere else only shifts the ranges after it. A pasted `@Name` is
 *   plain text; a typed or pasted `@id` is left as it is and the server resolves it as always.
 * - A range converts only when its token would parse back as itself in the sent message: the
 *   `@` must not be glued to a word (`x@Alice`) and the text after it must not extend the id
 *   (`@Alicey`, `@Alice.md`). Such a mention is still tracked — delete the stray character and
 *   it converts again — but until then it is sent as the name the box shows, and the composer
 *   stops highlighting it.
 */
import { mentionRuns } from "./channel-mentions";

export interface DraftMention {
  /** Offset of the `@` in the draft text. */
  start: number;
  /** The display name shown after the `@`, as it was when the mention was picked. */
  label: string;
  /** What the sent message carries after the `@`: a bare id, `user:<id>` or `all`. */
  wire: string;
}

export interface MentionDraft {
  text: string;
  /** Sorted by `start`, never overlapping. */
  mentions: readonly DraftMention[];
}

export const EMPTY_DRAFT: MentionDraft = { text: "", mentions: [] };

/** The offset just past a mention's last character. */
export const mentionEnd = (m: DraftMention): number => m.start + 1 + m.label.length;

/**
 * Replaces `from`…`to` with `insert`: a mention that overlaps the replaced span — or that the
 * span sits strictly inside — is dropped, one wholly before it stays, one wholly after it moves.
 */
function splice(draft: MentionDraft, from: number, to: number, insert: string): MentionDraft {
  const delta = insert.length - (to - from);
  const mentions: DraftMention[] = [];
  for (const m of draft.mentions) {
    const end = mentionEnd(m);
    if (end <= from) mentions.push(m);
    else if (m.start >= to) mentions.push({ ...m, start: m.start + delta });
  }
  return { text: draft.text.slice(0, from) + insert + draft.text.slice(to), mentions };
}

/**
 * Replaces the `@query` being typed (`start`…`caret`) with `@<label> ` and tracks the new
 * mention; returns the draft and the caret, which lands after the trailing space.
 */
export function draftInsertMention(
  draft: MentionDraft,
  start: number,
  caret: number,
  label: string,
  wire: string,
): { draft: MentionDraft; caret: number } {
  const inserted = `@${label} `;
  const next = splice(draft, start, caret, inserted);
  const mentions = [...next.mentions, { start, label, wire }].sort((a, b) => a.start - b.start);
  return { draft: { text: next.text, mentions }, caret: start + inserted.length };
}

/**
 * The draft after the box's value became `next`. A textarea reports only the new value, so the
 * edit is recovered as the span between the longest common prefix and suffix. When that is
 * ambiguous — typing an `a` inside `@Anna` reads the same as typing it after — the caret
 * decides: an insertion ends where the caret now stands, so the common suffix cannot reach
 * past it.
 */
export function draftApplyEdit(draft: MentionDraft, next: string, caret?: number): MentionDraft {
  const prev = draft.text;
  if (prev === next) return draft;
  const max = Math.min(prev.length, next.length);
  let suffix = 0;
  while (suffix < max && prev[prev.length - 1 - suffix] === next[next.length - 1 - suffix]) {
    suffix += 1;
  }
  if (caret !== undefined) suffix = Math.max(0, Math.min(suffix, next.length - caret));
  let prefix = 0;
  const prefixMax = max - suffix;
  while (prefix < prefixMax && prev[prefix] === next[prefix]) prefix += 1;
  return splice(draft, prefix, prev.length - suffix, next.slice(prefix, next.length - suffix));
}

/** Whether a tracked mention's `@` sits at `offset` (the composer keeps its panel closed there). */
export function mentionStartsAt(draft: MentionDraft, offset: number): boolean {
  return draft.mentions.some((m) => m.start === offset);
}

/** The draft as sent, with the given mentions converted and every other one left as its text. */
function convert(draft: MentionDraft, live: ReadonlySet<DraftMention>): string {
  let out = "";
  let last = 0;
  for (const m of draft.mentions) {
    if (!live.has(m)) continue;
    out += `${draft.text.slice(last, m.start)}@${m.wire}`;
    last = mentionEnd(m);
  }
  return out + draft.text.slice(last);
}

/**
 * The mentions that convert: each still reads `@<label>`, and converted, its token parses back
 * as itself under the server's grammar (mentionRuns mirrors it). Converting one mention changes
 * the character the next one's `@` is judged against — `@张三@李四` becomes `@zhangsan@lisi`,
 * where the second `@` is glued to a word — and that influence only ever runs left to right.
 * So the first failing mention is reverted to its text and the rest are judged again: a later
 * one may have failed only because of it.
 */
export function liveMentions(draft: MentionDraft): DraftMention[] {
  const live = new Set(
    draft.mentions.filter((m) => draft.text.slice(m.start, mentionEnd(m)) === `@${m.label}`),
  );
  for (;;) {
    const wire = convert(draft, live);
    /** Offset of each parsed token's `@` in the converted text, to the token. */
    const parsed = new Map<number, string>();
    let offset = 0;
    for (const run of mentionRuns(wire)) {
      if (run.mention !== null) parsed.set(offset, run.mention);
      offset += run.text.length;
    }
    let failing: DraftMention | null = null;
    let shift = 0;
    for (const m of draft.mentions) {
      if (!live.has(m)) continue;
      if (parsed.get(m.start + shift) !== m.wire) {
        failing = m;
        break;
      }
      shift += m.wire.length - m.label.length;
    }
    if (failing === null) return draft.mentions.filter((m) => live.has(m));
    live.delete(failing);
  }
}

/** The text the send button posts: every live mention as its token, everything else verbatim. */
export function draftWireText(draft: MentionDraft): string {
  return convert(draft, new Set(liveMentions(draft)));
}

export interface DraftSegment {
  text: string;
  /** True for a live mention's `@<label>`. */
  mention: boolean;
}

/** The draft split for the composer's highlight layer: plain runs and live mentions, in order. */
export function draftSegments(draft: MentionDraft): DraftSegment[] {
  const out: DraftSegment[] = [];
  let last = 0;
  for (const m of liveMentions(draft)) {
    if (m.start > last) out.push({ text: draft.text.slice(last, m.start), mention: false });
    out.push({ text: `@${m.label}`, mention: true });
    last = mentionEnd(m);
  }
  if (last < draft.text.length) out.push({ text: draft.text.slice(last), mention: false });
  return out;
}
