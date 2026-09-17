/**
 * Stats & charts: a Trace's numbers.
 *
 * - Overview: the stat strip (cost, tokens, elapsed, cache hit), the Overall summary as a ruled
 *   key-value grid, the per-turn chips, the context ring and the tokens-per-turn sparkline;
 * - Timeline: turn 2's execution timeline — a lane for the model and one per tool, the time axis,
 *   the legend — and the events it cross-highlights;
 * - Usage: a week of tokens by bucket as stacked bars, and the month's spend against its budget
 *   with the 80 % and 95 % thresholds.
 *
 * Static stand-ins for W4's `StatTile`, `StatChip`, `KeyValue`, `ProgressBar` and W8's `Legend`,
 * `Ring`, `Sparkline` and `ChartFrame`.
 */
import { fixturesFor } from "../fixtures";
import type { FixtureLang, Fixtures, TraceSegmentKind } from "../fixtures";
import { defineModule } from "../module";
import { duration, percent, tokens, usd } from "../screens/format";
import { Badge, GlyphIcon, KeyValue, RuledSection } from "./parts";
import type { IconName } from "./parts";

/**
 * Local fixture (K3): K-redesign §4.6 adds a `usage` series (7 days × 3 buckets) to the fixtures;
 * until #763 does, it lives here in that shape, with the labels the three variants print.
 */
const LOCAL: Readonly<
  Record<
    FixtureLang,
    {
      usage: {
        days: readonly string[];
        cacheRead: readonly number[];
        cacheWrite: readonly number[];
        output: readonly number[];
      };
      buckets: { cacheRead: string; cacheWrite: string; output: string };
      weekTitle: string;
      budgetTitle: string;
      budgetOf: (spent: string, budget: string) => string;
      thresholds: string;
      tiles: { cost: string; tokens: string; elapsed: string; cacheHit: string };
      context: (used: string, window: string) => string;
      sparkline: string;
      turnChips: string;
      turnsDetail: (n: number) => string;
    }
  >
> = {
  en: {
    usage: {
      days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      cacheRead: [182, 240, 96, 310, 268, 40, 12],
      cacheWrite: [34, 52, 18, 61, 44, 9, 3],
      output: [21, 30, 11, 38, 33, 6, 2],
    },
    buckets: { cacheRead: "Cache read", cacheWrite: "Cache write", output: "Output" },
    weekTitle: "Tokens this week, thousands",
    budgetTitle: "September spend",
    budgetOf: (spent, budget) => `${spent} of ${budget}`,
    thresholds: "Warn at 80 %, stop at 95 %",
    tiles: { cost: "Cost", tokens: "Tokens", elapsed: "Elapsed", cacheHit: "Cache hit" },
    context: (used, window) => `${used} of ${window} context`,
    sparkline: "Output tokens per turn",
    turnChips: "Turn 2",
    turnsDetail: (n) => `over ${n} turns`,
  },
  zh: {
    usage: {
      days: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
      cacheRead: [182, 240, 96, 310, 268, 40, 12],
      cacheWrite: [34, 52, 18, 61, 44, 9, 3],
      output: [21, 30, 11, 38, 33, 6, 2],
    },
    buckets: { cacheRead: "缓存读取", cacheWrite: "缓存写入", output: "输出" },
    weekTitle: "本周 Token，单位千",
    budgetTitle: "九月花费",
    budgetOf: (spent, budget) => `${spent} / ${budget}`,
    thresholds: "80% 时提醒，95% 时停止",
    tiles: { cost: "成本", tokens: "Token", elapsed: "用时", cacheHit: "缓存命中" },
    context: (used, window) => `上下文 ${used} / ${window}`,
    sparkline: "每轮输出 Token",
    turnChips: "第 2 轮",
    turnsDetail: (n) => `共 ${n} 轮`,
  },
};

