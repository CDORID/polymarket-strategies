"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts";

interface BacktestChartProps {
  equityCurve: number[];
  prices: number[];
  timestamps: number[];
  initialCapital?: number;
}

export function EquityCurveChart({
  equityCurve,
  timestamps,
  initialCapital = 1000,
}: BacktestChartProps) {
  const data = equityCurve.map((eq, i) => ({
    index: i,
    equity: eq,
    time: timestamps[i]
      ? new Date(timestamps[i] * 1000).toLocaleDateString()
      : i.toString(),
  }));

  // Sample if too many points
  const sampled = data.length > 500
    ? data.filter((_, i) => i % Math.ceil(data.length / 500) === 0 || i === data.length - 1)
    : data;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
        Equity Curve
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={sampled}>
          <defs>
            <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: "#888" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#888" }}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a2e",
              border: "1px solid #333",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "#888" }}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke="#3b82f6"
            fill="url(#equityGrad)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PriceChart({
  prices,
  timestamps,
}: {
  prices: number[];
  timestamps: number[];
}) {
  const data = prices.map((p, i) => ({
    index: i,
    price: p,
    time: timestamps[i]
      ? new Date(timestamps[i] * 1000).toLocaleDateString()
      : i.toString(),
  }));

  const sampled = data.length > 500
    ? data.filter((_, i) => i % Math.ceil(data.length / 500) === 0 || i === data.length - 1)
    : data;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
        Market Price
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={sampled}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: "#888" }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 10, fill: "#888" }} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a2e",
              border: "1px solid #333",
              borderRadius: "8px",
            }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#a855f7"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
