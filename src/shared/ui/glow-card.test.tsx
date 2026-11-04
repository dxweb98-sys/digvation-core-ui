import { fireEvent, render, screen } from '@testing-library/react';
import { Profiler } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GlowCard } from './glow-card';

function stubMedia(matches: (query: string) => boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matches(query),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

const FINE_POINTER = (query: string) => query.includes('pointer: fine');

afterEach(() => vi.unstubAllGlobals());

describe('GlowCard', () => {
  it('writes the pointer position once per frame without re-rendering', () => {
    stubMedia(FINE_POINTER);
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
    const onRender = vi.fn();
    render(
      <Profiler id="card" onRender={onRender}>
        <GlowCard data-testid="card">content</GlowCard>
      </Profiler>,
    );
    const card = screen.getByTestId('card');
    const rendersAfterMount = onRender.mock.calls.length;

    fireEvent.pointerMove(card, { clientX: 10, clientY: 20 });
    fireEvent.pointerMove(card, { clientX: 30, clientY: 40 });
    expect(frames).toHaveLength(1);
    frames[0](0);

    // Only the empty layer is written, so the card's content needs no style recalculation.
    const layer = card.querySelector('.glow-card-layer') as HTMLElement;
    expect(layer.style.getPropertyValue('--glow-x')).toMatch(/px$/);
    expect(layer.style.getPropertyValue('--glow-y')).toMatch(/px$/);
    expect(card.style.getPropertyValue('--glow-x')).toBe('');
    expect(onRender.mock.calls.length).toBe(rendersAfterMount);
  });

  it.each([
    ['a coarse pointer', () => false],
    ['reduced motion', (query: string) => query.includes('pointer: fine') || query.includes('reduced-motion')],
  ])('does not follow the pointer under %s', (_name, matches) => {
    stubMedia(matches);
    const request = vi.fn();
    vi.stubGlobal('requestAnimationFrame', request);
    render(<GlowCard data-testid="card">content</GlowCard>);

    fireEvent.pointerMove(screen.getByTestId('card'), { clientX: 10, clientY: 20 });

    expect(request).not.toHaveBeenCalled();
    const layer = screen.getByTestId('card').querySelector('.glow-card-layer') as HTMLElement;
    expect(layer.style.getPropertyValue('--glow-x')).toBe('');
  });

  it('stops following after unmount', () => {
    stubMedia(FINE_POINTER);
    const cancel = vi.fn();
    vi.stubGlobal('requestAnimationFrame', () => 7);
    vi.stubGlobal('cancelAnimationFrame', cancel);
    const { unmount } = render(<GlowCard data-testid="card">content</GlowCard>);

    fireEvent.pointerMove(screen.getByTestId('card'), { clientX: 10, clientY: 20 });
    unmount();

    expect(cancel).toHaveBeenCalledWith(7);
  });

  it('is neutral by default and carries a status tone only when told to', () => {
    stubMedia(() => false);
    render(
      <>
        <GlowCard data-testid="neutral">a</GlowCard>
        <GlowCard data-testid="critical" tone="danger">b</GlowCard>
      </>,
    );

    expect(screen.getByTestId('neutral')).toHaveClass('glow-card-accent');
    expect(screen.getByTestId('critical')).toHaveClass('glow-card-danger');
  });

  it('keeps the decorative layer away from assistive technology and passes landmarks through', () => {
    stubMedia(() => false);
    render(<GlowCard aria-label="Attention" as="section" data-testid="card">content</GlowCard>);

    const card = screen.getByRole('region', { name: 'Attention' });
    expect(card.querySelector('.glow-card-layer')).toHaveAttribute('aria-hidden', 'true');
  });
});
