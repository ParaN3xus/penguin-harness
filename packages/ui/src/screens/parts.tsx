/**
 * Shell pieces shared by the screen mock-ups: marks, the sidebar, the chat header and the dock
 * frame. Static JSX on token utilities and the declared style hooks only — no palette class,
 * no `dark:` pair, no state — so the three themes differ purely through their tokens.
 *
 * Each piece names the web app component it imitates. When that component moves into this
 * package (the wave is noted), the screen swaps the piece for the real thing.
 */
import type { ReactNode } from "react";
import type { Fixtures, RunState, SessionListItem } from "../fixtures";
import { usd, duration, tokens } from "./format";
import { Glyph } from "./glyph";
import type { GlyphName } from "./glyph";

/**
 * A neutral fill for wells that must read as filled in every theme: bubbles, chips, inline code,
 * segmented tracks, timeline lanes. It is derived from the ink rather than taken from
 * `--ui-tone-neutral-bg`, because that token is a badge tint a theme may set to transparent
 * (Console outlines its badges), and the contract has no opaque neutral-fill token.
 */
export const NEUTRAL_FILL = "bg-[color-mix(in_oklab,var(--ui-fg)_7%,transparent)]";

// ---------------------------------------------------------------------------
// Marks (W1: Spinner, Dot, StatusIcon, AgentAvatar)
// ---------------------------------------------------------------------------

/** A ring spinner in the busy tone. */
export function Spinner({ size = 13, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      data-live="spinner"
      className={`ui-live inline-block shrink-0 animate-spin rounded-full border-[1.5px] border-current border-t-transparent ${className}`}
    />
  );
}

/** A 6 px state dot. Dots stay round in every theme; that is what `rounded-full` is kept for. */
export function Dot({ className }: { className: string }) {
  return <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${className}`} />;
}

const STATE_GLYPH: Record<Exclude<RunState, "running">, GlyphName> = {
  waiting: "hourglass",
  done: "circleCheck",
  failed: "circleCross",
  stopped: "circleCross",
};

const STATE_INK: Record<RunState, string> = {
  running: "text-tone-success-fg",
  waiting: "text-tone-attention-fg",
  done: "text-tone-neutral-fg",
  failed: "text-tone-danger-fg",
  stopped: "text-tone-neutral-fg",
};

/** The run-state glyph: a spinner while running, a static mark otherwise. */
export function StatusMark({ state, label }: { state: RunState; label?: string }) {
  if (state === "running") return <Spinner className={STATE_INK.running} />;
  return (
    <span title={label} className={STATE_INK[state]}>
      <Glyph name={STATE_GLYPH[state]} size={13} />
    </span>
  );
}

/** Which chart identity colour an id draws its tile in — identity, not judgement. */
const TILE_INKS = [
  "--ui-chart-6",
  "--ui-chart-1",
  "--ui-chart-5",
  "--ui-chart-2",
  "--ui-chart-4",
  "--ui-chart-3",
] as const;

function tileInk(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TILE_INKS[h % TILE_INKS.length]!;
}

/** A letter tile for an Agent (or a provider): the first letter on a tint of its identity colour. */
export function AgentTile({ id, name, size = 14 }: { id: string; name: string; size?: number }) {
  const ink = tileInk(id);
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.58),
        color: `var(${ink})`,
        background: `color-mix(in oklab, var(${ink}) 16%, transparent)`,
      }}
      className="inline-flex shrink-0 items-center justify-center rounded-sm font-semibold leading-none"
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** The signed-in user's round avatar. Avatars follow the pill radius, so Console squares them. */
export function UserAvatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
      className="inline-flex shrink-0 items-center justify-center rounded-[var(--ui-radius-pill)] bg-fg font-semibold text-canvas"
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** A square icon button (the app's h-8 / h-6 header and toolbar squares). */
export function IconSquare({
  glyph,
  size = "md",
  active = false,
  label,
}: {
  glyph: GlyphName;
  size?: "sm" | "md";
  active?: boolean;
  label?: string;
}) {
  const box = size === "md" ? "h-8 w-8" : "h-6 w-6";
  return (
    <span
      title={label}
      className={`ui-pill-hover flex ${box} shrink-0 items-center justify-center rounded-md ${
        active ? "bg-accent-muted text-fg" : "text-fg-subtle"
      }`}
    >
      <Glyph name={glyph} size={size === "md" ? 15 : 14} />
    </span>
  );
}

/** A tinted, single-line pill (the app's Badge). Pills follow the pill radius token. */
export function Pill({
  tone,
  children,
  mono = false,
}: {
  tone: "success" | "attention" | "danger" | "done" | "neutral" | "info";
  children: ReactNode;
  mono?: boolean;
}) {
  const ink: Record<typeof tone, string> = {
    success: "bg-tone-success-bg text-tone-success-fg",
    attention: "bg-tone-attention-bg text-tone-attention-fg",
    danger: "bg-tone-danger-bg text-tone-danger-fg",
    done: "bg-tone-done-bg text-tone-done-fg",
    neutral: "bg-tone-neutral-bg text-fg-muted",
    info: "bg-tone-info-bg text-tone-info-fg",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-[var(--ui-radius-pill)] px-2 py-0.5 text-[0.6875rem] font-(--ui-weight-strong) ${
        mono ? "font-mono" : ""
      } ${ink[tone]}`}
    >
      {children}
    </span>
  );
}

