/**
 * Pages & sections: how a page is put together.
 *
 * - Settings: the Plugin library page — page frame, page header with its "?" and toolbar, a ruled
 *   section holding one level of cards, and a collapsed section below;
 * - Entity: a model's page — the entity header (logo, name, id, badges, a link) above ruled
 *   sections of facts and of the agents that use it;
 * - Empty: the Agents page before any exists — the page's empty state, and a section's empty slot.
 *
 * Static stand-ins for W4's `PageFrame`, `PageHeader`, `RuledSection`, `Card`, `CollapsibleSection`,
 * `EntityHeader` and W1's `EmptyState`.
 */
import type { ReactNode } from "react";
import { fixturesFor } from "../fixtures";
import type { FixtureLang, Fixtures } from "../fixtures";
import { defineModule } from "../module";
import { AgentTile } from "../screens/parts";
import { tokens, usd } from "../screens/format";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  GlyphIcon,
  KeyValue,
  Link,
  PageHeader,
  RuledSection,
  SearchInput,
  Switch,
} from "./parts";
import type { IconName } from "./parts";

/**
 * Local fixture (K3): the pages' copy. The plugin cards reuse the four installed plugins K-redesign
 * §4.6 adds as `plugins`; until #763 does, they live here in that shape.
 */
const LOCAL: Readonly<
  Record<
    FixtureLang,
    {
      plugins: {
        title: string;
        info: string;
        search: string;
        install: string;
        installed: string;
        installedHint: string;
        rows: readonly {
          name: string;
          version: string;
          description: string;
          icon: IconName;
          enabled: boolean;
        }[];
        marketplaces: string;
      };
      entity: {
        docs: string;
        defaultBadge: string;
        vision: string;
        pricing: string;
        cacheRead: string;
        cacheWrite: string;
        output: string;
        context: string;
        usedBy: string;
        sessions: (n: number) => string;
        edit: string;
      };
      agents: {
        title: string;
        info: string;
        create: string;
        createAi: string;
        schedules: string;
        noSchedules: string;
        noSchedulesHint: string;
        addSchedule: string;
      };
      empty: { title: string; body: string };
    }
  >
> = {
  en: {
    plugins: {
      title: "Plugin library",
      info: "Plugins add Skills and MCP servers; enable one to offer it to every agent.",
      search: "Search plugins",
      install: "Install plugin",
      installed: "Installed",
      installedHint: "Turned-off plugins stay installed and keep their settings.",
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
      marketplaces: "Marketplaces",
    },
    entity: {
      docs: "Provider docs",
      defaultBadge: "Default",
      vision: "Text only",
      pricing: "Pricing per million tokens",
      cacheRead: "Cache read",
      cacheWrite: "Cache write",
      output: "Output",
      context: "Context window",
      usedBy: "Used by",
      sessions: (n) => `${n} Sessions this week`,
      edit: "Edit",
    },
    agents: {
      title: "Agents",
      info: "An agent is a model, a prompt and the tools it may use.",
      create: "New agent",
      createAi: "Create with AI",
      schedules: "Schedules",
      noSchedules: "No schedules",
      noSchedulesHint: "A schedule starts an agent's Session at set times.",
      addSchedule: "Add schedule",
    },
    empty: {
      title: "No agents yet",
      body: "Create one to give a Session its own model, prompt and tools. The default agent keeps working meanwhile.",
    },
  },
  zh: {
    plugins: {
      title: "插件库",
      info: "插件提供技能与 MCP 服务器；启用后所有智能体都可以使用。",
      search: "搜索插件",
      install: "安装插件",
      installed: "已安装",
      installedHint: "关闭的插件仍保持安装，设置也会保留。",
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
      marketplaces: "插件市场",
    },
    entity: {
      docs: "提供方文档",
      defaultBadge: "默认",
      vision: "仅文本",
      pricing: "每百万 Token 价格",
      cacheRead: "缓存读取",
      cacheWrite: "缓存写入",
      output: "输出",
      context: "上下文窗口",
      usedBy: "使用者",
      sessions: (n) => `本周 ${n} 个 Session`,
      edit: "编辑",
    },
    agents: {
      title: "智能体",
      info: "智能体由模型、提示词和它可用的工具组成。",
      create: "新建智能体",
      createAi: "用 AI 创建",
      schedules: "定时任务",
      noSchedules: "没有定时任务",
      noSchedulesHint: "定时任务会在设定的时间启动智能体的 Session。",
      addSchedule: "添加定时任务",
    },
    empty: {
      title: "还没有智能体",
      body: "创建一个，让 Session 拥有自己的模型、提示词与工具。在此之前，默认智能体照常工作。",
    },
  },
};

/** The page's scroll container and width cap. */
function PageFrame({ children }: { children: ReactNode }) {
  return <div className="mx-auto grid max-w-3xl gap-10 py-2">{children}</div>;
}

/** A section behind a header bar that folds it away (shown folded). */
function CollapsibleSection({ title, count }: { title: string; count: number }) {
  return (
    <section className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2 text-sm">
      <GlyphIcon name="chevronRight" size={14} className="text-fg-subtle" />
      <span className="font-(--ui-weight-medium) text-fg">{title}</span>
      <span className="text-xs tabular-nums text-fg-muted">{count}</span>
    </section>
  );
}

