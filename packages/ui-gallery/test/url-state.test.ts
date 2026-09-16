import { describe, expect, it } from "vitest";
import {
  DEFAULT_STATE,
  formatGalleryQuery,
  parseGalleryState,
  resolveMode,
  withVariant,
} from "../src/lib/url-state";

describe("gallery URL state", () => {
  it("reads every field and round-trips through the canonical query", () => {
    const search =
      "?theme=geek&mode=dark&tier=lg&lang=zh&compare=1&motion=reduced&v.actions-button=danger.sm&v.foundations-color=matrix";
    const state = parseGalleryState(search);
    expect(state).toEqual({
      theme: "geek",
      mode: "dark",
      tier: "lg",
      lang: "zh",
      compare: true,
      motion: "reduced",
      variants: { "actions-button": "danger.sm", "foundations-color": "matrix" },
    });
    expect(parseGalleryState(formatGalleryQuery(state))).toEqual(state);
  });

  it("always writes the four preferences and only the flags that are set", () => {
    expect(formatGalleryQuery(DEFAULT_STATE)).toBe("?theme=github&mode=light&tier=md&lang=en");
    expect(formatGalleryQuery({ ...DEFAULT_STATE, compare: true, motion: "reduced" })).toBe(
      "?theme=github&mode=light&tier=md&lang=en&compare=1&motion=reduced",
    );
  });

  it("keeps route params right after the preferences, in the order given", () => {
    expect(
      formatGalleryQuery(
        { ...DEFAULT_STATE, theme: "modern" },
        { demo: "actions-button", variant: "danger.sm" },
      ),
    ).toBe("?theme=modern&mode=light&tier=md&lang=en&demo=actions-button&variant=danger.sm");
  });

  it("sorts variant picks so one view has one URL", () => {
    const a = formatGalleryQuery({ ...DEFAULT_STATE, variants: { b: "x", a: "y" } });
    const b = formatGalleryQuery({ ...DEFAULT_STATE, variants: { a: "y", b: "x" } });
    expect(a).toBe(b);
    expect(a.endsWith("&v.a=y&v.b=x")).toBe(true);
  });

  it("falls back to the remembered value, then the default, for anything unknown", () => {
    expect(parseGalleryState("?theme=nope&mode=sepia&tier=xl&lang=fr")).toEqual(DEFAULT_STATE);
    expect(parseGalleryState("?theme=nope", { theme: "modern", lang: "zh" })).toMatchObject({
      theme: "modern",
      lang: "zh",
    });
    // The URL beats the remembered value.
    expect(parseGalleryState("?theme=geek", { theme: "modern" }).theme).toBe("geek");
  });

  it("ignores empty and nameless variant params", () => {
    expect(parseGalleryState("?v.=x&v.actions-button=").variants).toEqual({});
  });

  it("resolves system mode against the OS preference", () => {
    expect(resolveMode("system", true)).toBe("dark");
    expect(resolveMode("system", false)).toBe("light");
    expect(resolveMode("light", true)).toBe("light");
  });

  it("sets and clears one section's pick without touching the others", () => {
    const state = withVariant({ ...DEFAULT_STATE, variants: { a: "1" } }, "b", "2");
    expect(state.variants).toEqual({ a: "1", b: "2" });
    expect(withVariant(state, "a", null).variants).toEqual({ b: "2" });
  });
});
