/**
 * Overlays: what opens over the chat, each on the same settled transcript.
 *
 * - Menu: a message's context menu (compact rows, separators, a danger item, shortcuts), the dock's
 *   add-panel menu (rows with descriptions), an info popover and a tooltip;
 * - Dialog: the paged settings dialog over the dimmed chat, a discard confirmation above it;
 * - Drawer: a Trace file's details in a side drawer;
 * - Toasts: the stack in the corner;
 * - Palette: the command palette with a query, grouped results and key hints.
 *
 * Static stand-ins for W3's `Menu`, `FloatingPanel`, `InfoPopover`, `Tooltip`, `Modal`,
 * `PagedDialog`, `ConfirmModal`, `Drawer` and `Toaster`, and W8's `CommandPalette`.
 */
import type { ReactNode } from "react";
import { fixturesFor } from "../fixtures";
import type { ChatTurn, FixtureLang, Fixtures } from "../fixtures";
import { defineModule } from "../module";
import { bytes } from "../screens/format";
import { AgentTile } from "../screens/parts";
import { Turn } from "../screens/transcript";
import type { ToneName } from "../tokens";
import {
  Button,
  FloatingPanel,
  GlyphIcon,
  IconButton,
  Kbd,
  KeyValue,
  Link,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  Modal,
  PrefRow,
  Segmented,
  Switch,
  Toast,
  Tooltip,
} from "./parts";
import type { IconName } from "./parts";

/**
 * Local fixture (K3): K-redesign §4.6 adds `menus` (context menu items with shortcuts, a danger item),
 * `commandPalette` (groups) and `notices` (a toast list) to the fixtures; until #763 does, they live
 * here in that shape.
 */
const LOCAL: Readonly<
  Record<
    FixtureLang,
    {
      menus: {
        message: readonly (
          | { icon: IconName; label: string; shortcut?: readonly string[]; danger?: boolean }
          | "separator"
        )[];
        panelsLabel: string;
        panels: readonly { icon: IconName; label: string; description: string }[];
      };
      info: { title: string; body: string; link: string };
      tooltip: string;
      confirm: { title: string; body: string; cancel: string; discard: string };
      drawer: {
        title: string;
        facts: readonly [string, string, string, string];
        eventsLabel: string;
        export: string;
        delete: string;
      };
      toasts: readonly { tone: ToneName; title: string; body?: string; action?: string }[];
      palette: {
        query: string;
        groups: readonly {
          label: string;
          items: readonly {
            icon?: IconName;
            agent?: string;
            label: string;
            hint?: string;
            keys?: readonly string[];
          }[];
        }[];
        hints: readonly [string, string, string];
      };
    }
  >
