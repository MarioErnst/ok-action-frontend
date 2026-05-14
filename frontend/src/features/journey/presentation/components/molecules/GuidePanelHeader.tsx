import { GuideStepCounter } from '../atoms/GuideStepCounter';

type GuidePanelHeaderProps = {
  current: number;
  total: number;
  onClose: () => void;
};

export const GuidePanelHeader = ({ current, total, onClose }: GuidePanelHeaderProps) => (
  <div className="mb-3 flex items-center justify-between gap-3">
    <GuideStepCounter current={current} total={total} />
    <button
      type="button"
      onClick={onClose}
      className="rounded-full px-3 py-1 text-xs font-bold text-text-muted transition-colors hover:bg-surface-alt hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      Cerrar
    </button>
  </div>
);

