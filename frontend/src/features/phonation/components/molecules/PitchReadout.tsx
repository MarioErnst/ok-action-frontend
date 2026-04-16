import { colors } from '../../theme';
import SmallText from '../atoms/SmallText';

interface PitchReadoutProps {
  hz: number | null;
  isCalibrating: boolean;
}

export default function PitchReadout({ hz, isCalibrating }: PitchReadoutProps) {
  const hasValue = typeof hz === 'number' && !isCalibrating;
  const display = hasValue ? `${hz.toFixed(1)} Hz` : '—';

  return (
    <div
      style={{
        background: colors.surfaceAlt,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        padding: 12,
      }}
    >
      <SmallText margin="0 0 6px 0">Tono actual</SmallText>
      <div style={{ color: '#FFFFFF', fontSize: 34, fontWeight: 800 }}>
        {display}
      </div>
    </div>
  );
}
