/**
 * Inline SVG sparkline of the last N latency points for a single adapter.
 * Server component — no client JS, no hydration cost. Renders nothing
 * with fewer than 2 points (a single dot doesn't communicate trend).
 *
 * The y-axis is normalized to the local min/max so every adapter's
 * chart spans the visible band fully — operator-facing, so showing
 * shape matters more than absolute comparability across cards (the
 * per-card "Xms" text covers the latter).
 *
 * Failed calls render as a red dot; OK calls as the accent color.
 */
import type { AdapterHistoryPoint } from '@/lib/adapter-stats';

interface Props {
  points: readonly AdapterHistoryPoint[];
  width?: number;
  height?: number;
}

export function LatencySparkline({ points, width = 96, height = 24 }: Props) {
  if (points.length < 2) return null;
  const durations = points.map((p) => p.durationMs);
  const min = Math.min(...durations);
  const max = Math.max(...durations);
  const span = Math.max(1, max - min);

  // Padding so dots aren't clipped at the edges.
  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const xs = points.map((_, i) =>
    points.length === 1 ? pad + innerW / 2 : pad + (i * innerW) / (points.length - 1),
  );
  const ys = points.map((p) => pad + innerH - ((p.durationMs - min) / span) * innerH);
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i]!.toFixed(1)}`).join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${points.length} recent latencies, ${min}–${max}ms`}
      className="text-accent-600 dark:text-accent-300"
    >
      <path d={path} stroke="currentColor" strokeWidth={1.2} fill="none" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={xs[i]}
          cy={ys[i]}
          r={1.6}
          className={p.ok ? 'fill-current' : 'fill-red-500'}
        />
      ))}
    </svg>
  );
}