> = {
  en: {
    menus: {
      message: [
        { icon: "copy", label: "Copy message", shortcut: ["⌘", "C"] },
        { icon: "fork", label: "Fork chat from here" },
        { icon: "pencil", label: "Edit and resend" },
        "separator",
        { icon: "download", label: "Export as Markdown" },
        "separator",
        { icon: "trash", label: "Delete message", shortcut: ["⌫"], danger: true },
      ],
      panelsLabel: "Add a panel",
      panels: [
        {
          icon: "bot",
          label: "Subagents",
          description: "The call graph and each child's transcript",
        },
        { icon: "eye", label: "Trajectories", description: "Trace files, timelines and events" },
        { icon: "folder", label: "Files", description: "The Workspace tree and previews" },
        { icon: "terminal", label: "Terminal", description: "A shell in the Workspace" },
      ],
    },
    info: {
      title: "Tool short names",
      body: "Tool cards name the built-in tools by a short alias: read_file reads as “read”. The Trace keeps the full names.",
      link: "Learn more",
    },
    tooltip: "Send to background",
    confirm: {
      title: "Discard your changes?",
      body: "The accent and font size you picked are not saved yet.",
      cancel: "Keep editing",
      discard: "Discard",
    },
    drawer: {
      title: "Trace #001",
      facts: ["Written", "Size", "Events", "Model"],
      eventsLabel: "Latest events",
      export: "Export",
      delete: "Delete",
    },
    toasts: [
      { tone: "success", title: "Trace exported", body: "trace-001.jsonl · 48.2 KB" },
      {
        tone: "attention",
        title: "A command needs approval",
        body: "exec · Start the app and run the citation tests",
        action: "Review",
      },
      {
        tone: "danger",
        title: "Couldn't reach DeepSeek",
        body: "The request timed out after 60s.",
        action: "Retry",
      },
    ],
    palette: {
      query: "cit",
      groups: [
        {
          label: "Sessions",
          items: [
            { agent: "default_agent", label: "Make every citation open a real file", hint: "now" },
            { agent: "docs-reviewer", label: "Review hooks.md citations", hint: "5h" },
          ],
        },
        {
          label: "Actions",
          items: [
            { icon: "newChat", label: "New chat", keys: ["⌘", "N"] },
            { icon: "download", label: "Export the citation Trace" },
          ],
        },
        {
          label: "Go to",
          items: [
            { icon: "models", label: "Models" },
            { icon: "usage", label: "Cost Center" },
          ],
        },
      ],
      hints: ["navigate", "open", "close"],
    },
  },
  zh: {
    menus: {
      message: [
        { icon: "copy", label: "复制消息", shortcut: ["⌘", "C"] },
        { icon: "fork", label: "从这里分叉对话" },
        { icon: "pencil", label: "编辑后重发" },
        "separator",
        { icon: "download", label: "导出为 Markdown" },
        "separator",
        { icon: "trash", label: "删除消息", shortcut: ["⌫"], danger: true },
      ],
      panelsLabel: "添加面板",
      panels: [
        { icon: "bot", label: "子智能体", description: "调用关系与每个子会话的记录" },
        { icon: "eye", label: "轨迹观测", description: "Trace 文件、时间线与事件" },
        { icon: "folder", label: "文件", description: "Workspace 目录树与预览" },
        { icon: "terminal", label: "终端", description: "位于 Workspace 的 shell" },
      ],
    },
    info: {
      title: "工具短名",
      body: "工具卡片用短名称呼内置工具，read_file 显示为「读取」。Trace 中保留完整名称。",
      link: "了解更多",
    },
    tooltip: "转入后台执行",
    confirm: {
      title: "放弃修改？",
      body: "刚选的主题色和字号还没有保存。",
      cancel: "继续编辑",
      discard: "放弃",
    },
    drawer: {
      title: "Trace #001",
      facts: ["写入时间", "大小", "事件数", "模型"],
      eventsLabel: "最近的事件",
      export: "导出",
      delete: "删除",
    },
    toasts: [
      { tone: "success", title: "Trace 已导出", body: "trace-001.jsonl · 48.2 KB" },
      {
        tone: "attention",
        title: "有命令等待审批",
        body: "执行命令 · 启动应用并运行引用测试",
        action: "查看",
      },
      { tone: "danger", title: "无法连接 DeepSeek", body: "请求在 60 秒后超时。", action: "重试" },
    ],
    palette: {
      query: "引用",
      groups: [
        {
          label: "Session",
          items: [
            { agent: "default_agent", label: "让每个引用都打开真实文件", hint: "刚刚" },
            { agent: "docs-reviewer", label: "检查 hooks.md 的引用", hint: "5 小时" },
          ],
        },
        {
          label: "操作",
          items: [
            { icon: "newChat", label: "新对话", keys: ["⌘", "N"] },
            { icon: "download", label: "导出引用相关的 Trace" },
          ],
        },
        {
          label: "前往",
          items: [
            { icon: "models", label: "模型库" },
            { icon: "usage", label: "成本中心" },
          ],
        },
      ],
      hints: ["切换", "打开", "关闭"],
    },
  },
};

function settledTurn(f: Fixtures): ChatTurn {
  const turn1 = f.session.turns[0]!;
  return { ...turn1, items: turn1.items.filter((i) => ["u1", "tx3"].includes(i.id)) };
}

/** The chat every overlay opens over; `dim` lays the modal backdrop on it. */
function Stage({
  f,
  dim = false,
  className,
  children,
}: {
  f: Fixtures;
  dim?: boolean;
  className: string;
  children: ReactNode;
}) {
  return (
    <div className="relative h-[36rem] overflow-hidden rounded-lg border border-line bg-canvas">
      <div aria-hidden className="h-full overflow-hidden px-10 py-4">
        <div className="mx-auto max-w-2xl">
          <Turn turn={settledTurn(f)} f={f} />
        </div>
      </div>
      {dim && <div className="absolute inset-0 bg-[var(--ui-overlay-backdrop)]" />}
      <div className={`absolute inset-0 flex p-6 ${className}`}>{children}</div>
    </div>
  );
}

function InfoPopover({ f }: { f: Fixtures }) {
  const info = LOCAL[f.lang].info;
  return (
    <FloatingPanel className="w-72">
      <div className="grid gap-1 px-2 py-1.5 text-sm">
        <p className="font-(--ui-weight-medium) text-fg">{info.title}</p>
        <p className="text-fg-muted">{info.body}</p>
        <p className="pt-1">
          <Link external>{info.link}</Link>
        </p>
      </div>
    </FloatingPanel>
  );
}

