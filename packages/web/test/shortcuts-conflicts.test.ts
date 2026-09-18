/**
 * Conflicts between bindings (src/lib/shortcuts/conflicts.ts) and the chords the host keeps for
 * itself (src/lib/shortcuts/reserved.ts).
 */
import { describe, expect, it } from "vitest";
import { parseChord } from "../src/lib/shortcuts/chord";
import { conflictsOf, findConflicts } from "../src/lib/shortcuts/conflicts";
import { SHORTCUT_COMMANDS } from "../src/lib/shortcuts/registry";
import { browserReserved, desktopReserved } from "../src/lib/shortcuts/reserved";
import type { Chord, CommandId, Platform } from "../src/lib/shortcuts/types";

const chord = (text: string, platform: Platform = "linux"): Chord => {
  const parsed = parseChord(text)!;
  return platform === "mac" || !parsed.ctrl ? parsed : { ...parsed, mod: true, ctrl: false };
};

describe("findConflicts", () => {
  it("reports two globals on one chord as same-scope, first in registry order winning", () => {
    const keymap = new Map<CommandId, Chord | null>([
      ["palette.toggle", chord("Mod+KeyK")],
      ["terminal.toggle", chord("Mod+KeyK")],
    ]);
    expect(findConflicts(keymap, SHORTCUT_COMMANDS)).toEqual([
      { chord: chord("Mod+KeyK"), a: "palette.toggle", b: "terminal.toggle", kind: "same-scope" },
    ]);
  });

  it("reports a global and a focus-scoped command on one chord as shadowed", () => {
    const keymap = new Map<CommandId, Chord | null>([
      ["palette.toggle", chord("Mod+KeyW")],
      ["terminal.close", chord("Mod+KeyW")],
    ]);
    const found = findConflicts(keymap, SHORTCUT_COMMANDS);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ a: "palette.toggle", b: "terminal.close", kind: "shadowed" });
  });

  it("does not report two different focus scopes: they never hold focus together", () => {
    const keymap = new Map<CommandId, Chord | null>([
      ["terminal.close", chord("Mod+KeyS")],
      ["editor.save", chord("Mod+KeyS")],
    ]);
    expect(findConflicts(keymap, SHORTCUT_COMMANDS)).toEqual([]);
  });

  it("ignores unbound commands and filters by id", () => {
    const keymap = new Map<CommandId, Chord | null>([
      ["palette.toggle", null],
      ["terminal.toggle", null],
      ["terminal.close", chord("Mod+KeyW")],
      ["editor.save", chord("Mod+KeyW")],
    ]);
    expect(findConflicts(keymap, SHORTCUT_COMMANDS)).toEqual([]);
    const both = new Map<CommandId, Chord | null>([
      ["palette.toggle", chord("Mod+KeyK")],
      ["terminal.toggle", chord("Mod+KeyK")],
      ["terminal.close", chord("Mod+KeyK")],
    ]);
    const all = findConflicts(both, SHORTCUT_COMMANDS);
    expect(all).toHaveLength(3);
    expect(conflictsOf("editor.save", all)).toEqual([]);
    expect(conflictsOf("terminal.close", all).map((c) => c.kind)).toEqual(["shadowed", "shadowed"]);
  });
});

describe("browserReserved", () => {
  it("names the tab and window chords every browser takes first", () => {
    expect(browserReserved(chord("Mod+KeyW"), "linux")).toBe(true);
    expect(browserReserved(chord("Mod+KeyW", "mac"), "mac")).toBe(true);
    expect(browserReserved(chord("Mod+Shift+KeyW"), "windows")).toBe(true);
    expect(browserReserved(chord("Mod+KeyT"), "linux")).toBe(true);
    expect(browserReserved(chord("Mod+KeyN"), "linux")).toBe(true);
    expect(browserReserved(chord("Mod+Digit1"), "linux")).toBe(true);
    expect(browserReserved(chord("Mod+Digit9"), "linux")).toBe(true);
    expect(browserReserved(chord("Ctrl+Tab"), "windows")).toBe(true);
    expect(browserReserved(chord("Ctrl+Tab", "mac"), "mac")).toBe(true);
    expect(browserReserved(chord("Ctrl+PageDown"), "linux")).toBe(true);
  });

  it("adds the platform's own: F11 and Alt+F4 off a Mac, the OS chords on one", () => {
    expect(browserReserved(chord("F11"), "windows")).toBe(true);
    expect(browserReserved(chord("Alt+F4"), "linux")).toBe(true);
    expect(browserReserved(chord("F11", "mac"), "mac")).toBe(false);
    expect(browserReserved(chord("Mod+KeyQ", "mac"), "mac")).toBe(true);
    expect(browserReserved(chord("Mod+KeyH", "mac"), "mac")).toBe(true);
    expect(browserReserved(chord("Mod+Alt+KeyH", "mac"), "mac")).toBe(true);
    expect(browserReserved(chord("Mod+KeyM", "mac"), "mac")).toBe(true);
    expect(browserReserved(chord("Mod+Backquote", "mac"), "mac")).toBe(true);
    expect(browserReserved(chord("Ctrl+ArrowUp", "mac"), "mac")).toBe(true);
    expect(browserReserved(chord("Mod+KeyQ"), "linux")).toBe(false);
  });

  it("leaves the registry's other defaults and ordinary chords alone", () => {
    expect(browserReserved(chord("Ctrl+Backquote"), "linux")).toBe(false);
    expect(browserReserved(chord("Ctrl+Backquote", "mac"), "mac")).toBe(false);
    expect(browserReserved(chord("Mod+KeyS"), "linux")).toBe(false);
    expect(browserReserved(chord("Mod+KeyP", "mac"), "mac")).toBe(false);
    expect(browserReserved(chord("Mod+Alt+KeyW"), "linux")).toBe(false);
  });
});

describe("desktopReserved", () => {
  it("marks the shell's before-input-event keys on Windows and Linux only", () => {
    expect(desktopReserved(chord("F12"), "windows")).toBe("shell");
    expect(desktopReserved(chord("F10"), "linux")).toBe("shell");
    expect(desktopReserved(chord("Ctrl+Shift+KeyI"), "linux")).toBe("shell");
    expect(desktopReserved(chord("F12", "mac"), "mac")).toBeNull();
  });

  it("marks the menu role accelerators of each platform", () => {
    expect(desktopReserved(chord("Mod+KeyR", "mac"), "mac")).toBe("menu");
    expect(desktopReserved(chord("Mod+Alt+KeyI", "mac"), "mac")).toBe("menu");
    expect(desktopReserved(chord("Mod+Ctrl+KeyF", "mac"), "mac")).toBe("menu");
    expect(desktopReserved(chord("Mod+KeyR"), "windows")).toBe("menu");
    expect(desktopReserved(chord("Mod+KeyW"), "linux")).toBe("menu");
    expect(desktopReserved(chord("F11"), "linux")).toBe("menu");
    // Ctrl+Shift+I is taken by the shell first; the menu never sees it.
    expect(desktopReserved(chord("Ctrl+Shift+KeyI"), "windows")).toBe("shell");
    expect(desktopReserved(chord("Mod+KeyW", "mac"), "mac")).toBeNull();
    expect(desktopReserved(chord("Mod+KeyS"), "linux")).toBeNull();
  });
});
