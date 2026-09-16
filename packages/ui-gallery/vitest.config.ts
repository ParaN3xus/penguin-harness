/**
 * Vitest config kept separate from vite.config.ts (vitest's embedded vite types conflict with
 * this package's vite 7 plugin types). The tests cover the gallery's pure modules only, so a node
 * environment suffices; the package alias points `@prismshadow/penguin-ui` at its live source, as
 * the Vite plugin does for the app.
 */
import { defineConfig } from "vitest/config";
import { penguinUiAliases } from "../ui/src/vite-plugin";

export default defineConfig({
  resolve: { alias: penguinUiAliases() },
  test: { environment: "node" },
});