function Menus({ f }: { f: Fixtures }) {
  const local = LOCAL[f.lang];
  return (
    <Stage f={f} className="items-start justify-between">
      <div className="grid w-60 gap-6">
        <FloatingPanel>
          {local.menus.message.map((item, i) =>
            item === "separator" ? (
              <MenuSeparator key={i} />
            ) : (
              <MenuItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                shortcut={item.shortcut}
                danger={item.danger}
                active={i === 1}
              />
            ),
          )}
        </FloatingPanel>
        <span className="flex items-center gap-2">
          <IconButton label={local.tooltip} icon="arrowDownLine" hovered />
          <Tooltip label={local.tooltip} />
        </span>
      </div>
      <div className="grid w-80 justify-items-end gap-6">
        <FloatingPanel className="w-full">
          <MenuLabel>{local.menus.panelsLabel}</MenuLabel>
          {local.menus.panels.map((panel, i) => (
            <MenuItem
              key={panel.label}
              icon={panel.icon}
              label={panel.label}
              description={panel.description}
              active={i === 0}
            />
          ))}
        </FloatingPanel>
        <InfoPopover f={f} />
      </div>
    </Stage>
  );
}

/** The settings dialog: its grouped rail and the Appearance page. */
function PagedDialog({ f }: { f: Fixtures }) {
  const s = f.copy.settings;
  const groups = [
    {
      label: s.groupPersonal,
      pages: [s.pages.profile, s.pages.general, s.pages.appearance, s.pages.account],
    },
    { label: s.groupServer, pages: [s.pages.proxy, s.pages.uploads] },
  ];
  return (
    <Modal className="flex h-[28rem] w-full max-w-3xl">
      <nav className="grid w-44 shrink-0 content-start gap-4 border-r border-line p-3">
        {groups.map((group) => (
          <div key={group.label} className="grid gap-px">
            <p className="ui-eyebrow px-2 pb-1 text-xs font-(--ui-weight-medium) text-fg-muted">
              {group.label}
            </p>
            {group.pages.map((page) => (
              <span
                key={page}
                className={`rounded-md px-2 py-1.5 text-sm ${
                  page === s.pages.appearance
                    ? "bg-accent-muted font-(--ui-weight-medium) text-fg"
                    : "text-fg-muted"
                }`}
              >
                {page}
              </span>
            ))}
          </div>
        ))}
      </nav>
      <div className="min-w-0 flex-1 px-6 py-4">
        <p className="pb-2 text-base font-(--ui-weight-medium) text-fg">{s.pages.appearance}</p>
        <div className="divide-y divide-line-muted">
          <PrefRow
            label={s.theme}
            control={<Segmented options={[s.light, s.dark, s.system]} value={2} />}
          />
          <PrefRow
            label={s.fontSize}
            control={
              <Segmented options={[s.fontSizes.sm, s.fontSizes.md, s.fontSizes.lg]} value={2} />
            }
          />
          <PrefRow label={s.launcher} control={<Switch on />} />
        </div>
      </div>
    </Modal>
  );
}

function Dialogs({ f }: { f: Fixtures }) {
  const c = LOCAL[f.lang].confirm;
  return (
    <Stage f={f} dim className="items-center justify-center">
      <PagedDialog f={f} />
      <div className="absolute inset-0 flex items-center justify-center bg-[var(--ui-overlay-backdrop)] p-6">
        <Modal
          className="w-full max-w-sm"
          title={c.title}
          description={c.body}
          footer={
            <>
              <Button variant="secondary">{c.cancel}</Button>
              <Button variant="danger">{c.discard}</Button>
            </>
          }
        />
      </div>
    </Stage>
  );
}

