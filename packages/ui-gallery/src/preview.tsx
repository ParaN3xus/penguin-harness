/**
 * What a section previews, whatever produced it: a component demo, a Foundations page, or nothing
 * yet (a planned component, a screen). The main page, the compare frames and `/embed` all render
 * through this one module, so a preview looks the same in each.
 */
import { TOKEN_GROUPS } from "@prismshadow/penguin-ui";
import type { ReactNode } from "react";
import { CATALOG } from "../../ui/src/catalog";
import type { CatalogGroup, CatalogSection } from "../../ui/src/catalog";
import type { Demo, DemoAxes } from "../../ui/src/demo";
import { FOUNDATIONS } from "./foundations";
import { allSelections, formatVariantKey, parseVariantKey } from "./lib/demos";
import type { VariantPick } from "./lib/demos";
import { DEMOS } from "./registry";
import { useGallery } from "./state";

export interface Renderable {
  axes?: DemoAxes;
  matrix?: boolean;
  /** Token names for the drawer. */
  tokens: readonly string[];
  code: { kind: "demo"; path: string } | { kind: "file"; file: string };
  render: (pick: VariantPick) => ReactNode;
}

function DemoCell({
  demo,
  selection,
}: {
  demo: Demo;
  selection: Readonly<Record<string, string>>;
}) {
  const { state, mode } = useGallery();
  return <>{demo.render(selection, { lang: state.lang, mode })}</>;
}

function demoRenderable(demo: Demo, path: string): Renderable {
  return {
    axes: demo.axes,
    matrix: demo.matrix,
    tokens: demo.tokensUsed ?? [],
    code: { kind: "demo", path },
    render: (pick) =>
      pick.kind === "matrix" ? (
        <div className="g-matrix">
          {allSelections(demo.axes).map((selection) => {
            const key = formatVariantKey(demo.axes, { kind: "single", selection });
            return (
              <div key={key} className="g-matrix-cell">
                <span className="g-matrix-label">{key.replaceAll(".", " · ")}</span>
                <div className="g-matrix-body">
                  <DemoCell demo={demo} selection={selection} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <DemoCell demo={demo} selection={pick.selection} />
      ),
  };
}

/** The renderable for a section, or null when it has nothing to preview yet. */
export function renderableFor(section: CatalogSection): Renderable | null {
  if (section.kind === "foundation") {
    const page = FOUNDATIONS[section.id];
    if (!page) return null;
    const groups = new Set<string>(page.tokenGroups);
    return {
      axes: page.axes,
      tokens: TOKEN_GROUPS.filter((group) => groups.has(group.id)).flatMap((group) => group.names),
      code: { kind: "file", file: page.file },
      render: (pick) => page.render(pick.kind === "single" ? pick.selection : {}),
    };
  }
  if (section.kind === "component") {
    const found = DEMOS.byId.get(section.id);
    return found ? demoRenderable(found.demo, found.path) : null;
  }
  return null;
}

export interface SectionEntry {
  group: CatalogGroup;
  section: CatalogSection;
  /** `02.03`: group number . section number, as printed in the header. */
  number: string;
  renderable: Renderable | null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Every catalogued section in render order, plus uncatalogued demos as a trailing group. */
export const SECTION_ENTRIES: readonly SectionEntry[] = (() => {
  const entries: SectionEntry[] = CATALOG.flatMap((group, g) =>
    group.sections.map((section, s) => ({
      group,
      section,
      number: `${pad(g + 1)}.${pad(s + 1)}`,
      renderable: renderableFor(section),
    })),
  );
  if (DEMOS.uncatalogued.length > 0) {
    const group: CatalogGroup = {
      id: "uncatalogued",
      title: "Uncatalogued",
      description: "",
      sections: DEMOS.uncatalogued.map(({ demo }) => ({
        kind: "component" as const,
        id: demo.id,
        title: demo.title,
        components: [],
        description: demo.description,
        props: "",
        replaces: "",
        plan: "new" as const,
        wave: "W1" as const,
      })),
    };
    DEMOS.uncatalogued.forEach(({ demo, path }, s) => {
      const section = group.sections[s];
      if (section) {
        entries.push({
          group,
          section,
          number: `${pad(CATALOG.length + 1)}.${pad(s + 1)}`,
          renderable: demoRenderable(demo, path),
        });
      }
    });
  }
  return entries;
})();

export function findEntry(id: string): SectionEntry | undefined {
  return SECTION_ENTRIES.find((entry) => entry.section.id === id);
}

export function pickFor(entry: SectionEntry, key: string | undefined): VariantPick {
  return parseVariantKey(entry.renderable?.axes, entry.renderable?.matrix, key);
}

/** Localized title and description for a catalog group or section. */
export function useCatalogText(): {
  group: (group: CatalogGroup) => { title: string; description: string };
  section: (section: CatalogSection) => { title: string; description: string };
} {
  const { S } = useGallery();
  return {
    group: (group) =>
      S.catalog.groups[group.id] ?? { title: group.title, description: group.description },
    section: (section) => {
      const zh = S.catalog.sections[section.id];
      return {
        title: zh?.title ?? section.title,
        description: zh?.description ?? section.description,
      };
    },
  };
}
