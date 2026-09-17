/**
 * Tables & lists: the models table with a band header, a sorted column and hover actions; the vault
 * table under a plain header; a dense view of key-value facts and installed plugins as list rows
 * with a group header and a pager; and the models table with a row expanded to its details.
 * Static stand-ins for W4's `Table`, `KeyValue`, `ListRow`, `GroupHeader` and `Pager`.
 */
import type { ReactNode } from "react";
import { fixturesFor } from "../fixtures";
import type { FixtureLang, Fixtures, ModelFixture } from "../fixtures";
import { defineModule } from "../module";
import { AgentTile } from "../screens/parts";
import { tokens, usd } from "../screens/format";
import { Badge, Button, GlyphIcon, GroupHeader, IconButton, KeyValue, Switch } from "./parts";
import type { IconName } from "./parts";

/**
 * Local fixture (K3): K-redesign §4.6 adds a `vault` list of six rows and a `plugins` list of four
 * installed items to the fixtures; until #763 does, they live here in that shape.
 */
const LOCAL: Readonly<
  Record<
    FixtureLang,
    {
      columns: {
        model: string;
        context: string;
        cacheRead: string;
        output: string;
        vision: string;
      };
      defaultBadge: string;
      actions: { edit: string; more: string };
      vault: {
        columns: { name: string; kind: string; usedBy: string; updated: string };
        rows: readonly { name: string; kind: string; agents: readonly string[]; updated: string }[];
      };
      plugins: {
        label: string;
        rows: readonly {
          name: string;
          version: string;
          description: string;
          icon: IconName;
          enabled: boolean;
        }[];
        pager: (from: number, to: number, total: number) => string;
        previous: string;
        next: string;
      };
      facts: readonly [string, string, string, string, string, string];
      expanded: {
        pricing: string;
        cacheWrite: string;
        capabilities: string;
        vision: string;
        tools: string;
        setDefault: string;
      };
    }
  >
