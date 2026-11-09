export function completionTiming(
  deadlineAt: string | undefined,
  completedAt: number,
): string | null {
  const deadline = deadlineAt ? Date.parse(deadlineAt) : NaN;
  if (!Number.isFinite(deadline) || !Number.isFinite(completedAt)) return null;

  const difference = completedAt - deadline;
  if (difference === 0) return 'on time';

  let remaining = Math.floor(Math.abs(difference) / 1000);
  const parts: string[] = [];
  for (const [unit, seconds] of [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ] as const) {
    const count = Math.floor(remaining / seconds);
    remaining %= seconds;
    if (count > 0) parts.push(`${count} ${unit}${count === 1 ? '' : 's'}`);
    if (parts.length === 2) break;
  }
  const duration = parts.length ? parts.join(' ') : 'less than 1 second';
  return `${duration} ${difference > 0 ? 'late' : 'early'}`;
}
