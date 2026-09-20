/**
 * The hero's scene: its frames, what a reader holds of the mock, and the phases a frame names.
 *
 * The hero plays the gallery's clock like any other composition — until a reader clicks a session
 * row, switches a dock panel or types into the composer. Those moves settle the clock (the
 * package's `useSceneControls`), so the mock holds at `settled`, where everything reads as
 * finished, while the reader's own state — the row, the panel, the draft — sits beside it; a sent
 * prompt plays the clock from `working` once through `answer` to `settled`, where it stops. The
 * card's transport shows each of these, since they move the one clock it owns. Starting the
 * scene over — play from the first frame — is the one move that takes the mock back: the reader's
 * state is dropped when the first frame plays, and the hero follows the scene again.
 *
 * Without a clock (a variant with none, the landing page) the controls are null: a reader keeps
 * the mock for as long as the page is open, and a sent prompt shows its reply settled at once.
 */
import { useState } from "react";
import type { SceneFrame, SceneSpec } from "../module";
import { useArrivals } from "../modules/parts";
import { reached, useScene, useSceneControls } from "../scene";
import type { SceneClock } from "../scene";

/** The frames in play order. The last one is what the card shows while nothing plays. */
export const HERO_FRAMES: readonly SceneFrame[] = [
  { key: "idle", title: "Idle", hold: 900 },
  { key: "prompt", title: "Prompt", hold: 1400 },
  { key: "working", title: "Working", hold: 2600 },
  { key: "answer", title: "Answer", hold: 3200 },
  { key: "settled", title: "Settled", hold: 1800 },
];

export const HERO_SCENE: SceneSpec = { frames: HERO_FRAMES };

// ---------------------------------------------------------------------------------------------
// What the reader holds
// ---------------------------------------------------------------------------------------------

/** What a reader has done to the mock; the scene owns everything they have not touched. */
export interface HeroReader {
  /** Which session row of the sidebar the transcript reads, by its place in the list. */
  session: number;
  /** Which dock panel is on top. */
  panel: number;
  /** What the composer holds, once the reader has typed in it. */
  draft: string;
  /** The prompt the reader sent; the transcript shows it in place of the scene's. */
  sent: string | null;
}

/** The reader's state and the four things they can do to the mock. */
export interface HeroDrive extends HeroReader {
  openSession: (index: number) => void;
  openPanel: (index: number) => void;
  write: (draft: string) => void;
  /** Send what the composer shows — the reader's draft, or the line the scene typed into it. */
  send: (prompt: string) => void;
}

/** The mock as the scene leaves it: the first session, the first panel, an empty composer. */
const RESTING: HeroReader = { session: 0, panel: 0, draft: "", sent: null };

/**
 * The clock the hero's composition renders on, and the reader's hold on the mock. A card that
 * nobody touches behaves exactly like every other module's: settled, and played from the
 * transport.
 */
export function useHeroScene(): { clock: SceneClock | null; drive: HeroDrive } {
  const clock = useScene();
  const controls = useSceneControls();
  const [reader, setReader] = useState<HeroReader>(RESTING);

  // The scene starting over (play from the first frame) takes the mock back from the reader.
  const restarting = clock !== null && clock.playing && clock.index === 0;
  const [seenRestarting, setSeenRestarting] = useState(restarting);
  if (restarting !== seenRestarting) {
    setSeenRestarting(restarting);
    if (restarting) setReader(RESTING);
  }

  /** A reader's own move: the mock holds at settled, and their state sits beside it. */
  const hold = (patch: Partial<HeroReader>) => {
    controls?.settle();
    setReader((current) => ({ ...current, ...patch }));
  };
  const drive: HeroDrive = {
    ...reader,
    openSession: (row) => hold({ session: row }),
    openPanel: (tab) => hold({ panel: tab }),
    write: (text) => hold({ draft: text }),
    send: (prompt) => {
      const text = prompt.trim();
      if (text === "") return;
      // A prompt goes to the Task the composer belongs to, whichever row the reader was reading.
      setReader((current) => ({ ...current, session: 0, draft: "", sent: text }));
      controls?.playFrom("working");
    },
  };
  return { clock, drive };
}

// ---------------------------------------------------------------------------------------------
// What a frame names
// ---------------------------------------------------------------------------------------------

/** How far the second turn has got: not there yet, working, answering, or settled. */
export type HeroTurn = "none" | "working" | "answering" | "settled";

export function heroTurn(clock: SceneClock | null): HeroTurn {
  if (!reached(clock, "working")) return "none";
  if (!reached(clock, "answer")) return "working";
  return reached(clock, "settled") ? "settled" : "answering";
}

/** What the composer holds: nothing, the prompt as the scene types it, a draft, or a run. */
export type HeroComposer = "empty" | "typing" | "draft" | "running";

export function heroComposer(clock: SceneClock | null, reader: HeroReader): HeroComposer {
  if (reader.draft !== "") return "draft";
  if (reached(clock, "prompt") && !reached(clock, "working")) return "typing";
  const turn = heroTurn(clock);
  return turn === "working" || turn === "answering" ? "running" : "empty";
}

/**
 * The scene's prompt as far as it has been typed at this instant, on the same reveal clock as
 * `TypingText`. The composer needs the string rather than the node that helper renders, because
 * a reader types into the same input.
 */
export function useTypedPrompt(text: string): string {
  const characters = Array.from(text);
  const shown = useArrivals(characters.length, "prompt");
  return characters.slice(0, shown).join("");
}
