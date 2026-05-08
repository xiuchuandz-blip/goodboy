import { useEffect, useState } from "react";
import { Save, Check, Shuffle, Pin, Database, Clock } from "lucide-react";
import { useSettings, useUpdateSettings, useAccounts, type Settings } from "@/hooks/useAdmin";

const CACHE_MODES: { value: Settings["cacheMode"]; label: string; desc: string }[] = [
  { value: "none", label: "不启用", desc: "不修改请求体" },
  { value: "system-only", label: "System Only", desc: "仅缓存 system prompt" },
  { value: "system+rolling", label: "System + Rolling", desc: "滚动缓存对话历史" },
];

const CACHE_TTLS: { value: Settings["cacheTTL"]; label: string; sub: string }[] = [
  { value: "5m", label: "5 分钟", sub: "ephemeral" },
  { value: "1h", label: "1 小时", sub: "需 extended beta" },
];

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500 mt-0.5">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function OptionGrid<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string; sub?: string; desc?: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`relative text-left p-3 rounded-lg border-2 transition-all ${
              active
                ? "border-indigo-500 bg-indigo-50"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {opt.icon && (
                <div className={active ? "text-indigo-600" : "text-slate-400"}>{opt.icon}</div>
              )}
              <span className={`text-sm font-medium ${active ? "text-indigo-900" : "text-slate-700"}`}>
                {opt.label}
              </span>
              {active && <Check className="w-4 h-4 text-indigo-600 ml-auto" />}
            </div>
            {(opt.sub || opt.desc) && (
              <p className="text-xs text-slate-500 mt-1">{opt.sub ?? opt.desc}</p>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const { data: accounts = [] } = useAccounts();
  const update = useUpdateSettings();

  const [form, setForm] = useState<Settings>({
    cacheMode: "none",
    cacheTTL: "5m",
    routingStrategy: "round-robin",
  });

  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  const isDirty = !!settings && JSON.stringify(form) !== JSON.stringify(settings);

  function handleSave() { update.mutate(form); }

  if (isLoading) {
    return <div className="text-center py-8 text-sm text-slate-400">加载中…</div>;
  }

  const routingOptions = [
    { value: "round-robin", label: "轮询", sub: "每次请求依次切换", icon: <Shuffle className="w-4 h-4" /> },
    ...accounts.map((a) => ({
      value: a.url,
      label: `固定：${a.label}`,
      sub: a.url,
      icon: <Pin className="w-4 h-4" />,
    })),
  ];

  return (
    <div className="space-y-4">
      <Section title="调用策略" desc="控制请求如何分配到上游账号">
        <div className="space-y-2">
          {routingOptions.map((opt) => {
            const active = form.routingStrategy === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setForm((f) => ({ ...f, routingStrategy: opt.value }))}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  active
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    active ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {opt.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${active ? "text-indigo-900" : "text-slate-700"}`}>
                    {opt.label}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate font-mono">{opt.sub}</div>
                </div>
                {active && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="缓存控制" desc="Anthropic Prompt Caching 注入策略">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" /> 缓存模式
            </label>
            <OptionGrid
              options={CACHE_MODES.map((m) => ({ value: m.value, label: m.label, desc: m.desc }))}
              value={form.cacheMode}
              onChange={(v) => setForm((f) => ({ ...f, cacheMode: v }))}
            />
          </div>

          {form.cacheMode !== "none" && (
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> 缓存时长
              </label>
              <OptionGrid
                options={CACHE_TTLS}
                value={form.cacheTTL}
                onChange={(v) => setForm((f) => ({ ...f, cacheTTL: v }))}
              />
              {form.cacheTTL === "1h" && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 mt-2 font-mono">
                  ⓘ 自动附加 anthropic-beta: extended-cache-ttl-2025-04-11
                </p>
              )}
            </div>
          )}
        </div>
      </Section>

      <div className="sticky bottom-4 bg-white border border-slate-200 rounded-xl p-3 shadow-lg flex items-center justify-between">
        <span className="text-sm text-slate-600">
          {update.isSuccess && !isDirty ? (
            <span className="text-emerald-600 font-medium flex items-center gap-1.5">
              <Check className="w-4 h-4" /> 已保存，立即生效
            </span>
          ) : isDirty ? (
            <span className="text-amber-600">有未保存的更改</span>
          ) : (
            "所有更改已保存"
          )}
        </span>
        <button
          onClick={handleSave}
          disabled={!isDirty || update.isPending}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {update.isPending ? "保存中…" : "保存更改"}
        </button>
      </div>
    </div>
  );
}
