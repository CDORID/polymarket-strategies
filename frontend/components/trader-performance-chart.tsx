"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TraderPerformanceChartProps {
  equityCurve: number[];
  timestamps: number[];
  cumulativePnl: number[];
}

export function TraderEquityCurveChart({
  equityCurve,
  timestamps,
  cumulativePnl,
}: TraderPerformanceChartProps) {
  const data = equityCurve.map((eq, i) => ({
    index: i,
    equity: eq,
    pnl: cumulativePnl[i] ?? 0,
    time: timestamps[i] && timestamps[i] > 0
      ? new Date(timestamps[i] * 1000).toLocaleDateString()
      : i.toString(),
  }));

  const sampled =
    data.length > 500
      ? data.filter(
          (_, i) =>
            i % Math.ceil(data.length / 500) === 0 || i === data.length - 1
        )
      : data;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
        Equity Curve
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={sampled}>
          <defs>
            <linearGradient id="traderEquityGrad" x1="0" y1="0" x2="0" y2="1">
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
          <YAxis tick={{ fontSize: 10, fill: "#888" }} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a2e",
              border: "1px solid #333",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "#888" }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, "Equity"]}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke="#3b82f6"
            fill="url(#traderEquityGrad)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface MonthlyReturnsChartProps {
  monthlyReturns: { month: string; pnl: number }[];
}

export function MonthlyReturnsChart({ monthlyReturns }: MonthlyReturnsChartProps) {
  const data = monthlyReturns.map((mr) => ({
    month: mr.month,
    pnl: mr.pnl,
    fill: mr.pnl >= 0 ? "#22c55e" : "#ef4444",
  }));

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
          Monthly Returns
        </h3>
        <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
          No monthly data available
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
        Monthly Returns
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#888" }} />
          <YAxis tick={{ fontSize: 10, fill: "#888" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a2e",
              border: "1px solid #333",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, "P&L"]}
          />
          <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <rect key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface CumulativePnlChartProps {
  cumulativePnl: number[];
  timestamps: number[];
}

export function CumulativePnlChart({
  cumulativePnl,
  timestamps,
}: CumulativePnlChartProps) {
  const data = cumulativePnl.map((pnl, i) => ({
    index: i,
    pnl,
    time: timestamps[i] && timestamps[i] > 0
      ? new Date(timestamps[i] * 1000).toLocaleDateString()
      : i.toString(),
  }));

  const sampled =
    data.length > 500
      ? data.filter(
          (_, i) =>
            i % Math.ceil(data.length / 500) === 0 || i === data.length - 1
        )
      : data;

  const isProfit = (cumulativePnl[cumulativePnl.length - 1] ?? 0) >= 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
        Cumulative P&L
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={sampled}>
          <defs>
            <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={isProfit ? "#22c55e" : "#ef4444"}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={isProfit ? "#22c55e" : "#ef4444"}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: "#888" }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 10, fill: "#888" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a2e",
              border: "1px solid #333",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, "P&L"]}
          />
          <Area
            type="monotone"
            dataKey="pnl"
            stroke={isProfit ? "#22c55e" : "#ef4444"}
            fill="url(#pnlGrad)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
