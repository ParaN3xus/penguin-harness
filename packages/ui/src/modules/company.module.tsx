/**
 * Company board: the surfaces of company mode, over Docs Expert Co.
 *
 * - Board: the tickets in their columns — priority, the run or block state, owner and spend;
 * - Calendar: the week's events at their local times, past ones marked with their outcome, and the
 *   current time;
 * - Org: the employee tree with each employee's state and spend against budget;
 * - Channel: the group chat — a system line, runs of messages by sender, the user's own messages.
 *
 * The board, calendar and org canvas stay in the web app (A-architecture §3.13); W6's
 * `ChannelBubble` is the one package component here. Static stand-ins until then.
 */
import type { ToneName } from "../tokens";
import { fixturesFor } from "../fixtures";
import type {
  CalendarEventFixture,
  CalendarOutcome,
  EmployeeFixture,
  EmployeeState,
  FixtureLang,
  Fixtures,
  TicketFixture,
} from "../fixtures";
import { defineModule } from "../module";
import { AgentTile, UserAvatar } from "../screens/parts";
import { usd } from "../screens/format";
import { Badge, Count, GlyphIcon, IconButton, ProgressBar, RunSpinner, StatusWord } from "./parts";
import type { IconName } from "./parts";

/**
 * Local fixture (K3): the board, calendar and org labels, and the group chat's messages. The
 * channel is not part of K-redesign §4.6; it belongs in `fixtures/` beside `company`.
 */
const LOCAL: Readonly<
  Record<
    FixtureLang,
    {
      columns: Record<"proposed" | "in_progress" | "review" | "done", string>;
      blocked: string;
      sessions: (n: number) => string;
      days: readonly string[];
      outcomes: Record<CalendarOutcome | "upcoming", string>;
      now: string;
      states: Record<EmployeeState, string>;
      noBudget: string;
      overBudget: string;
      channel: {
        name: string;
        members: (n: number) => string;
        system: string;
        messages: readonly { from: string; time: string; text: string }[];
        placeholder: string;
        search: string;
      };
    }
  >
> = {
  en: {
    columns: {
      proposed: "Proposed",
      in_progress: "In progress",
      review: "In review",
      done: "Done",
    },
    blocked: "Blocked",
    sessions: (n) => `${n} ${n === 1 ? "Session" : "Sessions"}`,
    days: ["Mon 14", "Tue 15", "Wed 16", "Thu 17", "Fri 18", "Sat 19", "Sun 20"],
    outcomes: {
      fired: "Ran",
      queued: "Queued",
      paused: "Paused",
      missed: "Missed",
      error: "Failed",
      upcoming: "Upcoming",
    },
    now: "now",
    states: { running: "Running", idle: "Idle", paused: "Paused" },
    noBudget: "No budget",
    overBudget: "Over budget",
    channel: {
      name: "docs-expert-co",
      members: (n) => `${n} members`,
      system: "Rui started 2026-09-14-citation-links",
      messages: [
        {
          from: "ceo",
          time: "09:02",
          text: "Stand-up: citations are today's P0. Rui, can you own the fix? Theo, review it once it is up.",
        },
        {
          from: "rag-engineer",
          time: "09:05",
          text: "On it: hits get filtered before they reach the prompt. Draft in about twenty minutes.",
        },
        {
          from: "rag-engineer",
          time: "09:06",
          text: "citations.test.ts will cover a question that matches and one that cannot.",
        },
        {
          from: "qa-lead",
          time: "09:31",
          text: "Reviewing. Do we re-index when a file is renamed upstream?",
        },
        { from: "me", time: "09:33", text: "Yes, add a nightly re-index to the calendar." },
        {
          from: "docs-curator",
          time: "09:40",
          text: "hooks-guide.md is in the corpus now; the old hooks.md path returns 404.",
        },
      ],
      placeholder: "Message #docs-expert-co",
      search: "Search messages",
    },
  },
  zh: {
    columns: { proposed: "已提议", in_progress: "进行中", review: "评审中", done: "已完成" },
    blocked: "受阻",
    sessions: (n) => `${n} 个 Session`,
    days: ["周一 14", "周二 15", "周三 16", "周四 17", "周五 18", "周六 19", "周日 20"],
    outcomes: {
      fired: "已运行",
      queued: "排队中",
      paused: "已暂停",
      missed: "已错过",
      error: "失败",
      upcoming: "即将运行",
    },
    now: "现在",
    states: { running: "运行中", idle: "空闲", paused: "已暂停" },
    noBudget: "不限预算",
    overBudget: "超出预算",
    channel: {
      name: "docs-expert-co",
      members: (n) => `${n} 位成员`,
      system: "Rui 开始处理 2026-09-14-citation-links",
      messages: [
        {
          from: "ceo",
          time: "09:02",
          text: "站会：今天的 P0 是引用问题。Rui 负责修复，Theo 在提交后评审。",
        },
        {
          from: "rag-engineer",
          time: "09:05",
          text: "收到：先在检索结果进入提示词之前过滤掉失效条目，大约二十分钟后给出草稿。",
        },
        {
          from: "rag-engineer",
          time: "09:06",
          text: "citations.test.ts 会覆盖一个能匹配的问题和一个无法匹配的问题。",
        },
        { from: "qa-lead", time: "09:31", text: "正在评审。上游改了文件名时，我们会重建索引吗？" },
        { from: "me", time: "09:33", text: "会，把每晚重建索引加到日历里。" },
        {
          from: "docs-curator",
          time: "09:40",
          text: "hooks-guide.md 已加入语料，旧的 hooks.md 路径现在返回 404。",
        },
      ],
      placeholder: "发送消息到 #docs-expert-co",
      search: "搜索消息",
    },
  },
};

