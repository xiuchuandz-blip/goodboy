import { randomBytes, randomUUID } from "crypto";
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

/** A caller-side API key. allowedUpstreams=null means "all accounts". */
export interface AccessKey {
  id: string;
  name: string;
  key: string;
  /** List of account URLs this key may use. null = all accounts. */
  allowedUpstreams: string[] | null;
  createdAt: number;
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
let accessKeys: AccessKey[] = [];
let rrIndex = 0;
const statsMap = new Map<string, AccountStats>();

if (accounts.length === 0) {
  logger.warn("No accounts configured — proxy will return 503");
} else {
  logger.info({ count: accounts.length }, "Accounts loaded");
}

logger.info("Access keys: managed via admin panel only; proxy denies all calls until at least one key is created");

// ---------- Accounts ----------

export function getAccounts(): Account[] {
  return accounts.map((a) => ({ ...a }));
}

export function addAccount(a: Account): void {
  accounts.push({ ...a, url: a.url.replace(/\/$/, "") });
}

export function removeAccount(idx: number): boolean {
  if (idx < 0 || idx >= accounts.length) return false;
  const removed = accounts[idx]!;
  accounts.splice(idx, 1);
  // Remove this URL from any access key's allowedUpstreams.
  for (const k of accessKeys) {
    if (k.allowedUpstreams) {
      k.allowedUpstreams = k.allowedUpstreams.filter((u) => u !== removed.url);
    }
  }
  return true;
}

export function updateAccount(idx: number, patch: Partial<Account>): boolean {
  const acc = accounts[idx];
  if (!acc) return false;
  const newUrl = (patch.url ?? acc.url).replace(/\/$/, "");
  // If URL changes, propagate the rename into any key allowedUpstreams.
  if (newUrl !== acc.url) {
    for (const k of accessKeys) {
      if (k.allowedUpstreams) {
        k.allowedUpstreams = k.allowedUpstreams.map((u) => (u === acc.url ? newUrl : u));
      }
    }
  }
  accounts[idx] = { ...acc, ...patch, url: newUrl };
  return true;
}

/** Pick the next account, optionally restricted to a whitelist of URLs. */
export function getNextAccount(allowedUrls?: string[] | null): Account | null {
  let pool = accounts;
  // null/undefined = unrestricted; an array (even empty) is a strict whitelist
  if (Array.isArray(allowedUrls)) {
    pool = accounts.filter((a) => allowedUrls.includes(a.url));
  }
  if (pool.length === 0) return null;

  const strategy = settings.routingStrategy;
  if (strategy !== "round-robin") {
    const pinned = pool.find((a) => a.url === strategy);
    if (pinned) return pinned;
    // Pinned account not in the key's whitelist — fall back to round-robin within pool.
  }

  const acc = pool[rrIndex % pool.length]!;
  rrIndex++;
  return acc;
}

// ---------- Settings ----------

export function getSettings(): Settings {
  return { ...settings };
}

export function updateSettings(patch: Partial<Settings>): void {
  settings = { ...settings, ...patch };
}

// ---------- Access Keys ----------

export function getAccessKeys(): AccessKey[] {
  return accessKeys.map((k) => ({ ...k }));
}

/** Find key by token value. Returns the matching entry or null. */
export function findAccessKey(token: string): AccessKey | null {
  if (!token) return null;
  return accessKeys.find((k) => k.key === token) ?? null;
}

function generateKey(): string {
  return "sk-proxy-" + randomBytes(24).toString("base64url");
}

export interface CreateKeyInput {
  name: string;
  key?: string;
  allowedUpstreams?: string[] | null;
}

export function addAccessKey(input: CreateKeyInput): AccessKey {
  const entry: AccessKey = {
    id: randomUUID(),
    name: input.name.trim() || "未命名密钥",
    key: input.key?.trim() || generateKey(),
    allowedUpstreams: input.allowedUpstreams ?? null,
    createdAt: Date.now(),
  };
  accessKeys.push(entry);
  return entry;
}

export function updateAccessKey(
  id: string,
  patch: Partial<Pick<AccessKey, "name" | "allowedUpstreams">>,
): boolean {
  const k = accessKeys.find((x) => x.id === id);
  if (!k) return false;
  if (patch.name !== undefined) k.name = patch.name.trim() || k.name;
  if (patch.allowedUpstreams !== undefined) k.allowedUpstreams = patch.allowedUpstreams;
  return true;
}

export function removeAccessKey(id: string): boolean {
  const before = accessKeys.length;
  accessKeys = accessKeys.filter((k) => k.id !== id);
  return accessKeys.length < before;
}

// ---------- Stats ----------

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
