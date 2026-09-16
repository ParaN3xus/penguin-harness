/**
 * The channel composer's draft (features/company/mention-draft.ts): a picked mention shows the
 * name a sent message renders and still goes out as the token the server resolves; an edit
 * that touches the name turns it into plain text, edits elsewhere only move it; and a mention
 * converts only where its token would parse back as itself.
 */
import { describe, expect, it } from "vitest";
import { mentionRuns } from "../src/features/company/channel-mentions";
import {
  EMPTY_DRAFT,
  draftApplyEdit,
  draftInsertMention,
  draftSegments,
  draftWireText,
  liveMentions,
  mentionStartsAt,
} from "../src/features/company/mention-draft";
import type { MentionDraft } from "../src/features/company/mention-draft";

/** Types `value` at the end of the draft, the way a keystroke or a paste reports it. */
const typeAtEnd = (d: MentionDraft, value: string): MentionDraft =>
  draftApplyEdit(d, d.text + value, d.text.length + value.length);

/** Types `@query` at the end, then picks the candidate. */
function pick(d: MentionDraft, query: string, label: string, wire: string): MentionDraft {
  const typed = typeAtEnd(d, `@${query}`);
  const start = typed.text.length - query.length - 1;
  return draftInsertMention(typed, start, typed.text.length, label, wire).draft;
}

const tokens = (text: string) => mentionRuns(text).flatMap((r) => (r.mention ? [r.mention] : []));

describe("inserting a mention", () => {
  it("shows the name with a trailing space, moves the caret past it, and sends the id", () => {
    const typed = typeAtEnd(EMPTY_DRAFT, "hi @ce");
    const { draft, caret } = draftInsertMention(typed, 3, 6, "Ada Lovelace", "ceo");
    expect(draft.text).toBe("hi @Ada Lovelace ");
    expect(caret).toBe(17);
    expect(draftWireText(draft)).toBe("hi @ceo ");
  });

  it("keeps the text after the caret when the pick lands mid-draft", () => {
    const d = draftApplyEdit(EMPTY_DRAFT, "hi @ce there", 6);
    const { draft } = draftInsertMention(d, 3, 6, "Ada", "ceo");
    expect(draft.text).toBe("hi @Ada  there");
    expect(draftWireText(draft)).toBe("hi @ceo  there");
  });

  it("names in CJK and names with spaces send their ids, and the server grammar reads them back", () => {
    let d = pick(EMPTY_DRAFT, "张", "张三", "zhangsan");
    d = typeAtEnd(d, "和");
    d = pick(d, "Ada", "Ada Lovelace", "ceo");
    d = typeAtEnd(d, "请看一下。");
    expect(d.text).toBe("@张三 和@Ada Lovelace 请看一下。");
    const wire = draftWireText(d);
    expect(wire).toBe("@zhangsan 和@ceo 请看一下。");
    expect(tokens(wire)).toEqual(["zhangsan", "ceo"]);
  });

  it("keeps two employees who share a name apart", () => {
    let d = pick(EMPTY_DRAFT, "Al", "Alex", "dev_alex");
    d = pick(d, "Al", "Alex", "ops_alex");
    expect(d.text).toBe("@Alex @Alex ");
    expect(draftWireText(d)).toBe("@dev_alex @ops_alex ");
  });

  it("carries the disambiguated member and the everyone token as picked", () => {
    let d = pick(EMPTY_DRAFT, "al", "alice", "user:alice");
    d = pick(d, "", "所有人", "all");
    expect(d.text).toBe("@alice @所有人 ");
    expect(draftWireText(d)).toBe("@user:alice @all ");
  });

  it("marks where a picked mention starts, so the panel does not reopen on it", () => {
    const d = pick(typeAtEnd(EMPTY_DRAFT, "cc "), "A", "Ada", "ceo");
    expect(mentionStartsAt(d, 3)).toBe(true);
    expect(mentionStartsAt(d, 0)).toBe(false);
  });
});