const PRIORITY: Record<
  TicketFixture["priority"],
  { tone: ToneName; variant: "soft" | "outline" | "solid" }
> = {
  P0: { tone: "danger", variant: "solid" },
  P1: { tone: "attention", variant: "outline" },
  P2: { tone: "neutral", variant: "outline" },
};

const employee = (f: Fixtures, id: string): EmployeeFixture | undefined =>
  f.company.employees.find((e) => e.agentId === id);

// ---------------------------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------------------------

function TicketCard({ f, ticket }: { f: Fixtures; ticket: TicketFixture }) {
  const local = LOCAL[f.lang];
  const owner = employee(f, ticket.ownerAgentId);
  const priority = PRIORITY[ticket.priority];
  return (
    <li className="grid grid-cols-[minmax(0,1fr)] gap-2 rounded-[var(--radius-inner)] border border-line bg-surface px-3 py-2.5">
      <p className="line-clamp-2 text-sm text-fg">{ticket.title}</p>
      <div className="flex items-center gap-2">
        <Badge tone={priority.tone} variant={priority.variant}>
          {ticket.priority}
        </Badge>
        {ticket.running && <RunSpinner />}
        {ticket.blocked && (
          <StatusWord tone="attention" icon="alert">
            {local.blocked}
          </StatusWord>
        )}
      </div>
      {ticket.blocked && <p className="text-xs text-fg-muted">{ticket.blocked}</p>}
      <div className="flex items-center gap-1.5 text-xs text-fg-muted">
        {owner && <AgentTile id={owner.agentId} name={owner.name} size={16} />}
        <span className="min-w-0 flex-1 truncate">{owner?.name}</span>
        <span className="font-mono tabular-nums">
          {ticket.costUsd > 0 ? usd(ticket.costUsd) : "—"}
        </span>
      </div>
    </li>
  );
}