/** The segmented control: a filled track holding a raised selected option (W2: Segmented). */
export function Segmented({ options, value }: { options: readonly string[]; value: number }) {
  return (
    <div
      className={`grid gap-0.5 rounded-md p-0.5 ${NEUTRAL_FILL} ${
        options.length === 3 ? "grid-cols-3" : "grid-cols-2"
      }`}
    >
      {options.map((label, i) => (
        <span
          key={label}
          className={`rounded-sm px-2 py-1 text-center text-xs ${
            i === value ? "bg-surface font-(--ui-weight-medium) text-fg shadow-sm" : "text-fg-muted"
          }`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

/** A glyph welded to a mono value (the app's StatChip). */
export function StatChip({
  glyph,
  value,
  title,
}: {
  glyph: GlyphName;
  value: string;
  title?: string;
}) {
  return (
    <span title={title} className="flex shrink-0 items-center gap-1 font-mono text-xs">
      <Glyph name={glyph} size={13} className="text-fg-subtle" />
      {value}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sidebar (W7: SidebarFrame, SessionRow; W4: NavList, GroupHeader)
// ---------------------------------------------------------------------------

const NAV: ReadonlyArray<{ key: keyof Fixtures["copy"]["nav"]; glyph: GlyphName }> = [
  { key: "agents", glyph: "agents" },
  { key: "plugins", glyph: "plugins" },
  { key: "models", glyph: "models" },
  { key: "usage", glyph: "usage" },
  { key: "benchmark", glyph: "benchmark" },
];

function SessionRow({ item, active, f }: { item: SessionListItem; active: boolean; f: Fixtures }) {
  const agent = f.agents.find((a) => a.id === item.agentId);
  return (
    <li
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 ${active ? "bg-accent-muted" : ""}`}
    >
      <AgentTile id={item.agentId} name={agent?.name ?? item.agentId} />
      <span
        className={`min-w-0 flex-1 truncate text-sm ${
          active ? "font-(--ui-weight-medium) text-fg" : "text-fg-muted"
        }`}
      >
        {item.title}
      </span>
      {item.pinned && <Glyph name="pin" size={12} className="text-tone-neutral-fg" />}
      {item.scheduled && <Glyph name="calendarClock" size={12} className="text-tone-neutral-fg" />}
      {item.unread && <Dot className="bg-accent" />}
      {item.running ? (
        <Spinner size={12} className="text-tone-success-fg" />
      ) : (
        <span className="shrink-0 text-[0.6875rem] tabular-nums text-fg-subtle">
          {item.timeLabel}
        </span>
      )}
    </li>
  );
}

export function Sidebar({ f, activeSessionId }: { f: Fixtures; activeSessionId?: string }) {
  const c = f.copy.nav;
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-line bg-surface-muted">
      <div className="flex shrink-0 items-center gap-1 px-2 pt-2">
        <IconSquare glyph="sidebar" label={c.collapseSidebar} />
        <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-base font-(--ui-weight-strong) text-fg">
          <span className="min-w-0 flex-1 truncate">{f.user.name}</span>
          <Glyph name="chevronDown" size={14} className="text-fg-subtle" />
        </span>
      </div>
      <nav className="shrink-0 space-y-0.5 px-2 pt-2">
        <span className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-(--ui-weight-medium) text-fg">
          <Glyph name="newChat" size={16} className="text-fg-muted" />
          {c.newChat}
        </span>
        <div className="pt-1.5" />
        {NAV.map((item) => (
          <span
            key={item.key}
            className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-fg-muted"
          >
            <Glyph name={item.glyph} size={16} className="text-fg-subtle" />
            {c[item.key]}
          </span>
        ))}
      </nav>
      <div className="shrink-0 px-2 pt-1.5">
        <span
          className={`flex h-4 w-full items-center justify-center rounded-md text-fg-subtle ${NEUTRAL_FILL}`}
        >
          <Glyph name="chevronUp" size={12} />
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-2 pb-2">
        <div className="mt-3 flex items-center px-1 pt-2">
          <span className="ui-eyebrow min-w-0 flex-1 px-1 text-[0.6875rem] font-(--ui-weight-strong) uppercase tracking-wide text-fg-subtle">
            {c.sessions}
          </span>
          <span className="flex items-center gap-0.5">
            <IconSquare glyph="search" size="sm" label={c.search} />
            <IconSquare glyph="sliders" size="sm" />
            <IconSquare glyph="folderPlus" size="sm" />
          </span>
        </div>
        {f.sessionGroups.map((group, gi) => (
          <div key={group.key} className="pt-2.5">
            <div className="flex items-center gap-1 px-1.5 py-1 text-xs text-fg-subtle">
              <Glyph name={gi === 0 ? "folder" : "clock"} size={15} />
              <span className="font-(--ui-weight-strong) text-fg-muted">{group.label}</span>
              <span className="tabular-nums">{group.items.length}</span>
              <Glyph name="chevronDown" size={12} />
              <span className="min-w-0 flex-1" />
              {gi === 0 && <Glyph name="plus" size={15} />}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <SessionRow key={item.id} item={item} active={item.id === activeSessionId} f={f} />
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t border-line p-2">
        <span className="flex items-center gap-2 rounded-md px-2 py-1.5">
          <UserAvatar name={f.user.name} />
          <span className="min-w-0 flex-1 truncate text-sm font-(--ui-weight-medium) text-fg">
            {f.user.name}
          </span>
        </span>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Chat header (W7: PanelsToolbar; W4: StatChip)
// ---------------------------------------------------------------------------

export function ChatHeader({
  f,
  dock,
}: {
  f: Fixtures;
  /** Which dock toggle reads as pressed. */
  dock: "none" | "bottom" | "right";
}) {
  const s = f.session;
  return (
    <header className="flex shrink-0 items-center gap-2.5 border-b border-line px-4 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <h1 className="truncate text-sm font-(--ui-weight-strong) text-fg">{s.title}</h1>
        {s.running && (
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-tone-success-fg">
            <Spinner size={12} />
            {f.copy.chat.running}
          </span>
        )}
      </div>
      <span className="flex items-center gap-1">
        <IconSquare glyph="panelBottom" active={dock === "bottom"} />
        <IconSquare glyph="panelRight" active={dock === "right"} />
      </span>
      <span className="flex items-center gap-3 px-2 text-fg-muted">
        <StatChip glyph="tokens" value={tokens(s.totals.tokens)} />
        <StatChip glyph="cost" value={usd(s.totals.costUsd)} />
        <StatChip glyph="clock" value={duration(s.totals.elapsedMs)} />
      </span>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Dock frame (W7: DockFrame, DockTabs)
// ---------------------------------------------------------------------------

export function DockFrame({
  f,
  tab,
  glyph,
  children,
  edge,
}: {
  f: Fixtures;
  tab: string;
  glyph: GlyphName;
  children: ReactNode;
  edge: "bottom" | "right";
}) {
  return (
    <section
      className={`ui-frame flex min-h-0 w-full flex-col bg-canvas ${
        edge === "right" ? "h-full border-l border-line" : "border-t border-line"
      }`}
    >
      <div
        data-slot="head"
        className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-2 py-1.5 text-xs"
      >
        <span className="flex h-7 max-w-56 items-center gap-1.5 rounded-md bg-accent-muted pl-2 pr-1 text-fg">
          <Glyph name={glyph} size={14} className="text-fg-muted" />
          <span className="min-w-0 truncate">{tab}</span>
          <span className="flex h-4 w-4 items-center justify-center rounded-sm text-fg-subtle">
            <Glyph name="cross" size={11} />
          </span>
        </span>
        <span className="flex items-center gap-0.5">
          <IconSquare glyph="plus" size="sm" label={f.copy.dock.newPanel} />
          <IconSquare glyph={edge === "right" ? "panelBottom" : "panelRight"} size="sm" />
          <IconSquare glyph="cross" size="sm" label={f.copy.dock.close} />
        </span>
      </div>
      <div data-slot="body" className="min-h-0 flex-1 overflow-hidden">
        {children}
      </div>
    </section>
  );
}
