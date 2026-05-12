import { useState, type FormEvent } from "react";
import { Plus, Trash2, KeyRound, Copy, Check, X, Server } from "lucide-react";
import {
  useAccessKeys, useAddAccessKey, useUpdateAccessKey, useRemoveAccessKey,
  useAccounts,
  type AccessKeyRow, type AccountRow, type Settings,
} from "@/hooks/useAdmin";

type CacheModeDraft = Settings["cacheMode"] | "inherit";
type CacheTTLDraft = Settings["cacheTTL"] | "inherit";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white border border-slate-300 hover:bg-slate-50 rounded-md text-slate-600 shrink-0"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
      {copied ? "已复制" : "复制"}
    </button>
  );
}

function UpstreamPicker({
  accounts,
  selected,
  onChange,
}: {
  accounts: AccountRow[];
  selected: string[] | null;
  onChange: (next: string[] | null) => void;
}) {
  const allMode = selected === null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
          <input
            type="radio"
            checked={allMode}
            onChange={() => onChange(null)}
            className="w-3.5 h-3.5 text-indigo-600"
          />
          全部上游账号
        </label>
        <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
          <input
            type="radio"
            checked={!allMode}
            onChange={() => onChange([])}
            className="w-3.5 h-3.5 text-indigo-600"
          />
          仅指定账号
        </label>
      </div>

      {!allMode && (
        <div className="border border-slate-200 rounded-lg p-2 max-h-48 overflow-y-auto bg-slate-50">
          {accounts.length === 0 ? (
            <p className="text-xs text-slate-400 px-2 py-3 text-center">还没有上游账号，请先到「账号」页添加</p>
          ) : (
            accounts.map((a) => {
              const checked = selected?.includes(a.url) ?? false;
              return (
                <label
                  key={a.url}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-white rounded-md cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const cur = selected ?? [];
                      onChange(e.target.checked ? [...cur, a.url] : cur.filter((u) => u !== a.url));
                    }}
                    className="w-3.5 h-3.5 text-indigo-600 rounded"
                  />
                  <Server className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs font-medium text-slate-700 truncate">{a.label}</span>
                  <span className="text-xs text-slate-400 truncate font-mono ml-auto">{a.url}</span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function CacheSettingsPicker({
  mode,
  ttl,
  onModeChange,
  onTTLChange,
}: {
  mode: CacheModeDraft;
  ttl: CacheTTLDraft;
  onModeChange: (next: CacheModeDraft) => void;
  onTTLChange: (next: CacheTTLDraft) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <label className="text-xs font-medium text-slate-600">
        <span className="block mb-1">缓存模式</span>
        <select
          value={mode}
          onChange={(e) => onModeChange(e.target.value as CacheModeDraft)}
          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="inherit">继承全局</option>
          <option value="none">关闭</option>
          <option value="system-only">仅系统提示</option>
          <option value="system+rolling">系统提示 + 滚动消息</option>
        </select>
      </label>
      <label className="text-xs font-medium text-slate-600">
        <span className="block mb-1">缓存时长</span>
        <select
          value={ttl}
          onChange={(e) => onTTLChange(e.target.value as CacheTTLDraft)}
          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
          disabled={mode === "none"}
        >
          <option value="inherit">继承全局</option>
          <option value="5m">5 分钟</option>
          <option value="1h">1 小时</option>
        </select>
      </label>
    </div>
  );
}

function buildCacheSettings(mode: CacheModeDraft, ttl: CacheTTLDraft): AccessKeyRow["cacheSettings"] | undefined {
  const next: AccessKeyRow["cacheSettings"] = {};
  if (mode !== "inherit") next.cacheMode = mode;
  if (ttl !== "inherit" && mode !== "none") next.cacheTTL = ttl;
  return Object.keys(next).length > 0 ? next : undefined;
}

function cacheLabel(k: AccessKeyRow): string {
  const mode = k.cacheSettings?.cacheMode ?? "inherit";
  const ttl = k.cacheSettings?.cacheTTL ?? "inherit";
  if (mode === "inherit" && ttl === "inherit") return "缓存：继承全局";
  if (mode === "none") return "缓存：关闭";
  return `缓存：${mode}${ttl !== "inherit" ? ` / ${ttl}` : " / 继承时长"}`;
}

function AddKeyForm({ accounts, onClose }: { accounts: AccountRow[]; onClose: () => void }) {
  const [name, setName] = useState("");
  const [allowed, setAllowed] = useState<string[] | null>(null);
  const [cacheMode, setCacheMode] = useState<CacheModeDraft>("inherit");
  const [cacheTTL, setCacheTTL] = useState<CacheTTLDraft>("inherit");
  const add = useAddAccessKey();
  const emptyWhitelist = Array.isArray(allowed) && allowed.length === 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || emptyWhitelist) return;
    add.mutate(
      { name: name.trim(), allowedUpstreams: allowed, cacheSettings: buildCacheSettings(cacheMode, cacheTTL) },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gradient-to-b from-indigo-50/50 to-white border-2 border-indigo-200 rounded-xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">创建调用密钥</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-600">密钥名称</label>
        <input
          type="text"
          placeholder="例如：客户端 A、移动端"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-600">可调用的上游</label>
        <UpstreamPicker accounts={accounts} selected={allowed} onChange={setAllowed} />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-600">缓存策略</label>
        <CacheSettingsPicker
          mode={cacheMode}
          ttl={cacheTTL}
          onModeChange={setCacheMode}
          onTTLChange={setCacheTTL}
        />
      </div>

      {emptyWhitelist && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
          ⚠ 「仅指定账号」模式下未勾选任何上游 — 该密钥将无法调用任何上游。
        </div>
      )}

      {add.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
          {(add.error as Error).message}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={add.isPending || !name.trim() || emptyWhitelist}
          className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {add.isPending ? "生成中…" : "生成密钥"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg"
        >
          取消
        </button>
      </div>
    </form>
  );
}

function KeyCard({ k, accounts }: { k: AccessKeyRow; accounts: AccountRow[] }) {
  const remove = useRemoveAccessKey();
  const update = useUpdateAccessKey();
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[] | null>(k.allowedUpstreams);
  const [cacheModeDraft, setCacheModeDraft] = useState<CacheModeDraft>(k.cacheSettings?.cacheMode ?? "inherit");
  const [cacheTTLDraft, setCacheTTLDraft] = useState<CacheTTLDraft>(k.cacheSettings?.cacheTTL ?? "inherit");
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(k.name);

  const allCount = accounts.length;
  const allowedLabel =
    k.allowedUpstreams === null
      ? `全部 ${allCount} 个上游`
      : `${k.allowedUpstreams.length} 个指定上游`;

  const draftEmpty = Array.isArray(draft) && draft.length === 0;

  function savePerms() {
    if (draftEmpty) return;
    update.mutate(
      {
        id: k.id,
        allowedUpstreams: draft,
        cacheSettings: buildCacheSettings(cacheModeDraft, cacheTTLDraft) ?? null,
      },
      { onSuccess: () => setEditing(false) },
    );
  }

  function saveName() {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === k.name) { setRenaming(false); return; }
    update.mutate(
      { id: k.id, name: trimmed },
      { onSuccess: () => setRenaming(false) },
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
          <KeyRound className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          {renaming ? (
            <div className="flex items-center gap-1.5">
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  else if (e.key === "Escape") { setNameDraft(k.name); setRenaming(false); }
                }}
                autoFocus
                className="px-2 py-0.5 text-sm font-semibold bg-white border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={saveName}
                className="px-2 py-0.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded"
              >
                保存
              </button>
              <button
                onClick={() => { setNameDraft(k.name); setRenaming(false); }}
                className="px-2 py-0.5 text-xs bg-white border border-slate-300 text-slate-600 rounded"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setRenaming(true)}
              className="font-semibold text-slate-900 truncate hover:text-indigo-600 text-left"
              title="点击改名"
            >
              {k.name}
            </button>
          )}
          <div className="mt-1.5 flex items-center gap-2">
            <code className="flex-1 min-w-0 px-2 py-1 bg-slate-900 text-emerald-300 text-xs font-mono rounded truncate">
              {k.key}
            </code>
            <CopyButton value={k.key} />
          </div>
          <div className="text-xs text-slate-400 mt-1.5">可调用：{allowedLabel}</div>
          <div className="text-xs text-slate-400 mt-0.5">{cacheLabel(k)}</div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!editing && !confirming && (
            <>
              <button
                onClick={() => {
                  setDraft(k.allowedUpstreams);
                  setCacheModeDraft(k.cacheSettings?.cacheMode ?? "inherit");
                  setCacheTTLDraft(k.cacheSettings?.cacheTTL ?? "inherit");
                  setEditing(true);
                }}
                className="px-2.5 py-1 text-xs text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md"
              >
                编辑
              </button>
              <button
                onClick={() => setConfirming(true)}
                title="删除"
                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          {confirming && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { remove.mutate(k.id); setConfirming(false); }}
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

      {editing && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
          <UpstreamPicker accounts={accounts} selected={draft} onChange={setDraft} />
          <CacheSettingsPicker
            mode={cacheModeDraft}
            ttl={cacheTTLDraft}
            onModeChange={setCacheModeDraft}
            onTTLChange={setCacheTTLDraft}
          />
          {draftEmpty && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
              ⚠ 「仅指定账号」模式下未勾选任何上游，该密钥将无法调用任何上游。
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={savePerms}
              disabled={update.isPending || draftEmpty}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-md disabled:opacity-50"
            >
              {update.isPending ? "保存中…" : "保存"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-md"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Keys() {
  const { data: keys = [], isLoading } = useAccessKeys();
  const { data: accounts = [] } = useAccounts();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">调用密钥</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {keys.length === 0
                ? "暂无密钥 · 代理当前拒绝所有调用，请生成至少一个密钥"
                : `共 ${keys.length} 个密钥 · 客户端调用时需要在 Authorization 头携带`}
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" /> 生成密钥
            </button>
          )}
        </div>
      </div>

      {showForm && <AddKeyForm accounts={accounts} onClose={() => setShowForm(false)} />}

      {isLoading && (
        <div className="text-center py-8 text-sm text-slate-400">加载中…</div>
      )}

      {!isLoading && keys.length === 0 && !showForm && (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl py-12 text-center">
          <KeyRound className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">暂无调用密钥</p>
          <p className="text-xs text-slate-400 mt-1">
            点击「生成密钥」创建第一个密钥后才能调用 `/v1/*` 接口
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        {keys.map((k) => (
          <KeyCard key={k.id} k={k} accounts={accounts} />
        ))}
      </div>
    </div>
  );
}
