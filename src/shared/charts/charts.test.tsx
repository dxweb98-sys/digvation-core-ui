import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  AreaTrendChart,
  CHART_COLORS,
  ColumnChart,
  DistributionChart,
  formatCount,
  formatPercent,
  Sparkline,
} from './charts';
import { usePrefersReducedMotion } from '../ui/use-prefers-reduced-motion';

const SERIES = [
  { key: 'cpu', label: 'CPU', color: CHART_COLORS.series1 },
  { key: 'memory', label: 'Memory', color: CHART_COLORS.series2 },
];
const DATA = [
  { node: 'atlas', cpu: 31, memory: 46 },
  { node: 'stark', cpu: 68, memory: 91 },
];

function renderColumns() {
  render(
    <ColumnChart
      data={DATA}
      format={formatPercent}
      series={SERIES}
      title="Node resources"
      xKey="node"
      xLabel="Node"
    />,
  );
}

describe('chart primitives', () => {
  it('names the chart and keeps a table alternative for assistive technology', () => {
    renderColumns();

    const figure = screen.getByRole('figure', { name: 'Node resources' });
    const table = within(figure).getByRole('table', { hidden: true });
    expect(within(table).getByText('stark')).toBeInTheDocument();
    expect(within(table).getByText('91%')).toBeInTheDocument();
    expect(table.parentElement).toHaveClass('visually-hidden');
  });

  it('switches between the chart and a visible table', () => {
    renderColumns();

    fireEvent.click(screen.getByRole('button', { name: 'View as table' }));
    const table = screen.getByRole('table');
    expect(table.parentElement).toHaveClass('chart-table-wrap');

    fireEvent.click(screen.getByRole('button', { name: 'View as chart' }));
    expect(screen.getByRole('table', { hidden: true }).parentElement).toHaveClass('visually-hidden');
  });

  it('lets the legend toggle a series, with state exposed beyond color', () => {
    renderColumns();

    const memory = screen.getByRole('button', { name: 'Memory' });
    expect(memory).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(memory);
    expect(memory).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'CPU' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders trend charts through the same frame', () => {
    render(
      <AreaTrendChart
        data={[{ at: '2026-11-04T12:00:00.000Z', cpu: 10, memory: 20 }]}
        format={formatPercent}
        series={SERIES}
        title="Node trend"
        xFormat={() => 'Nov 4'}
        xKey="at"
        xLabel="Time"
      />,
    );

    const table = screen.getByRole('table', { hidden: true });
    expect(within(table).getByText('Nov 4')).toBeInTheDocument();
    expect(within(table).getByText('20%')).toBeInTheDocument();
  });

  it('lists every category of a distribution, including zero', () => {
    render(
      <DistributionChart
        rows={[
          { key: 'a', label: 'Healthy', value: 2, color: CHART_COLORS.success },
          { key: 'b', label: 'Unknown', value: 0, color: CHART_COLORS.neutral },
        ]}
        title="Health"
        valueLabel="Installations"
      />,
    );

    const table = screen.getByRole('table', { hidden: true });
    expect(within(table).getByText('Unknown')).toBeInTheDocument();
    expect(within(table).getByText('0')).toBeInTheDocument();
  });

  it('keeps threshold labels out of the plotted area', () => {
    render(
      <ColumnChart
        data={DATA}
        format={formatPercent}
        series={SERIES}
        thresholds={[{ value: 90, label: 'Critical 90%', color: CHART_COLORS.danger }]}
        title="With thresholds"
        xKey="node"
        xLabel="Node"
      />,
    );

    expect(screen.getByRole('figure', { name: 'With thresholds' })).toBeInTheDocument();
  });

  it('describes a sparkline as text', () => {
    render(<Sparkline data={[{ at: 'a', value: 1 }]} dataKey="value" label="Clients over 7 days: from 3 to 4" />);

    expect(screen.getByRole('img', { name: 'Clients over 7 days: from 3 to 4' })).toBeInTheDocument();
  });

  it('formats percentages and counts', () => {
    expect(formatPercent(90.4)).toBe('90%');
    expect(formatCount(1200)).toBe('1,200');
  });

  it('never uses the accent as a chart color', () => {
    for (const color of Object.values(CHART_COLORS)) {
      expect(color).toMatch(/^var\(--cc-(series|status|text)/);
      expect(color).not.toContain('accent');
    }
  });

  it('reads the reduced motion preference', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    function Probe() {
      return <span>{usePrefersReducedMotion() ? 'reduced' : 'full'}</span>;
    }

    render(<Probe />);

    expect(screen.getByText('reduced')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