/** Timeline phase inks: chart identity colours, one per kind; `other` recedes. */
const SEGMENT_INK: Record<TraceSegmentKind, string> = {
  thinking: "bg-chart-5",
  text: "bg-chart-1",
  toolgen: "bg-chart-2",
  approvalWait: "bg-chart-4",
  exec: "bg-chart-6",
  other: "bg-tone-neutral-emphasis",
};

const LEGEND: readonly TraceSegmentKind[] = [
  "thinking",
  "text",
  "toolgen",
  "approvalWait",
  "exec",
  "other",
];

function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="min-w-0 flex-1 px-4 py-3 first:pl-0">
      <p className="text-xs text-fg-muted">{label}</p>
      <p className="font-(family-name:--ui-h3-font) text-(length:--ui-h3-size) leading-(--ui-h3-lh) font-(--ui-h3-weight) tabular-nums text-fg">
        {value}
      </p>
      {detail && <p className="text-xs tabular-nums text-fg-subtle">{detail}</p>}
    </div>
  );
}

function StatChip({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <span
      title={label}
      className="flex items-center gap-1 font-mono text-xs tabular-nums text-fg-muted"
    >
      <GlyphIcon name={icon} size={13} className="text-fg-subtle" />
      {value}
    </span>
  );
}

function Ring({ share, label }: { share: number; label: string }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <svg
      width="52"
      height="52"
      viewBox="0 0 52 52"
      role="img"
      aria-label={label}
      className="shrink-0"
    >
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--ui-chart-grid)" strokeWidth="5" />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        stroke="var(--ui-chart-1)"
        strokeWidth="5"
        strokeDasharray={`${Math.max(share * c, 2)} ${c}`}
        transform="rotate(-90 26 26)"
      />
    </svg>
  );
}

