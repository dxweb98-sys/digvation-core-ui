import { useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';
import { usePrefersReducedMotion } from './use-prefers-reduced-motion';
import './glow-card.css';

/** Accent is neutral. A status tone is only for a card that represents that status. */
export type GlowTone = 'accent' | 'warning' | 'danger';

const FINE_POINTER = '(hover: hover) and (pointer: fine)';

function hasFinePointer() {
  return typeof window.matchMedia === 'function' && window.matchMedia(FINE_POINTER).matches;
}

/**
 * Card whose border glow and spotlight follow the pointer. Position is written once per
 * frame to custom properties on an empty layer: never re-rendering React, and sparing the
 * card's content (charts included) the style recalculation inherited properties cost.
 */
export function GlowCard({
  as: Tag = 'div',
  tone = 'accent',
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'section' | 'article';
  tone?: GlowTone;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const layerRef = useRef<HTMLSpanElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const element = ref.current;
    const layer = layerRef.current;
    if (!element || !layer || reduced || !hasFinePointer()) return undefined;

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    const paint = () => {
      frame = 0;
      const box = element.getBoundingClientRect();
      layer.style.setProperty('--glow-x', `${pointerX - box.left}px`);
      layer.style.setProperty('--glow-y', `${pointerY - box.top}px`);
    };
    const follow = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!frame) frame = window.requestAnimationFrame(paint);
    };

    element.addEventListener('pointermove', follow, { passive: true });
    return () => {
      element.removeEventListener('pointermove', follow);
      window.cancelAnimationFrame(frame);
    };
  }, [reduced]);

  const classes = ['glow-card', `glow-card-${tone}`, className].filter(Boolean).join(' ');

  return (
    <Tag {...rest} className={classes} ref={ref as never}>
      <span aria-hidden="true" className="glow-card-layer" ref={layerRef}>
        <span className="glow-card-grid" />
      </span>
      {children}
    </Tag>
  );
}
