type GuidePanelActionsProps = {
  isFirstStep: boolean;
  isLastStep: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

export const GuidePanelActions = ({
  isFirstStep,
  isLastStep,
  onPrevious,
  onNext,
}: GuidePanelActionsProps) => (
  <div className="mt-5 flex items-center justify-between gap-3">
    <button
      type="button"
      onClick={onPrevious}
      disabled={isFirstStep}
      className="min-h-[40px] rounded-xl border border-border/70 px-4 text-sm font-bold text-text-muted transition-colors hover:border-accent/50 hover:text-text disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      Atras
    </button>
    <button
      type="button"
      onClick={onNext}
      className="min-h-[40px] rounded-xl bg-accent px-5 text-sm font-extrabold text-text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      {isLastStep ? 'Finalizar' : 'Siguiente'}
    </button>
  </div>
);

