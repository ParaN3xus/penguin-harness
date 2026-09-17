/**
 * Buttons & actions, where they occur: the Agents page toolbar (search, the create pair, an icon
 * button), a confirm dialog's footer, dense rows with their hover actions beside a code header's
 * copy button, an external link and key hints, and every button variant in every state. Static
 * stand-ins for W1's `Button`, `IconButton`, `Link`, `CopyButton`, `Kbd` and `CreateButtons`.
 */
import { fixturesFor } from "../fixtures";
import type { FixtureLang, Fixtures } from "../fixtures";
import { defineModule } from "../module";
import { AgentTile } from "../screens/parts";
import { Button, GlyphIcon, Heading, IconButton, Kbd, Link, Modal, SearchInput } from "./parts";
import type { ButtonState, ButtonVariant } from "./parts";

/** Local fixture (K3): the actions' labels. The rows come from `fixtures` (agents, models). */
const COPY: Readonly<
  Record<
    FixtureLang,
    {
      agentsTitle: string;
      searchAgents: string;
      createWithAi: string;
      newAgent: string;
      more: string;
      deleteTitle: (name: string) => string;
      deleteBody: string;
      cancel: string;
      delete: string;
      keysTitle: string;
      copy: string;
      edit: string;
      remove: string;
      getKey: string;
      openPalette: string;
      close: string;
      states: Record<ButtonState, string>;
      variants: Record<ButtonVariant, string>;
    }
  >
> = {
  en: {
    agentsTitle: "Agents",
    searchAgents: "Search agents",
    createWithAi: "Create with AI",
    newAgent: "New agent",
    more: "More",
    deleteTitle: (name) => `Delete “${name}”?`,
    deleteBody: "Its Sessions stay in the sidebar; schedules that start it are turned off.",
    cancel: "Cancel",
    delete: "Delete agent",
    keysTitle: "API keys",
    copy: "Copy",
    edit: "Edit",
    remove: "Remove",
    getKey: "Get a key",
    openPalette: "Command palette",
    close: "Close",
    states: {
      rest: "rest",
      hover: "hover",
      focus: "focus",
      disabled: "disabled",
      loading: "loading",
    },
    variants: {
      primary: "Save",
      secondary: "Cancel",
      danger: "Delete",
      ghost: "Skip",
      link: "Details",
    },
  },
  zh: {
    agentsTitle: "智能体",
    searchAgents: "搜索智能体",
    createWithAi: "用 AI 创建",
    newAgent: "新建智能体",
    more: "更多",
    deleteTitle: (name) => `删除「${name}」？`,
    deleteBody: "它的 Session 仍保留在侧栏中；启动它的定时任务会被关闭。",
    cancel: "取消",
    delete: "删除智能体",
    keysTitle: "API 密钥",
    copy: "复制",
    edit: "编辑",
    remove: "移除",
    getKey: "获取密钥",
    openPalette: "命令面板",
    close: "关闭",
    states: { rest: "静止", hover: "悬停", focus: "焦点", disabled: "禁用", loading: "加载中" },
    variants: { primary: "保存", secondary: "取消", danger: "删除", ghost: "跳过", link: "详情" },
  },
};

