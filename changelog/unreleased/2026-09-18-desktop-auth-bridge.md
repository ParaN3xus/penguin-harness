# The desktop app never opens a blank window, and Penguin Go authorization opens its page directly there

- **Date:** 2026-09-18
- **Type:** fix
- **Scope:** `desktop`, `web`

[中文版](2026-09-18-desktop-auth-bridge.zh.md)

The desktop shell allowed one window outside its window-open rule: the hidden `about:blank`
window the Web App opened while Penguin Go authorization started, to be pointed at the
authorization page once the server returned it. An HTML file previewed in the Files panel
could ask for the same window — its iframe allows popups, and the shell is not told which frame
asked — and, since a blank window inherits its opener's origin, script it, invisibly, for as
long as the preview's script kept it. The shell now refuses every blank window, and the Web App
does not ask for one inside the shell.

## Desktop

- A request for `about:blank` — `window.open()` with no URL — is refused like any other
  non-web scheme, from the main window as from every window it opened. The main window has no
  window-open exception of its own any more.
- Every other rule stays as it was: the Workspace preview hand-off, pages on the preview host
  and a detached terminal get a window of the app; `http(s)` and `mailto` links elsewhere go to
  the system browser; everything else on this instance is refused and logged.

## Web App

- In the desktop shell's own window, the Penguin Go "Authorize" click no longer opens a blank
  tab first. Once the server returns the authorization URL, the page opens it directly and the
  shell hands it to the system browser — Electron has no popup blocker, so the tab a browser
  needs to open inside the click is not needed there.
- In a browser, including one signed into a desktop-mode server, the flow is unchanged: a blank
  tab opens inside the click and navigates to the authorization page when the URL arrives.
