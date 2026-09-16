/**
 * ticket-press.ts unit tests: a tap lets its click through, a hold lifts the card and a release
 * drops it, a quick drag does nothing, a cancel puts a lifted card back, only the main button of
 * the primary pointer presses, and the click a non-tap gesture produces is swallowed for a short
 * window only. Plus the edge-scroll step a held card drives. Timings run on fake timers.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CLICK_GUARD_MS,
  LONG_PRESS_MS,
  PRESS_SLOP_PX,
  createTicketPress,
  edgeScrollStep,
} from "../src/features/company/ticket-press";

function setup() {
  const calls: string[] = [];
  const press = createTicketPress({
    lift: (at) => calls.push(`lift ${at.x},${at.y}`),
    drag: (at) => calls.push(`drag ${at.x},${at.y}`),
    drop: (at) => calls.push(`drop ${at.x},${at.y}`),
    cancel: () => calls.push("cancel"),
  });
  const down = (
    x = 10,
    y = 10,
    over: { pointerId?: number; button?: number; isPrimary?: boolean } = {},
  ) => press.down({ pointerId: 1, button: 0, isPrimary: true, x, y, ...over });
  const move = (x: number, y: number, pointerId = 1) => press.move({ pointerId, x, y });
  const up = (x: number, y: number, pointerId = 1) => press.up({ pointerId, x, y });
  return { press, calls, down, move, up };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("ticket card press", () => {
  it("lets a tap's click through: released before the hold completes, nothing lifts", () => {
    const { press, calls, down, up } = setup();
    down();
    vi.advanceTimersByTime(LONG_PRESS_MS - 1);
    up(10, 10);
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(calls).toEqual([]);
    expect(press.phase()).toBe("idle");
    expect(press.consumeClick()).toBe(false);
  });

  it("lifts after the hold, follows the pointer, and drops where it is released", () => {
    const { press, calls, down, move, up } = setup();
    down(10, 20);
    vi.advanceTimersByTime(LONG_PRESS_MS - 1);
    expect(calls).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(press.phase()).toBe("lifted");
    move(200, 40);
    move(420, 60);
    up(430, 64);
    expect(calls).toEqual(["lift 10,20", "drag 200,40", "drag 420,60", "drop 430,64"]);
    expect(press.phase()).toBe("idle");
    // The drag's own click does not open the card.
    expect(press.consumeClick()).toBe(true);
    expect(press.consumeClick()).toBe(false);
  });

  it("keeps the hold through a wobble inside the slop", () => {
    const { calls, down, move } = setup();
    down(10, 10);
    move(10 + PRESS_SLOP_PX, 10 - PRESS_SLOP_PX);
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(calls).toEqual(["lift 10,10"]);
  });

  it("does nothing on a quick drag: no lift, no drop, and its click is swallowed", () => {
    const { press, calls, down, move, up } = setup();
    down(10, 10);
    vi.advanceTimersByTime(100);
    move(10 + PRESS_SLOP_PX + 1, 10);
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(press.phase()).toBe("void");
    move(300, 10);
    up(300, 10);
    expect(calls).toEqual([]);
    expect(press.consumeClick()).toBe(true);
  });

  it("swallows the click of a hold released in place (the DOM finds no other column)", () => {
    const { press, calls, down, up } = setup();
    down(50, 50);
    vi.advanceTimersByTime(LONG_PRESS_MS);
    up(50, 50);
    expect(calls).toEqual(["lift 50,50", "drop 50,50"]);
    expect(press.consumeClick()).toBe(true);
  });

  it("puts a lifted card back on cancel, without a drop", () => {
    const { press, calls, down, move, up } = setup();
    down();
    vi.advanceTimersByTime(LONG_PRESS_MS);
    move(80, 10);
    press.cancel();
    up(80, 10);
    expect(calls).toEqual(["lift 10,10", "drag 80,10", "cancel"]);
    expect(press.phase()).toBe("idle");
    expect(press.consumeClick()).toBe(true);
  });

  it("ends a press the browser took over for a scroll: the hold never completes", () => {
    const { press, calls, down } = setup();
    down();
    vi.advanceTimersByTime(100);
    press.cancel();
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(calls).toEqual([]);
    expect(press.phase()).toBe("idle");
  });

  it("ignores a secondary button, a non-primary pointer and another pointer's events", () => {
    const { press, calls, down, move, up } = setup();
    down(10, 10, { button: 2 });
    down(10, 10, { isPrimary: false });
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(press.phase()).toBe("idle");
    down(10, 10);
    move(400, 400, 2);
    up(400, 400, 2);
    expect(press.phase()).toBe("pressing");
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(calls).toEqual(["lift 10,10"]);
  });

  it("forgets the click guard after its window, and on the next press", () => {
    const { press, down, move, up } = setup();
    down();
    move(100, 10);
    up(100, 10);
    vi.advanceTimersByTime(CLICK_GUARD_MS);
    // A screen reader's activation long after the drag still opens the card.
    expect(press.consumeClick()).toBe(false);

    down();
    move(100, 10);
    up(100, 10);
    down();
    up(10, 10);
    expect(press.consumeClick()).toBe(false);
  });

  it("stops everything on dispose", () => {
    const { press, calls, down } = setup();
    down();
    press.dispose();
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(calls).toEqual([]);
    expect(press.phase()).toBe("idle");
  });
});

describe("edge scroll step", () => {
  it("scrolls toward the edge the pointer is held near, faster the deeper it goes", () => {
    expect(edgeScrollStep(500, 0, 1000)).toBe(0);
    expect(edgeScrollStep(40, 0, 1000)).toBeLessThan(0);
    expect(edgeScrollStep(0, 0, 1000)).toBeLessThan(edgeScrollStep(40, 0, 1000));
    expect(edgeScrollStep(960, 0, 1000)).toBeGreaterThan(0);
    expect(edgeScrollStep(1000, 0, 1000)).toBeGreaterThan(edgeScrollStep(960, 0, 1000));
  });

  it("caps the step once the pointer leaves the container", () => {
    expect(edgeScrollStep(-500, 0, 1000)).toBe(edgeScrollStep(0, 0, 1000));
    expect(edgeScrollStep(5000, 0, 1000)).toBe(edgeScrollStep(1000, 0, 1000));
  });

  it("does not scroll a container too small to have a middle", () => {
    expect(edgeScrollStep(10, 0, 90)).toBe(0);
  });
});