function Sparkline({ values, label }: { values: readonly number[]; label: string }) {
  const w = 160;
  const h = 40;
  const max = Math.max(...values);
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - (v / max) * (h - 4)}`)
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={label}
      className="shrink-0 overflow-visible"
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--ui-chart-output)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Overview({ f }: { f: Fixtures }) {
  const local = LOCAL[f.lang];
  const t = f.copy.traces;
  const o = f.trace.overall;
  const turn = f.trace.turns[1]!;
  const ctx = f.session.context;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex divide-x divide-line">
        <StatTile
          label={local.tiles.cost}
          value={usd(o.costUsd)}
          detail={local.turnsDetail(o.turns)}
        />
        <StatTile
          label={local.tiles.tokens}
          value={tokens(o.inputTokens + o.outputTokens)}
          detail={`${tokens(o.outputTokens)} ${t.outputTokens}`}
        />
        <StatTile
          label={local.tiles.elapsed}
          value={duration(o.elapsedMs)}
          detail={`${o.outputTps} tok/s`}
        />
        <StatTile
          label={local.tiles.cacheHit}
          value={percent(o.cacheReadTokens, o.inputTokens)}
          detail={tokens(o.cacheReadTokens)}
        />
      </div>
      <RuledSection title={t.overall}>
        <KeyValue
          items={[
            { label: t.turns, value: String(o.turns) },
            { label: t.toolCalls, value: String(o.toolCalls) },
            { label: t.compactions, value: String(o.compactions) },
            { label: t.inputTokens, value: tokens(o.inputTokens) },
            {
              label: t.cacheHits,
              value: `${tokens(o.cacheReadTokens)} · ${percent(o.cacheReadTokens, o.inputTokens)}`,
            },
            { label: t.outputTokens, value: tokens(o.outputTokens) },
          ]}
        />
      </RuledSection>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 border-t border-line pt-4">
        <span className="flex items-center gap-3">
          <Badge>{local.turnChips}</Badge>
          <StatChip icon="wrench" value={String(turn.toolCalls)} label={t.toolCalls} />
          <StatChip icon="arrowUpLine" value={tokens(turn.inputTokens)} label={t.inputTokens} />
          <StatChip icon="arrowDownLine" value={tokens(turn.outputTokens)} label={t.outputTokens} />
          <StatChip icon="cost" value={usd(turn.costUsd)} label={t.cost} />
        </span>
        <span className="flex flex-wrap items-center gap-x-10 gap-y-4">
          <span className="flex items-center gap-3">
            <Ring
              share={ctx.tokens / ctx.window}
              label={local.context(tokens(ctx.tokens), tokens(ctx.window))}
            />
            <span className="text-xs text-fg-muted">
              {local.context(tokens(ctx.tokens), tokens(ctx.window))}
            </span>
          </span>
          <span className="flex items-center gap-3">
            <Sparkline values={[612, 1_326, 480, 1_938, 842, 1_352]} label={local.sparkline} />
            <span className="text-xs text-fg-muted">{local.sparkline}</span>
          </span>
        </span>
      </div>
    </div>
  );
}

function Timeline({ f }: { f: Fixtures }) {
  const t = f.copy.traces;
  const turn = f.trace.turns[1]!;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <section className="grid grid-cols-[minmax(0,1fr)] gap-3">
        <p className="text-sm font-(--ui-weight-medium) text-fg">
          {t.turn(turn.index)} · {t.timeline}
        </p>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-1">
          {turn.lanes.map((lane) => (
            <div key={lane.name} className="flex items-center gap-2">
              <span className="w-28 shrink-0 truncate text-right font-mono text-xs text-fg-muted">
                {lane.name === "model"
                  ? t.modelLane
                  : lane.name === "other"
                    ? t.legend.other
                    : lane.name}
              </span>
              <span className="relative h-4 min-w-0 flex-1 overflow-hidden bg-surface-muted">
                {lane.segments.map((seg, i) => (
                  <span
                    key={i}
                    className={`absolute inset-y-0 min-w-0.5 ${SEGMENT_INK[seg.kind]}`}
                    style={{
                      left: `${(seg.startMs / turn.spanMs) * 100}%`,
                      width: `${((seg.endMs - seg.startMs) / turn.spanMs) * 100}%`,
                    }}
                  />
                ))}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="w-28 shrink-0" />
            <span className="relative h-4 min-w-0 flex-1">
              {ticks.map((p) => (
                <span
                  key={p}
                  className={`absolute top-0 font-mono text-xs tabular-nums text-fg-subtle ${
                    p === 0 ? "" : p === 1 ? "-translate-x-full" : "-translate-x-1/2"
                  }`}
                  style={{ left: `${p * 100}%` }}
                >
                  {duration(Math.round(turn.spanMs * p))}
                </span>
              ))}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-30">
          {LEGEND.map((kind) => (
            <span key={kind} className="flex items-center gap-1.5 text-xs text-fg-muted">
              <span className={`inline-block h-2 w-3 ${SEGMENT_INK[kind]}`} />
              {t.legend[kind]}
            </span>
          ))}
        </div>
      </section>
      <section className="grid grid-cols-[minmax(0,1fr)] gap-1">
        <p className="text-sm font-(--ui-weight-medium) text-fg">{t.messages}</p>
        <ul className="grid grid-cols-[minmax(0,1fr)]">
          {turn.events.map((event, i) => (
            <li
              key={event.time}
              className={`flex items-center gap-2 border-t border-line-muted px-2 py-1.5 ${i === 3 ? "bg-surface-muted" : ""}`}
            >
              <span className="shrink-0 font-mono text-xs tabular-nums text-fg-subtle">
                {event.time}
              </span>
              <Badge
                tone={
                  event.messageType === "event_msg"
                    ? "attention"
                    : event.messageType === "session_meta"
                      ? "info"
                      : "neutral"
                }
                variant="outline"
              >
                {event.payloadType}
              </Badge>
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-fg-muted">
                {event.summary}
              </span>
              {event.stopReason && (
                <span className="shrink-0 font-mono text-xs text-fg-subtle">
                  {event.stopReason}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Usage({ f }: { f: Fixtures }) {
  const local = LOCAL[f.lang];
  const u = local.usage;
  const totals = u.days.map((_, i) => u.cacheRead[i]! + u.cacheWrite[i]! + u.output[i]!);
  const max = Math.ceil(Math.max(...totals) / 100) * 100;
  const spend = f.company.org.spend;
  const share = spend.costUsd / spend.budgetUsd;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10">
      <section className="grid grid-cols-[minmax(0,1fr)] gap-3">
        <p className="text-sm font-(--ui-weight-medium) text-fg">{local.weekTitle}</p>
        <div className="flex gap-3">
          <div className="flex h-44 w-8 flex-col justify-between text-right font-mono text-xs tabular-nums text-fg-subtle">
            <span>{max}</span>
            <span>{max / 2}</span>
            <span>0</span>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)] min-w-0 flex-1 gap-1">
            <div className="flex h-44 items-end gap-4 border-b border-[var(--ui-chart-axis)] border-t border-t-[var(--ui-chart-grid)] px-2">
              {u.days.map((day, i) => (
                <span
                  key={day}
                  className="flex h-full min-w-0 flex-1 flex-col justify-end"
                  title={`${day}: ${totals[i]}k`}
                >
                  <span
                    className="block bg-chart-output"
                    style={{ height: `${(u.output[i]! / max) * 100}%` }}
                  />
                  <span
                    className="block bg-chart-cache-write"
                    style={{ height: `${(u.cacheWrite[i]! / max) * 100}%` }}
                  />
                  <span
                    className="block bg-chart-cache-read"
                    style={{ height: `${(u.cacheRead[i]! / max) * 100}%` }}
                  />
                </span>
              ))}
            </div>
            <div className="flex gap-4 px-2">
              {u.days.map((day) => (
                <span key={day} className="min-w-0 flex-1 text-center text-xs text-fg-muted">
                  {day}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 pl-13">
          {(
            [
              ["bg-chart-cache-read", local.buckets.cacheRead],
              ["bg-chart-cache-write", local.buckets.cacheWrite],
              ["bg-chart-output", local.buckets.output],
            ] as const
          ).map(([ink, label]) => (
            <span key={label} className="flex items-center gap-1.5 text-xs text-fg-muted">
              <span className={`inline-block size-2.5 ${ink}`} />
              {label}
            </span>
          ))}
        </div>
      </section>
      <section className="grid grid-cols-[minmax(0,1fr)] gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-(--ui-weight-medium) text-fg">{local.budgetTitle}</p>
          <p className="font-mono text-xs tabular-nums text-fg-muted">
            {local.budgetOf(usd(spend.costUsd), usd(spend.budgetUsd))}
          </p>
        </div>
        <span className="relative block h-2 w-full bg-tone-neutral-bg">
          <span
            className="absolute inset-y-0 left-0 bg-tone-success-emphasis"
            style={{ width: `${share * 100}%` }}
          />
          <span className="absolute -inset-y-1 left-[80%] w-px bg-tone-attention-fg" />
          <span className="absolute -inset-y-1 left-[95%] w-px bg-tone-danger-fg" />
        </span>
        <p className="text-xs text-fg-muted">{local.thresholds}</p>
      </section>
    </div>
  );
}

const VARIANTS = { overview: Overview, timeline: Timeline, usage: Usage } as const;

export const module = defineModule({
  id: "stats",
  title: "Stats & charts",
  description:
    "A Trace's numbers: the overall summary, stat tiles and chips, a context ring and a sparkline; the execution timeline and its legend; spend by day against the budget.",
  width: "wide",
  variants: [
    { key: "overview", title: "Overview" },
    { key: "timeline", title: "Timeline" },
    { key: "usage", title: "Usage" },
  ],
  parts: [
    "data-stat-tile",
    "data-stat-chip",
    "data-legend",
    "data-ring",
    "data-sparkline",
    "data-chart-frame",
    "charts-domain",
    "data-key-value",
    "feedback-progress-bar",
    "layout-ruled-section",
  ],
  render: (variant, { lang }) => {
    const View = VARIANTS[variant as keyof typeof VARIANTS] ?? Overview;
    return <View f={fixturesFor(lang)} />;
  },
});
