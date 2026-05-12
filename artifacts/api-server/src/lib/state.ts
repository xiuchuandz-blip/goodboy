import { randomBytes, randomUUID } from "crypto";
import { logger } from "./logger";
import { loadSnapshot, saveSnapshot, type Snapshot } from "./persistence";

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

export interface CacheSettingsOverride {
  cacheMode?: CacheMode;
  cacheTTL?: CacheTTL;
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
  /** Per-key cache override. Missing fields inherit global settings. */
  cacheSettings?: CacheSettingsOverride;
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

let accounts: Account[] = [];
let settings: Settings = loadSettingsFromEnv();
let accessKeys: AccessKey[] = [];
let rrIndex = 0;
let statsMap = new Map<string, AccountStats>();

// ---- Boot: load disk snapshot if present, else fall back to env ----

function applySnapshot(snap: Snapshot): void {
  accounts = (snap.accounts as Account[]).map((a) => ({
    url: String(a.url ?? "").replace(/\/$/, ""),
    key: String(a.key ?? ""),
    label: String(a.label ?? a.url ?? ""),
  }));
  accessKeys = (snap.accessKeys as AccessKey[]).map((k) => ({
    id: String(k.id ?? randomUUID()),
    name: String(k.name ?? "未命名"),
    key: String(k.key ?? generateKey()),
    allowedUpstreams: Array.isArray(k.allowedUpstreams) ? k.allowedUpstreams.map(String) : null,
    cacheSettings: normalizeCacheSettings(k.cacheSettings),
    createdAt: Number(k.createdAt ?? Date.now()),
  }));
  if (snap.settings && typeof snap.settings === "object") {
    settings = { ...settings, ...(snap.settings as Partial<Settings>) };
  }
  statsMap = new Map(Object.entries((snap.stats ?? {}) as Record<string, AccountStats>));
}

const initial = loadSnapshot();
if (initial) {
  applySnapshot(initial);
} else {
  accounts = loadAccountsFromEnv();
  if (accounts.length > 0) logger.info({ count: accounts.length }, "Accounts seeded from env (no state.json yet)");
}

if (accounts.length === 0) {
  logger.warn("No accounts configured — proxy will return 503");
} else {
  logger.info({ count: accounts.length }, "Accounts ready");
}
logger.info({ count: accessKeys.length }, "Access keys ready (managed via admin panel)");

function persist(): void {
  saveSnapshot({
    version: 1,
    accounts,
    accessKeys,
    settings,
    stats: Object.fromEntries(statsMap),
  });
}

// Save once at boot to materialize the file when first run.
persist();

// ---------- Accounts ----------

export function getAccounts(): Account[] {
  return accounts.map((a) => ({ ...a }));
}

export function addAccount(a: Account): void {
  accounts.push({ ...a, url: a.url.replace(/\/$/, "") });
  persist();
}

export function removeAccount(idx: number): boolean {
  if (idx < 0 || idx >= accounts.length) return false;
  const removed = accounts[idx]!;
  accounts.splice(idx, 1);
  for (const k of accessKeys) {
    if (k.allowedUpstreams) {
      k.allowedUpstreams = k.allowedUpstreams.filter((u) => u !== removed.url);
    }
  }
  persist();
  return true;
}

export function updateAccount(idx: number, patch: Partial<Account>): boolean {
  const acc = accounts[idx];
  if (!acc) return false;
  const newUrl = (patch.url ?? acc.url).replace(/\/$/, "");
  if (newUrl !== acc.url) {
    for (const k of accessKeys) {
      if (k.allowedUpstreams) {
        k.allowedUpstreams = k.allowedUpstreams.map((u) => (u === acc.url ? newUrl : u));
      }
    }
  }
  accounts[idx] = { ...acc, ...patch, url: newUrl };
  persist();
  return true;
}

/** Pick the next account, optionally restricted to a whitelist of URLs. */
export function getNextAccount(allowedUrls?: string[] | null): Account | null {
  let pool = accounts;
  if (Array.isArray(allowedUrls)) {
    pool = accounts.filter((a) => allowedUrls.includes(a.url));
  }
  if (pool.length === 0) return null;

  const strategy = settings.routingStrategy;
  if (strategy !== "round-robin") {
    const pinned = pool.find((a) => a.url === strategy);
    if (pinned) return pinned;
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
  persist();
}

// ---------- Access Keys ----------

export function getAccessKeys(): AccessKey[] {
  return accessKeys.map((k) => ({ ...k }));
}

export function findAccessKey(token: string): AccessKey | null {
  if (!token) return null;
  return accessKeys.find((k) => k.key === token) ?? null;
}

function generateKey(): string {
  return "sk-proxy-" + randomBytes(24).toString("base64url");
}

function normalizeCacheSettings(value: unknown): CacheSettingsOverride | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const obj = value as Partial<Record<keyof CacheSettingsOverride, unknown>>;
  const validModes: CacheMode[] = ["none", "system-only", "system+rolling"];
  const validTTLs: CacheTTL[] = ["5m", "1h"];
  const result: CacheSettingsOverride = {};
  if (validModes.includes(obj.cacheMode as CacheMode)) result.cacheMode = obj.cacheMode as CacheMode;
  if (validTTLs.includes(obj.cacheTTL as CacheTTL)) result.cacheTTL = obj.cacheTTL as CacheTTL;
  return Object.keys(result).length > 0 ? result : undefined;
}

export interface CreateKeyInput {
  name: string;
  key?: string;
  allowedUpstreams?: string[] | null;
  cacheSettings?: CacheSettingsOverride;
}

export function addAccessKey(input: CreateKeyInput): AccessKey {
  const entry: AccessKey = {
    id: randomUUID(),
    name: input.name.trim() || "未命名密钥",
    key: input.key?.trim() || generateKey(),
    allowedUpstreams: input.allowedUpstreams ?? null,
    cacheSettings: normalizeCacheSettings(input.cacheSettings),
    createdAt: Date.now(),
  };
  accessKeys.push(entry);
  persist();
  return entry;
}

export function updateAccessKey(
  id: string,
  patch: Partial<Pick<AccessKey, "name" | "allowedUpstreams">> & { cacheSettings?: CacheSettingsOverride | null },
): boolean {
  const k = accessKeys.find((x) => x.id === id);
  if (!k) return false;
  if (patch.name !== undefined) k.name = patch.name.trim() || k.name;
  if (patch.allowedUpstreams !== undefined) k.allowedUpstreams = patch.allowedUpstreams;
  if (patch.cacheSettings !== undefined) k.cacheSettings = normalizeCacheSettings(patch.cacheSettings);
  persist();
  return true;
}

export function removeAccessKey(id: string): boolean {
  const before = accessKeys.length;
  accessKeys = accessKeys.filter((k) => k.id !== id);
  const changed = accessKeys.length < before;
  if (changed) persist();
  return changed;
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
  // Stats persisted lazily — see persistStatsSoon below.
  persistStatsSoon();
}

let statsPersistTimer: NodeJS.Timeout | null = null;
function persistStatsSoon(): void {
  if (statsPersistTimer) return;
  statsPersistTimer = setTimeout(() => {
    statsPersistTimer = null;
    persist();
  }, 5_000);
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
  persist();
}

// ---------- Export / Import ----------

export interface ExportPayload {
  version: 1;
  exportedAt: number;
  accounts: Account[];
  accessKeys: AccessKey[];
  settings: Settings;
  stats: Record<string, AccountStats>;
}

export function exportAll(): ExportPayload {
  return {
    version: 1,
    exportedAt: Date.now(),
    accounts: getAccounts(),
    accessKeys: getAccessKeys(),
    settings: getSettings(),
    stats: Object.fromEntries(statsMap),
  };
}

export interface ImportOptions {
  /** If true, merge into existing state. If false (default), replace everything. */
  merge?: boolean;
}

export interface ImportResult {
  ok: true;
  accountsAdded: number;
  keysAdded: number;
}

export function importAll(payload: unknown, opts: ImportOptions = {}): ImportResult {
  const data = payload as Partial<ExportPayload>;
  if (!data || typeof data !== "object") throw new Error("payload 必须是对象");
  if (data.version !== 1) throw new Error(`不支持的版本：${String(data.version)}`);

  const incomingAccounts: Account[] = Array.isArray(data.accounts)
    ? data.accounts.map((a) => ({
        url: String(a.url ?? "").replace(/\/$/, ""),
        key: String(a.key ?? ""),
        label: String(a.label ?? a.url ?? ""),
      })).filter((a) => a.url && a.key)
    : [];

  const incomingKeys: AccessKey[] = Array.isArray(data.accessKeys)
    ? data.accessKeys.map((k) => ({
        id: String(k.id ?? randomUUID()),
        name: String(k.name ?? "未命名"),
        key: String(k.key ?? generateKey()),
        allowedUpstreams: Array.isArray(k.allowedUpstreams) ? k.allowedUpstreams.map(String) : null,
        cacheSettings: normalizeCacheSettings((k as Partial<AccessKey>).cacheSettings),
        createdAt: Number(k.createdAt ?? Date.now()),
      }))
    : [];

  const incomingSettings = (data.settings && typeof data.settings === "object")
    ? data.settings as Partial<Settings>
    : null;

  let added = { accounts: 0, keys: 0 };

  if (opts.merge) {
    for (const a of incomingAccounts) {
      if (!accounts.some((x) => x.url === a.url)) {
        accounts.push(a);
        added.accounts++;
      }
    }
    for (const k of incomingKeys) {
      if (!accessKeys.some((x) => x.key === k.key)) {
        accessKeys.push(k);
        added.keys++;
      }
    }
    if (incomingSettings) settings = { ...settings, ...incomingSettings };
  } else {
    accounts = incomingAccounts;
    accessKeys = incomingKeys;
    if (incomingSettings) settings = { ...settings, ...incomingSettings };
    if (data.stats && typeof data.stats === "object") {
      statsMap = new Map(Object.entries(data.stats as Record<string, AccountStats>));
    }
    added = { accounts: incomingAccounts.length, keys: incomingKeys.length };
  }

  persist();
  return { ok: true, accountsAdded: added.accounts, keysAdded: added.keys };
}