> = {
  en: {
    columns: {
      model: "Model",
      context: "Context",
      cacheRead: "Cache read",
      output: "Output",
      vision: "Images",
    },
    defaultBadge: "Default",
    actions: { edit: "Edit", more: "More" },
    vault: {
      columns: { name: "Name", kind: "Kind", usedBy: "Used by", updated: "Updated" },
      rows: [
        {
          name: "DEEPSEEK_API_KEY",
          kind: "API key",
          agents: ["default_agent", "docs-reviewer"],
          updated: "Sep 14",
        },
        {
          name: "OPENROUTER_API_KEY",
          kind: "API key",
          agents: ["default_agent"],
          updated: "Sep 12",
        },
        { name: "GITHUB_TOKEN", kind: "Token", agents: ["docs-reviewer"], updated: "Sep 9" },
        { name: "SLACK_WEBHOOK_URL", kind: "Webhook", agents: [], updated: "Aug 30" },
        { name: "PROXY_PASSWORD", kind: "Password", agents: [], updated: "Aug 21" },
        { name: "S3_UPLOAD_SECRET", kind: "Secret", agents: ["default_agent"], updated: "Aug 3" },
      ],
    },
    plugins: {
      label: "Installed",
      rows: [
        {
          name: "penguin-sdk",
          version: "0.2.13",
          description: "Build apps on the PenguinHarness SDK",
          icon: "book",
          enabled: true,
        },
        {
          name: "docs-review",
          version: "1.4.0",
          description: "Check rendered docs for dead links and citations",
          icon: "search",
          enabled: true,
        },
        {
          name: "github",
          version: "2.1.3",
          description: "Issues, pull requests and reviews over MCP",
          icon: "fork",
          enabled: false,
        },
        {
          name: "slack-notify",
          version: "0.9.1",
          description: "Post a message when a Task finishes",
          icon: "bell",
          enabled: true,
        },
      ],
      pager: (from, to, total) => `${from}–${to} of ${total}`,
      previous: "Previous page",
      next: "Next page",
    },
    facts: ["Plugins", "Enabled", "Skills", "MCP servers", "Updates", "Last sync"],
    expanded: {
      pricing: "Pricing per million tokens",
      cacheWrite: "Cache write",
      capabilities: "Capabilities",
      vision: "Images",
      tools: "Tool calls",
      setDefault: "Set as default",
    },
  },
  zh: {
    columns: {
      model: "模型",
      context: "上下文",
      cacheRead: "缓存读取",
      output: "输出",
      vision: "图片",
    },
    defaultBadge: "默认",
    actions: { edit: "编辑", more: "更多" },
    vault: {
      columns: { name: "名称", kind: "类型", usedBy: "使用者", updated: "更新" },
      rows: [
        {
          name: "DEEPSEEK_API_KEY",
          kind: "API 密钥",
          agents: ["default_agent", "docs-reviewer"],
          updated: "9 月 14 日",
        },
        {
          name: "OPENROUTER_API_KEY",
          kind: "API 密钥",
          agents: ["default_agent"],
          updated: "9 月 12 日",
        },
        { name: "GITHUB_TOKEN", kind: "令牌", agents: ["docs-reviewer"], updated: "9 月 9 日" },
        { name: "SLACK_WEBHOOK_URL", kind: "Webhook", agents: [], updated: "8 月 30 日" },
        { name: "PROXY_PASSWORD", kind: "密码", agents: [], updated: "8 月 21 日" },
        { name: "S3_UPLOAD_SECRET", kind: "密钥", agents: ["default_agent"], updated: "8 月 3 日" },
      ],
    },
    plugins: {
      label: "已安装",
      rows: [
        {
          name: "penguin-sdk",
          version: "0.2.13",
          description: "基于 PenguinHarness SDK 构建应用",
          icon: "book",
          enabled: true,
        },
        {
          name: "docs-review",
          version: "1.4.0",
          description: "检查渲染后文档的失效链接与引用",
          icon: "search",
          enabled: true,
        },
        {
          name: "github",
          version: "2.1.3",
          description: "经由 MCP 处理 Issue、Pull Request 与评审",
          icon: "fork",
          enabled: false,
        },
        {
          name: "slack-notify",
          version: "0.9.1",
          description: "Task 完成时发送一条消息",
          icon: "bell",
          enabled: true,
        },
      ],
      pager: (from, to, total) => `第 ${from}–${to} 项，共 ${total} 项`,
      previous: "上一页",
      next: "下一页",
    },
    facts: ["插件", "已启用", "技能", "MCP 服务器", "可更新", "上次同步"],
    expanded: {
      pricing: "每百万 Token 价格",
      cacheWrite: "缓存写入",
      capabilities: "能力",
      vision: "图片",
      tools: "工具调用",
      setDefault: "设为默认",
    },
  },
};

/** A table's header row: `band` is a filled row, `plain` a rule under the labels. */
function TableHead({ band, children }: { band: boolean; children: ReactNode }) {
  return (
    <thead>
      <tr
        className={`text-left text-xs text-fg-muted ${band ? "bg-surface-muted" : "border-b border-line"}`}
      >
        {children}
      </tr>
    </thead>
  );
}

function Th({
  children,
  align = "left",
  sorted,
}: {
  children?: ReactNode;
  align?: "left" | "right";
  sorted?: boolean;
}) {
  return (
    <th
      className={`px-3 py-2 font-(--ui-weight-medium) ${align === "right" ? "text-right" : "text-left"} ${sorted ? "text-fg" : ""}`}
    >
      <span
        className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        {children}
        {sorted && <GlyphIcon name="arrowDown" size={12} />}
      </span>
    </th>
  );
}

function ModelCell({ model, badge }: { model: ModelFixture; badge?: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <AgentTile id={model.provider} name={model.providerLabel} size={20} />
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm text-fg">{model.displayName}</span>
          {badge && <Badge tone="success">{badge}</Badge>}
        </span>
        <span className="block truncate font-mono text-xs text-fg-subtle">{model.modelId}</span>
      </span>
    </span>
  );
}

