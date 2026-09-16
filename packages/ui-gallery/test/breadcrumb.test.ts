import { describe, expect, it } from "vitest";
import { formatBreadcrumb } from "../src/lib/breadcrumb";

describe("formatBreadcrumb", () => {
  it("spells the architecture's example exactly", () => {
    expect(
      formatBreadcrumb({
        theme: "geek",
        group: "Actions",
        section: "Button",
        variant: ["danger", "sm"],
        mode: "dark",
        lang: "en",
        tier: "md",
      }),
    ).toBe("Console › Actions › Button › danger · sm · dark");
  });

  it("names a matrix pick `all`", () => {
    expect(
      formatBreadcrumb({
        theme: "modern",
        group: "Actions",
        section: "Button",
        variant: ["all"],
        mode: "light",
        lang: "en",
        tier: "md",
      }),
    ).toBe("Frost › Actions › Button › all · light");
  });

  it("appends the language and root size only when they differ from en and 18px", () => {
    expect(
      formatBreadcrumb({
        theme: "github",
        group: "Foundations",
        section: "Colour",
        variant: ["matrix"],
        mode: "dark",
        lang: "zh",
        tier: "lg",
      }),
    ).toBe("Primer › Foundations › Colour › matrix · dark · zh · 20px");
  });

  it("joins the mode with a dot when a card has no pills", () => {
    expect(
      formatBreadcrumb({
        theme: "github",
        group: "Foundations",
        section: "Layering",
        mode: "light",
        lang: "en",
        tier: "sm",
      }),
    ).toBe("Primer › Foundations › Layering · light · 16px");
  });
});
