import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useSettings, useUpdateSettings, useAccounts, type Settings } from "@/hooks/useAdmin";

const CACHE_MODE_LABELS: Record<string, string> = {
  none: "不启用",
  "system-only": "System Only（缓存 system prompt）",
  "system+rolling": "System + Rolling（滚动缓存）",
};

const CACHE_TTL_LABELS: Record<string, string> = {
  "5m": "5 分钟（ephemeral）",
  "1h": "1 小时（需 extended beta header）",
};

export default function Settings() {
  const { data: settings, isLoading } = useSettings();
  const { data: accounts = [] } = useAccounts();
  const update = useUpdateSettings();

  const [form, setForm] = useState<Settings>({
    cacheMode: "none",
    cacheTTL: "5m",
    routingStrategy: "round-robin",
  });

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  function handleSave() {
    update.mutate(form);
  }

  const isDirty = settings && JSON.stringify(form) !== JSON.stringify(settings);

  if (isLoading) {
    return <p className="text-zinc-400 text-sm text-center py-8">加载中…</p>;
  }

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-white">调用策略</CardTitle>
          <CardDescription className="text-zinc-400">
            选择轮询所有账号，或固定指向某一个账号
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label className="text-zinc-300">路由方式</Label>
          <Select
            value={form.routingStrategy}
            onValueChange={(v) => setForm((f) => ({ ...f, routingStrategy: v }))}
          >
            <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-600">
              <SelectItem value="round-robin" className="text-white focus:bg-zinc-700">
                🔀 轮询（Round Robin）
              </SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={acc.index} value={acc.url} className="text-white focus:bg-zinc-700">
                  📌 固定：{acc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.routingStrategy !== "round-robin" && (
            <p className="text-xs text-zinc-500">
              URL：{form.routingStrategy}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-white">缓存控制</CardTitle>
          <CardDescription className="text-zinc-400">
            注入 Anthropic Prompt Caching 相关字段（对非 Anthropic 上游透明传递）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">缓存模式</Label>
            <Select
              value={form.cacheMode}
              onValueChange={(v) => setForm((f) => ({ ...f, cacheMode: v as Settings["cacheMode"] }))}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-600">
                {Object.entries(CACHE_MODE_LABELS).map(([v, label]) => (
                  <SelectItem key={v} value={v} className="text-white focus:bg-zinc-700">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.cacheMode !== "none" && (
            <div className="space-y-2">
              <Label className="text-zinc-300">缓存时长（TTL）</Label>
              <Select
                value={form.cacheTTL}
                onValueChange={(v) => setForm((f) => ({ ...f, cacheTTL: v as Settings["cacheTTL"] }))}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-600">
                  {Object.entries(CACHE_TTL_LABELS).map(([v, label]) => (
                    <SelectItem key={v} value={v} className="text-white focus:bg-zinc-700">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.cacheTTL === "1h" && (
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-800 text-amber-200 text-xs">自动附加</Badge>
                  <span className="text-xs text-zinc-500 font-mono">
                    anthropic-beta: extended-cache-ttl-2025-04-11
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={!isDirty || update.isPending}
        className="w-full gap-2"
      >
        <Save className="w-4 h-4" />
        {update.isPending ? "保存中…" : isDirty ? "保存更改" : "已是最新"}
      </Button>
      {update.isSuccess && (
        <p className="text-green-400 text-sm text-center">✓ 已保存，立即生效</p>
      )}
    </div>
  );
}
