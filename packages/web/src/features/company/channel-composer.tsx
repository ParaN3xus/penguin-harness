/**
 * A channel's composer: a growing textarea (Enter sends, Shift+Enter breaks the line, an
 * IME's accepting Enter never sends), the send button, and the `@` autocomplete — a portaled
 * panel above the box (through Dropdown's portal, so no ancestor's overflow clips it) listing
 * the channel's own members — employees with their titles, then people, then everyone —
 * ranked against what was typed (by id or by name), walked with the arrow keys and picked with
 * Enter or Tab. Escape dismisses the panel for that token until it changes.
 *
 * A pick writes the name the message will render (`@Ada Lovelace`), not the id the server
 * resolves: the draft tracks each picked mention as a range and the send converts it back
 * (mention-draft.ts has the rules — an edited mention goes out as plain text). A live mention
 * is tinted the way a sent chip is by a layer drawn behind the transparent textarea: the same
 * box, font and wrapping, with the text itself invisible, so only the tint shows through and
 * the textarea keeps native caret, selection, IME and undo.
 *
 * The keys are named in the placeholder and nothing is rendered under the box, the way
 * development mode's chat input reads: a line of hint below the composer is read once and
 * then costs a row of the stream on every later visit.
 */
import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { S } from "../../lib/strings";
import { ICON_GAP } from "../../lib/icon-scale";
import { Button } from "../../components/ui/button";
import { Dropdown } from "../../components/ui/dropdown";
import { noAutofill } from "../../components/ui/input";
import { PrincipalChip } from "./shared";
import {
  mentionInsertId,
  mentionLabel,
  mentionQueryAt,
  rankMentionCandidates,
} from "./channel-mentions";
import type { MentionCandidate, MentionKind } from "./channel-mentions";
import {
  EMPTY_DRAFT,
  draftApplyEdit,
  draftInsertMention,
  draftSegments,
  draftWireText,
  mentionStartsAt,
} from "./mention-draft";

/**
 * The box grows with the draft up to this many pixels, then scrolls inside — the same cap the
 * development-mode composer sets in chat-input.tsx, and deliberately a pixel count rather than
 * `max-h-40`: the root font is the reader's own (16 / 18 / 20px, theme.tsx FONT_PX), so a rem
 * cap would let the box eat a different share of the stream at each scale. `max-h-40` is only
 * the outer guard; this is the one that binds.
 */
const MAX_BOX_PX = 160;

/**
 * The box's text metrics, shared by the textarea and the highlight layer behind it: any
 * difference in padding, border, font or line height would wrap the two differently and slide
 * the tint off its name.
 */
const BOX_METRICS = "rounded-md border px-3 py-[9px] text-sm leading-5";

function kindTitle(kind: MentionKind): string {
  if (kind === "employee") return S.company.channels.employees;
  if (kind === "member") return S.company.channels.members;
  return S.company.channels.mentionAll;
}

