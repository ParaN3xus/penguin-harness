/**
 * Layering: the stacking tiers overlays pick from (no tokens — a convention the Web App's
 * `styles.css` header documents), drawn as offset planes from the page up to toasts.
 */
import { useGallery } from "../state";

export function LayeringPage() {
  const { S } = useGallery();
  const rows = S.foundations.layerRows;
  return (
    <div className="gf-layers">
      {rows.map(([tier, what], i) => (
        <div
          key={tier}
          className="gf-layer"
          style={{
            marginLeft: `${i * 1.5}rem`,
            zIndex: i,
            boxShadow: i === 0 ? "none" : "var(--ui-shadow-overlay)",
          }}
        >
          <span className="gf-mono gf-layer-tier">{tier}</span>
          <span>{what}</span>
        </div>
      ))}
    </div>
  );
}
