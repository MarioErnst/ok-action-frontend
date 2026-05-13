// Aggregate emotion percentages submitted to the backend alongside the
// audio at finalize time. Computed locally from the classifier stream
// (the backend never sees raw frames or video, only this payload).
//
// Field names match the columns of facial_expression_metrics in BD and
// FacialSummaryInput in the backend Pydantic schemas, with the
// canonical -ed/-ful endings (surprised, fearful, disgusted). The
// classifier emits the older surprise/fear/disgust names; the builder
// performs the translation when accumulating.

export interface FacialSummaryPayload {
  happy_pct: number
  sad_pct: number
  angry_pct: number
  surprised_pct: number
  fearful_pct: number
  disgusted_pct: number
  neutral_pct: number
}
