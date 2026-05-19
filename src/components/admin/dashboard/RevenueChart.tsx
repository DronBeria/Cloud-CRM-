"use client";

import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";

const RANGES = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "12M", value: "year" },
];

interface ChartPoint { date: string; revenue: number; }

interface Props {
  initialData?: ChartPoint[];
  initialRange?: string;
  totalRevenue?: number;
}

const formatInr = (val: number) =>
  val >= 100000
    ? `₹${(val / 100000).toFixed(1)}L`
    : val >= 1000
    ? `₹${(val / 1000).toFixed(0)}K`
    : `₹${val}`;

export function RevenueChart({ initialData = [], initialRange = "30d", totalRevenue = 0 }: Props) {
  const [range, setRange] = useState(initialRange);
  const [data, setData] = useState<ChartPoint[]>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (range === initialRange && initialData.length > 0) {
      setData(initialData);
      return;
    }
    setLoading(true);
    fetch(`/api/admin/dashboard?range=${range}`)
      .then((r) => r.json())
      .then((d) => setData(d.chartData ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [range]);

  const total = data.reduce((s, d) => s + d.revenue, 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-100 rounded-lg shadow-lg px-3 py-2 text-xs">
        <p className="text-gray-500 mb-1">{label}</p>
        <p className="font-semibold text-gray-900">
          ₹{payload[0].value.toLocaleString("en-IN")}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Revenue</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">
            ₹{total.toLocaleString("en-IN")}
          </p>
        </div>
        {/* Range picker */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                range === r.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-52 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        )}
        {data.length === 0 && !loading ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-gray-400">No revenue data for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={formatInr}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#f97316"
                strokeWidth={2}
                fill="url(#revenueGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "#f97316", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
