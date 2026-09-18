# Six more keyboard shortcuts: search, new chat, sidebar, docks, new terminal

- **Date:** 2026-09-18
- **Type:** feature
- **Scope:** `web`

[中文版](2026-09-18-shortcut-commands.zh.md)

Six commands joined the shortcut registry, each rebindable on the Shortcuts settings page
(`Mod` is ⌘ on macOS and Ctrl elsewhere): search sessions (Mod+K), new chat (Mod+Shift+O), show or
hide the sidebar (Mod+B), show or hide the right dock (Mod+Alt+B), show or hide the bottom dock
(Mod+J), and new terminal (Ctrl+Shift+` on every platform, beside the terminal toggle's Ctrl+`).
The buttons that run the same actions — the dock toggles in the chat toolbar, the sidebar's search
and new-chat buttons, the sidebar collapse control — name the chord in their tooltips.

## Details

- Search sessions opens the sidebar's search field, or puts the caret back into an open one; with
  the sidebar collapsed to its rail, the first press expands it.
- New chat goes to the draft page from anywhere, sidebar expanded or not.
- The settings page's Panels group, empty until now, holds the sidebar and dock toggles.
