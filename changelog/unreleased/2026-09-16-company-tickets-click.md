# A ticket card opens with a click and moves with a long press, and a ticket session opens

- **Date:** 2026-09-16
- **Type:** feature
- **Scope:** `web`, `docs`
- **PR:** [#752](https://github.com/Prism-Shadow/penguin-harness/pull/752)

[中文版](2026-09-16-company-tickets-click.zh.md)

Company mode's ticket board and ticket dialog changed how they are clicked. A whole ticket card
became the target that opens the ticket, and moving it between columns took a long press and a
drag. Inside the dialog the parent, the child tickets and the ticket sessions opened from their
titles instead of corner buttons. Clicking a ticket session had landed back on the board with
the dialog closed; it opened the conversation, and the company sidebar gained one temporary row
for it.

## Board

- A click, Enter or Space anywhere on a card opened the ticket dialog; the title button inside
  the card went away. The card was the one declared exception to the company pages' rule against
  whole-area click targets.
- Moving a card took holding it still for 350 ms: it then lifted, followed the pointer as a ghost
  and asked to move when released over another column, through the same confirmation as before.
  A quick drag without the hold did nothing and did not open the ticket. On a touch screen the page
  kept scrolling until the card lifted. Holding the card near an edge of the board or the page
  scrolled it. Escape put a lifted card back.
- HTML5 drag-and-drop was replaced by pointer events, so the gesture works with a mouse, a pen and
  a finger alike. The dialog's move control stayed as the way to move a ticket without dragging.

## Ticket dialog

- The parent ticket, each child ticket and each ticket session opened by clicking its title, which
  underlines on hover and names its destination in its tooltip. The jump buttons beside them were
  removed.

## Ticket sessions

- Opening a ticket session from the dialog on the board used to return to the board: the dialog
  closed before the router committed the new location, and the board, still mounted, removed
  `?ticket=` from its query against its own location, replacing the conversation's history entry.
  The board stopped writing its query once the browser has left it.
- The opened session showed in the company sidebar as one row under a **Temporary** header, above
  the desks, with the employee's avatar, the session title, a ✕ and a "Back to ticket" link; the
  collapsed rail showed its avatar. The row lasted while the conversation was on screen and was
  dropped on any other location. The ✕ and the link returned to the page the session was opened
  from, with its ticket open again. A desk session opened from a ticket kept its own desk row
  instead.
- The company mode guide described the board's click and long press, the dialog's titles and the
  temporary row, in both languages.
