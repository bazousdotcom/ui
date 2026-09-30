import { useEffect, useRef, useState } from "react";

/**
 * The width a drawing is laid out at: the container's real width, so 11 px labels stay
 * 11 px on a phone instead of being scaled down with the whole picture.
 */
export function useWidth<T extends HTMLElement>(initial = 880, min = 300) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.round(entry?.contentRect.width ?? initial);
      if (w > 0) setWidth(Math.max(min, w));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [initial, min]);
  return [ref, width] as const;
}

/** Cuts a label to `max` characters with an ellipsis, for text drawn next to a mark. */
export function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
