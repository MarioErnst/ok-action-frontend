// src/features/phonation/components/molecules/PitchReadout.jsx

import SmallText from '../atoms/SmallText';

const HZ_MIN = 75;
const HZ_MAX = 400;

/**
 * Molecule: bloque de lectura de pitch con rango esperado.
 */
export default function PitchReadout({ hz, isCalibrating }) {
  const hasValue = typeof hz === 'number' && !isCalibrating;
  const display = hasValue ? `${hz.toFixed(1)} Hz` : '—';
  const isOutOfRange = hasValue && (hz < HZ_MIN || hz > HZ_MAX);

  return (
    <div
      style={{
        background: '#232B38',
        border: '1px solid #334155',
        borderRadius: 10,
        padding: 12,
      }}
    >
      <SmallText margin="0 0 6px 0">Tono actual</SmallText>
      <div style={{ color: isOutOfRange ? '#F59E0B' : '#FFFFFF', fontSize: 34, fontWeight: 800 }}>
        {display}
      </div>
    </div>
  );
}
