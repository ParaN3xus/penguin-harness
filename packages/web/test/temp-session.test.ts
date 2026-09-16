/**
 * temp-session.ts unit tests: the company sidebar's temporary row for a ticket session. It
 * survives the pending navigation on the page it was opened from, is marked arrived on its own
 * conversation, and drops on any other location; the sidebar draws it only for its own
 * organization and never for a desk the 工位 group already lists; the store follows the same
 * lifecycle and tells its subscribers.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  chatPath,
  clearTempSession,
  getTempSession,
  openTempSession,
  settleTempSession,
  subscribeTempSession,
  tempSessionAt,
  visibleTempSession,
} from "../src/features/company/temp-session";
import type { TempSession } from "../src/features/company/temp-session";

const BOARD = "/org/proj/acme/tickets";

function temp(over: Partial<TempSession> = {}): TempSession {
  return {
    projectId: "proj",
    orgId: "acme",
    sessionId: "sess_ticket",
    agentId: "acme_dev",
    title: "Build the site",
    ticket: { ticketId: "2026-09-16-site", title: "Marketplace site" },
    returnTo: `${BOARD}?ticket=2026-09-16-site`,
    arrived: false,
    ...over,
  };
}

/** The record as the dialog opens it: everything but whether it has arrived. */
function opened(): Omit<TempSession, "arrived"> {
  const { projectId, orgId, sessionId, agentId, title, ticket, returnTo } = temp();
  return { projectId, orgId, sessionId, agentId, title, ticket, returnTo };
}

afterEach(() => {
  clearTempSession();
});

describe("temporary session lifecycle", () => {
  it("is the conversation's own route", () => {
    expect(chatPath("sess_ticket")).toBe("/chat/sess_ticket");
  });

  it("waits on the page it was opened from while the navigation is pending", () => {
    const t = temp();
    expect(tempSessionAt(t, BOARD)).toBe(t);
  });

  it("is marked arrived on its conversation, and stays the same record once it is", () => {
    const arrived = tempSessionAt(temp(), "/chat/sess_ticket");
    expect(arrived).toEqual(temp({ arrived: true }));
    expect(tempSessionAt(arrived, "/chat/sess_ticket")).toBe(arrived);
  });

  it("drops on any other location once the conversation has been reached", () => {
    const arrived = temp({ arrived: true });
    expect(tempSessionAt(arrived, BOARD)).toBeNull();
    expect(tempSessionAt(arrived, "/chat/sess_other")).toBeNull();
    expect(tempSessionAt(arrived, "/org/proj/acme/channels/default_channel")).toBeNull();
    expect(tempSessionAt(arrived, "/org/proj/acme/overview")).toBeNull();
  });

  it("drops a pending record that ended up anywhere but its origin or its conversation", () => {
    expect(tempSessionAt(temp(), "/chat/sess_redirected")).toBeNull();
    expect(tempSessionAt(temp(), "/org/proj/acme/overview")).toBeNull();
  });

  it("stays null without a record", () => {
    expect(tempSessionAt(null, "/chat/sess_ticket")).toBeNull();
  });
});

describe("visible temporary session", () => {
  const org = { projectId: "proj", orgId: "acme" };

  it("is drawn for its own organization", () => {
    const t = temp();
    expect(visibleTempSession(t, org, ["sess_desk", null])).toBe(t);
  });

  it("is not drawn for another organization, or with none open", () => {
    expect(visibleTempSession(temp(), { projectId: "proj", orgId: "other" }, [])).toBeNull();
    expect(visibleTempSession(temp(), { projectId: "other", orgId: "acme" }, [])).toBeNull();
    expect(visibleTempSession(temp(), null, [])).toBeNull();
  });

  it("is not drawn for a desk, which the 工位 group already lists", () => {
    expect(visibleTempSession(temp({ sessionId: "sess_desk" }), org, ["sess_desk"])).toBeNull();
  });
});

describe("temporary session store", () => {
  it("follows a ticket session from the board to its conversation and away again", () => {
    let notified = 0;
    const unsubscribe = subscribeTempSession(() => {
      notified += 1;
    });
    openTempSession(opened());
    expect(getTempSession()).toEqual(temp());
    expect(notified).toBe(1);

    // The board re-renders before the router commits the conversation: the record holds.
    settleTempSession(BOARD);
    expect(getTempSession()).toEqual(temp());
    expect(notified).toBe(1);

    settleTempSession("/chat/sess_ticket");
    expect(getTempSession()).toEqual(temp({ arrived: true }));
    expect(notified).toBe(2);

    settleTempSession("/org/proj/acme/channels/default_channel");
    expect(getTempSession()).toBeNull();
    expect(notified).toBe(3);
    unsubscribe();
  });

  it("clears on request", () => {
    openTempSession(opened());
    clearTempSession();
    expect(getTempSession()).toBeNull();
  });
});
