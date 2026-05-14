import { beforeEach, describe, expect, it, vi } from 'vitest';

import { APP_OVERVIEW_GUIDE_ID, GUIDE_VERSION } from '../domain/guideDefinitions';
import { getJourneyStorageKey, useJourneyStore } from '../presentation/store/journeyStore';

const createMemoryStorage = (): Storage => {
  let values: Record<string, string> = {};

  return {
    get length() {
      return Object.keys(values).length;
    },
    clear: () => {
      values = {};
    },
    getItem: (key: string) => values[key] ?? null,
    key: (index: number) => Object.keys(values)[index] ?? null,
    removeItem: (key: string) => {
      delete values[key];
    },
    setItem: (key: string, value: string) => {
      values[key] = value;
    },
  };
};

describe('journeyStore', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    useJourneyStore.setState({
      journeySeenVersion: null,
      activeGuideId: null,
      currentStepIndex: 0,
    });
  });

  it('opens the global guide at the first step', () => {
    useJourneyStore.getState().startGuide(APP_OVERVIEW_GUIDE_ID);

    expect(useJourneyStore.getState().activeGuideId).toBe('app-overview');
    expect(useJourneyStore.getState().currentStepIndex).toBe(0);
  });

  it('opens a module guide by id', () => {
    useJourneyStore.getState().startGuide('phonation');

    expect(useJourneyStore.getState().activeGuideId).toBe('phonation');
    expect(useJourneyStore.getState().currentStepIndex).toBe(0);
  });

  it('moves forward and backward through the active guide', () => {
    useJourneyStore.getState().startGuide('app-overview');
    useJourneyStore.getState().nextStep();

    expect(useJourneyStore.getState().currentStepIndex).toBe(1);

    useJourneyStore.getState().previousStep();

    expect(useJourneyStore.getState().currentStepIndex).toBe(0);
  });

  it('closes a guide without storing it as seen', () => {
    useJourneyStore.getState().startGuide('phonation');
    useJourneyStore.getState().closeGuide();

    expect(useJourneyStore.getState().activeGuideId).toBeNull();
    expect(localStorage.getItem(getJourneyStorageKey())).toBeNull();
  });

  it('stores the seen version when the global guide is closed', () => {
    useJourneyStore.getState().startGuide('app-overview');
    useJourneyStore.getState().closeGuide();

    expect(useJourneyStore.getState().activeGuideId).toBeNull();
    expect(useJourneyStore.getState().journeySeenVersion).toBe(GUIDE_VERSION);
    expect(localStorage.getItem(getJourneyStorageKey())).toBe(GUIDE_VERSION);
  });

  it('stores the seen version when the global guide is finished', () => {
    useJourneyStore.getState().startGuide('app-overview', 7);
    useJourneyStore.getState().nextStep();

    expect(useJourneyStore.getState().activeGuideId).toBeNull();
    expect(useJourneyStore.getState().journeySeenVersion).toBe(GUIDE_VERSION);
    expect(localStorage.getItem(getJourneyStorageKey())).toBe(GUIDE_VERSION);
  });

  it('does not store seen version when a module guide is finished', () => {
    useJourneyStore.getState().startGuide('phonation', 3);
    useJourneyStore.getState().nextStep();

    expect(useJourneyStore.getState().activeGuideId).toBeNull();
    expect(useJourneyStore.getState().journeySeenVersion).toBeNull();
    expect(localStorage.getItem(getJourneyStorageKey())).toBeNull();
  });
});
