import { TOKEN_GROUPS } from "@prismshadow/penguin-ui";
import { describe, expect, it } from "vitest";
import { CATALOG, CATALOG_SECTIONS } from "../../ui/src/catalog";
import { FOUNDATION_TOKEN_GROUPS } from "../src/foundations/token-groups";
import { zh } from "../src/strings";

describe("catalog", () => {
  it("gives every group and section a unique, kebab-case, group-prefixed id", () => {
    const ids = CATALOG_SECTIONS.map(({ section }) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(CATALOG.map((g) => g.id)).size).toBe(CATALOG.length);
    for (const { group, section } of CATALOG_SECTIONS) {
      expect(section.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(section.id.startsWith(`${group.id}-`)).toBe(true);
    }
  });

  it("keeps the component partition's group order", () => {
    expect(CATALOG.map((g) => g.id)).toEqual([
      "foundations",
      "icons",
      "actions",
      "forms",
      "navigation",
      "overlays",
      "feedback",
      "layout",
      "data",
      "content",
      "chat",
      "files",
      "shell",
      "charts",
      "screens",
    ]);
  });

  it("lists at least one export for every planned component", () => {
    for (const { section } of CATALOG_SECTIONS) {
      if (section.kind === "component") expect(section.components.length).toBeGreaterThan(0);
    }
  });

  it("renders every token group on exactly one Foundations page, and every page is catalogued", () => {
    const foundationIds = CATALOG.find((g) => g.id === "foundations")!.sections.map((s) => s.id);
    expect(Object.keys(FOUNDATION_TOKEN_GROUPS).sort()).toEqual([...foundationIds].sort());
    const rendered = Object.values(FOUNDATION_TOKEN_GROUPS).flat();
    expect([...rendered].sort()).toEqual(TOKEN_GROUPS.map((g) => g.id).sort());
  });

  it("has a Chinese title or description for every group, section and token group", () => {
    for (const group of CATALOG) expect(zh.catalog.groups[group.id], group.id).toBeDefined();
    for (const { section } of CATALOG_SECTIONS) {
      expect(zh.catalog.sections[section.id], section.id).toBeDefined();
    }
    for (const group of TOKEN_GROUPS)
      expect(zh.catalog.tokenGroups[group.id], group.id).toBeDefined();
  });
});
