import { logger } from "./logger";

export type CacheMode = "none" | "system-only" | "system+rolling";
export type CacheTTL = "5m" | "1h";

export interface Account {
  url: string;
  key: string;
  label: string;
}

export interface Settings {
  cacheMode: CacheMode;
  cacheTTL: CacheTTL;
  routingStrategy: string;
}

export interface AccountStats {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheHitTokens: number;
}

function loadAccountsFromEnv(): Account[] {
  const urls = process.env["UPSTREAM_URLS"];
  const keys = process.env["UPSTREAM_KEYS"];
  if (urls) {
    const urlList = urls.split(",").map((s) => s.trim()).filter(Boolean);
    const keyList = keys ? keys.split(",").map((s) => s.trim()) : [];
    return urlList.map((url, i) => ({
      url: url.replace(/\/$/, ""),
      key: keyList[i] ?? "",
      label: `Account ${i + 1}`,
    }));
  }
  const url = process.env["UPSTREAM_URL"]?.replace(/\/$/, "");
  const key = process.env["UPSTREAM_KEY"];
  if (url && key) return [{ url, key, label: "Default" }];
  return [];
}

function loadSettingsFromEnv(): Settings {
  const rawMode = process.env["CACHE_MODE"] ?? "none";
  const rawTTL = process.env["CACHE_TTL"] ?? "5m";
  const validModes: CacheMode[] = ["none", "system-only", "system+rolling"];
  const validTTLs: CacheTTL[] = ["5m", "1h"];
  return {
    cacheMode: validModes.includes(rawMode as CacheMode) ? (rawMode as CacheMode) : "none",
    cacheTTL: validTTLs.includes(rawTTL as CacheTTL) ? (rawTTL as CacheTTL) : "5m",
    routingStrategy: process.env["ROUTING_STRATEGY"] ?? "round-robin",
  };
}

let accounts: Account[] = loadAccountsFromEnv();
let settings: Settings = loadSettingsFromEnv();
let rrIndex = 0;
const statsMap = new Map<string, AccountStats>();

if (accounts.length === 0) {
  logger.warn("No accounts configured — proxy will return 503");
} else {
  logger.info({ count: accounts.length }, "Accounts loaded");
}

export function getAccounts(): Account[] {
  return accounts.map((a) => ({ ...a }));
}

export function addAccount(a: Account): void {
  accounts.push({ ...a, url: a.url.replace(/\/$/, "") });
}

export function removeAccount(idx: number): boolean {
  if (idx < 0 || idx >= accounts.length) return false;
  accounts.splice(idx, 1);
  return true;
}

export function updateAccount(idx: number, patch: Partial<Account>): boolean {
  const acc = accounts[idx];
  if (!acc) return false;
  accounts[idx] = {
    ...acc,
    ...patch,
    url: (patch.url ?? acc.url).replace(/\/$/, ""),
  };
  return true;
}

export function getNextAccount(): Account | null {
  if (accounts.length === 0) return null;
  const strategy = settings.routingStrategy;
  if (strategy === "round-robin") {
    const acc = accounts[rrIndex % accounts.length]!;
    rrIndex++;
    return acc;
  }
  return accounts.find((a) => a.url === strategy) ?? accounts[0] ?? null;
}

export function getSettings(): Settings {
  return { ...settings };
}

export function updateSettings(patch: Partial<Settings>): void {
  settings = { ...settings, ...patch };
}

function emptyStats(): AccountStats {
  return { requests: 0, inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0, cacheHitTokens: 0 };
}

export function recordStats(url: string, patch: Partial<AccountStats>): void {
  const existing = statsMap.get(url) ?? emptyStats();
  statsMap.set(url, {
    requests: existing.requests + (patch.requests ?? 0),
    inputTokens: existing.inputTokens + (patch.inputTokens ?? 0),
    outputTokens: existing.outputTokens + (patch.outputTokens ?? 0),
    cacheWriteTokens: existing.cacheWriteTokens + (patch.cacheWriteTokens ?? 0),
    cacheHitTokens: existing.cacheHitTokens + (patch.cacheHitTokens ?? 0),
  });
}

export function getStats(): Record<string, AccountStats & { label: string }> {
  const result: Record<string, AccountStats & { label: string }> = {};
  for (const acc of accounts) {
    result[acc.url] = { ...(statsMap.get(acc.url) ?? emptyStats()), label: acc.label };
  }
  return result;
}

export function resetStats(): void {
  statsMap.clear();
}
