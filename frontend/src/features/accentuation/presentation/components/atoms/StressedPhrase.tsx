import { useMemo } from 'react';

import { annotatePhrase, type WordStressAnnotation } from '../../../services/spanishStress';

interface StressedPhraseProps {
  phrase: string;
  /**
   * Indices of words within the phrase the user pronounced with incorrect
   * stress (according to the backend's Gemini analysis). Highlighted in
   * `danger` colour. Whitespace tokens do not consume an index — counting
   * is over content words in the order returned by `annotatePhrase`.
   */
  errorWordIndices?: number[];
  /**
   * Optional override of the inferred tonic syllable per word. Keys are the
   * same word index used by `errorWordIndices`. Used when Gemini reports the
   * syllable the user actually stressed — we mark it in danger and keep the
   * deterministic tonic in accent for comparison.
   */
  actualStressedSyllableByWord?: Record<number, number>;
  className?: string;
}

/**
 * Renders a phrase with each word's tonic syllable visually highlighted.
 *
 * Visual contract:
 *  - The deterministic tonic syllable of every word is drawn in the accent
 *    colour. This shows the user where the stress *should* go, regardless
 *    of how they actually pronounced it.
 *  - Words flagged in `errorWordIndices` get a `danger` underline so the user
 *    sees which specific word was the problem.
 *  - If Gemini reports `actualStressedSyllableByWord`, that syllable is also
 *    drawn in `danger` so the user sees *where* the stress landed.
 */
export const StressedPhrase = ({
  phrase,
  errorWordIndices,
  actualStressedSyllableByWord,
  className,
}: StressedPhraseProps) => {
  const annotated = useMemo(() => annotatePhrase(phrase), [phrase]);
  const errorSet = useMemo(() => new Set(errorWordIndices ?? []), [errorWordIndices]);

  let wordIndex = -1;
  return (
    <p className={className}>
      {annotated.map((word, i) => {
        // Whitespace tokens are filtered out by annotatePhrase, but the index
        // still maps to the visible word order; words receive a fresh counter.
        wordIndex += 1;
        const isErrored = errorSet.has(wordIndex);
        const actualSyllable = actualStressedSyllableByWord?.[wordIndex];
        return (
          <Word
            key={`${word.text}-${i}`}
            annotation={word}
            errored={isErrored}
            actualSyllable={actualSyllable}
          />
        );
      })}
    </p>
  );
};

interface WordProps {
  annotation: WordStressAnnotation;
  errored: boolean;
  actualSyllable?: number;
}

const Word = ({ annotation, errored, actualSyllable }: WordProps) => {
  // Reconstruct prefix/word/suffix from the raw token so punctuation renders
  // around the styled syllables exactly as in the source phrase.
  const match = annotation.text.match(/^([^\p{L}]*)(\p{L}+(?:['’]?\p{L}+)*)(.*)$/u);
  const prefix = match?.[1] ?? '';
  const suffix = match?.[3] ?? '';

  if (annotation.syllables.length <= 1 || annotation.tonicIndex < 0) {
    return (
      <span className={errored ? 'underline decoration-danger decoration-2 underline-offset-4' : ''}>
        {annotation.text}{' '}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-baseline ${errored ? 'underline decoration-danger decoration-2 underline-offset-4' : ''}`}>
      {prefix}
      {annotation.syllables.map((syllable, idx) => {
        const isTonic = idx === annotation.tonicIndex;
        const isActual = actualSyllable === idx && actualSyllable !== annotation.tonicIndex;
        const className = isActual
          ? 'font-extrabold text-danger'
          : isTonic
            ? 'font-extrabold text-accent'
            : '';
        return (
          <span key={idx} className={className}>
            {syllable}
          </span>
        );
      })}
      {suffix}{' '}
    </span>
  );
};
