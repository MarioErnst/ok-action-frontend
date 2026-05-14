import { useEffect, useMemo, useState } from 'react';

import {
  getGuideDefinition,
  getGuideStep,
  type GuideId,
} from '../../../domain/guideDefinitions';
import { GuideHighlightFrame } from '../atoms/GuideHighlightFrame';
import { GuidePanelActions } from '../molecules/GuidePanelActions';
import { GuidePanelHeader } from '../molecules/GuidePanelHeader';

type AnchorRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type GuideOverlayProps = {
  activeGuideId: GuideId;
  currentStepIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const getAnchorRect = (anchorId?: string): AnchorRect | null => {
  if (!anchorId) return null;
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-journey-id="${anchorId}"]`),
  );

  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  }

  return null;
};

const useAnchorRect = (anchorId?: string): AnchorRect | null => {
  const [rect, setRect] = useState<AnchorRect | null>(() => getAnchorRect(anchorId));

  useEffect(() => {
    const update = () => setRect(getAnchorRect(anchorId));

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    const id = window.setTimeout(update, 80);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      window.clearTimeout(id);
    };
  }, [anchorId]);

  return rect;
};

const useIsCompactViewport = (): boolean => {
  const [isCompact, setIsCompact] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const update = () => setIsCompact(window.innerWidth < 768);

    update();
    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('resize', update);
    };
  }, []);

  return isCompact;
};

export const GuideOverlay = ({
  activeGuideId,
  currentStepIndex,
  onPrevious,
  onNext,
  onClose,
}: GuideOverlayProps) => {
  const guide = getGuideDefinition(activeGuideId);
  const step = getGuideStep(activeGuideId, currentStepIndex);
  const anchorRect = useAnchorRect(step.anchorId);
  const isCompact = useIsCompactViewport();
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === guide.steps.length - 1;

  const panelStyle = useMemo(() => {
    if (isCompact || !anchorRect) {
      return undefined;
    }

    const panelWidth = 360;
    const belowTop = anchorRect.top + anchorRect.height + 16;
    const aboveTop = anchorRect.top - 220;
    const top =
      belowTop + 220 < window.innerHeight
        ? belowTop
        : Math.max(24, aboveTop);

    return {
      top,
      left: clamp(anchorRect.left + anchorRect.width / 2 - panelWidth / 2, 24, window.innerWidth - panelWidth - 24),
      width: panelWidth,
    };
  }, [anchorRect, isCompact]);

  return (
    <div className="fixed inset-0 z-[80] pointer-events-none">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />

      {anchorRect ? (
        <GuideHighlightFrame
          style={{
            top: anchorRect.top - 8,
            left: anchorRect.left - 8,
            width: anchorRect.width + 16,
            height: anchorRect.height + 16,
          }}
        />
      ) : null}

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        className="pointer-events-auto fixed left-4 right-4 bottom-24 rounded-2xl border border-border/70 bg-surface/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl md:left-auto md:right-auto md:bottom-auto md:max-w-[360px]"
        style={panelStyle}
      >
        <GuidePanelHeader
          current={currentStepIndex + 1}
          total={guide.steps.length}
          onClose={onClose}
        />

        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-accent">
          {guide.title}
        </p>
        <h2 id="guide-title" className="text-lg font-extrabold tracking-tight text-text">
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-text-muted">{step.body}</p>

        <GuidePanelActions
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          onPrevious={onPrevious}
          onNext={onNext}
        />
      </section>
    </div>
  );
};

