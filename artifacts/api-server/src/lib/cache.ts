import { logger } from "./logger";

export type CacheMode = "none" | "system-only" | "system+rolling";
export type CacheTTL = "5m" | "1h";

const rawMode = process.env["CACHE_MODE"] ?? "none";
const rawTTL = process.env["CACHE_TTL"] ?? "5m";

const VALID_MODES: CacheMode[] = ["none", "system-only", "system+rolling"];
const VALID_TTLS: CacheTTL[] = ["5m", "1h"];

export const cacheMode: CacheMode = VALID_MODES.includes(rawMode as CacheMode)
  ? (rawMode as CacheMode)
  : "none";

export const cacheTTL: CacheTTL = VALID_TTLS.includes(rawTTL as CacheTTL)
  ? (rawTTL as CacheTTL)
  : "5m";

if (cacheMode !== "none") {
  logger.info({ cacheMode, cacheTTL }, "Cache control injection enabled");
}

function buildCacheControl(ttl: CacheTTL): Record<string, string> {
  return ttl === "1h" ? { type: "ephemeral", ttl: "1h" } : { type: "ephemeral" };
}

export function injectCacheControl(body: unknown): unknown {
  if (cacheMode === "none") return body;
  if (!body || typeof body !== "object") return body;

  const obj = body as Record<string, unknown>;
  const cc = buildCacheControl(cacheTTL);
  let result = { ...obj };

  if (cacheMode === "system-only" || cacheMode === "system+rolling") {
    if (typeof result["system"] === "string" && result["system"].length > 0) {
      result["system"] = [{ type: "text", text: result["system"], cache_control: cc }];
    } else if (Array.isArray(result["system"]) && result["system"].length > 0) {
      const system = [...(result["system"] as unknown[])];
      const last = system[system.length - 1] as Record<string, unknown>;
      system[system.length - 1] = { ...last, cache_control: cc };
      result["system"] = system;
    }
  }

  if (cacheMode === "system+rolling" && Array.isArray(result["messages"])) {
    const messages = [...(result["messages"] as unknown[])];
    const lastUserIdx = messages.findLastIndex(
      (m: unknown) => (m as Record<string, unknown>)["role"] === "user",
    );
    if (lastUserIdx >= 0) {
      const msg = messages[lastUserIdx] as Record<string, unknown>;
      if (typeof msg["content"] === "string") {
        messages[lastUserIdx] = {
          ...msg,
          content: [{ type: "text", text: msg["content"], cache_control: cc }],
        };
      } else if (Array.isArray(msg["content"])) {
        const content = [...(msg["content"] as unknown[])];
        const lastContent = content[content.length - 1] as Record<string, unknown>;
        content[content.length - 1] = { ...lastContent, cache_control: cc };
        messages[lastUserIdx] = { ...msg, content };
      }
    }
    result["messages"] = messages;
  }

  return result;
}

export function buildCacheHeaders(reqHeaders: Record<string, string>): Record<string, string> {
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
