import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { Readable } from "stream";
import { logger } from "../lib/logger";
import {
  getNextAccount, findAccessKey,
  type Account, type AccessKey,
} from "../lib/state";
import { injectCacheControl, buildCacheHeaders } from "../lib/cache";
import { createStatsInterceptor } from "../lib/stats-interceptor";

const router: IRouter = Router();

function checkAccessKey(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers["authorization"] ?? "";
  const token = (Array.isArray(auth) ? auth[0] ?? "" : auth);
  const value = token.startsWith("Bearer ") ? token.slice(7).trim() : token.trim();

  const matched = findAccessKey(value);
  if (!matched) {
    res.status(401).json({ error: "Unauthorized: invalid or missing API key" });
    return;
  }
  res.locals["accessKey"] = matched;
  next();
}

function pickAccount(_req: Request, res: Response, next: NextFunction) {
  const matched = res.locals["accessKey"] as AccessKey | undefined;
  const account = getNextAccount(matched?.allowedUpstreams ?? null);
  if (!account) {
    res.status(503).json({
      error: Array.isArray(matched?.allowedUpstreams)
        ? "No upstream account available for this key"
        : "Proxy not configured: no accounts available",
    });
    return;
  }
  res.locals["account"] = account;
  next();
}

const HOP_BY_HOP = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailers", "transfer-encoding", "upgrade", "host",
]);

const REVEALING_HEADERS = new Set([
  "openai-organization", "openai-processing-ms", "openai-version", "openai-model",
  "anthropic-ratelimit-input-tokens-limit", "anthropic-ratelimit-input-tokens-remaining",
  "anthropic-ratelimit-input-tokens-reset", "anthropic-ratelimit-output-tokens-limit",
  "anthropic-ratelimit-output-tokens-remaining", "anthropic-ratelimit-output-tokens-reset",
  "anthropic-ratelimit-requests-limit", "anthropic-ratelimit-requests-remaining",
  "anthropic-ratelimit-requests-reset", "x-ratelimit-limit-requests", "x-ratelimit-limit-tokens",
  "x-ratelimit-remaining-requests", "x-ratelimit-remaining-tokens",
  "x-ratelimit-reset-requests", "x-ratelimit-reset-tokens",
  "x-request-id", "x-envoy-upstream-service-time", "x-robots-tag", "replit-cluster",
]);

router.use("/v1", checkAccessKey, pickAccount, async (req: Request, res: Response) => {
  const account = res.locals["account"] as Account;

  try {
    const qs = req.url.includes("?") ? "?" + req.url.split("?").slice(1).join("?") : "";
    const targetUrl = `${account.url}/v1${req.path}${qs}`;

    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (!HOP_BY_HOP.has(k.toLowerCase())) {
        headers[k] = Array.isArray(v) ? v.join(", ") : (v ?? "");
      }
    }
    headers["authorization"] = `Bearer ${account.key}`;
    Object.assign(headers, buildCacheHeaders(headers));

    let body: string | undefined;
    const isStreaming = !!req.body?.stream;
    if (req.method !== "GET" && req.method !== "HEAD" && req.body && Object.keys(req.body).length > 0) {
      const processedBody = injectCacheControl(req.body);
      body = JSON.stringify(processedBody);
      headers["content-type"] = "application/json";
      headers["content-length"] = String(Buffer.byteLength(body));
    }

    logger.info({ method: req.method, target: targetUrl, account: account.label }, "Proxying request");

    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      // @ts-ignore — Node 22+ fetch option
      duplex: "half",
    });

    res.status(upstreamRes.status);
    for (const [k, v] of upstreamRes.headers.entries()) {
      const lower = k.toLowerCase();
      if (!HOP_BY_HOP.has(lower) && !REVEALING_HEADERS.has(lower) && !lower.startsWith("x-ratelimit")) {
        res.setHeader(k, v);
      }
    }
    res.setHeader("server", "nginx");

    if (upstreamRes.body) {
      const interceptor = createStatsInterceptor(account.url, isStreaming);
      Readable.fromWeb(upstreamRes.body as import("stream/web").ReadableStream<Uint8Array>)
        .pipe(interceptor)
        .pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    logger.error({ err }, "Proxy fetch error");
    if (!res.headersSent) {
      res.status(502).json({ error: "Bad gateway" });
    }
  }
});

export default router;
