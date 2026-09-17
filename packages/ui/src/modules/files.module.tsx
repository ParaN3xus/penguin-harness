/**
 * Files & trees: the Workspace's Files panel.
 *
 * - Tree: the tree pane — search, refresh and upload in its header, folders open to the files this
 *   session changed (marked added or modified), the selected file — beside an empty preview;
 * - Preview: the same tree beside `src/rag.ts` previewed as source, under its breadcrumbs and
 *   actions;
 * - Drop: files dragged over the preview, the drop overlay naming the target folder.
 *
 * Static stand-ins for W7's `TreePane`, `FileTree`, `PreviewPane`, `Breadcrumbs`, `DropOverlay` and
 * `ResizeHandle`.
 */
import type { ReactNode } from "react";
import { fixturesFor } from "../fixtures";
import type { FileNode, FixtureLang, Fixtures } from "../fixtures";
import { defineModule } from "../module";
import { bytes } from "../screens/format";
import { Breadcrumbs, EmptyState, GlyphIcon, IconButton, SearchInput } from "./parts";

/** Local fixture (K3): the panel's labels. The tree and the preview come from `fixtures`. */
const COPY: Readonly<
  Record<
    FixtureLang,
    {
      title: string;
      search: string;
      refresh: string;
      upload: string;
      added: string;
      modified: string;
      emptyTitle: string;
      emptyBody: string;
      copyPath: string;
      download: string;
      lines: (n: number) => string;
      dropTitle: (folder: string) => string;
      dropBody: string;
    }
  >
> = {
  en: {
    title: "Files",
    search: "Search files",
    refresh: "Refresh",
    upload: "Upload files",
    added: "Added in this session",
    modified: "Modified in this session",
    emptyTitle: "No file selected",
    emptyBody: "Pick a file in the tree to preview it here.",
    copyPath: "Copy path",
    download: "Download",
    lines: (n) => `${n} lines`,
    dropTitle: (folder) => `Drop to upload to ${folder}`,
    dropBody: "Files over 50 MB are skipped.",
  },
  zh: {
    title: "文件",
    search: "搜索文件",
    refresh: "刷新",
    upload: "上传文件",
    added: "本次会话新增",
    modified: "本次会话修改",
    emptyTitle: "未选择文件",
    emptyBody: "在左侧目录树中选择一个文件即可在此预览。",
    copyPath: "复制路径",
    download: "下载",
    lines: (n) => `${n} 行`,
    dropTitle: (folder) => `松开即可上传到 ${folder}`,
    dropBody: "超过 50 MB 的文件会被跳过。",
  },
};

/** Folders shown open: the ones leading to this session's changes. */
const OPEN = new Set(["claude-code-expert", "claude-code-expert/src", "claude-code-expert/test"]);

