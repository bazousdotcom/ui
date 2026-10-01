import { useId } from "react";

/**
 * « Nuit »: the scenes that draw money as light (kit 0.5, from the community's dashboards).
 * A night scene stays dark in both themes, like the emphasis tile: gold is money you have,
 * red is what is missing, green is the income that comes. Colours live in bazous.css
 * (`.bz-night` and the `bz-n-*` stop classes); the ids are per drawing, so two scenes on a
 * page never share a gradient.
 */
export type NightIds = { star: string; moved: string; risk: string; core: string; coreOk: string; glow: string; haze: string };

export function useNightIds(): NightIds {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return { star: `${id}-star`, moved: `${id}-moved`, risk: `${id}-risk`, core: `${id}-core`, coreOk: `${id}-core-ok`, glow: `${id}-glow`, haze: `${id}-haze` };
}

export function NightDefs({ ids, glow = 7 }: { ids: NightIds; glow?: number }) {
  return (
    <defs>
      <radialGradient id={ids.star} cx="35%" cy="30%" r="75%">
        <stop offset="0" className="bz-n-star-0" /><stop offset=".35" className="bz-n-star-1" /><stop offset=".75" className="bz-n-star-2" /><stop offset="1" className="bz-n-star-3" />
      </radialGradient>
      <radialGradient id={ids.moved} cx="35%" cy="30%" r="75%">
        <stop offset="0" className="bz-n-ok-0" /><stop offset=".45" className="bz-n-ok-1" /><stop offset="1" className="bz-n-ok-2" />
      </radialGradient>
      <radialGradient id={ids.risk} cx="35%" cy="30%" r="75%">
        <stop offset="0" className="bz-n-risk-0" /><stop offset=".45" className="bz-n-risk-1" /><stop offset="1" className="bz-n-risk-2" />
      </radialGradient>
      <radialGradient id={ids.core} cx="38%" cy="32%" r="70%">
        <stop offset="0" className="bz-n-core-0" /><stop offset=".38" className="bz-n-core-1" /><stop offset=".78" className="bz-n-core-2" /><stop offset="1" className="bz-n-core-3" />
      </radialGradient>
      <radialGradient id={ids.coreOk} cx="38%" cy="32%" r="70%">
        <stop offset="0" className="bz-n-gold-0" /><stop offset=".38" className="bz-n-gold-1" /><stop offset=".78" className="bz-n-gold-2" /><stop offset="1" className="bz-n-core-3" />
      </radialGradient>
      <filter id={ids.glow} x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation={glow} result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id={ids.haze}><feGaussianBlur stdDeviation="12" /></filter>
    </defs>
  );
}

/** Day of a date counted from `from`, without time zones (dates are calendar days). */
export function dayIndex(from: string, date: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
