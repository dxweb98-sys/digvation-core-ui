import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MiniBars } from './mini-bars';
import { RingGauge } from './ring-gauge';

describe('RingGauge', () => {
  it('names the value and its note, so status is never color alone', () => {
    render(<RingGauge label="Memory" note="Critical pressure" tone="critical" value={91} />);

    const gauge = screen.getByRole('img', { name: 'Memory: 91%, Critical pressure' });
    expect(gauge).toHaveClass('ring-gauge-critical');
    expect(within(gauge).getByText('91%')).toBeInTheDocument();
    expect(within(gauge).getByText('Memory')).toBeInTheDocument();
    expect(within(gauge).getByText('Critical pressure')).toBeInTheDocument();
  });

  it('accepts a contextual name', () => {
    render(<RingGauge description="40% of 5 installations are healthy" label="Healthy share" tone="warning" value={40} />);

    expect(screen.getByRole('img', { name: '40% of 5 installations are healthy' })).toBeInTheDocument();
  });

  it.each([[-5, '0%', '100'], [140, '100%', '0'], [25, '25%', '75']])('keeps %s inside the dial', (value, text, offset) => {
    const { container } = render(<RingGauge label="CPU" tone="normal" value={value} />);

    expect(screen.getByText(text)).toBeInTheDocument();
    const ring = container.querySelector('.ring-gauge-value') as SVGElement;
    expect(ring.style.getPropertyValue('--ring-offset')).toBe(offset);
  });
});

describe('MiniBars', () => {
  const POINTS = [
    { label: 'Nov 3', value: 1 },
    { label: 'Nov 4', value: 2 },
    { label: 'Nov 5', value: 4 },
  ];

  it('highlights only the latest bar and scales from the highest value', () => {
    const { container } = render(<MiniBars label="Incidents" points={POINTS} valueLabel="Incidents" />);

    const bars = [...container.querySelectorAll<HTMLElement>('.mini-bar')];
    expect(bars.map((bar) => bar.classList.contains('mini-bar-latest'))).toEqual([false, false, true]);
    expect(bars.map((bar) => bar.style.height)).toEqual(['25%', '50%', '100%']);
  });

  it('has an accessible name and a table of the exact values', () => {
    render(<MiniBars label="Incidents over 7 days" points={POINTS} valueLabel="Incidents" />);

    expect(screen.getByRole('img', { name: 'Incidents over 7 days' })).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Incidents over 7 days' });
    expect(within(table).getByText('Nov 5').closest('tr')).toHaveTextContent('4');
  });

  it('renders an all-zero series without dividing by zero', () => {
    const { container } = render(
      <MiniBars label="None" points={[{ label: 'Nov 5', value: 0 }]} valueLabel="Incidents" />,
    );

    expect(container.querySelector<HTMLElement>('.mini-bar')?.style.height).toBe('0%');
  });
});
