/**
 * Screen composites for `/screens/<name>`, read from the package: `packages/ui/src/screens/index.ts`
 * exports `SCREENS`, entries of `{ id, title, description, Component }` whose Component takes
 * `{ lang }` and renders a full viewport from token utilities and fixtures (W0e).
 *
 * The module is read through a glob rather than imported, so the gallery builds and shows its
 * placeholders before the screens land, and picks them up the moment they do. catalog.ts's
 * `screens` group names the planned ids.
 */
import type { ComponentType } from "react";

export interface ScreenEntry {
  id: string;
  title: string;
  description: string;
  Component: ComponentType<{ lang: "en" | "zh" }>;
}

const modules = import.meta.glob<{ SCREENS?: readonly ScreenEntry[] }>(
  "../../ui/src/screens/index.ts",
  {
    eager: true,
  },
);

export const SCREENS: Readonly<Record<string, ScreenEntry>> = Object.fromEntries(
  Object.values(modules)
    .flatMap((module) => module.SCREENS ?? [])
    .map((entry) => [entry.id, entry]),
);
