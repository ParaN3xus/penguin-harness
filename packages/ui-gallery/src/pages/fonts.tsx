/**
 * `/fonts` — what the package's `fonts/` ships: each theme's families (resolved from its tokens)
 * set in an en and a zh paragraph at the three root sizes, every `@font-face` the page's styles
 * declare with its load status, and the licence texts mirrored under `fonts/LICENSES/`.
 */
import { THEME_IDS } from "@prismshadow/penguin-ui";
import { useEffect, useState } from "react";
import { ModeSwitch, ViewControls } from "../chrome/rail";
import { ChromeIcon } from "../chrome/icons";
import { SPECIMENS } from "../foundations/specimens";
import { BASE } from "../lib/location";
import { THEME_NAMES, TIER_PX } from "../lib/themes";
import { formatGalleryQuery } from "../lib/url-state";
import { FONT_LICENSES, repoPath } from "../registry";
import { useGallery } from "../state";

const ROLES = ["--ui-font-sans", "--ui-font-mono", "--ui-font-display", "--ui-font-cjk"] as const;

interface FaceSummary {
  family: string;
  count: number;
  weights: string[];
  styles: string[];
  status: Record<FontFaceLoadStatus, number>;
}

function useFaces(): FaceSummary[] {
  const [faces, setFaces] = useState<FaceSummary[]>([]);
  useEffect(() => {
    const read = () => {
      const byFamily = new Map<string, FaceSummary>();
      document.fonts.forEach((face) => {
        const family = face.family.replace(/^["']|["']$/g, "");
        const summary = byFamily.get(family) ?? {
          family,
          count: 0,
          weights: [],
          styles: [],
          status: { unloaded: 0, loading: 0, loaded: 0, error: 0 },
        };
        summary.count++;
        if (!summary.weights.includes(face.weight)) summary.weights.push(face.weight);
        if (!summary.styles.includes(face.style)) summary.styles.push(face.style);
        summary.status[face.status]++;
        byFamily.set(family, summary);
      });
      setFaces([...byFamily.values()].sort((a, b) => a.family.localeCompare(b.family)));
    };
    read();
    document.fonts.addEventListener("loadingdone", read);
    void document.fonts.ready.then(read);
    return () => document.fonts.removeEventListener("loadingdone", read);
  }, []);
  return faces;
}

function Licence({ path }: { path: string }) {
  const [text, setText] = useState<string | null>(null);
  return (
    <details
      className="g-licence"
      onToggle={(event) => {
        const load = FONT_LICENSES[path];
        if ((event.target as HTMLDetailsElement).open && text === null && load)
          void load().then(setText);
      }}
    >
      <summary>{repoPath(path)}</summary>
      <pre className="g-code">{text ?? "…"}</pre>
    </details>
  );
}

export function FontsPage() {
  const { S, state, mode, tokens } = useGallery();
  const faces = useFaces();
  const licences = Object.keys(FONT_LICENSES).sort();
  const query = formatGalleryQuery({ ...state, variants: {} });

  useEffect(() => {
    if (!tokens) return;
    void document.fonts.ready.then(() => {
      document.documentElement.dataset.galleryReady = "1";
    });
  }, [tokens]);

  return (
    <div className="g-app">
      <div className="g-page g-chrome">
        <header className="g-page-head">
          <a className="g-icon-button" href={`${BASE}/${query}`} title={S.screens.back}>
            <ChromeIcon name="back" />
          </a>
          <h1>{S.fonts.title}</h1>
          <span className="g-page-head-controls">
            <ViewControls compact />
            <ModeSwitch />
          </span>
        </header>

        <section className="g-page-section">
          <h2>{S.fonts.specimens}</h2>
          <p className="g-muted">{S.fonts.specimensHint}</p>
          {!tokens && <p className="g-muted">{S.intro.resolving}</p>}
          {tokens &&
            THEME_IDS.map((themeId) => {
              const values = tokens[themeId][mode];
              return (
                <div key={themeId} className="g-font-theme">
                  <h3>{THEME_NAMES[themeId]}</h3>
                  {ROLES.map((role) => {
                    const family = values[role];
                    return (
                      <div key={role} className="g-font-role">
                        <div className="g-font-role-meta">
                          <code>{role}</code>
                          <span className="g-muted" data-unset={!family || undefined}>
                            {family || S.section.unset}
                          </span>
                        </div>
                        <div className="g-font-samples">
                          {(Object.keys(TIER_PX) as (keyof typeof TIER_PX)[]).map((tier) => (
                            <div
                              key={tier}
                              className="g-font-sample"
                              style={{ fontFamily: family || undefined, fontSize: TIER_PX[tier] }}
                            >
                              <span className="g-font-size">{TIER_PX[tier]}px</span>
                              {(["en", "zh"] as const).map((lang) => (
                                <p key={lang} lang={lang === "zh" ? "zh-CN" : "en"}>
                                  {role === "--ui-font-mono"
                                    ? SPECIMENS[lang].code
                                    : SPECIMENS[lang].paragraph}
                                </p>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
        </section>

        <section className="g-page-section">
          <h2>{S.fonts.declared}</h2>
          <p className="g-muted">{S.fonts.declaredHint}</p>
          {faces.length === 0 ? (
            <p className="g-muted">{S.fonts.noFaces}</p>
          ) : (
            <table className="g-table">
              <tbody>
                {faces.map((face) => (
                  <tr key={face.family}>
                    <td style={{ fontFamily: `"${face.family}"` }}>{face.family}</td>
                    <td>{face.count > 1 ? S.fonts.slices(face.count) : "1"}</td>
                    <td>
                      <code>{face.weights.join(", ")}</code> <code>{face.styles.join(", ")}</code>
                    </td>
                    <td className="g-muted">
                      {(Object.keys(face.status) as FontFaceLoadStatus[])
                        .filter((status) => face.status[status] > 0)
                        .map((status) => `${S.fonts.status[status]} ${face.status[status]}`)
                        .join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="g-page-section">
          <h2>{S.fonts.licences}</h2>
          {licences.length === 0 ? (
            <p className="g-muted">{S.fonts.noLicences}</p>
          ) : (
            licences.map((path) => <Licence key={path} path={path} />)
          )}
        </section>
      </div>
    </div>
  );
}
