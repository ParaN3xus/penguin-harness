/**
 * Which token groups each Foundations page renders. Pure data (no JSX), so the coverage test —
 * every group in tokens.ts on exactly one page — runs in node.
 */
import type { TokenGroupId } from "@prismshadow/penguin-ui";

export const FOUNDATION_TOKEN_GROUPS = {
  "foundations-color": [
    "color-surfaces",
    "color-text",
    "color-lines",
    "color-accent",
    "color-tones",
    "color-charts",
    "color-code",
  ],
  "foundations-typography": ["type-families", "type-scale"],
  "foundations-radius": ["shape"],
  "foundations-elevation": ["elevation"],
  "foundations-density": ["density"],
  "foundations-motion": ["motion"],
  "foundations-icons": ["icons"],
  "foundations-focus": ["focus"],
  "foundations-hooks": [],
  "foundations-layering": [],
} satisfies Record<string, readonly TokenGroupId[]>;
