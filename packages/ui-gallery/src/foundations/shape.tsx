/**
 * Foundations › Shape & depth: the things radius, border and shadow are for, in one stack — a page
 * card with its controls and a box nested at the inner radius, a menu floating over the card (glass
 * in Frost), a dialog over the dimmed page and a toast above everything — each layer tagged with the
 * stacking tier it takes. Below it, the radius steps and the five shadow levels on plain boxes.
 */
import type { CSSProperties } from "react";
import { useGallery } from "../state";
import { BoardGroup } from "./shared";
import { SPECIMENS } from "./specimens";

const RADII = ["xs", "sm", "md", "lg", "xl", "pill", "control"] as const;
const SHADOWS = ["flat", "raised", "overlay", "modal", "drawer"] as const;

function Tier({ children }: { children: string }) {
  return <span className="gf-tier gf-caption gf-mono">{children}</span>;
}

function Scene() {
  const { S, state } = useGallery();
  const t = S.foundations.scene;
  return (
    <div className="gf-scene">
      <div className="gf-scene-page">
        <Tier>{t.pageTier}</Tier>
        <div className="gf-card">
          <div className="gf-card-head">
            <strong>{t.cardTitle}</strong>
            <span className="gf-caption">{t.cardMeta}</span>
          </div>
          <div className="gf-nested" style={{ "--gf-parent-p": "0.75rem" } as CSSProperties}>
            <span className="gf-caption">{t.nested}</span>
          </div>
          <div className="gf-controls">
            <span className="gf-button" data-variant="primary">
              {t.primary}
            </span>
            <span className="gf-button">{t.secondary}</span>
            <span className="gf-input">{t.input}</span>
            <span className="gf-badge">{t.badge}</span>
          </div>
        </div>
        <div className="gf-menu ui-glass" role="menu">
          <Tier>{t.menuTier}</Tier>
          {t.menuItems.map((item, i) => (
            <span key={item} className="gf-menu-row" data-active={i === 1 || undefined}>
              {item}
            </span>
          ))}
        </div>
      </div>
      <div className="gf-scene-modal">
        <p className="gf-scene-text" aria-hidden>
          {SPECIMENS[state.lang].paragraph}
        </p>
        <span className="gf-backdrop" />
        <Tier>{t.backdropTier}</Tier>
        <div className="gf-dialog ui-glass" role="dialog" aria-label={t.dialogTitle}>
          <strong>{t.dialogTitle}</strong>
          <p className="gf-muted">{t.dialogBody}</p>
          <div className="gf-controls gf-controls-end">
            <span className="gf-button">{t.cancel}</span>
            <span className="gf-button" data-variant="danger">
              {t.confirm}
            </span>
          </div>
        </div>
        <div className="gf-toast">
          <Tier>{t.toastTier}</Tier>
          <span>{t.toast}</span>
        </div>
      </div>
    </div>
  );
}

export function ShapeBoard() {
  const { S } = useGallery();
  return (
    <div className="gf-board">
      <Scene />
      <div className="gf-pair">
        <BoardGroup title={S.foundations.radius}>
          <div className="gf-radii">
            {RADII.map((step) => (
              <span key={step} className="gf-radius">
                <span
                  className="gf-radius-box"
                  style={{ borderRadius: `var(--ui-radius-${step})` }}
                />
                <span className="gf-caption gf-mono">{step}</span>
              </span>
            ))}
          </div>
          <div className="gf-borders">
            <span className="gf-border" style={{ borderTopWidth: "var(--ui-border-w)" }} />
            <span className="gf-border" style={{ borderTopWidth: "var(--ui-border-w-thick)" }} />
          </div>
        </BoardGroup>
        <BoardGroup title={S.foundations.shadows}>
          <div className="gf-shadows">
            {SHADOWS.map((level) => (
              <span
                key={level}
                className="gf-shadow"
                style={{ boxShadow: `var(--ui-shadow-${level})` }}
              >
                <span className="gf-caption gf-mono">{level}</span>
              </span>
            ))}
          </div>
        </BoardGroup>
      </div>
    </div>
  );
}
