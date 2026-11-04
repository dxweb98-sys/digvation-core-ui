import { useLayoutEffect, useRef } from 'react';
import { usePrefersReducedMotion } from './use-prefers-reduced-motion';

const DURATION_MS = 600;
const defaultFormat = (value: number) => new Intl.NumberFormat('en').format(value);

function easeOutCubic(progress: number) {
  return 1 - (1 - progress) ** 3;
}

/**
 * Counts from the previous value to the current one. It runs only when the value
 * changes (or on first load, from zero) and writes text directly, without re-renders.
 * Assistive technology reads the final value, never the intermediate frames.
 */
export function AnimatedNumber({
  value,
  format = defaultFormat,
  className,
}: {
  value: number;
  format?: (value: number) => string;
  className?: string;
}) {
  const textRef = useRef<HTMLSpanElement>(null);
  const shownRef = useRef(0);
  const reduced = usePrefersReducedMotion();

  useLayoutEffect(() => {
    const text = textRef.current;
    if (!text) return undefined;

    const from = shownRef.current;
    if (reduced || from === value) {
      shownRef.current = value;
      text.textContent = format(value);
      return undefined;
    }

    let frame = 0;
    let startedAt: number | null = null;
    const step = (now: number) => {
      startedAt ??= now;
      const progress = Math.min((now - startedAt) / DURATION_MS, 1);
      shownRef.current = progress === 1 ? value : from + (value - from) * easeOutCubic(progress);
      text.textContent = format(Math.round(shownRef.current));
      if (progress < 1) frame = window.requestAnimationFrame(step);
    };

    text.textContent = format(from);
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [format, reduced, value]);

  return (
    <span className={['animated-number', className].filter(Boolean).join(' ')} style={{ fontVariantNumeric: 'tabular-nums' }}>
      <span aria-hidden="true" ref={textRef}>{format(value)}</span>
      <span className="visually-hidden">{format(value)}</span>
    </span>
  );
}