function Board({ f }: { f: Fixtures }) {
  const local = LOCAL[f.lang];
  const columns = ["proposed", "in_progress", "review", "done"] as const;
  return (
    <div className="grid grid-cols-4 items-start gap-3">
      {columns.map((status) => {
        const tickets = f.company.tickets.filter((t) => t.status === status);
        return (
          <section
            key={status}
            className="grid grid-cols-[minmax(0,1fr)] gap-2 rounded-lg bg-surface-muted p-2 [--radius-inner:max(var(--ui-radius-xs),calc(var(--ui-radius-lg)-0.5rem))]"
          >
            <div className="flex items-center gap-2 px-1 pt-1">
              <span className="min-w-0 flex-1 truncate text-sm font-(--ui-weight-medium) text-fg">
                {local.columns[status]}
              </span>
              <Count n={tickets.length} />
            </div>
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
              {tickets.map((ticket) => (
                <TicketCard key={ticket.ticketId} f={f} ticket={ticket} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------------------------

/** The working day the week view draws: 09:00 to 18:00, one row an hour. */
const FIRST_HOUR = 9;
const END_HOUR = 18;
const HOURS = Array.from({ length: END_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i);
const ROW_REM = 2.75;
/** The org's zone is Asia/Shanghai, UTC+8. */
const OFFSET_H = 8;
/** "Now" in the dataset: Wednesday 16, 15:10 local — after the morning runs, before the eval run. */
const NOW = Date.parse("2026-09-16T07:10:00.000Z");

interface Occurrence {
  event: CalendarEventFixture;
  day: number;
  startH: number;
  outcome: CalendarOutcome | "upcoming";
}

function occurrences(f: Fixtures): Occurrence[] {
  const weekStart =
    Date.parse(`${f.company.calendar.weekStartIso}T00:00:00.000Z`) - OFFSET_H * 3_600_000;
  const out: Occurrence[] = [];
  for (const event of f.company.calendar.events) {
    const first = Date.parse(event.startAtIso);
    const step = event.period ? Number.parseInt(event.period, 10) * 86_400_000 : 0;
    for (let at = first; at < weekStart + 7 * 86_400_000; at += step || Infinity) {
      const day = Math.floor((at - weekStart) / 86_400_000);
      const local = new Date(at + OFFSET_H * 3_600_000);
      const startH = local.getUTCHours() + local.getUTCMinutes() / 60;
      const past = at + event.durationMin * 60_000 <= NOW;
      const next = event.nextFireAtIso ? Date.parse(event.nextFireAtIso) : Infinity;
      const outcome: Occurrence["outcome"] = !event.enabled
        ? "paused"
        : !past
          ? "upcoming"
          : at + step >= next && event.lastOutcome
            ? event.lastOutcome
            : "fired";
      if (day >= 0 && day < 7) out.push({ event, day, startH, outcome });
      if (!step) break;
    }
  }
  return out;
}

const OUTCOME_MARK: Record<Occurrence["outcome"], { icon: IconName; tone: string } | null> = {
  fired: { icon: "check", tone: "text-fg-subtle" },
  queued: { icon: "clock", tone: "text-tone-attention-fg" },
  paused: { icon: "minus", tone: "text-fg-subtle" },
  missed: { icon: "cross", tone: "text-tone-danger-fg" },
  error: { icon: "circleCross", tone: "text-tone-danger-fg" },
  upcoming: null,
};

function Calendar({ f }: { f: Fixtures }) {
  const local = LOCAL[f.lang];
  const all = occurrences(f);
  const nowLocal = new Date(NOW + OFFSET_H * 3_600_000);
  const nowH = nowLocal.getUTCHours() + nowLocal.getUTCMinutes() / 60;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <div className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] border-b border-line pb-2 text-xs text-fg-muted">
        <span />
        {local.days.map((day, i) => (
          <span key={day} className={`px-1 ${i === 2 ? "font-(--ui-weight-medium) text-fg" : ""}`}>
            {day}
          </span>
        ))}
      </div>
      <div className="relative grid grid-cols-[3rem_repeat(7,minmax(0,1fr))]">
        <div>
          {HOURS.map((h) => (
            <p
              key={h}
              className="text-right font-mono text-xs tabular-nums text-fg-subtle"
              style={{ height: `${ROW_REM}rem` }}
            >
              <span className="-translate-y-2 inline-block pr-2">
                {String(h).padStart(2, "0")}:00
              </span>
            </p>
          ))}
        </div>
        {local.days.map((day, dayIndex) => (
          <div key={day} className="relative border-l border-line-muted">
            {HOURS.map((h) => (
              <div
                key={h}
                className="border-t border-line-muted"
                style={{ height: `${ROW_REM}rem` }}
              />
            ))}
            {all
              .filter((o) => o.day === dayIndex && o.startH >= FIRST_HOUR && o.startH < END_HOUR)
              .map((o) => {
                const owner = employee(f, o.event.agentId);
                const mark = OUTCOME_MARK[o.outcome];
                return (
                  <div
                    key={o.event.name}
                    title={`${o.event.title} · ${local.outcomes[o.outcome]}`}
                    className={`absolute inset-x-0.5 overflow-hidden rounded-sm border border-line px-1 py-0.5 text-xs ${
                      o.outcome === "upcoming"
                        ? "bg-surface text-fg"
                        : "bg-surface-muted text-fg-muted"
                    }`}
                    style={{
                      top: `${(o.startH - FIRST_HOUR) * ROW_REM}rem`,
                      height: `${Math.max((o.event.durationMin / 60) * ROW_REM, 1.25)}rem`,
                    }}
                  >
                    <span className="flex items-center gap-1">
                      {owner && <AgentTile id={owner.agentId} name={owner.name} size={12} />}
                      <span className="min-w-0 flex-1 truncate">{o.event.title}</span>
                      {mark && <GlyphIcon name={mark.icon} size={11} className={mark.tone} />}
                    </span>
                  </div>
                );
              })}
            {dayIndex === 2 && (
              <div
                className="absolute inset-x-0 h-px bg-tone-danger-fg"
                style={{ top: `${(nowH - FIRST_HOUR) * ROW_REM}rem` }}
              >
                <span className="absolute bottom-0.5 right-1 text-xs leading-none text-tone-danger-fg">
                  {local.now}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-12 text-xs text-fg-muted">
        {(["fired", "queued", "missed", "paused"] as const).map((outcome) => {
          const mark = OUTCOME_MARK[outcome]!;
          return (
            <span key={outcome} className="flex items-center gap-1">
              <GlyphIcon name={mark.icon} size={11} className={mark.tone} />
              {local.outcomes[outcome]}
            </span>
          );
        })}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Org chart
// ---------------------------------------------------------------------------------------------

const STATE_WORD: Record<EmployeeState, { tone: ToneName; icon?: IconName | "spinner" }> = {
  running: { tone: "success", icon: "spinner" },
  idle: { tone: "neutral" },
  paused: { tone: "attention", icon: "minus" },
};

function OrgNode({ f, person }: { f: Fixtures; person: EmployeeFixture }) {
  const local = LOCAL[f.lang];
  const state = STATE_WORD[person.state];
  const over = person.budgetUsd !== undefined && person.spendUsd > person.budgetUsd;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] w-48 gap-2 rounded-lg border border-line bg-surface px-3 py-2.5">
      <div className="flex items-center gap-2">
        <AgentTile id={person.agentId} name={person.name} size={24} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-(--ui-weight-medium) text-fg">
            {person.name}
          </span>
          <span className="block truncate text-xs text-fg-muted">{person.title}</span>
        </span>
      </div>
      <StatusWord tone={state.tone} icon={state.icon}>
        {local.states[person.state]}
      </StatusWord>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-1">
        <ProgressBar
          value={person.budgetUsd ? person.spendUsd / person.budgetUsd : 0}
          tone={over ? "danger" : "neutral"}
          label={person.name}
        />
        <span
          className={`flex justify-between text-xs tabular-nums ${over ? "text-tone-danger-fg" : "text-fg-muted"}`}
        >
          <span>{usd(person.spendUsd)}</span>
          <span>
            {person.budgetUsd !== undefined
              ? over
                ? local.overBudget
                : usd(person.budgetUsd)
              : local.noBudget}
          </span>
        </span>
      </div>
    </div>
  );
}

/** A connector stub: the vertical hairline between a node and its parent's rule. */
function Stub() {
  return <span aria-hidden className="mx-auto block h-4 w-px bg-line-emphasis" />;
}

function Org({ f }: { f: Fixtures }) {
  const people = f.company.employees;
  const root = people.find((p) => p.reportsTo === null)!;
  const reports = people.filter((p) => p.reportsTo === root.agentId);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] justify-items-center py-4">
      <OrgNode f={f} person={root} />
      <Stub />
      <div className="relative grid grid-cols-3 items-start gap-6">
        <span
          aria-hidden
          className="absolute left-[calc((100%-3rem)/6)] right-[calc((100%-3rem)/6)] top-0 h-px bg-line-emphasis"
        />
        {reports.map((person) => {
          const children = people.filter((p) => p.reportsTo === person.agentId);
          return (
            <div
              key={person.agentId}
              className="grid grid-cols-[minmax(0,1fr)] justify-items-center"
            >
              <Stub />
              <OrgNode f={f} person={person} />
              {children.map((child) => (
                <div
                  key={child.agentId}
                  className="grid grid-cols-[minmax(0,1fr)] justify-items-center"
                >
                  <Stub />
                  <OrgNode f={f} person={child} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Channel
// ---------------------------------------------------------------------------------------------

/** One message in a run: the sender's name and time lead only the first of their run. */
function ChannelBubble({
  f,
  from,
  time,
  text,
  first,
}: {
  f: Fixtures;
  from: string;
  time: string;
  text: string;
  first: boolean;
}) {
  const own = from === "me";
  const sender = employee(f, from);
  return (
    <div className={`flex gap-2 ${own ? "flex-row-reverse" : ""} ${first ? "pt-3" : "pt-1"}`}>
      <span className="w-7 shrink-0">
        {first &&
          (own ? (
            <UserAvatar name={f.user.name} size={28} />
          ) : (
            sender && <AgentTile id={sender.agentId} name={sender.name} size={28} />
          ))}
      </span>
      <div
        className={`grid grid-cols-[minmax(0,1fr)] max-w-[75%] gap-1 ${own ? "justify-items-end" : ""}`}
      >
        {first && (
          <span className="flex items-baseline gap-2 text-xs">
            <span className="font-(--ui-weight-medium) text-fg">
              {own ? f.user.name : sender?.name}
            </span>
            {!own && <span className="text-fg-muted">{sender?.title}</span>}
            <span className="font-mono tabular-nums text-fg-subtle">{time}</span>
          </span>
        )}
        <p
          className={`rounded-lg px-3 py-2 text-sm text-fg ${own ? "bg-accent-muted" : "bg-surface-muted"}`}
        >
          {text}
        </p>
      </div>
    </div>
  );
}

function Channel({ f }: { f: Fixtures }) {
  const c = LOCAL[f.lang].channel;
  const people = f.company.employees;
  return (
    <div className="flex h-[40rem] flex-col overflow-hidden rounded-lg border border-line bg-canvas">
      <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <GlyphIcon name="hash" size={16} className="text-fg-muted" />
        <span className="text-sm font-(--ui-weight-medium) text-fg">{c.name}</span>
        <span className="flex -space-x-1 pl-2">
          {people.map((p) => (
            <span key={p.agentId} className="rounded-sm ring-2 ring-canvas">
              <AgentTile id={p.agentId} name={p.name} size={18} />
            </span>
          ))}
        </span>
        <span className="text-xs text-fg-muted">{c.members(people.length + 1)}</span>
        <span className="min-w-0 flex-1" />
        <IconButton label={c.search} icon="search" size="sm" />
      </header>
      <div className="min-h-0 flex-1 overflow-hidden px-4 pb-4">
        <p className="flex items-center gap-3 pt-4 text-xs text-fg-subtle">
          <span className="h-px flex-1 bg-line-muted" />
          {c.system}
          <span className="h-px flex-1 bg-line-muted" />
        </p>
        {c.messages.map((message, i) => (
          <ChannelBubble
            key={`${message.from}-${message.time}`}
            f={f}
            from={message.from}
            time={message.time}
            text={message.text}
            first={i === 0 || c.messages[i - 1]!.from !== message.from}
          />
        ))}
      </div>
      <div className="border-t border-line px-4 py-3">
        <span className="flex h-9 items-center rounded-md border border-line bg-surface px-3 text-sm text-fg-subtle">
          {c.placeholder}
        </span>
      </div>
    </div>
  );
}

const VARIANTS = { board: Board, calendar: Calendar, org: Org, channel: Channel } as const;

export const module = defineModule({
  id: "company",
  title: "Company board",
  description:
    "Company mode's surfaces: the ticket board, the week's calendar with outcomes, the org chart with employee states, and the group chat.",
  width: "wide",
  variants: [
    { key: "board", title: "Board" },
    { key: "calendar", title: "Calendar" },
    { key: "org", title: "Org" },
    { key: "channel", title: "Channel" },
  ],
  parts: [
    "chat-channel-bubble",
    "feedback-badge",
    "icons-avatars",
    "icons-status-icon",
    "feedback-progress-bar",
  ],
  render: (variant, { lang }) => {
    const View = VARIANTS[variant as keyof typeof VARIANTS] ?? Board;
    return <View f={fixturesFor(lang)} />;
  },
});
