import { cn } from '@/lib/cn';
import { clampProgress, formatProgress } from './progress';

/**
 * Progress of a project: accessible bar plus its value as visible text.
 *
 * The value is rendered twice on purpose and in two different places. Inside the
 * element with `role="progressbar"` goes only the track, because the content of
 * a progressbar is not exposed as its accessible name -- that is what
 * `aria-label` is for. The `40 %` text is a sibling, so it is readable by
 * anyone and reachable by `getByText` in the phase 6 spec.
 */
export interface ProgressBarProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Percentage, clamped to 0-100: the caller does not have to sanitize it. */
  value: number;
  /**
   * Accessible name of the bar, in Spanish and specific to its row (for example
   * `Progreso de Reforestacion del Amazonas`). Several bars in a table with the
   * same name are indistinguishable for a screen reader and ambiguous for a
   * `getByRole('progressbar', { name })`.
   */
  label: string;
}

export function ProgressBar({ value, label, className, ...props }: ProgressBarProps) {
  const progress = clampProgress(value);

  return (
    <div className={cn('flex items-center gap-3', className)} {...props}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full min-w-16 overflow-hidden rounded-full bg-gray-200"
      >
        {/* Width is the one thing that cannot be a utility class: it is data. */}
        <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
      </div>
      <span className="shrink-0 text-sm font-bold text-gray-900 tabular-nums">
        {formatProgress(progress)}
      </span>
    </div>
  );
}
