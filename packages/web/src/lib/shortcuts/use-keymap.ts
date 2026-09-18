/**
 * React reads of the keymap. Every display site of a chord goes through these, so a change made
 * in the settings dialog — or in another tab, through the mirror's `storage` event — redraws the
 * tooltip, the kbd and the button title without a reload.
 */
import { useSyncExternalStore } from "react";
import { formatBinding } from "./format";
import { currentPlatform } from "./platform";
import { bindingOf, keyboardLayout, keymap, keymapVersion, subscribeKeymap } from "./store";
import type { Chord, CommandId, Keymap } from "./types";

export function useKeymap(): Keymap {
  useSyncExternalStore(subscribeKeymap, keymapVersion, keymapVersion);
  return keymap();
}

export function useBinding(id: CommandId): Chord | null {
  useKeymap();
  return bindingOf(id);
}

/** The command's chord as the platform writes it, or null while it is unbound. */
export function useShortcutLabel(id: CommandId): string | null {
  const map = useKeymap();
  return formatBinding(id, map, currentPlatform(), keyboardLayout() ?? undefined);
}
