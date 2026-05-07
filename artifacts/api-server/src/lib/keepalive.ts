import { logger } from "./logger";
import { getAccounts } from "./state";

const INTERVAL_MS = 3 * 60 * 1000;

async function pingAccount(url: string, key: string): Promise<void> {
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

  const accounts = getAccounts();
  if (accounts.length === 0) {
    logger.warn("Keepalive enabled but no accounts configured");
    return;
  }

  logger.info({ count: accounts.length, intervalMs: INTERVAL_MS }, "Keepalive started");

  setInterval(() => {
    for (const { url, key } of getAccounts()) {
      void pingAccount(url, key);
    }
  }, INTERVAL_MS);
}
