import { RotateCcw, Activity, ArrowDownToLine, ArrowUpFromLine, Database, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { useStats, useResetStats, type AccountStats } from "@/hooks/useAdmin";

function StatCard({
  label, value, sub, icon, color,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {value.toLocaleString()}
          </p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function sumStats(stats: Record<string, AccountStats>) {
  const total = { requests: 0, inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0, cacheHitTokens: 0 };
  for (const s of Object.values(stats)) {
    total.requests += s.requests;
    total.inputTokens += s.inputTokens;
    total.outputTokens += s.outputTokens;
    total.cacheWriteTokens += s.cacheWriteTokens;
    total.cacheHitTokens += s.cacheHitTokens;
  }
  return total;
}

const CHART_COLORS = ["#6366f1", "#06b6d4", "#f59e0b", "#10b981"];

export default function Stats() {
  const { data: stats = {}, isLoading } = useStats();
  const reset = useResetStats();

  const total = sumStats(stats);
  const entries = Object.entries(stats);

  const chartData = entries.map(([, s]) => ({
    name: s.label.length > 12 ? s.label.slice(0, 12) + "…" : s.label,
    输入: s.inputTokens,
    输出: s.outputTokens,
    缓存写入: s.cacheWriteTokens,
    缓存命中: s.cacheHitTokens,
  }));

  const cacheHitRate =
    total.cacheHitTokens + total.inputTokens > 0
      ? ((total.cacheHitTokens / (total.inputTokens + total.cacheHitTokens)) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">用量统计</h2>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            每 5 秒自动刷新
          </p>
        </div>
        <button
          onClick={() => reset.mutate()}
          disabled={reset.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" /> 重置
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-sm text-slate-400">加载中…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard
              label="总请求数"
              value={total.requests}
              icon={<Activity className="w-4 h-4 text-indigo-600" />}
              color="bg-indigo-100"
            />
            <StatCard
              label="输入 Tokens"
              value={total.inputTokens}
              icon={<ArrowDownToLine className="w-4 h-4 text-cyan-600" />}
              color="bg-cyan-100"
            />
            <StatCard
              label="输出 Tokens"
              value={total.outputTokens}
              icon={<ArrowUpFromLine className="w-4 h-4 text-amber-600" />}
              color="bg-amber-100"
            />
            <StatCard
              label="缓存写入"
              value={total.cacheWriteTokens}
              icon={<Database className="w-4 h-4 text-violet-600" />}
              color="bg-violet-100"
            />
            <StatCard
              label="缓存命中"
              value={total.cacheHitTokens}
              sub={`命中率 ${cacheHitRate}%`}
              icon={<Zap className="w-4 h-4 text-emerald-600" />}
              color="bg-emerald-100"
            />
          </div>

          {chartData.length > 0 && total.requests > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">各账号 Token 用量</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    }}
                    labelStyle={{ color: "#0f172a", fontWeight: 600 }}
                    itemStyle={{ color: "#475569" }}
                  />
                  <Legend wrapperStyle={{ color: "#475569", fontSize: 12, paddingTop: 8 }} />
                  {["输入", "输出", "缓存写入", "缓存命中"].map((key, i) => (
                    <Bar key={key} dataKey={key} fill={CHART_COLORS[i]} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {(entries.length === 0 || total.requests === 0) && (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl py-12 text-center">
              <Activity className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">暂无统计数据</p>
              <p className="text-xs text-slate-400 mt-1">发起 API 调用后数据会显示在这里</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
