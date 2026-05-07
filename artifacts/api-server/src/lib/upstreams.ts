import { logger } from "./logger";

export interface Upstream {
  url: string;
  key: string;
}

function parseUpstreams(): Upstream[] {
  const urls = process.env["UPSTREAM_URLS"];
  const keys = process.env["UPSTREAM_KEYS"];

  if (urls) {
    const urlList = urls.split(",").map((s) => s.trim()).filter(Boolean);
    const keyList = keys ? keys.split(",").map((s) => s.trim()) : [];
    const list = urlList.map((url, i) => ({
      url: url.replace(/\/$/, ""),
      key: keyList[i] ?? "",
    }));
    logger.info({ count: list.length }, "Upstreams loaded from UPSTREAM_URLS");
    return list;
  }

  const url = process.env["UPSTREAM_URL"]?.replace(/\/$/, "");
  const key = process.env["UPSTREAM_KEY"];
  if (url && key) {
    logger.info("Single upstream loaded from UPSTREAM_URL");
    return [{ url, key }];
  }

  logger.warn("No upstreams configured — proxy will return 503");
  return [];
}

export const upstreams: Upstream[] = parseUpstreams();

let rrIndex = 0;

export function getUpstream(): Upstream | null {
  if (upstreams.length === 0) return null;

  const strategy = (process.env["ROUTING_STRATEGY"] ?? "round-robin").trim();

  if (strategy === "round-robin") {
    const upstream = upstreams[rrIndex % upstreams.length]!;
    rrIndex++;
    return upstream;
  }

  const found = upstreams.find((u) => u.url === strategy);
  if (found) return found;

  logger.warn({ strategy }, "ROUTING_STRATEGY URL not found in upstreams, falling back to first");
  return upstreams[0]!;
}
