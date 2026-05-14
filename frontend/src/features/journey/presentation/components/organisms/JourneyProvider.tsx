import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  APP_OVERVIEW_GUIDE_ID,
  getGuideStep,
} from '../../../domain/guideDefinitions';
import { hasSeenCurrentJourney, useJourneyStore } from '../../store/journeyStore';
import { GuideOverlay } from './GuideOverlay';

export const JourneyProvider = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const journeySeenVersion = useJourneyStore((state) => state.journeySeenVersion);
  const activeGuideId = useJourneyStore((state) => state.activeGuideId);
  const currentStepIndex = useJourneyStore((state) => state.currentStepIndex);
  const startGuide = useJourneyStore((state) => state.startGuide);
  const nextStep = useJourneyStore((state) => state.nextStep);
  const previousStep = useJourneyStore((state) => state.previousStep);
  const closeGuide = useJourneyStore((state) => state.closeGuide);

  useEffect(() => {
    if (
      location.pathname === '/dashboard' &&
      !activeGuideId &&
      !hasSeenCurrentJourney(journeySeenVersion)
    ) {
      startGuide(APP_OVERVIEW_GUIDE_ID);
    }
  }, [activeGuideId, journeySeenVersion, location.pathname, startGuide]);

  useEffect(() => {
    if (!activeGuideId) return;

    const step = getGuideStep(activeGuideId, currentStepIndex);
    if (step.route !== location.pathname) {
      navigate(step.route);
    }
  }, [activeGuideId, currentStepIndex, location.pathname, navigate]);

  if (!activeGuideId) return null;

  return (
    <GuideOverlay
      activeGuideId={activeGuideId}
      currentStepIndex={currentStepIndex}
      onPrevious={previousStep}
      onNext={nextStep}
      onClose={closeGuide}
    />
  );
};

