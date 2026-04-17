import SmallText from '../atoms/SmallText';

interface PitchReadoutProps {
  hz: number | null;
  isCalibrating: boolean;
}

export default function PitchReadout({ hz, isCalibrating }: PitchReadoutProps) {
  const hasValue = typeof hz === 'number' && !isCalibrating;
  const display = hasValue ? `${hz.toFixed(1)} Hz` : '—';

  return (
    <div className="rounded-[10px] border border-border bg-surface-alt p-3">
      <SmallText className="mb-1.5">Tono actual</SmallText>
      <div className="text-[34px] font-extrabold text-white">
        {display}
      </div>
    </div>
  );
}