export function ChannelComposer({
  candidates,
  names,
  onSend,
}: {
  candidates: readonly MentionCandidate[];
  names: ReadonlyMap<string, string>;
  /** Sends the draft; resolves true once it is in the stream (the draft is then cleared). */
  onSend: (text: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const text = draft.text;
  const [caret, setCaret] = useState(0);
  const [highlight, setHighlight] = useState(0);
  /** The `start:query` token Escape dismissed the panel for; typing on changes the token and reopens it. */
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const segments = useMemo(() => draftSegments(draft), [draft]);

  // A caret right after a picked mention (its trailing space deleted) is not a new query.
  const typed = mentionQueryAt(text, caret);
  const mention = typed !== null && !mentionStartsAt(draft, typed.start) ? typed : null;
  const suggestions = mention === null ? [] : rankMentionCandidates(candidates, mention.query);
  const tokenKey = mention === null ? null : `${mention.start}:${mention.query}`;
  const panelOpen = mention !== null && suggestions.length > 0 && dismissed !== tokenKey;
  const active = suggestions[Math.min(highlight, Math.max(0, suggestions.length - 1))];

  /**
   * Keeps the highlight layer on the textarea's lines: its scroll offset, and the width a
   * vertical scrollbar takes once the draft outgrows the cap — the layer has none of its own,
   * so without the extra padding it would wrap a few characters later than the box.
   */
  const syncLayer = () => {
    const el = inputRef.current;
    const layer = layerRef.current;
    if (!el || !layer) return;
    const scrollbar = el.offsetWidth - el.clientWidth - 2 * el.clientLeft;
    layer.style.paddingRight = scrollbar > 0 ? `calc(0.75rem + ${scrollbar}px)` : "";
    layer.scrollTop = el.scrollTop;
  };

  // The box follows its content up to the cap, so a long draft stays in view without a
  // scrollbar appearing at the second line. `scrollHeight` is content + padding and the box
  // is border-box, so the border has to be added back — without it every line would be set
  // 2px short and the box would scroll against itself from the very first one.
  //
  // The resting height is not set here: `min-h-10` on the box and `h-10` on the button are the
  // same 2.5rem, so an empty or single-line draft sits exactly as tall as 发送 at every font
  // scale, and `min-height` outranks the height written below. The row is `items-end`, so the
  // button stays welded to the box's bottom edge as the box grows.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const border = el.offsetHeight - el.clientHeight;
    el.style.height = `${Math.min(el.scrollHeight + border, MAX_BOX_PX)}px`;
    syncLayer();
  }, [text]);

  const pick = (c: MentionCandidate) => {
    if (mention === null) return;
    const wire = mentionInsertId(c, candidates);
    // The name exactly as a sent message renders this token (channel-markdown's chip).
    const label = mentionLabel(wire, names, S.company.principalAll);
    const next = draftInsertMention(draft, mention.start, caret, label, wire);
    setDraft(next.draft);
    setCaret(next.caret);
    setHighlight(0);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(next.caret, next.caret);
      }
    });
  };

  const send = async () => {
    if (text.trim() === "" || sending) return;
    const body = draftWireText(draft).trim();
    setSending(true);
    try {
      if (await onSend(body)) {
        setDraft(EMPTY_DRAFT);
        setCaret(0);
      }
    } finally {
      setSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (panelOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => (h + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
        return;
      }
      // Not while an IME is composing: its Enter accepts the candidate being typed after the @.
      if ((e.key === "Enter" || e.key === "Tab") && !e.nativeEvent.isComposing) {
        e.preventDefault();
        if (active) pick(active);
        return;
      }
    }
    // Enter sends; Shift+Enter breaks the line. The isComposing guard keeps an IME's
    // candidate-accepting Enter from sending the raw pinyin.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  };

  const rows: Array<{ c: MentionCandidate; i: number; head: boolean }> = suggestions.map(
    (c, i) => ({ c, i, head: i === 0 || suggestions[i - 1]!.kind !== c.kind }),
  );

  return (
    <div className="shrink-0 border-t border-gray-200 pt-3 dark:border-gray-800">
      <div className={`flex items-end ${ICON_GAP.menu}`}>
        <Dropdown
          className="min-w-0 flex-1"
          open={panelOpen}
          setOpen={(v) => {
            if (!v) setDismissed(tokenKey);
          }}
          portal={{ direction: "up", align: "left" }}
          menuClass="w-80"
          focusOnOpen={false}
          button={
            <div className="relative rounded-md bg-white dark:bg-gray-900">
              <div
                ref={layerRef}
                aria-hidden
                className={`pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words border-transparent text-transparent ${BOX_METRICS}`}
              >
                {segments.map((seg, i) =>
                  seg.mention ? (
                    <span
                      key={i}
                      className="rounded-sm bg-gray-200 ring-2 ring-gray-200 dark:bg-gray-700 dark:ring-gray-700"
                    >
                      {seg.text}
                    </span>
                  ) : (
                    <span key={i}>{seg.text}</span>
                  ),
                )}
                {/* A trailing newline only takes a line in the layer when something follows it. */}
                {"\u200b"}
              </div>
              <textarea
                ref={inputRef}
                rows={1}
                value={text}
                placeholder={S.company.channels.placeholder}
                aria-label={S.company.channels.placeholder}
                aria-autocomplete="list"
                aria-expanded={panelOpen}
                aria-controls={panelOpen ? listId : undefined}
                aria-activedescendant={
                  panelOpen && active ? `${listId}-${active.principal}` : undefined
                }
                disabled={sending}
                {...noAutofill}
                onChange={(e) => {
                  const value = e.target.value;
                  const at = e.target.selectionStart ?? value.length;
                  setDraft(draftApplyEdit(draft, value, at));
                  setCaret(at);
                  setHighlight(0);
                }}
                onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
                onScroll={syncLayer}
                onKeyDown={onKeyDown}
                className={`relative block max-h-40 min-h-10 w-full resize-none border-gray-300 bg-transparent placeholder:text-gray-400 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400/30 disabled:opacity-60 dark:border-gray-700 dark:placeholder:text-gray-500 ${BOX_METRICS}`}
              />
            </div>
          }
        >
          <div id={listId} role="listbox" aria-label={S.company.channels.mentionPanel}>
            {rows.map(({ c, i, head }) => (
              <div key={c.principal}>
                {head && (
                  <p className="px-2.5 pb-0.5 pt-1.5 text-[11px] font-medium text-gray-400 dark:text-gray-500">
                    {kindTitle(c.kind)}
                  </p>
                )}
                <button
                  type="button"
                  role="option"
                  id={`${listId}-${c.principal}`}
                  aria-selected={i === highlight}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(c)}
                  className={`flex w-full items-center justify-between gap-3 px-2.5 py-1.5 text-left text-xs transition-colors duration-150 ${
                    i === highlight ? "bg-gray-100 dark:bg-gray-800" : ""
                  }`}
                >
                  <span className="min-w-0 truncate">
                    <PrincipalChip principal={c.principal} names={names} />
                  </span>
                  <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500">
                    {c.kind === "all"
                      ? S.company.channels.mentionAllDesc
                      : c.kind === "employee"
                        ? (c.detail ?? "")
                        : ""}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </Dropdown>
        {/* `items-end` on the row plus a fixed height here: the button stays welded to the
            box's bottom edge as the box grows for a multi-line draft. */}
        <Button
          variant="primary"
          className="h-10 shrink-0"
          disabled={sending || text.trim() === ""}
          onClick={() => void send()}
        >
          {S.company.channels.send}
        </Button>
      </div>
    </div>
  );
}
