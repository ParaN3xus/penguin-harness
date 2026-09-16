/**
 * The ticket card's press gesture (pure, unit tested): a click opens the ticket, and only a
 * long press lifts the card so it can be dragged to another column.
 *
 * One machine per board, since a board only ever has one card under a finger or the mouse:
 *
 * - `idle` → a primary press starts `pressing` and the hold timer.
 * - `pressing` → released before the hold completes: a tap, and the click that follows is let
 *   through, so the card opens. Moved further than the slop first: `void` — a quick drag, which
 *   does nothing at all. The hold completing without that movement: `lifted`.
 * - `lifted` → the card follows the pointer, and releasing it drops it where the pointer is.
 * - A cancel (the browser took the gesture over for a scroll, the pointer was lost, Escape)
 *   ends any phase; a lifted card is put back.
 *
 * Every gesture that did not end as a tap swallows the click the browser sends after it: a mouse
 * press that moved still fires one, and a touch released between the hold completing and the
 * platform's own long-press threshold fires one too. The guard is short-lived and a new press
 * resets it, so a click that does not belong to a gesture — a screen reader's activation — is
 * never eaten by a stale one.
 *
 * The touch-scroll half of the contract lives in the DOM binding: while a card is only being
 * pressed nothing here stops the page, so a finger that moves scrolls it and the browser's
 * `pointercancel` ends the press.
 */

/** How long a card has to be held still before it lifts. */
export const LONG_PRESS_MS = 350;

/** How far (px, either axis) a held pointer may wander before the press counts as a quick drag. */
export const PRESS_SLOP_PX = 6;

/** How long after a non-tap gesture ends the click it produces is still swallowed. */
export const CLICK_GUARD_MS = 600;

export type PressPhase = "idle" | "pressing" | "lifted" | "void";

export interface PressPoint {
  pointerId: number;
  x: number;
  y: number;
}

export interface PressStart extends PressPoint {
  /** `MouseEvent.button`: only the main button (0) presses a card. */
  button: number;
  isPrimary: boolean;
}

export interface PressHandlers {
  /** The hold completed without moving: the card lifts, at the point it was pressed. */
  lift: (at: { x: number; y: number }) => void;
  /** A lifted card follows the pointer. */
  drag: (at: { x: number; y: number }) => void;
  /** A lifted card was released here. */
  drop: (at: { x: number; y: number }) => void;
  /** A lifted card was cancelled rather than released: it goes back where it was. */
  cancel: () => void;
}

/** The timer seam: the browser's in the app, fake timers in the tests. */
export interface PressTimers {
  set: (fn: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
}

const defaultTimers: PressTimers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export interface TicketPress {
  phase: () => PressPhase;
  down: (e: PressStart) => void;
  move: (e: PressPoint) => void;
  up: (e: PressPoint) => void;
  /** The gesture is over without a release: pointercancel, a lost pointer, Escape. */
  cancel: () => void;
  /** Whether the click now arriving belongs to a gesture that was not a tap (and so is swallowed). */
  consumeClick: () => boolean;
  dispose: () => void;
}

export function createTicketPress(
  handlers: PressHandlers,
  options: { holdMs?: number; slopPx?: number; timers?: PressTimers } = {},
): TicketPress {
  const holdMs = options.holdMs ?? LONG_PRESS_MS;
  const slopPx = options.slopPx ?? PRESS_SLOP_PX;
  const timers = options.timers ?? defaultTimers;
  let phase: PressPhase = "idle";
  let pointerId = -1;
  let origin = { x: 0, y: 0 };
  let holdTimer: unknown = null;
  let guard = false;
  let guardTimer: unknown = null;

  const clearHold = () => {
    if (holdTimer !== null) timers.clear(holdTimer);
    holdTimer = null;
  };
  const clearGuard = () => {
    if (guardTimer !== null) timers.clear(guardTimer);
    guardTimer = null;
    guard = false;
  };
  /** The gesture ended as something other than a tap: swallow the click it is about to produce. */
  const armGuard = () => {
    clearGuard();
    guard = true;
    guardTimer = timers.set(() => {
      guard = false;
      guardTimer = null;
    }, CLICK_GUARD_MS);
  };
  const end = () => {
    clearHold();
    phase = "idle";
    pointerId = -1;
  };

  return {
    phase: () => phase,

    down: (e) => {
      if (!e.isPrimary || e.button !== 0) return;
      // A press that never saw its release (a lost pointer) must not keep a timer alive.
      if (phase === "lifted") handlers.cancel();
      end();
      clearGuard();
      phase = "pressing";
      pointerId = e.pointerId;
      origin = { x: e.x, y: e.y };
      holdTimer = timers.set(() => {
        holdTimer = null;
        if (phase !== "pressing") return;
        phase = "lifted";
        handlers.lift(origin);
      }, holdMs);
    },

    move: (e) => {
      if (e.pointerId !== pointerId) return;
      if (phase === "pressing") {
        if (Math.abs(e.x - origin.x) > slopPx || Math.abs(e.y - origin.y) > slopPx) {
          clearHold();
          phase = "void";
        }
      } else if (phase === "lifted") {
        handlers.drag({ x: e.x, y: e.y });
      }
    },

    up: (e) => {
      if (e.pointerId !== pointerId) return;
      const was = phase;
      end();
      if (was === "lifted") {
        handlers.drop({ x: e.x, y: e.y });
        armGuard();
      } else if (was === "void") {
        armGuard();
      }
      // `pressing`: a tap — the click that follows opens the card.
    },

    cancel: () => {
      if (phase === "idle") return;
      const was = phase;
      end();
      if (was === "lifted") handlers.cancel();
      armGuard();
    },

    consumeClick: () => {
      const swallow = guard;
      clearGuard();
      return swallow;
    },

    dispose: () => {
      end();
      clearGuard();
    },
  };
}

/**
 * How far to scroll a container this frame while a lifted card is held near one of its edges:
 * nothing outside the band, then faster the deeper into it — negative toward the start edge,
 * positive toward the end. `pos`, `start` and `end` are one axis of the pointer and of the
 * container's visible box.
 */
export function edgeScrollStep(
  pos: number,
  start: number,
  end: number,
  band = 48,
  maxStep = 16,
): number {
  if (end - start <= band * 2) return 0;
  if (pos < start + band) {
    const depth = Math.min(1, (start + band - pos) / band);
    return -Math.ceil(depth * maxStep);
  }
  if (pos > end - band) {
    const depth = Math.min(1, (pos - (end - band)) / band);
    return Math.ceil(depth * maxStep);
  }
  return 0;
}
