import { colors } from '../../theme';
import SmallText from '../atoms/SmallText';

const DB_MIN = -80;
const DB_MAX = 0;

interface DbMeterProps {
  db: number;
}

export default function DbMeter({ db }: DbMeterProps) {
  const normalized = ((db - DB_MIN) / (DB_MAX - DB_MIN)) * 100;
  const width = Math.min(100, Math.max(0, normalized));

  let meterColor = colors.success;
  if (db >= -6) meterColor = colors.danger;
  else if (db >= -20) meterColor = colors.warning;

  return (
    <div
      style={{
        background: colors.surfaceAlt,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        padding: 12,
      }}
    >
      <SmallText margin="0 0 8px 0">Intensidad (dB)</SmallText>
      <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 999, height: 14 }}>
        <div
          style={{
            width: `${width}%`,
            height: '100%',
            borderRadius: 999,
            background: meterColor,
            transition: 'width 80ms linear',
          }}
        />
      </div>
      <SmallText margin="8px 0 0 0">Valor actual: {db.toFixed(1)} dB</SmallText>
    </div>
  );
}
