import { cn } from '@/lib/cn';

/**
 * Pill label (rule 60). Deliberately domain agnostic: it knows nothing about
 * `ProjectStatus`. The state -> tone mapping lives in
 * `src/features/projects/status.ts`, so a second domain can reuse the pill
 * without dragging the vocabulary of projects along.
 */
export type BadgeTone = 'neutral' | 'accent' | 'forest' | 'outline';

export interface BadgeProps extends React.ComponentProps<'span'> {
  tone?: BadgeTone;
}

const BASE =
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-gray-100 text-gray-700',
  accent: 'bg-accent text-gray-900',
  forest: 'bg-forest text-white',
  outline: 'border border-black/15 text-gray-700',
};

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return <span className={cn(BASE, TONES[tone], className)} {...props} />;
}
