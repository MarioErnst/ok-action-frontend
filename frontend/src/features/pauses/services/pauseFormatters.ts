export function formatMsAsSeconds(valueMs: number): string {
  return `${Math.max(0, valueMs / 1000).toFixed(1)} s`;
}

export function formatDuration(valueMs: number): string {
  const totalSeconds = Math.max(0, Math.round(valueMs / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}
