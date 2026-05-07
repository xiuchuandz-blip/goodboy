import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { Readable } from "stream";
import { logger } from "../lib/logger";
import { type Upstream, getUpstream } from "../lib/upstreams";
import { injectCacheControl, buildCacheHeaders } from "../lib/cache";

const router: IRouter = Router();

const accessKey = process.env["ACCESS_KEY"];
if (!accessKey) logger.info("ACCESS_KEY is not set — proxy is open (no authentication required)");

function checkConfig(_req: Request, res: Response, next: NextFunction) {
  const upstream = getUpstream();
  if (!upstream) {
    res.status(503).json({ error: "Proxy not configured: no upstreams available" });
    return;
  }
  res.locals["upstream"] = upstream;
  next();
}

function checkAccessKey(req: Request, res: Response, next: NextFunction) {
  if (!accessKey) {
    next();
    return;
  }
  const auth = req.headers["authorization"] ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : auth.trim();
  if (token !== accessKey) {
    res.status(401).json({ error: "Unauthorized: invalid or missing API key" });
    return;
  }
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

router.use("/v1", checkConfig, checkAccessKey, async (req: Request, res: Response) => {
  const upstream = res.locals["upstream"] as Upstream;

  try {
    const qs = req.url.includes("?") ? "?" + req.url.split("?").slice(1).join("?") : "";
    const targetUrl = `${upstream.url}/v1${req.path}${qs}`;

    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (!HOP_BY_HOP.has(k.toLowerCase())) {
        headers[k] = Array.isArray(v) ? v.join(", ") : (v ?? "");
      }
    }
    headers["authorization"] = `Bearer ${upstream.key}`;

    const cacheHeaders = buildCacheHeaders(headers);
    Object.assign(headers, cacheHeaders);

    let body: string | undefined;
    if (req.method !== "GET" && req.method !== "HEAD" && req.body && Object.keys(req.body).length > 0) {
      const processedBody = injectCacheControl(req.body);
      body = JSON.stringify(processedBody);
      headers["content-type"] = "application/json";
      headers["content-length"] = String(Buffer.byteLength(body));
    }

    logger.info({ method: req.method, target: targetUrl, upstream: upstream.url }, "Proxying request");

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
      Readable.fromWeb(upstreamRes.body as import("stream/web").ReadableStream<Uint8Array>).pipe(res);
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
