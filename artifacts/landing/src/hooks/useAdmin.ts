import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getToken, clearToken, AuthError } from "@/lib/auth";

const BASE = "/api/admin";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new Event("admin-unauthorized"));
    throw new AuthError();
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error: string };
    throw new Error(err.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export interface AccountRow {
  index: number;
  url: string;
  label: string;
  keyHint: string;
}

export interface Settings {
  cacheMode: "none" | "system-only" | "system+rolling";
  cacheTTL: "5m" | "1h";
  routingStrategy: string;
}

export interface AccountStats {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheHitTokens: number;
  label: string;
}

export function useAccounts() {
  return useQuery<AccountRow[]>({
    queryKey: ["accounts"],
    queryFn: () => apiFetch<AccountRow[]>("/accounts"),
    refetchInterval: 5000,
  });
}

export function useAddAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { url: string; key: string; label: string }) =>
      apiFetch("/accounts", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["accounts"] }); },
  });
}

export function useRemoveAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (index: number) =>
      apiFetch(`/accounts/${index}`, { method: "DELETE" }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["accounts"] }); },
  });
}

export function useSettings() {
  return useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: () => apiFetch<Settings>("/settings"),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Settings>) =>
      apiFetch<Settings>("/settings", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["settings"] }); },
  });
}

export function useStats() {
  return useQuery<Record<string, AccountStats>>({
    queryKey: ["stats"],
    queryFn: () => apiFetch<Record<string, AccountStats>>("/stats"),
    refetchInterval: 5000,
  });
}

export function useResetStats() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch("/stats/reset", { method: "POST" }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["stats"] }); },
  });
}

// ---------- Access keys ----------

export interface AccessKeyRow {
  id: string;
  name: string;
  key: string;
  allowedUpstreams: string[] | null;
  cacheSettings?: Partial<Pick<Settings, "cacheMode" | "cacheTTL">>;
  createdAt: number;
}

export function useAccessKeys() {
  return useQuery<AccessKeyRow[]>({
    queryKey: ["accessKeys"],
    queryFn: () => apiFetch<AccessKeyRow[]>("/keys"),
  });
}

export function useAddAccessKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; key?: string; allowedUpstreams: string[] | null; cacheSettings?: AccessKeyRow["cacheSettings"] }) =>
      apiFetch<AccessKeyRow>("/keys", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["accessKeys"] }); },
  });
}

export function useUpdateAccessKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; name?: string; allowedUpstreams?: string[] | null; cacheSettings?: AccessKeyRow["cacheSettings"] | null }) =>
      apiFetch(`/keys/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["accessKeys"] }); },
  });
}

export function useRemoveAccessKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/keys/${id}`, { method: "DELETE" }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["accessKeys"] }); },
  });
}

// ---------- Export / Import ----------

export async function downloadExport(): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}/export`, { headers });
  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new Event("admin-unauthorized"));
    throw new AuthError();
  }
  if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);

  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") ?? "";
  const m = cd.match(/filename="([^"]+)"/);
  const filename = m?.[1] ?? `proxy-backup-${new Date().toISOString().slice(0, 10)}.json`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  ok: true;
  accountsAdded: number;
  keysAdded: number;
}

export function useImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, merge }: { payload: unknown; merge: boolean }) =>
      apiFetch<ImportResult>(`/import?merge=${merge}`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["accounts"] });
      void qc.invalidateQueries({ queryKey: ["accessKeys"] });
      void qc.invalidateQueries({ queryKey: ["settings"] });
      void qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}
