// src/features/phonation/components/molecules/DbMeter.jsx

import SmallText from '../atoms/SmallText';

const DB_MIN = -80;
const DB_MAX = 0;

/**
 * Molecule: medidor visual de intensidad en dB.
 */
export default function DbMeter({ db }) {
  const normalized = ((db - DB_MIN) / (DB_MAX - DB_MIN)) * 100;
  const width = Math.min(100, Math.max(0, normalized));

  let meterColor = '#22c55e';
  if (db >= -6) meterColor = '#ef4444';
  else if (db >= -20) meterColor = '#facc15';

  return (
    <div
      style={{
        background: '#232B38',
        border: '1px solid #334155',
        borderRadius: 10,
        padding: 12,
      }}
    >
      <SmallText margin="0 0 8px 0">Intensidad (dB)</SmallText>
      <div style={{ background: '#1C1C1E', border: '1px solid #334155', borderRadius: 999, height: 14 }}>
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
