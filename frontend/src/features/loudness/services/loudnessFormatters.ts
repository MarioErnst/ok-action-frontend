function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDuration(durationMs: number): string {
  const safeDuration = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(safeDuration / 60);
  const seconds = safeDuration % 60;
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function formatSeconds(durationMs: number): string {
  return `${(Math.max(0, durationMs) / 1000).toFixed(1)} s`;
}
