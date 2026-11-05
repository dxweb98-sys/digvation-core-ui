import { AppAction } from '../ui/app-action';
import { useId, useState, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { usePrefersReducedMotion } from '../ui/use-prefers-reduced-motion';
import './charts.css';

/** Tokens only: SVG presentation attributes resolve var() in supported browsers. */
export const CHART_COLORS = {
  series1: 'var(--cc-series-1)',
  series2: 'var(--cc-series-2)',
  series3: 'var(--cc-series-3)',
  success: 'var(--cc-status-success)',
  warning: 'var(--cc-status-warning)',
  danger: 'var(--cc-status-danger)',
  info: 'var(--cc-status-info)',
  neutral: 'var(--cc-text-subtle)',
} as const;

const GRID_COLOR = 'var(--cc-line)';
const AXIS_TEXT = { fill: 'var(--cc-text-muted)', fontSize: 12 };
const SURFACE = 'var(--color-surface)';
const CURSOR = { fill: 'var(--cc-raised)' };
const ANIMATION_MS = 260;
const THRESHOLD_GUTTER = 72;

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

export interface ChartThreshold {
  value: number;
  label: string;
  color: string;
}

export interface ChartTableColumn {
  key: string;
  label: string;
}

type ChartRow = Record<string, string | number | null | undefined>;
type ChartData = ReadonlyArray<object>;
type Format = (value: number) => string;

export const formatPercent: Format = (value) => `${Math.round(value)}%`;
export const formatCount: Format = (value) => new Intl.NumberFormat('en').format(value);

function useHiddenSeries() {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const toggle = (key: string) => {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  return { hidden, toggle };
}

function SeriesLegend({
  series,
  hidden,
  onToggle,
}: {
  series: ChartSeries[];
  hidden: ReadonlySet<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="chart-legend" role="group" aria-label="Series">
      {series.map((item) => (
        <button
          aria-pressed={!hidden.has(item.key)}
          className="chart-legend-item"
          key={item.key}
          onClick={() => onToggle(item.key)}
          type="button"
        >
          <span className="chart-legend-swatch" style={{ background: item.color }} aria-hidden="true" />
          {item.label}
        </button>
      ))}
    </div>
  );
}

function ChartTooltip({
  active,
  label,
  payload,
  format,
  labelFormat,
}: {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<{ name?: unknown; value?: unknown; color?: string; dataKey?: unknown }>;
  format: Format;
  labelFormat?: (value: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label !== undefined ? (
        <p className="chart-tooltip-label">{labelFormat ? labelFormat(String(label)) : label}</p>
      ) : null}
      {payload.map((entry) => (
        <p className="chart-tooltip-row" key={String(entry.dataKey ?? entry.name)}>
          <span className="chart-legend-swatch" style={{ background: entry.color }} aria-hidden="true" />
          <span>{String(entry.name)}</span>
          <strong>{format(Number(entry.value))}</strong>
        </p>
      ))}
    </div>
  );
}

function renderTooltip(format: Format, labelFormat?: (value: string) => string) {
  return (props: object) => <ChartTooltip {...props} format={format} labelFormat={labelFormat} />;
}

function thresholdLines(thresholds: ChartThreshold[] = []) {
  return thresholds.map((threshold) => (
    <ReferenceLine
      ifOverflow="extendDomain"
      key={threshold.value}
      label={{ value: threshold.label, position: 'right', fill: 'var(--cc-text-muted)', fontSize: 11 }}
      stroke={threshold.color}
      strokeWidth={1}
      y={threshold.value}
    />
  ));
}

/** Right margin of a cartesian plot; thresholds need room for their gutter label. */
function plotMargin(thresholds?: ChartThreshold[]) {
  return { top: 8, right: thresholds?.length ? THRESHOLD_GUTTER : 8, bottom: 0, left: 0 };
}

function ChartDataTable({
  caption,
  columns,
  rows,
  visible,
}: {
  caption: string;
  columns: ChartTableColumn[];
  rows: ChartRow[];
  visible: boolean;
}) {
  return (
    <div className={visible ? 'chart-table-wrap' : 'visually-hidden'}>
      <table className="chart-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => <td key={column.key}>{row[column.key] ?? 'None'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A titled chart with a named region and a table twin, hidden until asked for. */
export function ChartCard({
  title,
  description,
  columns,
  rows,
  children,
  legend,
  actions,
  lead,
}: {
  title: string;
  description?: string;
  columns: ChartTableColumn[];
  rows: ChartRow[];
  children: ReactNode;
  legend?: ReactNode;
  /** Controls beside the title, such as a range toggle. */
  actions?: ReactNode;
  /** Headline figures between the heading and the plot. */
  lead?: ReactNode;
}) {
  const titleId = useId();
  const [showTable, setShowTable] = useState(false);

  return (
    <figure aria-labelledby={titleId} className="chart-card">
      <figcaption className="chart-card-heading">
        <div>
          <h3 id={titleId}>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        <div className="chart-card-actions">
          {actions}
          <AppAction
            aria-pressed={showTable}
            onClick={() => setShowTable((current) => !current)}
            size="sm"
            tone="tertiary"
          >
            {showTable ? 'View as chart' : 'View as table'}
          </AppAction>
        </div>
      </figcaption>
      {lead}
      {showTable ? null : legend}
      {showTable ? null : children}
      <ChartDataTable caption={title} columns={columns} rows={rows} visible={showTable} />
    </figure>
  );
}

function tableFor(
  xKey: string,
  xLabel: string,
  series: ChartSeries[],
  data: ChartData,
  format: Format,
  xFormat?: (value: string) => string,
) {
  return {
    columns: [{ key: xKey, label: xLabel }, ...series.map((item) => ({ key: item.key, label: item.label }))],
    rows: (data as ChartRow[]).map((row) => ({
      ...row,
      [xKey]: xFormat ? xFormat(String(row[xKey])) : row[xKey],
      ...Object.fromEntries(series.map((item) => [item.key, row[item.key] === undefined || row[item.key] === null ? null : format(Number(row[item.key]))])),
    })),
  };
}

interface CartesianChartProps {
  title: string;
  description?: string;
  data: ChartData;
  xKey: string;
  xLabel: string;
  xFormat?: (value: string) => string;
  series: ChartSeries[];
  format: Format;
  yMax?: number;
  thresholds?: ChartThreshold[];
  height?: number;
}

export function AreaTrendChart({
  title,
  description,
  data,
  xKey,
  xLabel,
  xFormat,
  series,
  format,
  yMax,
  thresholds,
  actions,
  lead,
  height = 280,
}: CartesianChartProps & { actions?: ReactNode; lead?: ReactNode }) {
  const { hidden, toggle } = useHiddenSeries();
  const reduced = usePrefersReducedMotion();
  const gradientBase = useId();
  const table = tableFor(xKey, xLabel, series, data, format, xFormat);

  return (
    <ChartCard
      {...table}
      actions={actions}
      description={description}
      lead={lead}
      legend={<SeriesLegend hidden={hidden} onToggle={toggle} series={series} />}
      title={title}
    >
      <div className="chart-area">
        <ResponsiveContainer height={height} width="100%">
          <AreaChart data={[...data]} margin={plotMargin(thresholds)}>
            <defs>
              {series.map((item) => (
                <linearGradient id={`${gradientBase}-${item.key}`} key={item.key} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={item.color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={item.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis
              axisLine={{ stroke: GRID_COLOR }}
              dataKey={xKey}
              minTickGap={32}
              tick={AXIS_TEXT}
              tickFormatter={xFormat}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              domain={[0, yMax ?? 'auto']}
              tick={AXIS_TEXT}
              tickFormatter={format}
              tickLine={false}
              width={44}
            />
            {thresholdLines(thresholds)}
            <Tooltip
              content={renderTooltip(format, xFormat)}
              cursor={{ stroke: 'var(--cc-text-muted)', strokeDasharray: '3 3' }}
              isAnimationActive={false}
            />
            {series.map((item) => (
              <Area
                activeDot={{ r: 5, fill: item.color, stroke: SURFACE, strokeWidth: 2 }}
                animationDuration={ANIMATION_MS}
                color={item.color}
                dataKey={item.key}
                dot={false}
                fill={`url(#${gradientBase}-${item.key})`}
                hide={hidden.has(item.key)}
                isAnimationActive={!reduced}
                key={item.key}
                name={item.label}
                stroke={item.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                type="monotone"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function ColumnChart({
  title,
  description,
  data,
  xKey,
  xLabel,
  xFormat,
  series,
  format,
  yMax,
  thresholds,
  stacked = false,
  height = 240,
}: CartesianChartProps & { stacked?: boolean }) {
  const { hidden, toggle } = useHiddenSeries();
  const reduced = usePrefersReducedMotion();
  const table = tableFor(xKey, xLabel, series, data, format, xFormat);

  return (
    <ChartCard
      {...table}
      description={description}
      legend={<SeriesLegend hidden={hidden} onToggle={toggle} series={series} />}
      title={title}
    >
      <ResponsiveContainer height={height} width="100%">
        <BarChart barCategoryGap="24%" barGap={2} data={[...data]} margin={plotMargin(thresholds)}>
          <CartesianGrid stroke={GRID_COLOR} vertical={false} />
          <XAxis
            axisLine={{ stroke: GRID_COLOR }}
            dataKey={xKey}
            minTickGap={24}
            tick={AXIS_TEXT}
            tickFormatter={xFormat}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            domain={[0, yMax ?? 'auto']}
            tick={AXIS_TEXT}
            tickFormatter={format}
            tickLine={false}
            width={44}
          />
          {thresholdLines(thresholds)}
          <Tooltip content={renderTooltip(format, xFormat)} cursor={CURSOR} isAnimationActive={false} />
          {series.map((item) => (
            <Bar
              animationDuration={ANIMATION_MS}
              dataKey={item.key}
              fill={item.color}
              hide={hidden.has(item.key)}
              isAnimationActive={!reduced}
              key={item.key}
              maxBarSize={24}
              name={item.label}
              radius={stacked ? 0 : [4, 4, 0, 0]}
              stackId={stacked ? 'stack' : undefined}
              stroke={stacked ? SURFACE : undefined}
              strokeWidth={stacked ? 2 : 0}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export interface DistributionRow {
  key: string;
  label: string;
  value: number;
  color: string;
}

function renderDistributionLabel(format: Format) {
  return (props: { x?: unknown; y?: unknown; width?: unknown; height?: unknown; value?: unknown }) => (
    <text
      className="chart-distribution-value"
      dominantBaseline="central"
      fill="var(--cc-text)"
      fontSize={12}
      x={Number(props.x) + Number(props.width) + 6}
      y={Number(props.y) + Number(props.height) / 2}
    >
      {format(Number(props.value))}
    </text>
  );
}

/** One value per named category: horizontal bars with the value at the tip. */
export function DistributionChart({
  title,
  description,
  rows,
  valueLabel,
  format = formatCount,
}: {
  title: string;
  description?: string;
  rows: DistributionRow[];
  valueLabel: string;
  format?: Format;
}) {
  const reduced = usePrefersReducedMotion();
  const height = rows.length * 36 + 8;

  return (
    <ChartCard
      columns={[{ key: 'label', label: 'Category' }, { key: 'value', label: valueLabel }]}
      description={description}
      rows={rows.map((row) => ({ label: row.label, value: format(row.value) }))}
      title={title}
    >
      <ResponsiveContainer height={height} width="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 0 }}>
          <XAxis allowDecimals={false} domain={[0, 'auto']} hide type="number" />
          <YAxis
            axisLine={false}
            dataKey="label"
            tick={AXIS_TEXT}
            tickLine={false}
            type="category"
            width={104}
          />
          <Tooltip content={renderTooltip(format)} cursor={CURSOR} isAnimationActive={false} />
          <Bar
            animationDuration={ANIMATION_MS}
            dataKey="value"
            isAnimationActive={!reduced}
            maxBarSize={16}
            // Recharts drops the label of a zero-width bar, so a zero keeps one invisible pixel.
            minPointSize={1}
            name={valueLabel}
            radius={[0, 4, 4, 0]}
          >
            {rows.map((row) => <Cell fill={row.value === 0 ? 'transparent' : row.color} key={row.key} />)}
            <LabelList content={renderDistributionLabel(format)} dataKey="value" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function Sparkline({
  label,
  data,
  dataKey,
}: {
  label: string;
  data: ChartData;
  dataKey: string;
}) {
  const reduced = usePrefersReducedMotion();

  return (
    <div aria-label={label} className="chart-sparkline" role="img">
      <ResponsiveContainer height={32} width="100%">
        <LineChart accessibilityLayer={false} data={[...data]} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Line
            animationDuration={ANIMATION_MS}
            dataKey={dataKey}
            dot={false}
            isAnimationActive={!reduced}
            stroke="var(--cc-text-muted)"
            strokeLinecap="round"
            strokeWidth={2}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
