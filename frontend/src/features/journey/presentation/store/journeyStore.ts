import { create } from 'zustand';

import {
  GUIDE_VERSION,
  getGuideDefinition,
  isLastGuideStep,
  type GuideId,
} from '../../domain/guideDefinitions';

const STORAGE_KEY = 'ok-action:journey:seen-version';

type JourneyState = {
  journeySeenVersion: string | null;
  activeGuideId: GuideId | null;
  currentStepIndex: number;
  startGuide: (guideId: GuideId, stepIndex?: number) => void;
  closeGuide: () => void;
  finishGuide: () => void;
  nextStep: () => void;
  previousStep: () => void;
};

const getStorage = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

const readSeenVersion = (): string | null => getStorage()?.getItem(STORAGE_KEY) ?? null;

const writeSeenVersion = (version: string) => {
  getStorage()?.setItem(STORAGE_KEY, version);
};

const markSeenState = {
  journeySeenVersion: GUIDE_VERSION,
  activeGuideId: null,
  currentStepIndex: 0,
};

const closeState = {
  activeGuideId: null,
  currentStepIndex: 0,
};

const closeActiveGuide = (activeGuideId: GuideId | null) => {
  const guide = activeGuideId ? getGuideDefinition(activeGuideId) : null;

  if (guide?.persistSeen) {
    writeSeenVersion(GUIDE_VERSION);
    return markSeenState;
  }

  return closeState;
};

export const useJourneyStore = create<JourneyState>((set, get) => ({
  journeySeenVersion: readSeenVersion(),
  activeGuideId: null,
  currentStepIndex: 0,
  startGuide: (guideId, stepIndex = 0) => {
    const guide = getGuideDefinition(guideId);
    const safeIndex = Math.min(Math.max(stepIndex, 0), guide.steps.length - 1);

    set({
      activeGuideId: guideId,
      currentStepIndex: safeIndex,
    });
  },
  closeGuide: () => set((state) => closeActiveGuide(state.activeGuideId)),
  finishGuide: () => {
    set(closeActiveGuide(get().activeGuideId));
  },
  nextStep: () =>
    set((state) => {
      if (!state.activeGuideId) return state;
      if (isLastGuideStep(state.activeGuideId, state.currentStepIndex)) {
        return closeActiveGuide(state.activeGuideId);
      }

      return { currentStepIndex: state.currentStepIndex + 1 };
    }),
  previousStep: () =>
    set((state) => {
      if (!state.activeGuideId || state.currentStepIndex === 0) return state;
      return { currentStepIndex: state.currentStepIndex - 1 };
    }),
}));

export const hasSeenCurrentJourney = (seenVersion: string | null): boolean =>
  seenVersion === GUIDE_VERSION;

export const getJourneyStorageKey = (): string => STORAGE_KEY;