function DrawerPanel({ f }: { f: Fixtures }) {
  const d = LOCAL[f.lang].drawer;
  const file = f.trace.files[f.trace.activeFile]!;
  const turn = f.trace.turns[0]!;
  const [written, size, events, model] = d.facts;
  return (
    <aside className="absolute inset-y-0 right-0 flex w-96 flex-col border-l border-line bg-overlay shadow-xl">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <p className="min-w-0 flex-1 truncate text-base font-(--ui-weight-medium) text-fg">
          {d.title}
        </p>
        <IconButton label={f.copy.dock.close} icon="cross" size="sm" />
      </div>
      <div className="grid min-h-0 flex-1 content-start gap-6 overflow-hidden p-4">
        <KeyValue
          columns={2}
          items={[
            { label: written, value: file.dateIso, mono: true },
            { label: size, value: bytes(file.sizeBytes), mono: true },
            { label: events, value: String(turn.events.length), mono: true },
            { label: model, value: f.session.model.modelId, mono: true },
          ]}
        />
        <div className="grid gap-1">
          <p className="text-xs text-fg-muted">{d.eventsLabel}</p>
          {turn.events.slice(-5).map((event) => (
            <p
              key={event.time}
              className="flex items-center gap-2 border-t border-line-muted py-1.5 text-xs"
            >
              <span className="font-mono tabular-nums text-fg-subtle">
                {event.time.slice(0, 8)}
              </span>
              <span className="font-mono text-fg">{event.payloadType}</span>
              <span className="min-w-0 flex-1 truncate text-fg-muted">{event.summary}</span>
            </p>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
        <Button variant="secondary">{d.delete}</Button>
        <Button variant="primary" leading={<GlyphIcon name="download" size={13} />}>
          {d.export}
        </Button>
      </div>
    </aside>
  );
}

function Drawer({ f }: { f: Fixtures }) {
  return (
    <Stage f={f} dim className="">
      <DrawerPanel f={f} />
    </Stage>
  );
}

function Toasts({ f }: { f: Fixtures }) {
  return (
    <Stage f={f} className="flex-col items-end gap-2">
      {LOCAL[f.lang].toasts.map((toast) => (
        <Toast
          key={toast.title}
          tone={toast.tone}
          title={toast.title}
          description={toast.body}
          action={toast.action ? <Link>{toast.action}</Link> : undefined}
        />
      ))}
    </Stage>
  );
}

function CommandPalette({ f }: { f: Fixtures }) {
  const p = LOCAL[f.lang].palette;
  let index = 0;
  return (
    <Modal className="w-full max-w-xl self-start">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <GlyphIcon name="search" size={16} className="text-fg-subtle" />
        <span className="min-w-0 flex-1 text-base text-fg">
          {p.query}
          <span aria-hidden className="ml-px inline-block h-5 w-px translate-y-1 bg-fg" />
        </span>
        <Kbd keys={["Esc"]} />
      </div>
      <div className="grid gap-2 p-2 [--radius-inner:max(var(--ui-radius-xs),calc(var(--ui-radius-lg)-0.5rem))]">
        {p.groups.map((group) => (
          <div key={group.label}>
            <p className="px-2 pb-1 pt-1.5 text-xs text-fg-muted">{group.label}</p>
            {group.items.map((item) => {
              const active = index++ === 0;
              return (
                <span
                  key={item.label}
                  className={`flex items-center gap-2 rounded-[var(--radius-inner)] px-2 py-1.5 text-sm text-fg ${active ? "bg-surface-muted" : ""}`}
                >
                  {item.agent ? (
                    <AgentTile
                      id={item.agent}
                      name={f.agents.find((a) => a.id === item.agent)?.name ?? item.agent}
                      size={16}
                    />
                  ) : (
                    item.icon && <GlyphIcon name={item.icon} size={15} className="text-fg-muted" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.hint && <span className="text-xs text-fg-subtle">{item.hint}</span>}
                  {item.keys && <Kbd keys={item.keys} />}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-xs text-fg-muted">
        <span className="flex items-center gap-1.5">
          <Kbd keys={["↑", "↓"]} />
          {p.hints[0]}
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd keys={["↵"]} />
          {p.hints[1]}
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd keys={["Esc"]} />
          {p.hints[2]}
        </span>
      </div>
    </Modal>
  );
}

function Palette({ f }: { f: Fixtures }) {
  return (
    <Stage f={f} dim className="justify-center pt-12">
      <CommandPalette f={f} />
    </Stage>
  );
}

const VARIANTS = {
  menu: Menus,
  dialog: Dialogs,
  drawer: Drawer,
  toasts: Toasts,
  palette: Palette,
} as const;

export const module = defineModule({
  id: "overlays",
  title: "Overlays",
  description:
    "What opens over the chat: a context menu, an info popover and a tooltip; a dialog; a drawer; the toast stack; the command palette.",
  width: "wide",
  variants: [
    { key: "menu", title: "Menu" },
    { key: "dialog", title: "Dialog" },
    { key: "drawer", title: "Drawer" },
    { key: "toasts", title: "Toasts" },
    { key: "palette", title: "Palette" },
  ],
  parts: [
    "overlays-modal",
    "overlays-confirm-modal",
    "overlays-paged-dialog",
    "overlays-drawer",
    "overlays-floating-panel",
    "overlays-menu",
    "overlays-dropdown",
    "overlays-portal-panel",
    "overlays-info-popover",
    "overlays-tooltip",
    "overlays-lightbox",
    "overlays-toaster",
    "navigation-command-palette",
  ],
  render: (variant, { lang }) => {
    const View = VARIANTS[variant as keyof typeof VARIANTS] ?? Menus;
    return <View f={fixturesFor(lang)} />;
  },
});
