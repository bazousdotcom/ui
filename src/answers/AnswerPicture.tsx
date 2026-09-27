import { useLayoutEffect, useRef } from "react";

import type { Locale } from "../i18n";
import type { AnswerVisual } from "./contract";
import { MAX_WIDTH, MIN_WIDTH, drawVisual } from "./draw";

export type AnswerPictureProps = { visual: AnswerVisual | null | undefined; locale: Locale; className?: string };

const laidOutAt = (px: number) => Math.round(Math.min(Math.max(px || MAX_WIDTH, MIN_WIDTH), MAX_WIDTH));

/**
 * The picture of an answer, drawn by the same code as in the assistants' card. Nothing when there is none.
 * It is laid out at the width of its container and redrawn when that width changes, so the labels keep
 * their size on a phone.
 */
export function AnswerPicture({ visual, locale, className }: AnswerPictureProps) {
  const host = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = host.current;
    if (!node) return;
    let width = 0;
    const draw = () => {
      const next = laidOutAt(node.clientWidth);
      if (next === width) return;
      width = next;
      const svg = drawVisual(visual, locale, node.ownerDocument, { width });
      node.replaceChildren(...(svg ? [svg] : []));
      node.hidden = !svg;
    };
    draw();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(draw);
    observer.observe(node);
    return () => observer.disconnect();
  }, [visual, locale]);
  return <div ref={host} className={className ? `bz-answer-picture ${className}` : "bz-answer-picture"} hidden={!visual} />;
}