describe("editing around a mention", () => {
  const base = () => typeAtEnd(pick(EMPTY_DRAFT, "A", "Ada Lovelace", "ceo"), "please");

  it("text typed after it or pasted before it only moves it", () => {
    let d = typeAtEnd(base(), " review");
    expect(draftWireText(d)).toBe("@ceo please review");
    d = draftApplyEdit(d, `hey ${d.text}`, 4);
    expect(d.text).toBe("hey @Ada Lovelace please review");
    expect(draftWireText(d)).toBe("hey @ceo please review");
  });

  it("deleting a character inside the name sends what is left as plain text", () => {
    const d = base();
    const next = d.text.slice(0, 5) + d.text.slice(6); // "@Ada ovelace please"
    const edited = draftApplyEdit(d, next, 5);
    expect(edited.mentions).toEqual([]);
    expect(draftWireText(edited)).toBe(next);
  });

  it("typing inside the name drops it, even where the text reads the same as typing after it", () => {
    let d = pick(EMPTY_DRAFT, "An", "Anna", "anna_pm");
    // "@Ann|a " + "a" at the caret → "@Annaa " — the same text as appending after "@Anna".
    d = draftApplyEdit(d, "@Annaa ", 5);
    expect(d.mentions).toEqual([]);
    expect(draftWireText(d)).toBe("@Annaa ");
  });

  it("replacing a selection that spans the mention drops it", () => {
    const d = base();
    const edited = draftApplyEdit(d, "@Ada ok please", 7);
    expect(edited.mentions).toEqual([]);
    expect(draftWireText(edited)).toBe("@Ada ok please");
  });

  it("clearing the whole draft clears its mentions", () => {
    expect(draftApplyEdit(base(), "", 0)).toEqual(EMPTY_DRAFT);
  });

  it("a pasted @Name is plain text, a pasted @id is sent as typed", () => {
    let d = typeAtEnd(EMPTY_DRAFT, "@Ada Lovelace ");
    expect(d.mentions).toEqual([]);
    expect(draftWireText(d)).toBe("@Ada Lovelace ");
    d = typeAtEnd(d, "@ceo");
    expect(draftWireText(d)).toBe("@Ada Lovelace @ceo");
  });

  it("an undo that restores a deleted name leaves it plain: the pick is gone, only the text is back", () => {
    const d = base();
    const deleted = draftApplyEdit(d, d.text.slice(0, 12) + d.text.slice(13), 12);
    const restored = draftApplyEdit(deleted, d.text, 13);
    expect(restored.text).toBe(d.text);
    expect(restored.mentions).toEqual([]);
  });
});

describe("where a mention converts", () => {
  it("not when a letter is glued after it, and again once the letter is gone", () => {
    const d = pick(EMPTY_DRAFT, "A", "Ada", "ceo");
    const glued = draftApplyEdit(d, "@Ada", 4); // the trailing space deleted …
    const typed = draftApplyEdit(glued, "@Aday", 5); // … and a letter typed in its place
    expect(typed.mentions).toHaveLength(1);
    expect(liveMentions(typed)).toEqual([]);
    expect(draftWireText(typed)).toBe("@Aday");
    const fixed = draftApplyEdit(typed, "@Ada", 4);
    expect(draftWireText(fixed)).toBe("@ceo");
  });

  it("not when the @ is glued to a word before it", () => {
    const d = pick(EMPTY_DRAFT, "A", "Ada", "ceo");
    const glued = draftApplyEdit(d, `x${d.text}`, 1);
    expect(draftWireText(glued)).toBe("x@Ada ");
  });

  it("a full stop after it is punctuation, a file extension is not", () => {
    const d = pick(EMPTY_DRAFT, "A", "Ada", "ceo");
    const stop = draftApplyEdit(d, "@Ada.", 5);
    expect(draftWireText(stop)).toBe("@ceo.");
    const ext = draftApplyEdit(d, "@Ada.md", 7);
    expect(draftWireText(ext)).toBe("@Ada.md");
  });

  it("text right after a CJK name never extends the id", () => {
    const d = pick(EMPTY_DRAFT, "张", "张三", "zhangsan");
    const glued = draftApplyEdit(d, "@张三你好", 5);
    expect(draftWireText(glued)).toBe("@zhangsan你好");
    expect(tokens(draftWireText(glued))).toEqual(["zhangsan"]);
  });

  it("of two glued mentions only the first converts, since its id glues the second's @", () => {
    let d = pick(EMPTY_DRAFT, "张", "张三", "zhangsan");
    d = draftApplyEdit(d, "@张三", 3); // trailing space deleted
    d = pick(d, "李", "李四", "lisi");
    expect(d.text).toBe("@张三@李四 ");
    expect(draftWireText(d)).toBe("@zhangsan@李四 ");
  });

  it("a later mention is judged again once an earlier one reverts to its text", () => {
    let d = pick(typeAtEnd(EMPTY_DRAFT, "x"), "张", "张三", "zhangsan");
    d = draftApplyEdit(d, "x@张三", 4);
    d = pick(d, "李", "李四", "lisi");
    // "x@张三" is glued to the x and stays text; "@李四" then follows 三, not n, and converts.
    expect(draftWireText(d)).toBe("x@张三@lisi ");
  });
});

describe("draftSegments", () => {
  it("splits the draft into plain runs and the live mentions the highlight layer tints", () => {
    let d = typeAtEnd(EMPTY_DRAFT, "cc ");
    d = pick(d, "A", "Ada", "ceo");
    d = typeAtEnd(d, "and x");
    d = pick(d, "B", "Bob", "bob");
    expect(d.text).toBe("cc @Ada and x@Bob ");
    expect(draftSegments(d)).toEqual([
      { text: "cc ", mention: false },
      { text: "@Ada", mention: true },
      { text: " and x@Bob ", mention: false },
    ]);
  });

  it("is empty for an empty draft", () => {
    expect(draftSegments(EMPTY_DRAFT)).toEqual([]);
  });
});
