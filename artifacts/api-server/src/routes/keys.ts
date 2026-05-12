import { Router, type IRouter } from "express";
import {
  getAccessKeys, addAccessKey, updateAccessKey, removeAccessKey,
  type CacheSettingsOverride,
} from "../lib/state";

const router: IRouter = Router();

/** Validate allowedUpstreams: must be null or an array of unique strings. */
function normalizeAllowed(v: unknown): { ok: true; value: string[] | null } | { ok: false; error: string } {
  if (v === null || v === undefined) return { ok: true, value: null };
  if (!Array.isArray(v)) return { ok: false, error: "allowedUpstreams 必须是数组或 null" };
  for (const item of v) {
    if (typeof item !== "string") return { ok: false, error: "allowedUpstreams 数组元素必须是字符串" };
  }
  return { ok: true, value: Array.from(new Set(v as string[])) };
}

function normalizeCacheSettings(
  v: unknown,
): { ok: true; value: CacheSettingsOverride | undefined } | { ok: false; error: string } {
  if (v === null || v === undefined) return { ok: true, value: undefined };
  if (typeof v !== "object" || Array.isArray(v)) return { ok: false, error: "cacheSettings must be an object" };
  const input = v as Partial<Record<keyof CacheSettingsOverride, unknown>>;
  const validModes = ["none", "system-only", "system+rolling"];
  const validTTLs = ["5m", "1h"];
  const output: CacheSettingsOverride = {};
  if (input.cacheMode !== undefined) {
    if (!validModes.includes(String(input.cacheMode))) return { ok: false, error: "invalid cacheSettings.cacheMode" };
    output.cacheMode = input.cacheMode as CacheSettingsOverride["cacheMode"];
  }
  if (input.cacheTTL !== undefined) {
    if (!validTTLs.includes(String(input.cacheTTL))) return { ok: false, error: "invalid cacheSettings.cacheTTL" };
    output.cacheTTL = input.cacheTTL as CacheSettingsOverride["cacheTTL"];
  }
  return { ok: true, value: Object.keys(output).length > 0 ? output : undefined };
}

router.get("/", (_req, res) => {
  res.json(getAccessKeys());
});

router.post("/", (req, res) => {
  const body = req.body as {
    name?: string;
    key?: string;
    allowedUpstreams?: string[] | null;
    cacheSettings?: CacheSettingsOverride;
  };
  if (!body.name?.trim()) {
    res.status(400).json({ error: "name 必填" });
    return;
  }
  const norm = normalizeAllowed(body.allowedUpstreams);
  if (!norm.ok) { res.status(400).json({ error: norm.error }); return; }
  const cache = normalizeCacheSettings(body.cacheSettings);
  if (!cache.ok) { res.status(400).json({ error: cache.error }); return; }
  const created = addAccessKey({
    name: body.name,
    key: body.key,
    allowedUpstreams: norm.value,
    cacheSettings: cache.value,
  });
  res.json(created);
});

router.patch("/:id", (req, res) => {
  const id = req.params["id"]!;
  const body = req.body as {
    name?: string;
    allowedUpstreams?: string[] | null;
    cacheSettings?: CacheSettingsOverride | null;
  };
  const patch: { name?: string; allowedUpstreams?: string[] | null; cacheSettings?: CacheSettingsOverride | null } = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.allowedUpstreams !== undefined) {
    const norm = normalizeAllowed(body.allowedUpstreams);
    if (!norm.ok) { res.status(400).json({ error: norm.error }); return; }
    patch.allowedUpstreams = norm.value;
  }
  if (body.cacheSettings !== undefined) {
    const cache = normalizeCacheSettings(body.cacheSettings);
    if (!cache.ok) { res.status(400).json({ error: cache.error }); return; }
    patch.cacheSettings = cache.value ?? null;
  }
  const ok = updateAccessKey(id, patch);
  if (!ok) { res.status(404).json({ error: "密钥不存在" }); return; }
  res.json({ ok: true });
});

router.delete("/:id", (req, res) => {
  const id = req.params["id"]!;
  const ok = removeAccessKey(id);
  if (!ok) { res.status(404).json({ error: "密钥不存在" }); return; }
  res.json({ ok: true });
});

export default router;
