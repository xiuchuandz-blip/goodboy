import { getSettings, type CacheMode, type CacheTTL } from "./state";

function buildCacheControl(ttl: CacheTTL): Record<string, string> {
  return ttl === "1h" ? { type: "ephemeral", ttl: "1h" } : { type: "ephemeral" };
}

function cacheTextContent(content: unknown, cc: Record<string, string>): unknown {
  if (typeof content === "string" && content.length > 0) {
    return [{ type: "text", text: content, cache_control: cc }];
  }
  if (Array.isArray(content) && content.length > 0) {
    const next = [...content];
    const last = next[next.length - 1];
    if (last && typeof last === "object") {
      next[next.length - 1] = { ...(last as Record<string, unknown>), cache_control: cc };
    }
    return next;
  }
  return content;
}

function cacheLastMessageByRole(messages: unknown[], role: string, cc: Record<string, string>): unknown[] {
  const next = [...messages];
  const idx = next.findLastIndex(
    (m: unknown) => !!m && typeof m === "object" && (m as Record<string, unknown>)["role"] === role,
  );
  if (idx < 0) return next;

  const msg = next[idx] as Record<string, unknown>;
  next[idx] = { ...msg, content: cacheTextContent(msg["content"], cc) };
  return next;
}

export function injectCacheControl(body: unknown): unknown {
  const { cacheMode, cacheTTL } = getSettings();
  if (cacheMode === "none") return body;
  if (!body || typeof body !== "object") return body;

  const obj = body as Record<string, unknown>;
  const cc = buildCacheControl(cacheTTL);
  let result = { ...obj };

  if (cacheMode === "system-only" || cacheMode === "system+rolling") {
    result["system"] = cacheTextContent(result["system"], cc);

    if (!result["system"] && Array.isArray(result["messages"])) {
      result["messages"] = cacheLastMessageByRole(result["messages"] as unknown[], "system", cc);
    }
  }

  if (cacheMode === "system+rolling" && Array.isArray(result["messages"])) {
    result["messages"] = cacheLastMessageByRole(result["messages"] as unknown[], "user", cc);
  }

  return result;
}

export function buildCacheHeaders(reqHeaders: Record<string, string>): Record<string, string> {
  const { cacheMode, cacheTTL } = getSettings();
  const extra: Record<string, string> = {};

  if (reqHeaders["anthropic-beta"]) {
    extra["anthropic-beta"] = reqHeaders["anthropic-beta"];
  }

  if (cacheMode !== "none" && cacheTTL === "1h") {
    const existing = extra["anthropic-beta"] ?? "";
    const betas = existing.split(",").map((s) => s.trim()).filter(Boolean);
    if (!betas.includes("extended-cache-ttl-2025-04-11")) {
      betas.push("extended-cache-ttl-2025-04-11");
    }
    extra["anthropic-beta"] = betas.join(",");
  }

  return extra;
}
