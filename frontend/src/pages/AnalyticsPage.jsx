import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
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
import { ArrowLeft, Activity, Key, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const METHOD_COLORS = {
  GET: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  PUT: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  DELETE: "bg-red-500/15 text-red-400 border-red-500/30",
  PATCH: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

function StatusColor({ code }) {
  if (code >= 200 && code < 300) return <span className="text-[#22C55E] font-mono text-xs">{code}</span>;
  if (code >= 400 && code < 500) return <span className="text-[#EAB308] font-mono text-xs">{code}</span>;
  if (code >= 500) return <span className="text-[#EF4444] font-mono text-xs">{code}</span>;
  return <span className="text-[#A1A1AA] font-mono text-xs">{code}</span>;
}

function relativeTime(iso) {
  if (!iso) return "—";
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

function formatNumber(n) {
  if (n == null) return "0";
  return n.toLocaleString();
}

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-[#18181B] rounded-sm ${className}`} />;
}

function StatCard({ icon: Icon, label, value, suffix, testId }) {
  return (
    <div
      className="bg-[#0F0F12] border border-[#27272A] rounded-lg p-5"
      data-testid={testId}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-[#71717A]" />
        <span className="text-xs text-[#71717A] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className="text-[#FAFAFA] text-3xl font-bold tracking-tight">
        {value}
        {suffix && <span className="text-lg font-normal text-[#71717A] ml-0.5">{suffix}</span>}
      </p>
    </div>
  );
}

function CustomTooltipArea({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#18181B] border border-[#27272A] rounded-sm px-3 py-2 text-xs shadow-lg">
      <p className="text-[#71717A] mb-1">{label}</p>
      <p className="text-[#FAFAFA] font-medium">{formatNumber(payload[0].value)} calls</p>
    </div>
  );
}

function CustomTooltipBar({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#18181B] border border-[#27272A] rounded-sm px-3 py-2 text-xs shadow-lg">
      <p className="text-[#FAFAFA] font-medium">{formatNumber(payload[0].value)} calls</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [projRes, analyticsRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/analytics`),
      ]);
      setProject(projRes.data);
      setData(analyticsRes.data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <AppLayout>
        <div data-testid="analytics-loading" className="pb-12">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  const isEmpty = !data || data.totalCalls === 0;

  return (
    <AppLayout>
      <div data-testid="analytics-page" className="pb-12">
        {/* Back + Header */}
        <button
          onClick={() => navigate(`/endpoints/${projectId}`)}
          data-testid="analytics-back-btn"
          className="flex items-center gap-1.5 text-xs text-[#71717A] hover:text-[#FAFAFA] transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to project
        </button>

        <div className="mb-8">
          <h1 className="text-[#FAFAFA] text-2xl font-semibold tracking-tight" data-testid="analytics-title">
            API Analytics
          </h1>
          <p className="text-[#71717A] text-sm mt-1">{project?.name}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" data-testid="stats-cards">
          <StatCard icon={Activity} label="Total Calls" value={formatNumber(data?.totalCalls || 0)} testId="stat-total-calls" />
          <StatCard icon={Key} label="Active Keys" value={data?.activeKeys || 0} testId="stat-active-keys" />
          <StatCard icon={Clock} label="Avg Latency" value={data?.avgLatency || 0} suffix="ms" testId="stat-avg-latency" />
          <StatCard icon={AlertTriangle} label="Error Rate" value={data?.errorRate || 0} suffix="%" testId="stat-error-rate" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Area Chart - Calls Over Time */}
          <div className="bg-[#0F0F12] border border-[#27272A] rounded-lg p-5" data-testid="chart-calls-over-time">
            <h2 className="text-[#FAFAFA] text-lg font-semibold mb-4">API Calls Over Time</h2>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data?.callsByDay || []}>
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#71717A", fontSize: 11 }}
                  axisLine={{ stroke: "#27272A" }}
                  tickLine={false}
                  tickFormatter={(v) => {
                    const d = new Date(v + "T00:00:00");
                    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  }}
                />
                <YAxis
                  tick={{ fill: "#71717A", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltipArea />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="url(#blueGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#2563EB", stroke: "#0F0F12", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
            {isEmpty && (
              <p className="text-center text-[#3F3F46] text-xs mt-2">No traffic data yet</p>
            )}
          </div>

          {/* Bar Chart - Top Endpoints */}
          <div className="bg-[#0F0F12] border border-[#27272A] rounded-lg p-5" data-testid="chart-top-endpoints">
            <h2 className="text-[#FAFAFA] text-lg font-semibold mb-4">Top Endpoints</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={data?.callsByEndpoint || []}
                layout="vertical"
                margin={{ left: 10, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: "#71717A", fontSize: 11 }}
                  axisLine={{ stroke: "#27272A" }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="endpoint"
                  tick={{ fill: "#A1A1AA", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                  axisLine={false}
                  tickLine={false}
                  width={140}
                />
                <Tooltip content={<CustomTooltipBar />} cursor={{ fill: "#18181B" }} />
                <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
            {isEmpty && (
              <p className="text-center text-[#3F3F46] text-xs mt-2">No endpoint data yet</p>
            )}
          </div>
        </div>

        {/* Recent Requests Table */}
        <div className="bg-[#0F0F12] border border-[#27272A] rounded-lg overflow-hidden" data-testid="recent-requests">
          <div className="px-5 py-4 border-b border-[#27272A]">
            <h2 className="text-[#FAFAFA] text-lg font-semibold">Recent Requests</h2>
          </div>
          {(data?.recentRequests?.length || 0) === 0 ? (
            <div className="px-5 py-12 text-center" data-testid="empty-requests">
              <p className="text-[#FAFAFA] font-medium mb-1">No API traffic yet</p>
              <p className="text-[#71717A] text-sm">
                Once consumers start using your API, you'll see analytics here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#18181B] border-b border-[#27272A]">
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">Time</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">Endpoint</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">Method</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">API Key</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">Status</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentRequests.map((r, i) => (
                    <tr key={i} className="border-b border-[#27272A] last:border-0" data-testid={`request-row-${i}`}>
                      <td className="px-4 py-2.5 text-xs text-[#71717A] whitespace-nowrap">{relativeTime(r.timestamp)}</td>
                      <td className="px-4 py-2.5">
                        <code className="font-mono text-xs text-[#FAFAFA]">{r.endpoint}</code>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center justify-center text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-sm border ${METHOD_COLORS[r.method] || METHOD_COLORS.GET}`}>
                          {r.method}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[#A1A1AA]">{r.keyName || "—"}</td>
                      <td className="px-4 py-2.5"><StatusColor code={r.statusCode} /></td>
                      <td className="px-4 py-2.5 text-xs text-[#71717A] font-mono">{r.latencyMs}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
