/**
 * The shape of the gallery's mock dataset. One coherent story — the "Build Claude Code docs
 * expert" session the landing page's screenshots are captured from — told twice, once per
 * locale, with identical structure: the same ids, the same numbers, the same code; only prose
 * differs. Demos, the `/screens` compositions and the package tests all read from it, so a
 * component is always judged on the same, realistic content.
 *
 * These are presentational shapes, not wire types: they carry what a component is handed as
 * props (a tool's short alias, a run state, a settled duration), never a server response to be
 * interpreted. Timestamps are ISO 8601 so tests stay deterministic; durations are milliseconds.
 */

/** The two locales every fixture exists in. */
export const FIXTURE_LANGS = ["en", "zh"] as const;
export type FixtureLang = (typeof FIXTURE_LANGS)[number];

/** A step's run state — the vocabulary of the web app's `StatusIcon`. */
export type RunState = "running" | "waiting" | "done" | "failed" | "stopped";

// ---------------------------------------------------------------------------
// People and Agents
// ---------------------------------------------------------------------------

export interface FixtureUser {
  id: string;
  name: string;
  isAdmin: boolean;
}

export interface FixtureAgent {
  id: string;
  name: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

/** A file or a skill attached to a message (the composer's chip row, a user bubble's footer). */
export interface AttachmentChip {
  kind: "file" | "skill" | "agent" | "model";
  label: string;
  /** Line range of a file excerpt, e.g. `L12-40`. */
  lines?: string;
}

export interface UserMessageItem {
  kind: "user";
  id: string;
  text: string;
  atIso: string;
  attachments?: AttachmentChip[];
}

/** Assistant prose. `streaming` = still arriving: the renderer draws a caret after it. */
export interface AssistantTextItem {
  kind: "text";
  id: string;
  markdown: string;
  streaming?: boolean;
  atIso: string;
}

export interface ThinkingItem {
  kind: "thinking";
  id: string;
  text: string;
  state: RunState;
  /** Settled duration; absent while running. */
  durationMs?: number;
  /** Seconds elapsed so far, for a running step's live clock. */
  elapsedMs?: number;
}

/** The built-in tools the fixtures exercise, by the name the model calls them. */
export type FixtureToolName =
  | "exec_command"
  | "input_command"
  | "read_file"
  | "edit_file"
  | "write_file"
  | "run_subagent"
  | "input_subagent";

/** One line of a unified diff, numbered on the side(s) it exists on. */
export interface DiffLine {
  kind: "context" | "add" | "del";
  text: string;
  oldNo?: number;
  newNo?: number;
}

export interface DiffHunk {
  /** `@@ -12,7 +12,14 @@` */
  header: string;
  lines: DiffLine[];
}

/** A file change as a diff viewer receives it. */
export interface FileDiff {
  path: string;
  language: string;
  added: number;
  removed: number;
  hunks: DiffHunk[];
}

/** The child conversation a `run_subagent` call spawned, as its shortcut chip shows it. */
export interface SubagentRef {
  sessionId: string;
  /** The short id suffix the chip prints. */
  shortId: string;
  agentId: string;
  agentName: string;
  running: boolean;
  pendingApproval: boolean;
  /** One-line summary of what it was asked to do (its `description` argument). */
  task: string;
  /** The child conversation so far, as the subagents panel renders it. */
  transcript: ChatItem[];
}

/** How an approval was decided, as the tool row's status label spells it. */
export interface ApprovalDecision {
  verdict: "allow" | "deny";
  source: "auto" | "manual" | "policy";
}

export interface ToolCallItem {
  kind: "tool_call";
  id: string;
  toolCallId: string;
  name: FixtureToolName;
  /** The short name the card shows while tool aliases are on (`exec`, `read`, `edit`, …). */
  alias: string;
  /** The model-written `description`, or a shortened file path for the file tools. */
  subtitle?: string;
  state: RunState;
  /** Generation + execution, excluding any approval wait. Absent while running. */
  durationMs?: number;
  /** Live clock of a running call. */
  elapsedMs?: number;
  /** The raw arguments, pretty-printed JSON. */
  argumentsJson: string;
  /** Tool output (ANSI already stripped). */
  output?: string;
  /** Output is still arriving: the renderer draws a caret after it. */
  outputStreaming?: boolean;
  decision?: ApprovalDecision;
  /** Present on `edit_file` / `write_file`: the change as a diff viewer shows it. */
  diff?: FileDiff;
  /** Present on `run_subagent`. */
  subagent?: SubagentRef;
  /** The call was launched with `run_in_background` or moved there. */
  background?: boolean;
}

/** Everything a transcript renders, in stream order. */
export type ChatItem = UserMessageItem | AssistantTextItem | ThinkingItem | ToolCallItem;

/** Per-turn footer numbers (the stats line under an assistant reply). */
export interface TurnStats {
  toolCalls: number;
  inputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  costUsd: number;
  elapsedMs: number;
  outputTps: number;
}

export interface ChatTurn {
  index: number;
  running: boolean;
  items: ChatItem[];
  /** Absent while the turn runs. */
  stats?: TurnStats;
}

export interface ChatSession {
  id: string;
  title: string;
  agentId: string;
  /** Provider + model id, the pair a model reference always is. */
  model: { provider: string; modelId: string };
  workspace: string;
  createdAtIso: string;
  running: boolean;
  /** The chat header's three session totals. */
  totals: { tokens: number; costUsd: number; elapsedMs: number };
  /** Context gauge: tokens in the current context against the model's window. */
  context: { tokens: number; window: number };
  /** Composer state: the chips waiting to be sent and the toolbar's current picks. */
  composer: {
    draft: string;
    chips: AttachmentChip[];
    approvalMode: "allow-all" | "read-only" | "deny-all" | "always-ask";
    thinkingLevel: "low" | "medium" | "high";
  };
  turns: ChatTurn[];
}

/** A row in the sidebar's session list. */
export interface SessionListItem {
  id: string;
  title: string;
  agentId: string;
  /** Relative time the row prints (`now`, `2h`, `yesterday`); the ISO time it was formatted from. */
  timeLabel: string;
  updatedAtIso: string;
  running?: boolean;
  pinned?: boolean;
  scheduled?: boolean;
  unread?: boolean;
}

export interface SessionGroup {
  key: string;
  label: string;
  items: SessionListItem[];
}

// ---------------------------------------------------------------------------
// Trace
// ---------------------------------------------------------------------------

/** Timeline segment kinds, in the legend's order. */
export type TraceSegmentKind = "thinking" | "text" | "toolgen" | "approvalWait" | "exec" | "other";

export interface TraceSegment {
  kind: TraceSegmentKind;
  startMs: number;
  endMs: number;
}

/** One row of the execution timeline: the model lane, then one lane per tool. */
export interface TraceLane {
  name: string;
  segments: TraceSegment[];
}

/** One event row of a Trace file. */
export interface TraceEvent {
  /** `HH:MM:SS.mmm` as the row prints it. */
  time: string;
  atIso: string;
  messageType: "session_meta" | "model_msg" | "event_msg";
  /** The payload's `type` (`tool_call`, `request_end`, …) — the row's badge. */
  payloadType: string;
  /** The one-line summary after the badge. */
  summary: string;
  stopReason?: string;
  /** From a child Session. */
  fromSubagent?: boolean;
}

export interface TraceTurn {
  index: number;
  toolCalls: number;
  inputTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  costUsd: number;
  elapsedMs: number;
  outputTps: number;
  /** The timeline's full span. */
  spanMs: number;
  lanes: TraceLane[];
  events: TraceEvent[];
}

export interface TraceFileRef {
  /** `#001` */
  label: string;
  dateIso: string;
  sizeBytes: number;
}

export interface TraceFixture {
  files: TraceFileRef[];
  /** Index into `files` of the file shown. */
  activeFile: number;
  overall: {
    turns: number;
    toolCalls: number;
    compactions: number;
    inputTokens: number;
    cacheReadTokens: number;
    outputTokens: number;
    costUsd: number;
    elapsedMs: number;
    outputTps: number;
  };
  turns: TraceTurn[];
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

/** A catalog row, trimmed to what a model picker and the model library show. */
export interface ModelFixture {
  /** Provider group id from the built-in catalog. */
  provider: string;
  providerLabel: string;
  modelId: string;
  displayName: string;
  contextWindow: number;
  supportsVision: boolean;
  /** USD per million tokens, the catalog's `usd_per_mtok` (CNY rows already converted at 7). */
  pricing: { cacheRead: number; cacheWrite: number; output: number };
  /** Short note the picker prints under the name. */
  note?: string;
  isDefault?: boolean;
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export interface FileNode {
  name: string;
  /** Workspace-relative, `/`-separated. */
  path: string;
  kind: "dir" | "file";
  sizeBytes?: number;
  modifiedIso?: string;
  /** Changed by this session's tool calls. */
  change?: "added" | "modified";
  children?: FileNode[];
}

export interface FilePreview {
  path: string;
  language: string;
  content: string;
}

// ---------------------------------------------------------------------------
// Company mode
// ---------------------------------------------------------------------------

export type EmployeeState = "running" | "idle" | "paused";

export interface EmployeeFixture {
  agentId: string;
  name: string;
  title: string;
  reportsTo: string | null;
  state: EmployeeState;
  /** Monthly budget in USD for this employee and every subordinate; absent = unbounded. */
  budgetUsd?: number;
  spendUsd: number;
}

export type TicketStatus = "proposed" | "in_progress" | "review" | "done" | "rejected";
export type TicketPriority = "P0" | "P1" | "P2";

export interface TicketFixture {
  /** `2026-09-12-citation-links` — the date prefix plus a slug. */
  ticketId: string;
  title: string;
  status: TicketStatus;
  ownerAgentId: string;
  priority: TicketPriority;
  dueIso?: string;
  /** Non-empty = blocked, with the reason. */
  blocked?: string;
  running: boolean;
  costUsd: number;
  sessionCount: number;
}

export type CalendarOutcome = "fired" | "queued" | "paused" | "missed" | "error";

export interface CalendarEventFixture {
  /** The event file's name; unique per employee. */
  name: string;
  agentId: string;
  title: string;
  prompt: string;
  startAtIso: string;
  /** How long the calendar draws the block. */
  durationMin: number;
  /** Raw fixed interval (`1d`, `7d`); absent = a one-off event. */
  period?: string;
  enabled: boolean;
  nextFireAtIso?: string;
  lastOutcome?: CalendarOutcome;
}

export interface CompanyFixture {
  org: {
    id: string;
    name: string;
    mission: string;
    timezone: string;
    /** `yyyy-mm` spend against the CEO's budget. */
    spend: { period: string; costUsd: number; budgetUsd: number };
  };
  employees: EmployeeFixture[];
  tickets: TicketFixture[];
  /** The week the calendar opens on (a Monday, local date) and the events in it. */
  calendar: { weekStartIso: string; events: CalendarEventFixture[] };
}

// ---------------------------------------------------------------------------
// App copy and type specimens
// ---------------------------------------------------------------------------

/**
 * The product chrome the screens print, copied from the web app's dictionaries so a mock-up
 * reads like the app. Not a second dictionary for the app: it exists for the gallery only, and
 * components receive their copy as props.
 */
export interface AppCopy {
  appName: string;
  nav: {
    newChat: string;
    agents: string;
    plugins: string;
    models: string;
    usage: string;
    benchmark: string;
    traces: string;
    files: string;
    sessions: string;
    collapseSidebar: string;
    search: string;
  };
  chat: {
    running: string;
    done: string;
    steps: (n: number) => string;
    thinking: string;
    approvalWaiting: string;
    decisionAllow: string;
    decisionAuto: string;
    sendToBackground: string;
    subagent: string;
    /** The short names tool cards print while tool aliases are on. */
    toolAliases: Record<FixtureToolName, string>;
    backgroundCall: string;
    inputPlaceholder: string;
    slashHint: string;
    approvalModes: Record<"allow-all" | "read-only" | "deny-all" | "always-ask", string>;
    thinkingLevels: Record<"low" | "medium" | "high", string>;
    skills: string;
    stop: string;
    copy: string;
    fork: string;
    approve: string;
    deny: string;
  };
  dock: {
    subagents: (n: number) => string;
    topology: string;
    nodeRunning: string;
    nodeDone: string;
    openAsSession: string;
    newPanel: string;
    close: string;
  };
  traces: {
    filesTitle: string;
    export: string;
    overall: string;
    turns: string;
    toolCalls: string;
    compactions: string;
    inputTokens: string;
    cacheHits: string;
    outputTokens: string;
    cost: string;
    elapsed: string;
    outputTps: string;
    turn: (n: number) => string;
    timeline: string;
    modelLane: string;
    legend: Record<TraceSegmentKind, string>;
    zoom: string;
    messages: string;
  };
  settings: {
    title: string;
    groupPersonal: string;
    groupServer: string;
    pages: Record<
      "profile" | "general" | "appearance" | "account" | "proxy" | "uploads" | "company" | "users",
      string
    >;
    theme: string;
    themeInfo: string;
    light: string;
    dark: string;
    system: string;
    terminalTheme: string;
    terminalThemeInfo: string;
    followApp: string;
    fontSize: string;
    fontSizeInfo: string;
    fontSizes: Record<"sm" | "md" | "lg", string>;
    accent: string;
    accentInfo: string;
    launcher: string;
    launcherInfo: string;
    toolAliases: string;
    toolAliasesInfo: string;
    moreInfo: string;
    close: string;
  };
  auth: {
    username: string;
    password: string;
    signIn: string;
    showPassword: string;
    defaultAdminNote: string;
    forgotAdminNote: string;
    language: string;
    langZh: string;
    langEn: string;
  };
}

/**
 * Specimen text for the `/fonts` page and the Typography foundation: mixed CJK and Latin on
 * purpose, with code, numbers and punctuation, so a family's fallback seams show.
 */
export interface TypeSpecimens {
  /** A short display line (hero / h1). */
  display: string;
  /** A section heading. */
  heading: string;
  /** A body paragraph: prose with inline product names, numbers and a path. */
  paragraph: string;
  /** A dense UI line: labels, counts, a price, a duration. */
  ui: string;
  /** A caption / hint line. */
  caption: string;
  /** A code block exercising the mono face: identifiers, strings with CJK, numbers, operators. */
  code: string;
  /** Tabular numerals and units, to judge figure widths. */
  numerals: string;
}

/** The whole dataset for one locale. */
export interface Fixtures {
  lang: FixtureLang;
  copy: AppCopy;
  user: FixtureUser;
  agents: FixtureAgent[];
  session: ChatSession;
  sessionGroups: SessionGroup[];
  trace: TraceFixture;
  models: ModelFixture[];
  fileTree: FileNode;
  filePreview: FilePreview;
  company: CompanyFixture;
  specimens: TypeSpecimens;
}
