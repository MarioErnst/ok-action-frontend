type GuideStepCounterProps = {
  current: number;
  total: number;
};

export const GuideStepCounter = ({ current, total }: GuideStepCounterProps) => (
  <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent">
    {current} de {total}
  </span>
);

