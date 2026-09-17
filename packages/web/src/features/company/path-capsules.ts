/**
 * Which stretches of a ticket's text are data paths, for the folder capsules the ticket dialog
 * draws over them (pure, unit tested). Employees write full paths into tickets on purpose — the
 * next session reads them to find the work — so a ticket is full of lines like
 * `<app_data_dir>/organizations/co_lab/workspace/experiments/dep-eval/`. The stored text never
 * changes; only what a person reads does.
 *
 * What counts as a path:
 *
 * - **Where it starts.** The `<app_data_dir>` placeholder followed by `/`, or an absolute path
 *   (`/…`, `~/…`, `C:/…`) that runs through this Project's data directory — a
 *   `/<projectId>/organizations/` or `/<projectId>/agents/` stretch, the real-path spelling of
 *   the same place. Any other absolute path is left alone: in prose `/api/v1/tickets` is a
 *   route, not a folder, and nothing but the data directory tells the two apart. This server's
 *   own routes share that stretch (`/api/projects/<projectId>/organizations/…`), so a path that
 *   starts at `/api/` is a route too.
 * - **What it is made of, in prose.** Segments of ASCII letters, digits and `._~+=@%-`, plus
 *   whole `<placeholder>` segments, separated by `/`. The path stops at anything else, so the
 *   punctuation and CJK around it stay outside (`见<app_data_dir>/…/dep-eval/。`), and a
 *   trailing `.` ends a sentence rather than a file name. File names are ASCII by the handbook's
 *   convention; a space ends a path, since prose gives no way to tell where it would stop.
 * - **Where it runs on past that.** A path whose next segment is not ASCII
 *   (`…/workspace/调研报告.md`, `…/workspace/实验/`) stays text: cut at the last ASCII
 *   character, its capsule would name and copy the folder above the one written. The run of
 *   letters after it counts as a segment when it goes on to a `/` or a file extension;
 *   otherwise it is the sentence resuming (`…/handbook/里有说明`), and the path keeps its capsule.
 * - **In code.** An inline code span that holds one path and nothing else is one path, taken
 *   verbatim — the backticks already say where it ends, so any non-space character may appear
 *   in it. A code span holding a command, and every fenced block, stays code.
 * - **Folder or file.** A trailing `/` is a folder; a last segment with an extension
 *   (`report.md`, `run.v2.json`) is a file; anything else is a folder, since employees name
 *   directories bare far more often than files.
 */

export interface PathScope {
  /** The Project the ticket belongs to: the directory an absolute path must pass through. */
  projectId: string;
}

export type PathPiece = { kind: "text"; text: string } | { kind: "path"; path: string };

const PLACEHOLDER_ROOT = "<app_data_dir>";

/** One segment of a prose path: plain characters, or a whole `<placeholder>`. */
const PROSE_SEGMENT = String.raw`(?:<[a-z][a-z0-9_]*>|[A-Za-z0-9._~+=@%-])+`;

/**
 * A candidate path in prose: a root, then `/segment` repeated, then an optional trailing `/`.
 * The lookbehinds keep a path from starting in the middle of a word; a bare `/`, `~` or drive
 * root additionally may not follow a path character or a `:`, which is what keeps a URL
 * (`https://…`) and the inside of another path from reading as a root. The placeholder cannot
 * be mistaken for either, so `Output:<app_data_dir>/…` still starts a path.
 */
const PROSE_PATH = new RegExp(
  String.raw`(?:(?<![A-Za-z0-9_])<app_data_dir>|(?<![A-Za-z0-9._~+=@%/\\:-])(?:~|[A-Za-z]:)?)(?:/${PROSE_SEGMENT})+/?`,
  "g",
);

/** The whole of an inline code span, as one path: the same roots, any non-space segment. */
const CODE_PATH = /^(?:<app_data_dir>|~|[A-Za-z]:)?(?:\/[^\s/]+)+\/?$/;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whether a well-formed candidate starts at a root this module capsules. */
function rooted(path: string, scope: PathScope): boolean {
  if (path.startsWith(`${PLACEHOLDER_ROOT}/`)) return true;
  if (path.startsWith("/api/")) return false;
  const marker = new RegExp(`/${escapeRe(scope.projectId)}/(?:organizations|agents)(?:/|$)`);
  return scope.projectId !== "" && marker.test(path);
}

/** Text right after a prose path that carries it on through a non-ASCII segment. */
const RUNS_ON = /^[\p{L}\p{N}_-]+(?:\/|\.[A-Za-z0-9])/u;

/** Drops the sentence's full stop(s) from a prose path; a trailing `/` survives them. */
function trimTrailing(path: string): string {
  return path.replace(/\.+$/, "");
}

/** Whether a path names something past its root: `<app_data_dir>/` alone is not a capsule. */
function hasSegment(path: string): boolean {
  return pathLabel(path) !== "";
}

/** Splits prose into text and path pieces, in order. Adjacent text is merged; empty text is never emitted. */
export function splitPaths(text: string, scope: PathScope): PathPiece[] {
  const out: PathPiece[] = [];
  let last = 0;
  const pushText = (value: string) => {
    if (value === "") return;
    const prev = out[out.length - 1];
    if (prev?.kind === "text") prev.text += value;
    else out.push({ kind: "text", text: value });
  };
  for (const m of text.matchAll(PROSE_PATH)) {
    const path = trimTrailing(m[0]);
    if (!rooted(path, scope) || !hasSegment(path)) continue;
    if (RUNS_ON.test(text.slice(m.index + m[0].length))) continue;
    pushText(text.slice(last, m.index));
    out.push({ kind: "path", path });
    last = m.index + path.length;
  }
  pushText(text.slice(last));
  return out;
}

/** The path an inline code span holds, when it holds exactly one; null for anything else. */
export function codePath(code: string, scope: PathScope): string | null {
  const value = code.trim();
  if (!CODE_PATH.test(value) || !rooted(value, scope) || !hasSegment(value)) return null;
  return value;
}

/**
 * The capsule's label: the last segment, without the trailing `/`. Empty for the placeholder
 * alone — the one root a rooted candidate can stop at, since any other root has to run on
 * through the Project's data directory.
 */
export function pathLabel(path: string): string {
  const body = path.replace(/\/+$/, "");
  const name = body.slice(body.lastIndexOf("/") + 1);
  return name === PLACEHOLDER_ROOT ? "" : name;
}

/** Folder or file, by the rule in this module's comment. */
export function pathKind(path: string): "folder" | "file" {
  if (path.endsWith("/")) return "folder";
  return /^.+\.[A-Za-z0-9]{1,10}$/.test(pathLabel(path)) ? "file" : "folder";
}
