/**
 * The Foundations pages by catalog section id. Each declares the token groups it renders (a test
 * checks every group in tokens.ts is rendered by exactly one page), its pill axes, and its source
 * file for the code drawer.
 */
import type { TokenGroupId } from "@prismshadow/penguin-ui";
import type { ReactNode } from "react";
import type { DemoAxes } from "../../../ui/src/demo";
import { ColorPage } from "./color";
import { DensityPage } from "./density";
import { ElevationPage } from "./elevation";
import { FocusPage } from "./focus";
import { HooksPage } from "./hooks";
import { IconsPage } from "./icons";
import { LayeringPage } from "./layering";
import { MotionPage } from "./motion";
import { ShapePage } from "./shape";
import { TypographyPage } from "./typography";
import { FOUNDATION_TOKEN_GROUPS } from "./token-groups";

export interface FoundationPage {
  axes?: DemoAxes;
  tokenGroups: readonly TokenGroupId[];
  file: string;
  render: (selection: Readonly<Record<string, string>>) => ReactNode;
}

const file = (name: string) => `packages/ui-gallery/src/foundations/${name}.tsx`;

export const FOUNDATIONS: Readonly<Record<string, FoundationPage>> = {
  "foundations-color": {
    axes: { view: ["active", "matrix"] },
    tokenGroups: FOUNDATION_TOKEN_GROUPS["foundations-color"],
    file: file("color"),
    render: ({ view }) => <ColorPage view={view ?? "active"} />,
  },
  "foundations-typography": {
    axes: { sample: ["both", "en", "zh"] },
    tokenGroups: FOUNDATION_TOKEN_GROUPS["foundations-typography"],
    file: file("typography"),
    render: ({ sample }) => <TypographyPage sample={sample ?? "both"} />,
  },
  "foundations-radius": {
    tokenGroups: FOUNDATION_TOKEN_GROUPS["foundations-radius"],
    file: file("shape"),
    render: () => <ShapePage />,
  },
  "foundations-elevation": {
    axes: { backdrop: ["wash", "canvas"] },
    tokenGroups: FOUNDATION_TOKEN_GROUPS["foundations-elevation"],
    file: file("elevation"),
    render: ({ backdrop }) => <ElevationPage backdrop={backdrop ?? "wash"} />,
  },
  "foundations-density": {
    tokenGroups: FOUNDATION_TOKEN_GROUPS["foundations-density"],
    file: file("density"),
    render: () => <DensityPage />,
  },
  "foundations-motion": {
    tokenGroups: FOUNDATION_TOKEN_GROUPS["foundations-motion"],
    file: file("motion"),
    render: () => <MotionPage />,
  },
  "foundations-icons": {
    axes: { size: ["16", "13", "24"] },
    tokenGroups: FOUNDATION_TOKEN_GROUPS["foundations-icons"],
    file: file("icons"),
    render: ({ size }) => <IconsPage size={size ?? "16"} />,
  },
  "foundations-focus": {
    tokenGroups: FOUNDATION_TOKEN_GROUPS["foundations-focus"],
    file: file("focus"),
    render: () => <FocusPage />,
  },
  "foundations-hooks": {
    tokenGroups: FOUNDATION_TOKEN_GROUPS["foundations-hooks"],
    file: file("hooks"),
    render: () => <HooksPage />,
  },
  "foundations-layering": {
    tokenGroups: FOUNDATION_TOKEN_GROUPS["foundations-layering"],
    file: file("layering"),
    render: () => <LayeringPage />,
  },
};
