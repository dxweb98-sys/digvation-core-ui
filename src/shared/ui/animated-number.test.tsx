import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnimatedNumber } from './animated-number';

let frames: FrameRequestCallback[];

function runFrame(now: number) {
  const pending = frames;
  frames = [];
  act(() => pending.forEach((callback) => callback(now)));
}

function shown(container: HTMLElement) {
  return container.querySelector('[aria-hidden="true"]')?.textContent;
}

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', () => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
}

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  stubReducedMotion(false);
});

afterEach(() => vi.unstubAllGlobals());

describe('AnimatedNumber', () => {
  it('counts up from zero on first load and lands exactly on the value', () => {
    const { container } = render(<AnimatedNumber value={100} />);
    expect(shown(container)).toBe('0');

    runFrame(0);
    runFrame(300);
    const midway = Number(shown(container));
    expect(midway).toBeGreaterThan(50);
    expect(midway).toBeLessThan(100);

    runFrame(600);
    expect(shown(container)).toBe('100');
    expect(frames).toHaveLength(0);
  });

  it('counts from the previous value when the data changes', () => {
    const { container, rerender } = render(<AnimatedNumber value={10} />);
    runFrame(0);
    runFrame(600);

    rerender(<AnimatedNumber value={20} />);
    expect(shown(container)).toBe('10');
    runFrame(1000);
    runFrame(1600);

    expect(shown(container)).toBe('20');
  });

  it('does not animate again when the value is unchanged', () => {
    const { rerender } = render(<AnimatedNumber value={10} />);
    runFrame(0);
    runFrame(600);

    rerender(<AnimatedNumber value={10} />);

    expect(frames).toHaveLength(0);
  });

  it('is instant under reduced motion', () => {
    stubReducedMotion(true);
    const { container } = render(<AnimatedNumber value={42} />);

    expect(shown(container)).toBe('42');
    expect(frames).toHaveLength(0);
  });

  it('gives assistive technology the final value during the animation', () => {
    render(<AnimatedNumber value={42} />);

    expect(screen.getByText('42')).toHaveClass('visually-hidden');
  });

  it('never ticks on a timer or from random numbers', () => {
    const interval = vi.spyOn(window, 'setInterval');
    const random = vi.spyOn(Math, 'random');
    render(<AnimatedNumber value={42} />);
    runFrame(0);
    runFrame(600);

    expect(interval).not.toHaveBeenCalled();
    expect(random).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
