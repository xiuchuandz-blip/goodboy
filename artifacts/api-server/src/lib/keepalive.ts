import { logger } from "./logger";
import { upstreams } from "./upstreams";

const INTERVAL_MS = 3 * 60 * 1000;

async function pingUpstream(url: string, key: string): Promise<void> {
  const target = `${url}/v1/models`;
  try {
    const res = await fetch(target, {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15_000),
    });
    logger.info({ url, status: res.status }, "Keepalive ping OK");
  } catch (err) {
    logger.warn({ url, err }, "Keepalive ping failed");
  }
}

export function startKeepalive(): void {
  if (process.env["KEEPALIVE_ENABLED"] !== "true") {
    logger.info("Keepalive disabled (set KEEPALIVE_ENABLED=true to enable)");
    return;
  }

  if (upstreams.length === 0) {
    logger.warn("Keepalive enabled but no upstreams configured");
    return;
  }

  logger.info({ count: upstreams.length, intervalMs: INTERVAL_MS }, "Keepalive started");

  setInterval(() => {
    for (const { url, key } of upstreams) {
      void pingUpstream(url, key);
    }
  }, INTERVAL_MS);
}
