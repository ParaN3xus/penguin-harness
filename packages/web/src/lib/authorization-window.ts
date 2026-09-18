/**
 * How the Penguin Go "Authorize" click reaches the platform's page.
 *
 * The authorization URL exists only after one request to the server, so a browser has to
 * open a blank tab synchronously inside the click and navigate it once the URL arrives —
 * a `window.open` after the `await` is an unsolicited popup, and the blocker eats it.
 *
 * The desktop shell's own window is the one place that trick must NOT be used. Electron has
 * no popup blocker, so a `window.open` after the request lands in the shell's window-open
 * handler like any other and is handed to the system browser. The blank window, on the
 * other hand, would have to be a hidden window of the shell, and the shell cannot tell a
 * request from the App apart from one made by Agent-written HTML previewed in the Files
 * panel (the iframe allows popups; `about:blank` inherits the opener's origin, so the preview
 * could script it). The shell therefore refuses every blank window, and the App does not ask
 * for one there.
 *
 * Both halves of isDesktopShellWindow are required: a browser signed into a desktop-mode
 * server over loopback has a popup blocker like any other browser and keeps the blank tab.
 */
import type { AccountMenuSession } from "./account-menu";
import { isDesktopShellWindow } from "./account-menu";

/** Whether authorization opens a blank tab first and navigates it once the URL is known. */
export function usesAuthorizationBridge(session: AccountMenuSession): boolean {
  return !isDesktopShellWindow(session);
}