function Toolbar({ f }: { f: Fixtures }) {
  const local = COPY[f.lang];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Heading level={3} className="mr-auto">
          {local.agentsTitle}
        </Heading>
        <Button variant="secondary" leading={<GlyphIcon name="sparkle" size={13} />}>
          {local.createWithAi}
        </Button>
        <Button variant="primary" leading={<GlyphIcon name="plus" size={13} />}>
          {local.newAgent}
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <SearchInput placeholder={local.searchAgents} />
        <IconButton label={local.more} icon="sliders" />
        <IconButton label={local.more} icon="more" />
      </div>
      <ul className="grid grid-cols-[minmax(0,1fr)]">
        {f.agents.map((agent) => (
          <li key={agent.id} className="flex items-center gap-3 border-t border-line-muted py-2.5">
            <AgentTile id={agent.id} name={agent.name} size={24} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-(--ui-weight-medium) text-fg">
                {agent.name}
              </span>
              <span className="block truncate text-xs text-fg-muted">{agent.description}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Footer({ f }: { f: Fixtures }) {
  const local = COPY[f.lang];
  const agent = f.agents[1] ?? f.agents[0]!;
  return (
    <div className="flex min-h-72 items-center justify-center">
      <Modal
        className="w-full max-w-sm"
        title={local.deleteTitle(agent.name)}
        description={local.deleteBody}
        footer={
          <>
            <Button variant="secondary">{local.cancel}</Button>
            <Button variant="danger">{local.delete}</Button>
          </>
        }
      />
    </div>
  );
}

/** Masked key suffixes for the three provider rows. */
const KEY_TAILS = ["a91f", "7c2e", "04bd"] as const;

/** A code block's header: the language and its copy button (W5's `CodeBlock`). */
function CodeBlock({ copyLabel }: { copyLabel: string }) {
  return (
    <section className="ui-frame grid overflow-hidden rounded-md border border-line">
      <div
        data-slot="head"
        className="flex items-center gap-2 border-b border-line bg-surface-muted px-3 py-1"
      >
        <span className="font-mono text-xs text-fg-muted">bash</span>
        <span className="min-w-0 flex-1" />
        <IconButton label={copyLabel} icon="copy" size="sm" />
      </div>
      <pre
        data-slot="body"
        className="overflow-x-auto bg-[var(--ui-code-bg)] px-3 py-2 font-mono text-xs leading-relaxed text-fg"
      >
        penguin server start --port 4630
      </pre>
    </section>
  );
}

function DenseRow({ f }: { f: Fixtures }) {
  const local = COPY[f.lang];
  const providers = [...new Map(f.models.map((m) => [m.provider, m])).values()].slice(0, 3);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <section className="grid grid-cols-[minmax(0,1fr)] gap-2">
        <div className="flex items-center gap-2">
          <Heading level={5} className="mr-auto">
            {local.keysTitle}
          </Heading>
          <Link external>{local.getKey}</Link>
        </div>
        <ul className="grid grid-cols-[minmax(0,1fr)]">
          {providers.map((model, i) => (
            <li
              key={model.provider}
              className={`flex h-10 items-center gap-2 rounded-md px-2 ${i === 1 ? "bg-surface-muted" : ""}`}
            >
              <AgentTile id={model.provider} name={model.providerLabel} size={18} />
              <span className="min-w-0 flex-1 truncate text-sm text-fg">{model.providerLabel}</span>
              <span className="font-mono text-xs text-fg-muted">sk-…{KEY_TAILS[i]}</span>
              <span className={`flex items-center ${i === 1 ? "" : "invisible"}`}>
                <IconButton label={local.copy} icon="copy" size="sm" hovered={i === 1} />
                <IconButton label={local.edit} icon="pencil" size="sm" />
                <IconButton label={local.remove} icon="trash" size="sm" />
              </span>
            </li>
          ))}
        </ul>
      </section>
      <CodeBlock copyLabel={local.copy} />

      <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-fg-muted">
        <span className="flex items-center gap-1.5">
          <Kbd keys={["⌘", "K"]} />
          {local.openPalette}
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd keys={["Esc"]} />
          {local.close}
        </span>
      </p>
    </div>
  );
}

const VARIANT_ORDER: readonly ButtonVariant[] = ["primary", "secondary", "danger", "ghost", "link"];
const STATE_ORDER: readonly ButtonState[] = ["rest", "hover", "focus", "disabled", "loading"];

function States({ f }: { f: Fixtures }) {
  const local = COPY[f.lang];
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-x-3 border-spacing-y-2 text-xs">
        <thead>
          <tr>
            <th />
            {STATE_ORDER.map((state) => (
              <th key={state} className="text-left font-(--ui-weight-body) text-fg-muted">
                {local.states[state]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {VARIANT_ORDER.map((variant) => (
            <tr key={variant}>
              <th className="pr-2 text-left font-mono font-(--ui-weight-body) text-fg-muted">
                {variant}
              </th>
              {STATE_ORDER.map((state) => (
                <td key={state}>
                  <Button variant={variant} state={state} size="xs">
                    {local.variants[variant]}
                  </Button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const VARIANTS = {
  toolbar: Toolbar,
  footer: Footer,
  "dense-row": DenseRow,
  states: States,
} as const;

export const module = defineModule({
  id: "actions",
  title: "Buttons & actions",
  description:
    "Buttons where they occur: a page toolbar, a dialog footer, a dense row's hover actions with links, keys and a copy button, and every variant in every state.",
  width: "narrow",
  variants: [
    { key: "toolbar", title: "Toolbar" },
    { key: "footer", title: "Footer" },
    { key: "dense-row", title: "Dense row" },
    { key: "states", title: "States" },
  ],
  parts: [
    "actions-button",
    "actions-icon-button",
    "actions-button-class",
    "actions-link",
    "actions-copy-button",
    "actions-close-button",
    "actions-kbd",
    "actions-hidden-file-input",
    "actions-create-buttons",
    "forms-search-input",
  ],
  render: (variant, { lang }) => {
    const View = VARIANTS[variant as keyof typeof VARIANTS] ?? Toolbar;
    return <View f={fixturesFor(lang)} />;
  },
});
