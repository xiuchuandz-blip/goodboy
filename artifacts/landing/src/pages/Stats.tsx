import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useStats, useResetStats, type AccountStats } from "@/hooks/useAdmin";

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <Card className="bg-zinc-800/60 border-zinc-700">
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-zinc-400 mb-1">{label}</p>
        <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
        {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function sumStats(stats: Record<string, AccountStats>): AccountStats & { label: string } {
  const total = { requests: 0, inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0, cacheHitTokens: 0, label: "全部" };
  for (const s of Object.values(stats)) {
    total.requests += s.requests;
    total.inputTokens += s.inputTokens;
    total.outputTokens += s.outputTokens;
    total.cacheWriteTokens += s.cacheWriteTokens;
    total.cacheHitTokens += s.cacheHitTokens;
  }
  return total;
}

const CHART_COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#f43f5e", "#a855f7"];

export default function Stats() {
  const { data: stats = {}, isLoading } = useStats();
  const reset = useResetStats();

  const total = sumStats(stats);
  const entries = Object.entries(stats);

  const chartData = entries.map(([, s]) => ({
    name: s.label,
    输入: s.inputTokens,
    输出: s.outputTokens,
    缓存写入: s.cacheWriteTokens,
    缓存命中: s.cacheHitTokens,
  }));

  const cacheHitRate =
    total.inputTokens > 0
      ? ((total.cacheHitTokens / (total.inputTokens + total.cacheHitTokens)) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-zinc-400">每 5 秒自动刷新</h2>
        <Button
          size="sm"
          variant="outline"
          className="gap-1 border-zinc-600 text-zinc-300 hover:bg-zinc-800"
          onClick={() => reset.mutate()}
          disabled={reset.isPending}
        >
          <RotateCcw className="w-3.5 h-3.5" /> 重置统计
        </Button>
      </div>

      {isLoading ? (
        <p className="text-zinc-400 text-sm text-center py-8">加载中…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="总请求数" value={total.requests} />
            <StatCard label="输入 Tokens" value={total.inputTokens} />
            <StatCard label="输出 Tokens" value={total.outputTokens} />
            <StatCard label="缓存写入" value={total.cacheWriteTokens} />
            <StatCard
              label="缓存命中"
              value={total.cacheHitTokens}
              sub={`命中率 ${cacheHitRate}%`}
            />
          </div>

          {chartData.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-white text-sm">各账号 Token 用量</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                    <YAxis stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                      labelStyle={{ color: "#e4e4e7" }}
                      itemStyle={{ color: "#a1a1aa" }}
                    />
                    <Legend wrapperStyle={{ color: "#a1a1aa", fontSize: 12 }} />
                    {["输入", "输出", "缓存写入", "缓存命中"].map((key, i) => (
                      <Bar key={key} dataKey={key} fill={CHART_COLORS[i]} radius={[3, 3, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {entries.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-8">
              暂无统计数据，发起 API 调用后数据会显示在这里
            </p>
          )}
        </>
      )}
    </div>
  );
}
