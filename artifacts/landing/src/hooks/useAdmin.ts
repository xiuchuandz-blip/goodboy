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
