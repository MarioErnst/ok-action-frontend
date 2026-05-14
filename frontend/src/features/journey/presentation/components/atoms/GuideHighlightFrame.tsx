import type { CSSProperties } from 'react';

type GuideHighlightFrameProps = {
  style: CSSProperties;
};

export const GuideHighlightFrame = ({ style }: GuideHighlightFrameProps) => (
  <div
    className="hidden md:block absolute rounded-2xl border-2 border-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.35),0_0_26px_rgba(245,158,11,0.45)] transition-all duration-200"
    style={style}
  />
);

