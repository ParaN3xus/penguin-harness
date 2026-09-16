/**
 * The company sidebar's temporary row: the one ticket session the reader opened from a ticket.
 *
 * Ticket sessions are never listed in the sidebar — there are many of them and each belongs to
 * the ticket that started it — but a conversation on screen with nothing in the sidebar naming
 * it leaves the reader nowhere to stand. So opening one from a ticket's dialog records it here,
 * the sidebar draws it as a single row under a 「临时」 header, and the record lasts exactly as
 * long as the reader stays on that conversation:
 *
 * - While the navigation to it is still on its way, the record survives on the page it was
 *   opened from (the router commits a new location in a transition, after the click).
 * - Once the conversation has been reached, any other location drops it: another session, a
 *   channel, a page.
 * - Dismissing it, or following its "back to ticket" link, returns to the page it was opened
 *   from with the ticket open again.
 *
 * The lifecycle is a pure function of the record and the current path, so it holds however
 * often and from wherever it is evaluated; the record is mirrored into sessionStorage so a
 * reload on the conversation keeps its row. State is module-level: the record belongs to the
 * browser tab, like the location it follows.
 */
import { useEffect, useSyncExternalStore } from "react";
import { useLocation } from "react-router";

export interface TempSession {
  projectId: string;
  orgId: string;
  sessionId: string;
  /** The employee the session runs as: the row's avatar. */
  agentId: string;
  /** The title the ticket listed it under, until the session list has its own. */
  title: string;
  /** The ticket it was opened from, for the way back; null when it was opened from elsewhere. */
  ticket: { ticketId: string; title: string } | null;
  /** The location (path and query) it was opened from — where dismissing it returns. */
  returnTo: string;
  /** The conversation has been on screen at least once. */
  arrived: boolean;
}

/** The route a Session opens at. */
export function chatPath(sessionId: string): string {
  return `/chat/${sessionId}`;
}

/** The path part of a stored location (the query and hash dropped). */
function pathOf(location: string): string {
  const cut = location.search(/[?#]/);
  return cut === -1 ? location : location.slice(0, cut);
}

/**
 * The record after the shell has settled on `pathname`: kept (and marked arrived) on its own
 * conversation, kept on the page it was opened from while the navigation is still pending, and
 * dropped everywhere else.
 */
export function tempSessionAt(temp: TempSession | null, pathname: string): TempSession | null {
  if (temp === null) return null;
  if (pathname === chatPath(temp.sessionId)) {
    return temp.arrived ? temp : { ...temp, arrived: true };
  }
  if (!temp.arrived && pathname === pathOf(temp.returnTo)) return temp;
  return null;
}

/**
 * The record the sidebar draws for one organization: that organization's, and not a desk the
 * 工位 group already lists (a desk can contribute to a ticket too, and has its row already).
 */
export function visibleTempSession(
  temp: TempSession | null,
  org: { projectId: string; orgId: string } | null,
  deskSessionIds: Iterable<string | null>,
): TempSession | null {
  if (temp === null || org === null) return null;
  if (temp.projectId !== org.projectId || temp.orgId !== org.orgId) return null;
  for (const id of deskSessionIds) if (id === temp.sessionId) return null;
  return temp;
}

// ---------------------------------------------------------------------------
// The store: one record per browser tab.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "penguin.company.tempSession";

function isTempSession(value: unknown): value is TempSession {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const ticket = v.ticket as Record<string, unknown> | null | undefined;
  return (
    typeof v.projectId === "string" &&
    typeof v.orgId === "string" &&
    typeof v.sessionId === "string" &&
    typeof v.agentId === "string" &&
    typeof v.title === "string" &&
    typeof v.returnTo === "string" &&
    typeof v.arrived === "boolean" &&
    (ticket === null ||
      (typeof ticket === "object" &&
        typeof ticket.ticketId === "string" &&
        typeof ticket.title === "string"))
  );
}

function readStored(): TempSession | null {
  try {
    const raw = globalThis.sessionStorage?.getItem(STORAGE_KEY);
    if (raw === null || raw === undefined) return null;
    const parsed: unknown = JSON.parse(raw);
    return isTempSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStored(temp: TempSession | null): void {
  try {
    if (temp === null) globalThis.sessionStorage?.removeItem(STORAGE_KEY);
    else globalThis.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(temp));
  } catch {
    // Storage blocked: the row still works, it just does not survive a reload.
  }
}

let current: TempSession | null = readStored();
const listeners = new Set<() => void>();

function set(next: TempSession | null): void {
  if (next === current) return;
  current = next;
  writeStored(next);
  for (const listener of listeners) listener();
}

export function getTempSession(): TempSession | null {
  return current;
}

/** Records the ticket session being opened; the caller navigates to it. */
export function openTempSession(temp: Omit<TempSession, "arrived">): void {
  set({ ...temp, arrived: false });
}

export function clearTempSession(): void {
  set(null);
}

/** Applies the lifecycle to the location the shell is on. */
export function settleTempSession(pathname: string): void {
  set(tempSessionAt(current, pathname));
}

export function subscribeTempSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTempSession(): TempSession | null {
  return useSyncExternalStore(subscribeTempSession, getTempSession, getTempSession);
}

/**
 * Keeps the record in step with the location. Mounted once, by the app layout, which is on
 * screen for every route — so a navigation made while the sidebar is collapsed or its drawer
 * closed is still seen.
 */
export function useTempSessionTracker(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    settleTempSession(pathname);
  }, [pathname]);
}
