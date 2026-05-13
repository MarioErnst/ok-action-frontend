import { Fragment, useMemo } from 'react';

import type { MuletillaPosition } from '../../../domain/MuletillasSession';

interface HighlightedTranscriptProps {
  transcript: string;
  positions: MuletillaPosition[];
  className?: string;
}

/**
 * Renders the spoken transcript with every filler-word occurrence painted in
 * the danger colour. Overlapping or out-of-bounds positions are filtered out
 * silently so a malformed Gemini response can't crash the result screen.
 */
export const HighlightedTranscript = ({
  transcript,
  positions,
  className,
}: HighlightedTranscriptProps) => {
  const segments = useMemo(() => buildSegments(transcript, positions), [transcript, positions]);

  return (
    <p className={className}>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <mark
            key={index}
            className="rounded-md bg-danger/15 px-1 py-0.5 font-semibold text-danger"
          >
            {segment.text}
          </mark>
        ) : (
          <Fragment key={index}>{segment.text}</Fragment>
        ),
      )}
    </p>
  );
};

interface Segment {
  text: string;
  highlighted: boolean;
}

function buildSegments(
  transcript: string,
  positions: MuletillaPosition[],
): Segment[] {
  if (transcript.length === 0) return [];

  // Normalise positions: drop invalid ranges, sort by start, merge overlaps.
  const sanitised: Array<{ start: number; end: number }> = positions
    .map((position) => ({
      start: Math.max(0, position.startChar),
      end: Math.min(transcript.length, position.endChar),
    }))
    .filter((range) => range.end > range.start)
    .sort((a, b) => a.start - b.start);

  const merged: Array<{ start: number; end: number }> = [];
  for (const range of sanitised) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }

  const segments: Segment[] = [];
  let cursor = 0;
  for (const range of merged) {
    if (range.start > cursor) {
      segments.push({ text: transcript.slice(cursor, range.start), highlighted: false });
    }
    segments.push({ text: transcript.slice(range.start, range.end), highlighted: true });
    cursor = range.end;
  }
  if (cursor < transcript.length) {
    segments.push({ text: transcript.slice(cursor), highlighted: false });
  }
  return segments;
}
