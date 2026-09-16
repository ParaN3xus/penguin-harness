# The shared UI package gains a mock dataset and four full-screen mock-ups for the gallery

- **Date:** 2026-09-16
- **Type:** feature
- **Scope:** `ui`
- **PR:** [#763](https://github.com/Prism-Shadow/penguin-harness/pull/763)

[中文版](2026-09-16-theme-fixtures-screens.zh.md)

`@prismshadow/penguin-ui` gained `fixtures/`, one typed mock dataset in English and Chinese, and
`screens/`, four static full-screen compositions the theme gallery renders at `/screens/:name`. The
Web App imports neither, so it looks exactly as before.

## Fixtures

- The "Build Claude Code docs expert" session the landing page's screenshots are captured from, as
  a two-turn run: user and assistant turns, settled and streaming thinking and text, and tool calls
  to `exec_command` with output, `read_file`, `edit_file` and `write_file` with diffs, a
  `run_subagent` call with the child's own transcript, and a command waiting for approval.
- A Trace of the same run (file list, overall figures, per-turn timeline lanes and event rows), ten
  models copied from the built-in catalog, the Workspace file tree and a file preview, the sidebar's
  session groups, and a company with employees, tickets in every column and a week of calendar
  events.
- Chrome copy taken from the Web App's two dictionaries, and specimen text for the fonts page and
  the Typography foundation that mixes Chinese, Latin, code and numbers.
- `en` and `zh` are built from one structure (`fixtures/dataset.ts`) and differ only in prose;
  `fixturesFor(lang)` returns either.

## Screens

- `chat`: a Task mid-run, with the sidebar, an opened diff, a running subagent, a pending approval,
  the composer with chips, and the Subagents dock streaming the child's reply.
- `traces`: the Trajectories dock with the Overall summary, a turn's execution timeline, legend and
  event rows.
- `settings`: the paged settings dialog on Appearance over the chat, with an info popover open.
- `login`: the sign-in card over the decorative canvas.
- The screens use token utilities and the declared style hooks only, so each theme restyles them
  through its token values; package components replace their stand-in pieces wave by wave.
- The package exports them as `@prismshadow/penguin-ui/screens` (`SCREENS`, `screenById`).