function Settings({ f }: { f: Fixtures }) {
  const p = LOCAL[f.lang].plugins;
  return (
    <PageFrame>
      <PageHeader
        title={p.title}
        info={p.info}
        actions={
          <>
            <span className="w-56">
              <SearchInput placeholder={p.search} />
            </span>
            <Button variant="primary" leading={<GlyphIcon name="plus" size={13} />}>
              {p.install}
            </Button>
          </>
        }
      />
      <RuledSection title={p.installed} description={p.installedHint} count={p.rows.length}>
        <div className="grid grid-cols-2 gap-3">
          {p.rows.map((row) => (
            <Card key={row.name} className="grid grid-cols-[minmax(0,1fr)] gap-3 p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-muted text-fg">
                  <GlyphIcon name={row.icon} size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-(--ui-weight-medium) text-fg">
                    {row.name}
                  </span>
                  <span className="block font-mono text-xs text-fg-subtle">{row.version}</span>
                </span>
                <Switch on={row.enabled} />
              </div>
              <p className="text-sm text-fg-muted">{row.description}</p>
            </Card>
          ))}
        </div>
      </RuledSection>
      <CollapsibleSection title={p.marketplaces} count={3} />
    </PageFrame>
  );
}

/** A model or plugin's identity: its logo, name, id, at most two badges and an outside link. */
function EntityHeader({ f }: { f: Fixtures }) {
  const e = LOCAL[f.lang].entity;
  const model = f.models[0]!;
  return (
    <header className="flex items-start gap-4">
      <AgentTile id={model.provider} name={model.providerLabel} size={48} />
      <div className="grid grid-cols-[minmax(0,1fr)] min-w-0 flex-1 gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-(family-name:--ui-h2-font) text-(length:--ui-h2-size) leading-(--ui-h2-lh) font-(--ui-h2-weight) tracking-(--ui-h2-tracking) text-fg">
            {model.displayName}
          </span>
          {model.isDefault && <Badge tone="success">{e.defaultBadge}</Badge>}
          {!model.supportsVision && <Badge variant="outline">{e.vision}</Badge>}
        </div>
        <p className="font-mono text-xs text-fg-muted">
          {model.provider}/{model.modelId}
        </p>
        <p className="text-sm">
          <Link external>{e.docs}</Link>
        </p>
      </div>
      <Button variant="secondary" leading={<GlyphIcon name="pencil" size={13} />}>
        {e.edit}
      </Button>
    </header>
  );
}

function Entity({ f }: { f: Fixtures }) {
  const e = LOCAL[f.lang].entity;
  const model = f.models[0]!;
  return (
    <PageFrame>
      <EntityHeader f={f} />
      <RuledSection title={e.pricing}>
        <KeyValue
          items={[
            { label: e.cacheRead, value: usd(model.pricing.cacheRead), mono: true },
            { label: e.cacheWrite, value: usd(model.pricing.cacheWrite), mono: true },
            { label: e.output, value: usd(model.pricing.output), mono: true },
            { label: e.context, value: tokens(model.contextWindow), mono: true },
          ]}
        />
      </RuledSection>
      <RuledSection title={e.usedBy} count={f.agents.length}>
        <ul className="grid grid-cols-[minmax(0,1fr)]">
          {f.agents.map((agent, i) => (
            <li
              key={agent.id}
              className="flex items-center gap-3 border-t border-line-muted py-2.5 first:border-t-0"
            >
              <AgentTile id={agent.id} name={agent.name} size={24} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-fg">{agent.name}</span>
                <span className="block truncate text-xs text-fg-muted">{agent.description}</span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-fg-muted">
                {e.sessions(i === 0 ? 14 : 3)}
              </span>
            </li>
          ))}
        </ul>
      </RuledSection>
    </PageFrame>
  );
}

function Empty({ f }: { f: Fixtures }) {
  const a = LOCAL[f.lang].agents;
  const empty = LOCAL[f.lang].empty;
  return (
    <PageFrame>
      <PageHeader title={a.title} info={a.info} />
      <EmptyState
        title={empty.title}
        description={empty.body}
        action={
          <span className="flex items-center gap-2">
            <Button variant="secondary" leading={<GlyphIcon name="sparkle" size={13} />}>
              {a.createAi}
            </Button>
            <Button variant="primary" leading={<GlyphIcon name="plus" size={13} />}>
              {a.create}
            </Button>
          </span>
        }
      />
      <RuledSection title={a.schedules}>
        <EmptyState
          variant="slot"
          title={a.noSchedules}
          description={a.noSchedulesHint}
          action={<Button variant="secondary">{a.addSchedule}</Button>}
        />
      </RuledSection>
    </PageFrame>
  );
}

const VARIANTS = { settings: Settings, entity: Entity, empty: Empty } as const;

export const module = defineModule({
  id: "pages",
  title: "Pages & sections",
  description:
    "A settings-style page: the page header, ruled sections, a card grid and a collapsible section; an entity page; an empty page.",
  width: "wide",
  variants: [
    { key: "settings", title: "Settings" },
    { key: "entity", title: "Entity" },
    { key: "empty", title: "Empty" },
  ],
  parts: [
    "layout-card",
    "layout-page-frame",
    "layout-ruled-section",
    "layout-collapsible-section",
    "layout-entity-header",
    "feedback-empty-state",
    "actions-create-buttons",
  ],
  render: (variant, { lang }) => {
    const View = VARIANTS[variant as keyof typeof VARIANTS] ?? Settings;
    return <View f={fixturesFor(lang)} />;
  },
});
