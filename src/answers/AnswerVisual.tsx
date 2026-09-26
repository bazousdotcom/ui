import { useLayoutEffect, useRef } from "react";

import type { Locale } from "../i18n";
import type { AnswerVisual as Visual } from "./contract";
import { drawVisual } from "./draw";

export type AnswerVisualProps = { visual: Visual | null | undefined; locale: Locale; className?: string };

/** The picture of an answer, drawn by the same code as in the assistants' card. Nothing when there is none. */
export function AnswerVisual({ visual, locale, className }: AnswerVisualProps) {
  const host = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = host.current;
    if (!node) return;
    const svg = drawVisual(visual, locale, node.ownerDocument);
    node.replaceChildren(...(svg ? [svg] : []));
    node.hidden = !svg;
  }, [visual, locale]);
  return <div ref={host} className={className ? `bz-answer-picture ${className}` : "bz-answer-picture"} hidden={!visual} />;
}
