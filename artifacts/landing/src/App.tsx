import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Users, Settings2, BarChart3, Zap } from "lucide-react";
import Accounts from "@/pages/Accounts";
import SettingsPage from "@/pages/Settings";
import Stats from "@/pages/Stats";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

const TABS = [
  { id: "accounts", label: "账号", icon: Users },
  { id: "settings", label: "设置", icon: Settings2 },
  { id: "stats", label: "统计", icon: BarChart3 },
] as const;

function Dashboard() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("accounts");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-none">
                API 代理管理面板
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                账号管理 · 调用策略 · 缓存控制 · 用量统计
              </p>
            </div>
          </div>
        </header>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1.5 mb-6 inline-flex w-full sm:w-auto">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>

        {tab === "accounts" && <Accounts />}
        {tab === "settings" && <SettingsPage />}
        {tab === "stats" && <Stats />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}
