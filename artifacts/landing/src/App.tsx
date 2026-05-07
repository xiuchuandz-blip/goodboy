import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Settings2, BarChart3 } from "lucide-react";
import Accounts from "@/pages/Accounts";
import SettingsPage from "@/pages/Settings";
import Stats from "@/pages/Stats";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

function Dashboard() {
  const [tab, setTab] = useState("accounts");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#09090b",
        color: "#fff",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff", margin: 0 }}>
            🔀 API 代理管理面板
          </h1>
          <p style={{ fontSize: "0.85rem", color: "#71717a", marginTop: "0.25rem" }}>
            账号管理 · 调用策略 · 缓存控制 · 用量统计
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList
            style={{
              background: "#18181b",
              border: "1px solid #27272a",
              borderRadius: 10,
              padding: "4px",
              marginBottom: "1.25rem",
              display: "flex",
              gap: 2,
            }}
          >
            <TabsTrigger value="accounts" style={{ gap: 6, flex: 1, borderRadius: 7 }}>
              <Users className="w-4 h-4" /> 账号
            </TabsTrigger>
            <TabsTrigger value="settings" style={{ gap: 6, flex: 1, borderRadius: 7 }}>
              <Settings2 className="w-4 h-4" /> 设置
            </TabsTrigger>
            <TabsTrigger value="stats" style={{ gap: 6, flex: 1, borderRadius: 7 }}>
              <BarChart3 className="w-4 h-4" /> 统计
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accounts">
            <Accounts />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsPage />
          </TabsContent>
          <TabsContent value="stats">
            <Stats />
          </TabsContent>
        </Tabs>
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
