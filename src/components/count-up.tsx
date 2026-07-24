/**
 * Numbers that move. Every figure in onboarding and the wrapped story counts
 * toward its value rather than snapping, because watching 740 arrive is the
 * whole point — a number that appears is data, a number that climbs is hers.
 *
 * Driven on the JS thread on purpose: one Text node per figure, and the value
 * has to be formatted with thousands separators, which a worklet can't do
 * with toLocaleString.
 */
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { T } from '@/components/kit';
import type { ComponentProps } from 'react';

/** Eases toward `value`, re-tweening whenever the target moves. */
export function useTweenedNumber(value: number, duration = 620): number {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (reduced || from.current === value) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = Date.now();
    const a = from.current;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      // easeOutCubic — fast off the line, settles gently on the number
      const eased = 1 - Math.pow(1 - p, 3);
      const next = Math.round(a + (value - a) * eased);
      setShown(next);
      from.current = next;
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [value, duration, reduced]);

  return shown;
}

type Props = Omit<ComponentProps<typeof T>, 'children'> & {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
};

export function CountUp({ value, prefix = '', suffix = '', duration, ...rest }: Props) {
  const shown = useTweenedNumber(value, duration);
  return (
    <T {...rest}>
      {prefix}
      {shown.toLocaleString()}
      {suffix}
    </T>
  );
}
