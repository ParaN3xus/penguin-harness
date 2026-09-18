/**
 * authorization-window.ts unit tests: where the Penguin Go "Authorize" click opens a blank
 * tab first, and where it must not.
 *
 * Pinned in all four combinations for the same reason as offersClientUpdate next door: each
 * single-field simplification fails a real case. `desktopMode` alone would drop the blank tab
 * for a browser signed into a desktop-mode server, whose popup blocker then eats the
 * authorization page; `sessionVia` alone would keep it for a stale desktop cookie replayed
 * against a plain server, where the desktop rule does not apply either way. vitest runs
 * node-only here, so this asserts the pure helper, not the dialog (account-menu.test.ts
 * convention).
 */
import { describe, expect, it } from "vitest";
import { usesAuthorizationBridge } from "../src/lib/authorization-window";

describe("usesAuthorizationBridge", () => {
  it("skips the blank tab only in the desktop shell's own window", () => {
    // The shell refuses every blank window (a Files-panel preview could open and script one),
    // and has no popup blocker, so the URL is opened directly once the server returns it.
    expect(usesAuthorizationBridge({ desktopMode: true, sessionVia: "desktop" })).toBe(false);
  });

  it("keeps the blank tab in every browser", () => {
    expect(usesAuthorizationBridge({ desktopMode: true, sessionVia: "password" })).toBe(true);
    expect(usesAuthorizationBridge({ desktopMode: false, sessionVia: "desktop" })).toBe(true);
    expect(usesAuthorizationBridge({ desktopMode: false, sessionVia: "password" })).toBe(true);
    expect(usesAuthorizationBridge({ desktopMode: false, sessionVia: "setup" })).toBe(true);
  });
});