function Table({
  f,
  expanded,
}: {
  f: Fixtures;
  /** A model id whose row is opened on its details. */
  expanded?: string;
}) {
  const local = LOCAL[f.lang];
  const models = f.models.slice(0, 6);
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <table className="w-full border-collapse">
        <TableHead band>
          {expanded !== undefined && <th className="w-8" />}
          <Th>{local.columns.model}</Th>
          <Th align="right">{local.columns.context}</Th>
          <Th align="right">{local.columns.cacheRead}</Th>
          <Th align="right" sorted>
            {local.columns.output}
          </Th>
          <Th align="right">{local.columns.vision}</Th>
          <th className="w-20" />
        </TableHead>
        <tbody>
          {models.map((model, i) => {
            const open = model.modelId === expanded;
            const hovered = expanded === undefined && i === 2;
            return (
              <ModelRows
                key={model.modelId}
                f={f}
                model={model}
                open={open}
                hovered={hovered}
                expandable={expanded !== undefined}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ModelRows({
  f,
  model,
  open,
  hovered,
  expandable,
}: {
  f: Fixtures;
  model: ModelFixture;
  open: boolean;
  hovered: boolean;
  expandable: boolean;
}) {
  const local = LOCAL[f.lang];
  const e = local.expanded;
  const cell = "border-t border-line px-3 py-2 text-right font-mono text-xs tabular-nums text-fg";
  return (
    <>
      <tr className={hovered || open ? "bg-surface-muted" : ""}>
        {expandable && (
          <td className="border-t border-line pl-3 text-fg-subtle">
            <GlyphIcon name={open ? "chevronDown" : "chevronRight"} size={14} />
          </td>
        )}
        <td className="border-t border-line px-3 py-2">
          <ModelCell model={model} badge={model.isDefault ? local.defaultBadge : undefined} />
        </td>
        <td className={cell}>{tokens(model.contextWindow)}</td>
        <td className={cell}>{usd(model.pricing.cacheRead)}</td>
        <td className={cell}>{usd(model.pricing.output)}</td>
        <td className="border-t border-line px-3 py-2 text-right text-fg-muted">
          {model.supportsVision ? (
            <GlyphIcon name="check" size={14} className="ml-auto" />
          ) : (
            <GlyphIcon name="minus" size={14} className="ml-auto text-fg-subtle" />
          )}
        </td>
        <td className="border-t border-line px-2 py-2">
          <span className={`flex justify-end ${hovered ? "" : "invisible"}`}>
            <IconButton label={local.actions.edit} icon="pencil" size="sm" />
            <IconButton label={local.actions.more} icon="more" size="sm" />
          </span>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} className="border-t border-line-muted bg-surface-muted px-10 pb-4 pt-3">
            <div className="grid grid-cols-2 gap-6">
              <div className="grid gap-2">
                <p className="text-xs text-fg-muted">{e.pricing}</p>
                <KeyValue
                  columns={3}
                  items={[
                    {
                      label: local.columns.cacheRead,
                      value: usd(model.pricing.cacheRead),
                      mono: true,
                    },
                    { label: e.cacheWrite, value: usd(model.pricing.cacheWrite), mono: true },
                    { label: local.columns.output, value: usd(model.pricing.output), mono: true },
                  ]}
                />
              </div>
              <div className="grid content-start gap-2">
                <p className="text-xs text-fg-muted">{e.capabilities}</p>
                <p className="flex flex-wrap items-center gap-2">
                  <Badge tone={model.supportsVision ? "success" : "neutral"} variant="outline">
                    {e.vision}
                  </Badge>
                  <Badge tone="success" variant="outline">
                    {e.tools}
                  </Badge>
                </p>
                <p className="pt-1">
                  <Button variant="secondary" size="xs">
                    {e.setDefault}
                  </Button>
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Band({ f }: { f: Fixtures }) {
  return <Table f={f} />;
}

function Plain({ f }: { f: Fixtures }) {
  const v = LOCAL[f.lang].vault;
  const cell = "border-b border-line-muted px-3 py-2.5";
  return (
    <table className="w-full border-collapse">
      <TableHead band={false}>
        <Th>{v.columns.name}</Th>
        <Th>{v.columns.kind}</Th>
        <Th>{v.columns.usedBy}</Th>
        <Th align="right">{v.columns.updated}</Th>
      </TableHead>
      <tbody>
        {v.rows.map((row) => (
          <tr key={row.name}>
            <td className={cell}>
              <span className="flex items-center gap-2">
                <GlyphIcon name="key" size={14} className="text-fg-subtle" />
                <span className="font-mono text-xs text-fg">{row.name}</span>
              </span>
            </td>
            <td className={`${cell} text-sm text-fg-muted`}>{row.kind}</td>
            <td className={cell}>
              <span className="flex items-center gap-1">
                {row.agents.length === 0 ? (
                  <span className="text-sm text-fg-subtle">—</span>
                ) : (
                  row.agents.map((id) => (
                    <AgentTile
                      key={id}
                      id={id}
                      name={f.agents.find((a) => a.id === id)?.name ?? id}
                      size={18}
                    />
                  ))
                )}
              </span>
            </td>
            <td className={`${cell} text-right text-xs tabular-nums text-fg-muted`}>
              {row.updated}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ListRow({
  lead,
  title,
  meta,
  trailing,
}: {
  lead: ReactNode;
  title: ReactNode;
  meta: string;
  trailing: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 border-t border-line-muted px-2 py-2.5">
      {lead}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-fg">{title}</span>
        <span className="block truncate text-xs text-fg-muted">{meta}</span>
      </span>
      {trailing}
    </li>
  );
}

function Dense({ f }: { f: Fixtures }) {
  const p = LOCAL[f.lang].plugins;
  const [plugins, enabled, skills, servers, updates, synced] = LOCAL[f.lang].facts;
  return (
    <div className="grid gap-6">
      <KeyValue
        items={[
          { label: plugins, value: "12" },
          { label: enabled, value: "9" },
          { label: skills, value: "31" },
          { label: servers, value: "4" },
          { label: updates, value: "2" },
          { label: synced, value: "2026-09-14 14:02", mono: true },
        ]}
      />
      <div>
        <GroupHeader label={p.label} count={12} />
        <ul className="grid">
          {p.rows.map((row) => (
            <ListRow
              key={row.name}
              lead={
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-muted text-fg">
                  <GlyphIcon name={row.icon} size={16} />
                </span>
              }
              title={
                <>
                  {row.name} <span className="font-mono text-xs text-fg-subtle">{row.version}</span>
                </>
              }
              meta={row.description}
              trailing={<Switch on={row.enabled} />}
            />
          ))}
        </ul>
        <div className="flex items-center justify-end gap-2 border-t border-line-muted pt-2 text-xs text-fg-muted">
          <span className="tabular-nums">{p.pager(1, 4, 12)}</span>
          <IconButton label={p.previous} icon="chevronLeft" size="sm" />
          <IconButton label={p.next} icon="chevronRight" size="sm" hovered />
        </div>
      </div>
    </div>
  );
}

function Expandable({ f }: { f: Fixtures }) {
  return <Table f={f} expanded={f.models[2]!.modelId} />;
}

const VARIANTS = { band: Band, plain: Plain, dense: Dense, expandable: Expandable } as const;

export const module = defineModule({
  id: "tables",
  title: "Tables & lists",
  description:
    "The models table with a band header, sortable columns and an expandable row; a plain vault table; key-value facts and installed plugins as list rows with a pager.",
  width: "wide",
  variants: [
    { key: "band", title: "Band" },
    { key: "plain", title: "Plain" },
    { key: "dense", title: "Dense" },
    { key: "expandable", title: "Expandable" },
  ],
  parts: [
    "data-table",
    "data-key-value",
    "layout-list-row",
    "navigation-group-header",
    "icons-logos",
    "feedback-badge",
  ],
  render: (variant, { lang }) => {
    const View = VARIANTS[variant as keyof typeof VARIANTS] ?? Band;
    return <View f={fixturesFor(lang)} />;
  },
});
