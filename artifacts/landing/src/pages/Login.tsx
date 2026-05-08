import { useState, type FormEvent } from "react";
import { Lock, Loader2 } from "lucide-react";
import { setToken } from "@/lib/auth";

interface Props {
  onSuccess: () => void;
}

export default function Login({ onSuccess }: Props) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        token?: string;
        error?: string;
      };
      if (!res.ok || !data.token) {
        setError(data.error ?? "登录失败");
        return;
      }
      setToken(data.token);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200 mb-4">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">管理员登录</h1>
          <p className="text-sm text-slate-500 mt-1">请输入管理员密码继续</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="ADMIN_PASSWORD"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            登录
          </button>

          <p className="text-xs text-slate-400 text-center pt-2">
            密码由部署方在环境变量 <code className="px-1 py-0.5 bg-slate-100 rounded">ADMIN_PASSWORD</code> 中设置
          </p>
        </form>
      </div>
    </div>
  );
}
