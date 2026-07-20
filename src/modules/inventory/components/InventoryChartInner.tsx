import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartPoint } from '../types';

type Props = {
  data: ChartPoint[];
  color: string;
  valueFormatter?: (value: number) => string;
};

export default function InventoryChartInner({ data, color, valueFormatter }: Props) {
  const format = valueFormatter || ((v: number) => String(v));

  return (
    <div className="h-44 w-full sm:h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: '#64748B' }}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tick={{ fontSize: 12, fill: '#64748B' }}
            tickFormatter={(v) => format(Number(v))}
          />
          <Tooltip
            formatter={(value) => [format(Number(value)), 'Value']}
            labelClassName="font-semibold text-slate-800"
            contentStyle={{
              borderRadius: 12,
              borderColor: '#E2E8F0',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
              fontSize: 13,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: color }}
            isAnimationActive
            animationDuration={500}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
