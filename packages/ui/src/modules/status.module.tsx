/**
 * Status & feedback: how the app says what is going on.
 *
 * - Live: a Task's plan with its run states (done, running with its live clock, waiting for
 *   approval, failed, stopped) and nav rows carrying counts;
 * - Settled: tickets with their status and priority badges (two at most per row), and stop reasons;
 * - Notices: a neutral strip, the one callout a view may have, an inline error, and toasts;
 * - Loading & empty: progress against a budget, a skeleton list, a page's empty state and a
 *   settings slot's.
 *
 * Static stand-ins for W1's `Dot`, `Spinner`, `StatusIcon`, `Badge`, `Count`, `Skeleton` and
 * `EmptyState`, and W4's `Notice` and `ProgressBar`.
 */
import type { ToneName } from "../tokens";
import { fixturesFor } from "../fixtures";
import type { FixtureLang, Fixtures, TicketFixture } from "../fixtures";
import { defineModule } from "../module";
import { liveDuration, usd } from "../screens/format";
import {
  Badge,
  Button,
  Dot,
  EmptyState,
  GlyphIcon,
  Heading,
  Link,
  NavRow,
  Notice,
  ProgressBar,
  RunSpinner,
  Skeleton,
  StatusWord,
  TONE_INK,
  Toast,
} from "./parts";
import type { IconName } from "./parts";

/**
 * Local fixture (K3): K-redesign §4.6 adds `notices` (one per tone and a toast list) to the fixtures;
 * until #763 does, the notices, the plan and the empty states' copy live here in that shape.
 */
const LOCAL: Readonly<
  Record<
    FixtureLang,
    {
      planTitle: string;
      plan: readonly {
        title: string;
        state: "done" | "running" | "waiting" | "failed" | "stopped";
        detail: string;
      }[];
      states: Record<"done" | "running" | "waiting" | "failed" | "stopped", string>;
      ticketsTitle: string;
      ticketStatus: Record<TicketFixture["status"], string>;
      stopReasonsTitle: string;
      notices: {
        strip: { title: string; body: string };
        callout: { title: string; body: string; action: string };
        inline: { body: string; action: string };
        toasts: readonly { tone: ToneName; title: string; body?: string; action?: string }[];
      };
      budget: { title: string; spent: (spent: string, budget: string) => string };
      sessionsTitle: string;
      empty: { title: string; body: string; action: string };
      slot: { title: string; body: string; action: string };
    }
  >
> = {
  en: {
    planTitle: "Plan",
    plan: [
      { title: "Collect the docs into corpus/", state: "done", detail: "15.8s" },
      { title: "Write the BM25 retrieval app", state: "done", detail: "1.4s" },
      { title: "Check how citations render", state: "running", detail: "" },
      { title: "Start the app and run the citation tests", state: "waiting", detail: "" },
      { title: "Ingest the PDF release notes", state: "failed", detail: "4.2s" },
      { title: "Package the app as a Docker image", state: "stopped", detail: "" },
    ],
    states: {
      done: "Done",
      running: "Running",
      waiting: "Needs approval",
      failed: "Failed",
      stopped: "Stopped",
    },
    ticketsTitle: "Tickets",
    ticketStatus: {
      proposed: "Proposed",
      in_progress: "In progress",
      review: "In review",
      done: "Done",
      rejected: "Rejected",
    },
    stopReasonsTitle: "Stop reasons",
    notices: {
      strip: { title: "Trace exported", body: "48.2 KB written to trace-001.jsonl." },
      callout: {
        title: "90% of this month's budget is spent",
        body: "Docs Expert Co. has used $108.20 of $120.00. Runs stop at the limit.",
        action: "Raise budget",
      },
      inline: { body: "Couldn't reach the model provider.", action: "Retry" },
      toasts: [
        { tone: "success", title: "Model added", body: "DeepSeek V4 Flash is ready to use." },
        {
          tone: "danger",
          title: "Couldn't save the key",
          body: "The provider rejected it: 401.",
          action: "Retry",
        },
      ],
    },
    budget: { title: "Monthly budget", spent: (spent, budget) => `${spent} of ${budget}` },
    sessionsTitle: "Sessions",
    empty: {
      title: "No agents yet",
      body: "An agent is a model, a prompt and the tools it may use. Create one to start a Session with it.",
      action: "New agent",
    },
    slot: {
      title: "No MCP servers",
      body: "Tools from an MCP server show up in every agent that enables it.",
      action: "Add server",
    },
  },
  zh: {
    planTitle: "计划",
    plan: [
      { title: "把文档收集到 corpus/", state: "done", detail: "15.8s" },
      { title: "编写 BM25 检索应用", state: "done", detail: "1.4s" },
      { title: "检查引用的渲染方式", state: "running", detail: "" },
      { title: "启动应用并运行引用测试", state: "waiting", detail: "" },
      { title: "导入 PDF 版本说明", state: "failed", detail: "4.2s" },
      { title: "把应用打包为 Docker 镜像", state: "stopped", detail: "" },
    ],
    states: {
      done: "已完成",
      running: "运行中",
      waiting: "待审批",
      failed: "失败",
      stopped: "已停止",
    },
    ticketsTitle: "工单",
    ticketStatus: {
      proposed: "已提议",
      in_progress: "进行中",
      review: "评审中",
      done: "已完成",
      rejected: "已拒绝",
    },
    stopReasonsTitle: "停止原因",
    notices: {
      strip: { title: "Trace 已导出", body: "已写入 trace-001.jsonl，共 48.2 KB。" },
      callout: {
        title: "本月预算已用 90%",
        body: "Docs Expert Co. 已花费 $108.20，预算 $120.00。达到上限后运行会停止。",
        action: "提高预算",
      },
      inline: { body: "无法连接模型提供方。", action: "重试" },
      toasts: [
        { tone: "success", title: "已添加模型", body: "DeepSeek V4 Flash 可以使用了。" },
        { tone: "danger", title: "密钥保存失败", body: "提供方拒绝了它：401。", action: "重试" },
      ],
    },
    budget: { title: "月度预算", spent: (spent, budget) => `${spent} / ${budget}` },
    sessionsTitle: "Session",
    empty: {
      title: "还没有智能体",
      body: "智能体由模型、提示词和它可用的工具组成。创建一个，就能用它开始 Session。",
      action: "新建智能体",
    },
    slot: {
      title: "没有 MCP 服务器",
      body: "MCP 服务器提供的工具会出现在所有启用它的智能体中。",
      action: "添加服务器",
    },
  },
};

