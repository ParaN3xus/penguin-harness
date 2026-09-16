# Company mode shows names and folders where it showed ids and paths

- **Date:** 2026-09-16
- **Type:** feature
- **Scope:** `web`
- **PR:** [#753](https://github.com/Prism-Shadow/penguin-harness/pull/753)

[中文版](2026-09-16-company-readable-names.zh.md)

Three company-mode surfaces stopped making people read machine spellings: an `@` picked in a
channel composer writes the Agent's name instead of its id, a data path in a ticket renders as a
folder capsule, and the organization's status sits beside its name as a text capsule.

## Mentions in the channel composer

- Picking from the `@` menu wrote the display name into the box (`@Ada Lovelace`), tinted the way
  a sent message's mention chip is, where it had written the id. The message sent still carries the
  id (`@ceo`, `@user:alice`, `@all`), so the server, delivery and `mention_not_member` did not
  change.
- Each pick is tracked as a range of the draft. Typing inside a name, deleting part of it or
  replacing a selection across it turns it into plain text; text typed or pasted elsewhere only
  moves it. A mention glued to a word before it, or followed by characters that would extend the
  id (`@Ada.md`), goes out as its visible text and loses its tint until the stray characters are
  removed. Employees who share a name stay apart, and a typed or pasted `@id` works as before.
- The menu also matched names typed in any script (`@张`), and an IME's Enter while composing after
  the `@` stopped picking a candidate.

## Paths in tickets

- The ticket dialog's goal, acceptance criteria, progress lines, result and blocked reason drew
  data paths as capsules: a folder or file glyph and the last segment, the full path on hover, and
  a click that copies the path exactly as written, the glyph turning into a check. The stored text
  did not change.
- A path is `<app_data_dir>/…`, or an absolute path that passes through the Project's
  `organizations/` or `agents/` directory. In prose it is made of ASCII file-name characters, so it
  stops at a space, CJK text or punctuation, and a trailing full stop stays outside it. An inline
  code span holding one path and nothing else becomes a capsule verbatim; fenced blocks, commands
  in code spans and link labels stay as written. A trailing `/`, or a last segment without an
  extension, reads as a folder; a last segment with an extension, as a file.

## Organization status

- The organization switcher's trigger showed the status as a text capsule to the right of the name
  — 运行中 / 已暂停 / 配置无效, in English Running / Paused / Invalid configuration — in place of the
  dot before it. The name truncates first, and the status joined the trigger's accessible name.
- The English label for an organization that is not paused changed from "Active" to "Running"
  everywhere it appears.
