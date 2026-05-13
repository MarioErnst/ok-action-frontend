// Deterministic Spanish syllabification + tonic syllable detection.
//
// Used by the Acentuación module to highlight which syllable should carry the
// stress in each word of the prompt, so the UI can show "el PÁ-ja-ro" vs
// "el pa-JA-ro" instead of generic feedback.
//
// Scope: covers the standard rules of Spanish phonology — open vs closed
// vowels, diphthongs/hiatuses, indivisible consonant clusters, and the
// aguda/grave/esdrújula ending rule. Edge cases (foreign loanwords, double
// 'h' interactions, dialectal variation) are out of scope for this MVP.

const OPEN_VOWELS = new Set(['a', 'e', 'o', 'á', 'é', 'ó']);
const ACCENTED_CLOSED = new Set(['í', 'ú']);
const ACCENT_MAP: Record<string, string> = {
  á: 'a',
  é: 'e',
  í: 'i',
  ó: 'o',
  ú: 'u',
  Á: 'A',
  É: 'E',
  Í: 'I',
  Ó: 'O',
  Ú: 'U',
};

// Consonant clusters that must stay together (do not split between syllables).
const INDIVISIBLE_CLUSTERS = new Set([
  'bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'tr',
  'ch', 'll', 'rr',
]);

const VOWEL_LETTERS = new Set([
  'a', 'e', 'i', 'o', 'u', 'á', 'é', 'í', 'ó', 'ú', 'ü',
]);

function isVowel(ch: string): boolean {
  return VOWEL_LETTERS.has(ch.toLowerCase());
}

function isOpenVowel(ch: string): boolean {
  return OPEN_VOWELS.has(ch.toLowerCase());
}

function isAccented(ch: string): boolean {
  const lower = ch.toLowerCase();
  return lower in ACCENT_MAP || ACCENTED_CLOSED.has(lower);
}

function stripAccent(ch: string): string {
  return ACCENT_MAP[ch] ?? ch;
}

// Returns the number of vowels in a contiguous vowel sequence that form a
// single syllable nucleus. A "ai" diphthong returns 2 (the run covers both).
// A "ae" hiatus returns 1 (only the first vowel belongs to this nucleus).
function nucleusLength(letters: string[], start: number): number {
  const first = letters[start];
  if (!first || !isVowel(first)) return 0;
  let length = 1;
  let i = start + 1;

  while (i < letters.length && isVowel(letters[i])) {
    const previous = letters[i - 1];
    const current = letters[i];

    const previousOpen = isOpenVowel(previous);
    const currentOpen = isOpenVowel(current);
    const previousAccentedClosed = ACCENTED_CLOSED.has(previous.toLowerCase());
    const currentAccentedClosed = ACCENTED_CLOSED.has(current.toLowerCase());

    // Hiatuses break the run.
    if (previousOpen && currentOpen) break;
    if (previousAccentedClosed || currentAccentedClosed) break;

    length += 1;
    i += 1;

    // Triphthongs cap at length 3 (closed + open + closed).
    if (length === 3) break;
  }

  return length;
}

interface Syllable {
  text: string;
  // Index of the syllable's *first character* in the original word, useful for
  // upstream highlighters that need to map back to character offsets.
  startIndex: number;
  endIndex: number;
}

export function syllabify(word: string): Syllable[] {
  const letters = [...word];
  if (letters.length === 0) return [];

  // First pass: locate every vowel nucleus by index range.
  const nuclei: Array<{ start: number; end: number }> = [];
  let i = 0;
  while (i < letters.length) {
    if (!isVowel(letters[i])) {
      i += 1;
      continue;
    }
    const len = nucleusLength(letters, i);
    nuclei.push({ start: i, end: i + len - 1 });
    i += len;
  }
  if (nuclei.length === 0) {
    return [{ text: word, startIndex: 0, endIndex: word.length - 1 }];
  }

  // Second pass: assign consonants around each nucleus to syllables using
  // standard Spanish onset/coda rules.
  const syllables: Syllable[] = [];
  let cursor = 0;
  for (let n = 0; n < nuclei.length; n++) {
    const current = nuclei[n];
    const next = nuclei[n + 1];

    let syllableEnd: number;
    if (!next) {
      syllableEnd = letters.length - 1;
    } else {
      const consonantStart = current.end + 1;
      const consonantEnd = next.start - 1;
      const consonantCount = consonantEnd - consonantStart + 1;

      if (consonantCount <= 0) {
        syllableEnd = current.end;
      } else if (consonantCount === 1) {
        syllableEnd = current.end;
      } else if (consonantCount === 2) {
        const cluster = letters[consonantStart].toLowerCase() + letters[consonantStart + 1].toLowerCase();
        syllableEnd = INDIVISIBLE_CLUSTERS.has(cluster) ? current.end : consonantStart;
      } else if (consonantCount === 3) {
        const lastTwo = letters[consonantStart + 1].toLowerCase() + letters[consonantStart + 2].toLowerCase();
        syllableEnd = INDIVISIBLE_CLUSTERS.has(lastTwo) ? consonantStart : consonantStart + 1;
      } else {
        // 4+ consonants: split down the middle.
        syllableEnd = consonantStart + 1;
      }
    }

    const segment = letters.slice(cursor, syllableEnd + 1).join('');
    syllables.push({ text: segment, startIndex: cursor, endIndex: syllableEnd });
    cursor = syllableEnd + 1;
  }

  return syllables;
}

/**
 * Returns the index (within the syllables array) of the tonic syllable for
 * the given word. Falls back to the last syllable for one-syllable words.
 *
 * Tonic resolution rules (in order):
 *  1. If any vowel is written with an accent (á/é/í/ó/ú), the syllable that
 *     contains it is tonic.
 *  2. Otherwise, if the word ends in a vowel, 'n' or 's': penultimate.
 *  3. Otherwise: last.
 */
export function getTonicSyllableIndex(word: string): number {
  const syllables = syllabify(word);
  if (syllables.length === 0) return -1;
  if (syllables.length === 1) return 0;

  for (let i = 0; i < syllables.length; i++) {
    for (const ch of syllables[i].text) {
      if (isAccented(ch)) return i;
    }
  }

  const lastChar = stripAccent(word.slice(-1)).toLowerCase();
  const endsInVowelNorS =
    VOWEL_LETTERS.has(lastChar) || lastChar === 'n' || lastChar === 's';
  return endsInVowelNorS ? syllables.length - 2 : syllables.length - 1;
}

export interface WordStressAnnotation {
  text: string;
  syllables: string[];
  tonicIndex: number;
}

/**
 * Splits a phrase into words and computes the tonic syllable for each one.
 * Punctuation is preserved in the `text` field; syllabification is performed
 * only on the alphabetic portion of each word.
 */
export function annotatePhrase(phrase: string): WordStressAnnotation[] {
  const tokens = phrase.split(/(\s+)/).filter((token) => token.length > 0);
  return tokens
    .filter((token) => !/^\s+$/.test(token))
    .map((token) => {
      const match = token.match(/^([^\p{L}]*)(\p{L}+(?:['’]?\p{L}+)*)(.*)$/u);
      if (!match) {
        return { text: token, syllables: [token], tonicIndex: 0 };
      }
      const word = match[2];
      const syllables = syllabify(word).map((s) => s.text);
      const tonicIndex = getTonicSyllableIndex(word);
      // Re-emit the full token with leading/trailing punctuation intact for
      // rendering; the syllables array describes only the alphabetic core.
      return {
        text: token,
        syllables,
        tonicIndex,
      };
    });
}