const STATE_MARK: Record<string, { tone: ToneName; icon: IconName | "spinner" }> = {
  done: { tone: "success", icon: "circleCheck" },
  running: { tone: "success", icon: "spinner" },
  waiting: { tone: "attention", icon: "hourglass" },
  failed: { tone: "danger", icon: "circleCross" },
  stopped: { tone: "neutral", icon: "circleCross" },
};

const TICKET_TONE: Record<
  TicketFixture["status"],
  { tone: ToneName; variant: "soft" | "outline" | "solid" }
> = {
  proposed: { tone: "neutral", variant: "soft" },
  in_progress: { tone: "info", variant: "soft" },
  review: { tone: "attention", variant: "outline" },
  done: { tone: "done", variant: "soft" },
  rejected: { tone: "danger", variant: "outline" },
};

const PRIORITY_TONE: Record<
  TicketFixture["priority"],
  { tone: ToneName; variant: "soft" | "outline" | "solid" }
> = {
  P0: { tone: "danger", variant: "solid" },
  P1: { tone: "attention", variant: "outline" },
  P2: { tone: "neutral", variant: "outline" },
};

function Live({ f }: { f: Fixtures }) {
  const local = LOCAL[f.lang];
  const running = f.session.turns[1]!.items.find(
    (i) => i.kind === "tool_call" && i.state === "running",
  );
  const clock = running?.kind === "tool_call" ? liveDuration(running.elapsedMs ?? 0) : "";
  return (
    <div className="grid gap-6">
      <section className="grid gap-1">
        <Heading level={5}>{local.planTitle}</Heading>
        <ul className="grid">
          {local.plan.map((step) => {
            const mark = STATE_MARK[step.state]!;
            return (
              <li
                key={step.title}
                className="flex items-center gap-2 border-t border-line-muted py-2 text-sm"
              >
                <span className="w-4 shrink-0">
                  {mark.icon === "spinner" ? (
                    <RunSpinner tone={mark.tone} />
                  ) : (
                    <StatusIcon tone={mark.tone} icon={mark.icon} />
                  )}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate ${step.state === "stopped" ? "text-fg-muted" : "text-fg"}`}
                >
                  {step.title}
                </span>
                {step.state === "waiting" ? (
                  <StatusWord tone="attention" icon="hourglass">
                    {local.states.waiting}
                  </StatusWord>
                ) : (
                  <span className="shrink-0 font-mono text-xs tabular-nums text-fg-muted">
                    {step.state === "running" ? clock : step.detail || local.states[step.state]}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <nav className="grid max-w-xs gap-px">
        <NavRow icon="kanban" label={local.ticketsTitle} count={f.company.tickets.length} active />
        <span className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-fg-muted">
          <GlyphIcon name="message" size={16} className="text-fg-subtle" />
          <span className="min-w-0 flex-1 truncate">{local.sessionsTitle}</span>
          <Dot tone="success" live size="xs" />
          <span className="text-xs tabular-nums">3</span>
        </span>
      </nav>
    </div>
  );
}

/** A run state's static glyph (W1's `StatusIcon`). */
function StatusIcon({ tone, icon }: { tone: ToneName; icon: IconName }) {
  return (
    <span className={TONE_INK[tone]}>
      <GlyphIcon name={icon} size={14} />
    </span>
  );
}

function Settled({ f }: { f: Fixtures }) {
  const local = LOCAL[f.lang];
  const reasons = ["completed", "tool_use", "max_tokens", "error"] as const;
  const reasonTone: Record<(typeof reasons)[number], ToneName> = {
    completed: "neutral",
    tool_use: "info",
    max_tokens: "attention",
    error: "danger",
  };
  return (
    <div className="grid gap-6">
      <section className="grid gap-1">
        <Heading level={5}>{local.ticketsTitle}</Heading>
        <ul className="grid">
          {f.company.tickets.slice(0, 6).map((ticket) => {
            const status = TICKET_TONE[ticket.status];
            const priority = PRIORITY_TONE[ticket.priority];
            return (
              <li
                key={ticket.ticketId}
                className="flex items-center gap-2 border-t border-line-muted py-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">{ticket.title}</span>
                  <span className="block truncate font-mono text-xs text-fg-subtle">
                    {ticket.ticketId} · {usd(ticket.costUsd)}
                  </span>
                </span>
                <Badge tone={priority.tone} variant={priority.variant}>
                  {ticket.priority}
                </Badge>
                <Badge tone={status.tone} variant={status.variant}>
                  {local.ticketStatus[ticket.status]}
                </Badge>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="grid gap-2">
        <Heading level={5}>{local.stopReasonsTitle}</Heading>
        <p className="flex flex-wrap items-center gap-2">
          {reasons.map((reason) => (
            <Badge key={reason} tone={reasonTone[reason]} variant="outline">
              {reason}
            </Badge>
          ))}
        </p>
      </section>
    </div>
  );
}

function Notices({ f }: { f: Fixtures }) {
  const n = LOCAL[f.lang].notices;
  return (
    <div className="grid gap-4">
      <Notice tone="info" title={n.strip.title}>
        {n.strip.body}
      </Notice>
      <Notice
        tone="attention"
        variant="callout"
        title={n.callout.title}
        action={<Button variant="secondary">{n.callout.action}</Button>}
      >
        {n.callout.body}
      </Notice>
      <Notice tone="danger" variant="inline" action={<Link>{n.inline.action}</Link>}>
        {n.inline.body}
      </Notice>
      <div className="grid justify-items-end gap-2 pt-2">
        {n.toasts.map((toast) => (
          <Toast
            key={toast.title}
            tone={toast.tone}
            title={toast.title}
            description={toast.body}
            action={toast.action ? <Link>{toast.action}</Link> : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function LoadingAndEmpty({ f }: { f: Fixtures }) {
  const local = LOCAL[f.lang];
  const spend = f.company.org.spend;
  const share = spend.costUsd / spend.budgetUsd;
  return (
    <div className="grid gap-6">
      <section className="grid gap-2">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="text-fg">{local.budget.title}</span>
          <span className="font-mono text-xs tabular-nums text-fg-muted">
            {local.budget.spent(usd(spend.costUsd), usd(spend.budgetUsd))}
          </span>
        </div>
        <ProgressBar value={share} label={local.budget.title} />
        <ProgressBar value={0.96} tone="danger" label={local.budget.title} />
      </section>
      <section aria-busy className="grid gap-3">
        {[0, 1, 2].map((row) => (
          <span key={row} className="flex items-center gap-3">
            <Skeleton className="size-6" />
            <span className="grid flex-1 gap-1.5">
              <Skeleton className={`h-3 ${row === 1 ? "w-2/3" : "w-4/5"}`} />
              <Skeleton className="h-2.5 w-1/3" />
            </span>
          </span>
        ))}
      </section>
      <EmptyState
        title={local.empty.title}
        description={local.empty.body}
        action={
          <Button variant="primary" leading={<GlyphIcon name="plus" size={13} />}>
            {local.empty.action}
          </Button>
        }
      />
      <EmptyState
        variant="slot"
        title={local.slot.title}
        description={local.slot.body}
        action={<Button variant="secondary">{local.slot.action}</Button>}
      />
    </div>
  );
}

const VARIANTS = {
  live: Live,
  settled: Settled,
  notices: Notices,
  "loading-empty": LoadingAndEmpty,
} as const;

export const module = defineModule({
  id: "status",
  title: "Status & feedback",
  description:
    "Run states, badges and counts on a task list; notices and toasts; progress, skeletons and empty states.",
  width: "narrow",
  variants: [
    { key: "live", title: "Live" },
    { key: "settled", title: "Settled" },
    { key: "notices", title: "Notices" },
    { key: "loading-empty", title: "Loading & empty" },
  ],
  parts: [
    "icons-dot",
    "icons-spinner",
    "icons-status-icon",
    "icons-update-dot",
    "feedback-badge",
    "feedback-count",
    "feedback-notice",
    "feedback-todo-notice",
    "feedback-skeleton",
    "feedback-empty-state",
    "feedback-progress-bar",
    "feedback-duration-slot",
    "feedback-beta-badge",
    "overlays-toaster",
  ],
  render: (variant, { lang }) => {
    const View = VARIANTS[variant as keyof typeof VARIANTS] ?? Live;
    return <View f={fixturesFor(lang)} />;
  },
});
