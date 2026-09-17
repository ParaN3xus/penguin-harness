/**
 * The channel composer's draft (features/company/mention-draft.ts): a picked mention shows the
 * name a sent message renders and still goes out as the token the server resolves. It is one
 * block — an edit that reaches into it takes all of it, the caret and the selection step over
 * it, an input method's edit waits for compositionend, and an undo brings it back whole — and
 * the message sent separates it from any text that would otherwise swallow its token.
 */
import { describe, expect, it } from "vitest";
import { mentionRuns } from "../src/features/company/channel-mentions";
import {
  EMPTY_DRAFT,
  draftApplyEdit,
  draftFollowEdit,
  draftInsertMention,
  draftRecall,
  draftRemember,
  draftSegments,
  draftSnapSelection,
  draftWireText,
  mentionCovers,
  mentionDeletedByKey,
} from "../src/features/company/mention-draft";
import type { DraftHistory, MentionDraft } from "../src/features/company/mention-draft";

/** Types `value` at the end of the draft, the way a keystroke or a paste reports it. */
const typeAtEnd = (d: MentionDraft, value: string): MentionDraft =>
  draftApplyEdit(d, d.text + value, d.text.length + value.length).draft;

/** Types `@query` at the end, then picks the candidate. */
function pick(d: MentionDraft, query: string, label: string, wire: string): MentionDraft {
  const typed = typeAtEnd(d, `@${query}`);
  const start = typed.text.length - query.length - 1;
  return draftInsertMention(typed, start, typed.text.length, label, wire).draft;
}

/** The browser deleting `from`…`to` (a key, a cut, a drag out), which leaves the caret at `from`. */
const deleteSpan = (d: MentionDraft, from: number, to: number) =>
  draftApplyEdit(d, d.text.slice(0, from) + d.text.slice(to), from);

const tokens = (text: string) => mentionRuns(text).flatMap((r) => (r.mention ? [r.mention] : []));

/** `@Ada Lovelace please`: the mention is 0…13. */
const base = () => typeAtEnd(pick(EMPTY_DRAFT, "A", "Ada Lovelace", "ceo"), "please");