function TreeRow({ node, depth, f }: { node: FileNode; depth: number; f: Fixtures }) {
  const local = COPY[f.lang];
  const open = node.kind === "dir" && OPEN.has(node.path);
  const selected = node.path === f.filePreview.path;
  return (
    <>
      <li
        className={`flex h-7 items-center gap-1.5 rounded-sm pr-2 text-sm ${selected ? "bg-accent-muted text-fg" : "text-fg"}`}
        style={{ paddingLeft: `${0.5 + depth * 0.875}rem` }}
      >
        {node.kind === "dir" ? (
          <GlyphIcon
            name={open ? "chevronDown" : "chevronRight"}
            size={12}
            className="text-fg-subtle"
          />
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <GlyphIcon
          name={node.kind === "dir" ? "folder" : "file"}
          size={14}
          className="text-fg-muted"
        />
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        {node.change && (
          <span
            title={node.change === "added" ? local.added : local.modified}
            className={`font-mono text-xs ${node.change === "added" ? "text-tone-success-fg" : "text-tone-attention-fg"}`}
          >
            {node.change === "added" ? "A" : "M"}
          </span>
        )}
        {node.kind === "file" && node.sizeBytes !== undefined && (
          <span className="shrink-0 text-xs tabular-nums text-fg-subtle">
            {bytes(node.sizeBytes)}
          </span>
        )}
      </li>
      {open &&
        node.children?.map((child) => (
          <TreeRow key={child.path} node={child} depth={depth + 1} f={f} />
        ))}
    </>
  );
}

function TreePane({ f }: { f: Fixtures }) {
  const local = COPY[f.lang];
  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-line">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2 border-b border-line p-2">
        <div className="flex items-center gap-1 pl-1">
          <span className="min-w-0 flex-1 text-sm font-(--ui-weight-medium) text-fg">
            {local.title}
          </span>
          <IconButton label={local.refresh} icon="refresh" size="sm" />
          <IconButton label={local.upload} icon="upload" size="sm" />
        </div>
        <SearchInput placeholder={local.search} />
      </div>
      <ul className="min-h-0 flex-1 overflow-hidden p-1">
        <TreeRow node={f.fileTree} depth={0} f={f} />
      </ul>
    </aside>
  );
}

function PreviewPane({ f }: { f: Fixtures }) {
  const local = COPY[f.lang];
  const lines = f.filePreview.content.split("\n");
  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <Breadcrumbs items={f.filePreview.path.split("/")} />
        <span className="shrink-0 text-xs tabular-nums text-fg-subtle">
          {local.lines(lines.length)}
        </span>
        <span className="min-w-0 flex-1" />
        <IconButton label={local.copyPath} icon="copy" size="sm" />
        <IconButton label={local.download} icon="download" size="sm" />
      </div>
      <pre className="min-h-0 flex-1 overflow-hidden bg-[var(--ui-code-bg)] py-2 font-mono text-xs leading-relaxed text-fg">
        {lines.slice(0, 26).map((line, i) => (
          <span key={i} className="flex">
            <span className="w-10 shrink-0 select-none pr-3 text-right text-[var(--ui-code-gutter)]">
              {i + 1}
            </span>
            <span className="whitespace-pre">{line}</span>
          </span>
        ))}
      </pre>
    </section>
  );
}

function Panel({ f, children }: { f: Fixtures; children: ReactNode }) {
  return (
    <div className="flex h-[34rem] overflow-hidden rounded-lg border border-line bg-canvas">
      <TreePane f={f} />
      {children}
    </div>
  );
}

function Tree({ f }: { f: Fixtures }) {
  const local = COPY[f.lang];
  return (
    <Panel f={f}>
      <div className="flex min-w-0 flex-1 items-center justify-center p-6">
        <EmptyState variant="slot" title={local.emptyTitle} description={local.emptyBody} />
      </div>
    </Panel>
  );
}

function Preview({ f }: { f: Fixtures }) {
  return (
    <Panel f={f}>
      <PreviewPane f={f} />
    </Panel>
  );
}

/** The drop target over a pane: an info-toned dashed outline and the folder it uploads to. */
function DropOverlay({ folder, f }: { folder: string; f: Fixtures }) {
  const local = COPY[f.lang];
  return (
    <div className="absolute inset-0 flex bg-[color-mix(in_oklab,var(--ui-canvas)_82%,transparent)] p-4">
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-tone-info-emphasis text-center">
        <GlyphIcon name="upload" size={24} className="text-tone-info-fg" />
        <p className="text-sm font-(--ui-weight-medium) text-fg">{local.dropTitle(folder)}</p>
        <p className="text-xs text-fg-muted">{local.dropBody}</p>
      </div>
    </div>
  );
}

function Drop({ f }: { f: Fixtures }) {
  return (
    <Panel f={f}>
      <div className="relative flex min-w-0 flex-1">
        <PreviewPane f={f} />
        <DropOverlay folder="claude-code-expert/src" f={f} />
      </div>
    </Panel>
  );
}

const VARIANTS = { tree: Tree, preview: Preview, drop: Drop } as const;

export const module = defineModule({
  id: "files",
  title: "Files & trees",
  description:
    "The Workspace's Files panel: the tree with search, refresh and upload; a file preview with breadcrumbs; the drop overlay.",
  width: "wide",
  variants: [
    { key: "tree", title: "Tree" },
    { key: "preview", title: "Preview" },
    { key: "drop", title: "Drop" },
  ],
  parts: [
    "files-file-tree",
    "files-file-browser",
    "files-tree-pane",
    "files-preview-pane",
    "files-drop-overlay",
    "files-workspace-file-menu",
    "content-workspace-file-editor",
    "layout-resize-handle",
    "navigation-breadcrumbs",
    "forms-search-input",
  ],
  render: (variant, { lang }) => {
    const View = VARIANTS[variant as keyof typeof VARIANTS] ?? Tree;
    return <View f={fixturesFor(lang)} />;
  },
});
