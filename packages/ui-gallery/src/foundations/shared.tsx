/**
 * Building blocks every Foundations page shares. Pages render INSIDE the preview, so they are
 * themed: documentation text reads the theme's tokens with a plain fallback (a page stays legible
 * while a theme is incomplete), while every specimen and swatch reads the bare token — an
 * undefined token must look broken, and its value cell says "unset".
 */
import { TOKEN_GROUPS } from "@prismshadow/penguin-ui";
import type { TokenGroupId } from "@prismshadow/penguin-ui";
import type { ReactNode } from "react";
import { useCopy } from "../chrome/copy";
import { TIER_PX } from "../lib/themes";
import type { TokenValues } from "../lib/token-probe";
import { useGallery } from "../state";

/** The active theme × mode's resolved tokens (empty until the first probe). */
export function useActiveTokens(): TokenValues {
  const { tokens, state, mode } = useGallery();
  return tokens?.[state.theme][mode] ?? {};
}

export function groupNames(id: TokenGroupId): readonly string[] {
  return TOKEN_GROUPS.find((group) => group.id === id)?.names ?? [];
}

export function useGroupTitle(): (id: TokenGroupId) => string {
  const { S } = useGallery();
  return (id) =>
    S.catalog.tokenGroups[id] ?? TOKEN_GROUPS.find((group) => group.id === id)?.title ?? id;
}

/** `1.25rem` → `22.5px` at the active tier; anything else as it is. */
export function useRemToPx(): (value: string) => string {
  const { state } = useGallery();
  const root = TIER_PX[state.tier];
  return (value) => {
    const rem = /^(-?\d*\.?\d+)rem$/.exec(value.trim())?.[1];
    if (rem === undefined) return value;
    const px = Number(rem) * root;
    return `${Number.isInteger(px) ? px : px.toFixed(1)}px`;
  };
}

export function SubHeading({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="gf-subhead">
      <h3>{children}</h3>
      {aside !== undefined && <span className="gf-aside">{aside}</span>}
    </div>
  );
}

/** A token name or value that copies itself on click; the copy glyph shows on hover. */
export function Copyable({
  text,
  className = "",
  title,
}: {
  text: string;
  className?: string;
  title?: string;
}) {
  const { S } = useGallery();
  const [copied, copy] = useCopy();
  return (
    <button
      type="button"
      className={`gf-copy ${className}`}
      title={title ?? text}
      data-copied={copied !== null || undefined}
      onClick={() => copy(text, text)}
    >
      <span className="gf-copy-text">{text}</span>
      <span className="gf-copy-hint" aria-live="polite">
        {copied !== null ? S.section.copied : "⧉"}
      </span>
    </button>
  );
}

/** A resolved value, or the "unset" marker. */
export function TokenValue({
  value,
  className = "",
}: {
  value: string | undefined;
  className?: string;
}) {
  const { S } = useGallery();
  if (!value) return <span className={`gf-unset ${className}`}>{S.section.unset}</span>;
  return <Copyable text={value} className={`gf-value ${className}`} />;
}

/** A name/value table for a token list — the fallback view and the tail of several pages. */
export function TokenTable({ names, values }: { names: readonly string[]; values: TokenValues }) {
  const toPx = useRemToPx();
  return (
    <div className="gf-token-table" role="table">
      {names.map((name) => {
        const value = values[name];
        const px = value ? toPx(value) : "";
        return (
          <div key={name} className="gf-token-row" role="row">
            <span role="cell">
              <Copyable text={name} className="gf-name" />
            </span>
            <span role="cell">
              <TokenValue value={value} />
              {value && px !== value && <span className="gf-px">{px}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function Resolving() {
  const { S } = useGallery();
  return <p className="gf-muted">{S.intro.resolving}</p>;
}
