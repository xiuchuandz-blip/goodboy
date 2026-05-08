import { useState } from "react";
import { Plus, Trash2, Pin, PinOff, Server, Key, Tag, X } from "lucide-react";
import {
  useAccounts, useAddAccount, useRemoveAccount, useSettings, useUpdateSettings,
  type AccountRow,
} from "@/hooks/useAdmin";

function AddAccountForm({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const add = useAddAccount();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    add.mutate(
      { url: url.trim(), key: key.trim(), label: label.trim() || url.trim() },
      {
        onSuccess: () => {
          setUrl(""); setKey(""); setLabel("");
          onClose();
        },
      },
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gradient-to-b from-indigo-50/50 to-white border-2 border-indigo-200 rounded-xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">添加新账号</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" /> 别名（可选）
        </label>
        <input
          type="text"
          placeholder="例如：主账号、备用号"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5" /> 上游 URL
        </label>
        <input
          type="text"
          placeholder="https://xxx.replit.dev/api"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400 font-mono"
        />
        <p className="text-xs text-slate-500">URL 末尾不要带斜杠</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
          <Key className="w-3.5 h-3.5" /> 上游 Key
        </label>
        <input
          type="password"
          placeholder="sk-..."
          value={key}
          onChange={(e) => setKey(e.target.value)}
          required
          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400 font-mono"
        />
      </div>

      {add.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
          {(add.error as Error).message}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={add.isPending || !url.trim() || !key.trim()}
          className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {add.isPending ? "添加中…" : "确认添加"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors"
        >
          取消
        </button>
      </div>
    </form>
  );
}

function AccountCard({ account }: { account: AccountRow }) {
  const remove = useRemoveAccount();
  const { data: settings } = useSettings();
  const update = useUpdateSettings();
  const [confirming, setConfirming] = useState(false);

  const isPinned = settings?.routingStrategy === account.url;

  function togglePin() {
    update.mutate({
      routingStrategy: isPinned ? "round-robin" : account.url,
    });
  }

  return (
    <div
      className={`group relative bg-white border rounded-xl p-4 transition-all hover:shadow-md ${
        isPinned ? "border-indigo-300 ring-1 ring-indigo-200" : "border-slate-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            isPinned ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"
          }`}
        >
          <Server className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 truncate">{account.label}</span>
            {isPinned && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-md">
                <Pin className="w-3 h-3" /> 已固定
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 truncate mt-1 font-mono">
            {account.url}
          </div>
          <div className="text-xs text-slate-400 mt-0.5 font-mono">
            Key: {account.keyHint}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={togglePin}
            title={isPinned ? "取消固定，切回轮询" : "固定到此账号"}
            className={`p-2 rounded-lg transition-colors ${
              isPinned
                ? "text-indigo-600 hover:bg-indigo-50"
                : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
            }`}
          >
            {isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
          </button>
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              title="删除此账号"
              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { remove.mutate(account.index); setConfirming(false); }}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md"
              >
                确认删除
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-md"
              >
                取消
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Accounts() {
  const { data: accounts = [], isLoading } = useAccounts();
  const { data: settings } = useSettings();
  const [showForm, setShowForm] = useState(false);

  const strategy = settings?.routingStrategy ?? "round-robin";
  const isRoundRobin = strategy === "round-robin";
  const pinnedAcc = accounts.find((a) => a.url === strategy);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">上游账号</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {isRoundRobin
                ? `当前策略：轮询 · 共 ${accounts.length} 个账号`
                : `当前策略：固定到 ${pinnedAcc?.label ?? "未知账号"}`}
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" /> 添加账号
            </button>
          )}
        </div>
      </div>

      {showForm && <AddAccountForm onClose={() => setShowForm(false)} />}

      {isLoading && (
        <div className="text-center py-8 text-sm text-slate-400">加载中…</div>
      )}

      {!isLoading && accounts.length === 0 && !showForm && (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl py-12 text-center">
          <Server className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">暂无账号</p>
          <p className="text-xs text-slate-400 mt-1">点击上方「添加账号」开始</p>
        </div>
      )}

      <div className="space-y-2.5">
        {accounts.map((acc) => (
          <AccountCard key={`${acc.index}-${acc.url}`} account={acc} />
        ))}
      </div>
    </div>
  );
}
