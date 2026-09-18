# An organization's approval mode reaches the sessions it already has

- **Date:** 2026-09-18
- **Type:** fix
- **Scope:** `server`, `web`

[中文版](2026-09-18-org-approval-sync.zh.md)

Changing an organization's approval mode in its settings now changes it for the desk and
ticket sessions the organization already has, not only for the ones opened afterwards. The
chat composer no longer offers `always-ask` on an organization's session, where it would deny
every call that needs approval.

## Details

- `OrganizationService.patch`, which every API write of an organization's settings goes
  through, writes a changed `approval_mode` onto every session the organization's files name —
  the current and previous desks in the ledger, and every session a ticket lists — except
  archived ones. A session mid-run applies the new mode from its next approval decision. A
  write that leaves the mode as it was touches no session, so a session whose mode was changed
  from its own composer keeps it until the organization's mode next changes.
- The composer's approval picker lists `read-only`, `allow-all` and `deny-all` for a session
  stamped `client: "org"`, as the organization settings do; so does the Agents panel's
  sub-session composer, which edits the parent session's mode. A session that already stores
  `always-ask` keeps it listed and ticked until another mode is picked.
- Sessions on disk whose mode already differs from their organization's were left as they are
  and take the organization's mode the next time it changes; nothing was migrated.
