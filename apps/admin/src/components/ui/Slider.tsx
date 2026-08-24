import { cn } from '@/lib/cn';

/**
 * Percentage slider of the panel: a native `<input type="range">` with its value
 * visible next to the track.
 *
 * Native and not a custom control on purpose. A range input already gives
 * keyboard support (arrows, Home/End, Page Up/Down), the `slider` role and
 * `aria-valuenow`/`min`/`max` for free, and it is a form control, so
 * `register()` of react-hook-form reads it like any other field. Rebuilding that
 * over a `<div>` is how sliders end up unusable without a mouse.
 *
 * The colour of the track and the thumb comes from `accent-color`, which is what
 * Tailwind's `accent-*` utility sets, so the control is themed with a design
 * token instead of being redrawn per browser.
 */
export interface SliderProps extends Omit<React.ComponentProps<'input'>, 'type' | 'children'> {
  id: string;
  /**
   * The current value as the admin reads it ("40 %"), already formatted by the
   * caller. It feeds both the visible `<output>` and `aria-valuetext`: without
   * it a screen reader announces a bare "40" and the unit is lost.
   */
  valueLabel: string;
}

export function Slider({ id, valueLabel, className, ...props }: SliderProps) {
  return (
    <div className="flex items-center gap-4">
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        aria-valuetext={valueLabel}
        className={cn(
          'h-11 w-full min-w-0 cursor-pointer accent-dark-green',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark-green',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
      {/*
        `<output for>` ties the number to the control that produces it, so it is
        announced as its result and not as a loose figure. `tabular-nums` keeps
        the track from shifting as the value goes from 9 to 10 to 100.
      */}
      <output
        htmlFor={id}
        className="w-16 shrink-0 text-right text-sm font-bold text-gray-900 tabular-nums"
      >
        {valueLabel}
      </output>
    </div>
  );
}
