/**
 * Chrome controls, styled by chrome.css only: a segmented pill, a switch row, and a swatch row
 * for the accent — each swatch painted in the colour it would apply, so the row previews the
 * theme's palette before anything is chosen.
 */
import type { CSSProperties, ReactNode } from "react";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  title?: string;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly SegmentOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="g-seg" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          title={option.title}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="g-switch-row">
      <span>{label}</span>
      <input
        type="checkbox"
        className="g-switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export interface SwatchOption {
  value: string;
  /** The name shown on hover and read to assistive technology. */
  label: string;
  /** The colour the swatch is painted in; empty until the probe has resolved it. */
  color: string;
}

export function Swatches({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly SwatchOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="g-swatches" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="g-swatch"
          aria-pressed={option.value === value}
          aria-label={option.label}
          title={option.label}
          data-empty={option.color === "" || undefined}
          style={{ "--g-swatch": option.color || "transparent" } as CSSProperties}
          onClick={() => onChange(option.value)}
        />
      ))}
    </div>
  );
}
