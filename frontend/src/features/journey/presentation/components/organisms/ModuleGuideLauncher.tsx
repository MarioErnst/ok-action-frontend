import { GuideHelpButton } from '../atoms/GuideHelpButton';
import { useJourneyStore } from '../../store/journeyStore';
import type { GuideId } from '../../../domain/guideDefinitions';

type ModuleGuideLauncherProps = {
  guideId: GuideId;
  className?: string;
};

export const ModuleGuideLauncher = ({ guideId, className }: ModuleGuideLauncherProps) => {
  const startGuide = useJourneyStore((state) => state.startGuide);

  return (
    <GuideHelpButton
      className={className}
      onClick={() => startGuide(guideId)}
      aria-label="Abrir ayuda del modulo"
    />
  );
};

