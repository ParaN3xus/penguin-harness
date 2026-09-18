# A Shortcuts settings page, with bindings stored per account

- **Date:** 2026-09-18
- **Type:** feature
- **Scope:** `web`, `server`

[中文版](2026-09-18-shortcut-settings.zh.md)

The System settings dialog gained a **Keyboard shortcuts** page in the personal group, after
Appearance. It lists every rebindable command by group with its current chord, written the way the
platform writes it (`⌘W` on a Mac, `Ctrl+W` elsewhere). Clicking a chord records the next
combination pressed: Esc cancels, Backspace or Delete clears the binding, and a key without a
modifier is refused unless it is an F key. Each row can go back to its default, and the page can
reset every override at once. Bindings are stored per account in `ui_prefs.keybindings` and apply
at once in every open tab of that account.

## Details

- A row says when it will not fire as bound: another command on the same chord (which one wins is
  stated), a chord the browser itself reserves (works in the desktop app only), or, in the desktop
  app, a chord the shell binds or its menu also carries.
- `PUT /api/me/prefs` validates `keybindings`: version 1, per-platform sections (`mac`, `windows`,
  `linux`) of at most 64 entries, command ids and chord strings checked against their grammar and
  length caps, the whole document at most 8 KiB. An invalid document is refused with
  `invalid_keybindings` and nothing from that request is stored.
- After sign-in the account's copy replaces the browser mirror; an edit made before the answer
  arrived is pushed to the account, and a mirror the account knows nothing about is cleared, so a
  shared browser cannot carry one account's bindings into another. A write that fails to reach the
  server is reported and leaves the mirror in place.
- Setting rows can now show their hint in the attention tone, which the conflict hint uses.