describe("inserting a mention", () => {
  it("shows the name with a trailing space, moves the caret past it, and sends the id", () => {
    const typed = typeAtEnd(EMPTY_DRAFT, "hi @ce");
    const { draft, caret } = draftInsertMention(typed, 3, 6, "Ada Lovelace", "ceo");
    expect(draft.text).toBe("hi @Ada Lovelace ");
    expect(caret).toBe(17);
    expect(draftWireText(draft)).toBe("hi @ceo ");
  });

  it("keeps the text after the caret when the pick lands mid-draft", () => {
    const d = draftApplyEdit(EMPTY_DRAFT, "hi @ce there", 6).draft;
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

  it("keeps two employees who share a name apart, down to which one a Backspace removes", () => {
    let d = pick(EMPTY_DRAFT, "Al", "Alex", "dev_alex");
    d = pick(d, "Al", "Alex", "ops_alex");
    expect(d.text).toBe("@Alex @Alex ");
    expect(draftWireText(d)).toBe("@dev_alex @ops_alex ");
    const second = deleteSpan(d, 10, 11).draft;
    expect(second.text).toBe("@Alex  ");
    expect(draftWireText(second)).toBe("@dev_alex  ");
    const first = deleteSpan(d, 4, 5).draft;
    expect(first.text).toBe(" @Alex ");
    expect(draftWireText(first)).toBe(" @ops_alex ");
  });

  it("carries the disambiguated member and the everyone token as picked", () => {
    let d = pick(EMPTY_DRAFT, "al", "alice", "user:alice");
    d = pick(d, "", "所有人", "all");
    expect(d.text).toBe("@alice @所有人 ");
    expect(draftWireText(d)).toBe("@user:alice @all ");
  });

  it("marks where a picked mention sits, so no @ panel opens on its name", () => {
    const d = pick(typeAtEnd(EMPTY_DRAFT, "cc "), "A", "Ada", "ceo");
    expect(mentionCovers(d, 3)).toBe(true);
    expect(mentionCovers(d, 6)).toBe(true);
    expect(mentionCovers(d, 2)).toBe(false);
    expect(mentionCovers(d, 7)).toBe(false);
  });
});

describe("a mention is one block", () => {
  it("Backspace at its end removes all of it, the caret landing where it started", () => {
    const { draft, caret } = deleteSpan(base(), 12, 13);
    expect(draft).toEqual({ text: " please", mentions: [] });
    expect(caret).toBe(0);
  });

  it("Delete at its start removes all of it", () => {
    const { draft, caret } = deleteSpan(base(), 0, 1);
    expect(draft).toEqual({ text: " please", mentions: [] });
    expect(caret).toBe(0);
  });

  it("a character deleted beside it, outside it, leaves it whole", () => {
    let d = typeAtEnd(EMPTY_DRAFT, "cc ");
    d = typeAtEnd(pick(d, "A", "Ada", "ceo"), "x");
    expect(d.text).toBe("cc @Ada x");
    const before = deleteSpan(d, 2, 3); // Backspace at its start
    expect(before.draft.text).toBe("cc@Ada x");
    expect(before.draft.mentions).toHaveLength(1);
    const after = deleteSpan(d, 7, 8); // Delete at its end
    expect(after.draft.text).toBe("cc @Adax");
    expect(after.draft.mentions).toHaveLength(1);
  });

  it("a word delete, a cut or a drag that takes part of it takes all of it", () => {
    // Ctrl+Backspace after "Lovelace ": the browser deletes the word and the space.
    const word = draftApplyEdit(base(), "@Ada please", 5);
    expect(word.draft).toEqual({ text: "please", mentions: [] });
    expect(word.caret).toBe(0);
    // A cut of "da Lovelace pl", starting inside the name.
    const cut = deleteSpan(base(), 2, 16);
    expect(cut.draft).toEqual({ text: "ease", mentions: [] });
  });

  it("replacing a selection that cuts into it replaces all of it", () => {
    // "Love" selected and "x" typed over it.
    const { draft, caret } = draftApplyEdit(base(), "@Ada xlace please", 6);
    expect(draft).toEqual({ text: "x please", mentions: [] });
    expect(caret).toBe(1);
  });

  it("text dropped inside it replaces it", () => {
    const { draft, caret } = draftApplyEdit(base(), "@Ada LoXvelace please", 8);
    expect(draft).toEqual({ text: "X please", mentions: [] });
    expect(caret).toBe(1);
  });

  it("text typed or pasted at either edge, or anywhere else, only moves it", () => {
    let d = typeAtEnd(base(), " review");
    expect(draftWireText(d)).toBe("@ceo please review");
    const pasted = draftApplyEdit(d, `hey ${d.text}`, 4);
    expect(pasted.draft.text).toBe("hey @Ada Lovelace please review");
    expect(pasted.caret).toBe(4);
    expect(draftWireText(pasted.draft)).toBe("hey @ceo please review");
    d = draftApplyEdit(base(), "@Ada Lovelace, please", 14).draft;
    expect(d.mentions).toEqual([{ start: 0, label: "Ada Lovelace", wire: "ceo" }]);
  });

  it("an a typed after a name ending in a is typed after it, not inside it", () => {
    const d = pick(EMPTY_DRAFT, "An", "Anna", "anna_pm");
    const { draft } = draftApplyEdit(d, "@Annaa ", 6);
    expect(draft.mentions).toEqual([{ start: 0, label: "Anna", wire: "anna_pm" }]);
  });

  it("of two glued mentions, a Backspace between them removes only the one before", () => {
    let d = pick(EMPTY_DRAFT, "张", "张三", "zhangsan");
    d = draftApplyEdit(d, "@张三", 3).draft; // its trailing space deleted
    d = pick(d, "李", "李四", "lisi");
    expect(d.text).toBe("@张三@李四 ");
    const { draft } = deleteSpan(d, 2, 3);
    expect(draft.text).toBe("@李四 ");
    expect(draftWireText(draft)).toBe("@lisi ");
  });

  it("clearing the whole draft clears its mentions", () => {
    expect(draftApplyEdit(base(), "", 0).draft).toEqual(EMPTY_DRAFT);
  });

  it("a pasted @Name is plain text, a pasted @id is sent as typed", () => {
    let d = typeAtEnd(EMPTY_DRAFT, "@Ada Lovelace ");
    expect(d.mentions).toEqual([]);
    expect(draftWireText(d)).toBe("@Ada Lovelace ");
    d = typeAtEnd(d, "@ceo");
    expect(draftWireText(d)).toBe("@Ada Lovelace @ceo");
  });
});

describe("Backspace and Delete at an edge, as one native delete", () => {
  it("names the whole mention a Backspace right after it or a Delete right before it reaches", () => {
    const d = base();
    expect(mentionDeletedByKey(d, "deleteContentBackward", 13, 13)).toEqual({ start: 0, end: 13 });
    expect(mentionDeletedByKey(d, "deleteContentForward", 0, 0)).toEqual({ start: 0, end: 13 });
  });

  it("is null for a key away from an edge, a selection, or any other edit", () => {
    const d = base();
    expect(mentionDeletedByKey(d, "deleteContentBackward", 14, 14)).toBeNull();
    expect(mentionDeletedByKey(d, "deleteContentBackward", 0, 0)).toBeNull();
    expect(mentionDeletedByKey(d, "deleteContentForward", 13, 13)).toBeNull();
    expect(mentionDeletedByKey(d, "deleteContentBackward", 0, 13)).toBeNull();
    expect(mentionDeletedByKey(d, "deleteWordBackward", 13, 13)).toBeNull();
    expect(mentionDeletedByKey(d, "insertText", 13, 13)).toBeNull();
  });
});

describe("the caret and the selection", () => {
  const sel = (start: number, end: number, backward = false) => ({ start, end, backward });

  it("an arrow key steps over a mention in either direction", () => {
    const d = base();
    expect(draftSnapSelection(d, sel(1, 1), 0)).toEqual({ start: 13, end: 13 });
    expect(draftSnapSelection(d, sel(12, 12), 13)).toEqual({ start: 0, end: 0 });
    // A word jump that lands inside continues the same way.
    expect(draftSnapSelection(d, sel(4, 4), 0)).toEqual({ start: 13, end: 13 });
  });

  it("a click inside a mention puts the caret at the nearer edge", () => {
    const d = base();
    expect(draftSnapSelection(d, sel(11, 11), null)).toEqual({ start: 13, end: 13 });
    expect(draftSnapSelection(d, sel(2, 2), null)).toEqual({ start: 0, end: 0 });
  });

  it("a caret outside every mention stays put", () => {
    const d = base();
    expect(draftSnapSelection(d, sel(13, 13), 12)).toEqual({ start: 13, end: 13 });
    expect(draftSnapSelection(d, sel(16, 16), null)).toEqual({ start: 16, end: 16 });
    expect(draftSnapSelection(d, sel(14, 18), 18)).toEqual({ start: 14, end: 18 });
  });

  it("Shift+arrow grows a selection by the whole mention and shrinks it back", () => {
    const d = base();
    expect(draftSnapSelection(d, sel(0, 1), 0)).toEqual({ start: 0, end: 13 });
    expect(draftSnapSelection(d, sel(0, 12), 13)).toEqual({ start: 0, end: 0 });
    expect(draftSnapSelection(d, sel(12, 20, true), 13)).toEqual({ start: 0, end: 20 });
    expect(draftSnapSelection(d, sel(1, 20, true), 0)).toEqual({ start: 13, end: 20 });
  });

  it("a range a pointer made that cuts into a mention grows to hold all of it", () => {
    const d = base();
    // A double-click on "Ada", and a drag from inside the name into the next word.
    expect(draftSnapSelection(d, sel(1, 4), null)).toEqual({ start: 0, end: 13 });
    expect(draftSnapSelection(d, sel(6, 17), null)).toEqual({ start: 0, end: 17 });
  });

  it("an end that did not move but sits inside a mention grows outward", () => {
    const d = typeAtEnd(pick(typeAtEnd(EMPTY_DRAFT, "cc "), "A", "Ada", "ceo"), "go");
    expect(d.text).toBe("cc @Ada go");
    expect(draftSnapSelection(d, sel(5, 9), 9)).toEqual({ start: 3, end: 9 });
  });
});

describe("input methods", () => {
  it("while composing the draft follows the box without rewriting it; compositionend widens the edit", () => {
    const before = base();
    // A keyboard app that composes over "Lovelace" deletes its last letter.
    const composing = draftFollowEdit(before, "@Ada Lovelac please", 12);
    expect(composing).toEqual({ text: "@Ada Lovelac please", mentions: [] });
    // At compositionend the edit is judged against the draft the composition started from.
    const ended = draftApplyEdit(before, "@Ada Lovelac please", 12);
    expect(ended.draft).toEqual({ text: " please", mentions: [] });
    expect(ended.caret).toBe(0);
  });

  it("a composition beside a mention keeps it", () => {
    const before = pick(EMPTY_DRAFT, "张", "张三", "zhangsan");
    const composing = draftFollowEdit(before, "@张三 ni", 6);
    expect(composing.mentions).toEqual(before.mentions);
    const ended = draftApplyEdit(before, "@张三 你好", 6);
    expect(ended.draft.mentions).toEqual(before.mentions);
    expect(draftWireText(ended.draft)).toBe("@zhangsan 你好");
  });
});

describe("undo and redo", () => {
  it("text an undo, a redo or a drop leaves selected is placed by where the selection ends", () => {
    const d = base();
    // " please" selected and deleted …
    const deleted = deleteSpan(d, 13, 20).draft;
    expect(deleted.text).toBe("@Ada Lovelace");
    // … then Ctrl+Z puts it back with 13…20 selected: the edit ends at 20, beside the name.
    expect(draftFollowEdit(deleted, d.text, 20)).toEqual(d);
    expect(draftApplyEdit(deleted, d.text, 20)).toEqual({ draft: d, caret: 20 });
  });

  it("an undo that brings back a deleted mention's text brings the mention back", () => {
    const d = base();
    let history: DraftHistory = [];
    history = draftRemember(history, d);
    const deleted = deleteSpan(d, 12, 13).draft;
    history = draftRemember(history, deleted);
    expect(draftRecall(history, d.text)).toEqual(d);
    // Without the history the same undo only gets the text back.
    expect(draftFollowEdit(deleted, d.text, 13).mentions).toEqual([]);
  });

  it("the history keeps the latest draft per text, skips drafts without mentions, and stays short", () => {
    const ada = pick(EMPTY_DRAFT, "A", "Ada", "ceo");
    const other = pick(EMPTY_DRAFT, "A", "Ada", "ada_ops");
    let history = draftRemember(draftRemember([], ada), other);
    expect(history).toEqual([other]);
    expect(draftRemember(history, typeAtEnd(EMPTY_DRAFT, "plain"))).toBe(history);
    expect(draftRecall(history, "missing")).toBeNull();
    for (let i = 0; i < 60; i += 1) history = draftRemember(history, typeAtEnd(ada, `${i}`));
    expect(history).toHaveLength(50);
    expect(draftRecall(history, ada.text)).toBeNull();
  });
});

describe("the message sent", () => {
  it("a mention glued to a word before it goes out with a space before its token", () => {
    const d = pick(EMPTY_DRAFT, "A", "Ada", "ceo");
    const glued = draftApplyEdit(d, `x${d.text}`, 1).draft;
    expect(glued.mentions).toHaveLength(1);
    expect(draftWireText(glued)).toBe("x @ceo ");
    expect(tokens(draftWireText(glued))).toEqual(["ceo"]);
  });

  it("a letter or a file extension right after it is set apart; a full stop is not", () => {
    const d = pick(EMPTY_DRAFT, "A", "Ada", "ceo");
    expect(draftWireText(draftApplyEdit(d, "@Aday", 5).draft)).toBe("@ceo y");
    expect(draftWireText(draftApplyEdit(d, "@Ada.md", 7).draft)).toBe("@ceo .md");
    expect(draftWireText(draftApplyEdit(d, "@Ada.", 5).draft)).toBe("@ceo.");
  });

  it("text right after a CJK name never extends the id, so nothing is added", () => {
    const d = pick(EMPTY_DRAFT, "张", "张三", "zhangsan");
    const glued = draftApplyEdit(d, "@张三你好", 5).draft;
    expect(draftWireText(glued)).toBe("@zhangsan你好");
    expect(tokens(draftWireText(glued))).toEqual(["zhangsan"]);
  });

  it("an @id typed right after a CJK name still reaches its reader", () => {
    let d = pick(EMPTY_DRAFT, "张", "张三", "zhangsan");
    d = draftApplyEdit(d, "@张三", 3).draft; // trailing space deleted
    d = typeAtEnd(d, "@ceo ");
    expect(d.text).toBe("@张三@ceo ");
    expect(tokens(d.text)).toEqual(["ceo"]);
    expect(draftWireText(d)).toBe("@zhangsan @ceo ");
    expect(tokens(draftWireText(d))).toEqual(["zhangsan", "ceo"]);
  });

  it("two glued mentions both convert", () => {
    let d = pick(EMPTY_DRAFT, "张", "张三", "zhangsan");
    d = draftApplyEdit(d, "@张三", 3).draft;
    d = pick(d, "李", "李四", "lisi");
    expect(d.text).toBe("@张三@李四 ");
    expect(tokens(draftWireText(d))).toEqual(["zhangsan", "lisi"]);
  });

  it("a mention after a typed token whose full stop would swallow its @ is set apart", () => {
    const d = pick(typeAtEnd(EMPTY_DRAFT, "@bob."), "A", "Ada", "ceo");
    expect(d.text).toBe("@bob.@Ada ");
    expect(draftWireText(d)).toBe("@bob. @ceo ");
    expect(tokens(draftWireText(d))).toEqual(["bob", "ceo"]);
  });
});

describe("draftSegments", () => {
  it("splits the draft into plain runs and the mentions the highlight layer tints, glued ones included", () => {
    let d = typeAtEnd(EMPTY_DRAFT, "cc ");
    d = pick(d, "A", "Ada", "ceo");
    d = typeAtEnd(d, "and x");
    d = pick(d, "B", "Bob", "bob");
    expect(d.text).toBe("cc @Ada and x@Bob ");
    expect(draftSegments(d)).toEqual([
      { text: "cc ", mention: false },
      { text: "@Ada", mention: true },
      { text: " and x", mention: false },
      { text: "@Bob", mention: true },
      { text: " ", mention: false },
    ]);
  });

  it("is empty for an empty draft", () => {
    expect(draftSegments(EMPTY_DRAFT)).toEqual([]);
  });
});
