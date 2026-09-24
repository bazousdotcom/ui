import type { ReactNode } from "react";

import type { Tone } from "../format";

/**
 * Primitives: the only markup modules are expected to use. Every class starts
 * with `bz-` so the kit never collides with the host application's styles.
 */

export function Card({ question, title, meta, actions, children, className }: {
  /** The money question, shown small above the title. */
  question?: string;
  title?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`bz-card${className ? ` ${className}` : ""}`}>
      {(question || title || meta || actions) && (
        <header className="bz-card-head">
          <div className="bz-card-titles">
            {question && <p className="bz-question">{question}</p>}
            {title && <h2 className="bz-title">{title}</h2>}
          </div>
          {meta && <span className="bz-meta">{meta}</span>}
          {actions && <div className="bz-card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </article>
  );
}

export function Tile({ question, label, value, unit, note, tone, emphasis }: {
  question: string;
  label: string;
  value: string;
  unit: string;
  note?: ReactNode;
  tone?: Tone;
  /** The one number that matters most on the page (the low point): drawn in gold. */
  emphasis?: boolean;
}) {
  return (
    <article className={`bz-tile${emphasis ? " bz-tile-emphasis" : ""}`} aria-label={question}>
      <p className="bz-eyebrow">{label}</p>
      <p className={`bz-tile-value${tone ? ` bz-${tone}` : ""}`}>
        {value} <span className="bz-unit">{unit}</span>
      </p>
      {note && <p className="bz-note">{note}</p>}
    </article>
  );
}

export function Row({ date, title, sub, amount, amountTone, late, children }: {
  date?: string;
  title: ReactNode;
  sub?: ReactNode;
  amount?: ReactNode;
  amountTone?: Tone;
  late?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={`bz-row${late ? " bz-late" : ""}`}>
      {date !== undefined && <span className="bz-date">{date}</span>}
      <div className="bz-row-body">
        <strong>{title}</strong>
        {sub && <span>{sub}</span>}
      </div>
      {amount !== undefined && <strong className={`bz-amount${amountTone ? ` bz-${amountTone}` : ""}`}>{amount}</strong>}
      {children}
    </div>
  );
}

export function Button({ children, onClick, variant = "secondary", disabled }: {
  children: ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary" | "ghost" | "link";
  disabled?: boolean;
}) {
  return (
    <button type="button" className={`bz-button bz-${variant}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Segmented<K extends string>({ options, value, onChange, label }: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
  label: string;
}) {
  return (
    <div className="bz-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button type="button" key={o.key} className={o.key === value ? "bz-on" : ""} aria-pressed={o.key === value} onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Dot({ tone }: { tone: "danger" | "warn" | "muted" }) {
  return <i className={`bz-dot bz-dot-${tone}`} aria-hidden="true" />;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="bz-empty">{children}</p>;
}

/** Proportional bars (drivers, categories) in the kit's four ink shades. */
export const SHADES = ["bz-shade-1", "bz-shade-2", "bz-shade-3", "bz-shade-4"] as const;
