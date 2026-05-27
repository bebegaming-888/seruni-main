/**
 * DashboardCharts — Lazy-loaded Recharts components for Admin dashboard
 *
 * Extracted from Admin.tsx to enable code-splitting.
 * Recharts bundle is ~379 KB — only load when dashboard is viewed.
 */

import { memo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { SuratRecord } from "@/lib/esurat-store";

type StatusKey = SuratRecord["status"];

const STATUS_COLORS: Record<StatusKey, string> = {
  "Menunggu Verifikasi": "hsl(var(--warning))",
  Diverifikasi: "hsl(var(--info))",
  "Menunggu Approval": "hsl(var(--primary))",
  Disetujui: "hsl(var(--success))",
  Ditolak: "hsl(var(--destructive))",
};

interface DashboardChartsProps {
  statusData: Array<{ name: string; value: number }>;
  monthlyData: Array<{ month: string; count: number }>;
}

export const DashboardCharts = memo(function DashboardCharts({
  statusData,
  monthlyData,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Status Distribution Pie Chart */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-ui text-base font-semibold mb-4">Distribusi Status</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.name}: ${entry.value}`}
              outerRadius={90}
              fill="#8884d8"
              dataKey="value"
            >
              {statusData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={STATUS_COLORS[entry.name as StatusKey] ?? "hsl(var(--muted))"}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Trend Bar Chart */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-ui text-base font-semibold mb-4">Tren Bulanan</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
