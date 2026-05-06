import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { Readable } from "stream";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const upstreamUrl = process.env["UPSTREAM_URL"]?.replace(/\/$/, "");
const upstreamKey = process.env["UPSTREAM_KEY"];
const accessKey = process.env["ACCESS_KEY"];

if (!upstreamUrl) logger.warn("UPSTREAM_URL is not set — proxy routes will return 503");
if (!upstreamKey) logger.warn("UPSTREAM_KEY is not set — proxy routes will return 503");
if (!accessKey) logger.warn("ACCESS_KEY is not set — all proxy requests will be rejected");

function checkConfig(_req: Request, res: Response, next: NextFunction) {
  if (!upstreamUrl || !upstreamKey) {
    res.status(503).json({ error: "Proxy not configured: missing UPSTREAM_URL or UPSTREAM_KEY" });
    return;
  }
  next();
}

function checkAccessKey(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers["authorization"] ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : auth.trim();
  if (!accessKey || token !== accessKey) {
    res.status(401).json({ error: "Unauthorized: invalid or missing API key" });
    return;
  }
  next();
}

const HOP_BY_HOP = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailers", "transfer-encoding", "upgrade", "host",
]);

router.use("/v1", checkConfig, checkAccessKey, async (req: Request, res: Response) => {
  try {
    // Build the upstream URL: UPSTREAM_URL + /v1 + remaining path + query
    const qs = req.url.includes("?") ? "?" + req.url.split("?").slice(1).join("?") : "";
    const targetUrl = `${upstreamUrl}/v1${req.path}${qs}`;

    // Forward all headers except hop-by-hop, replacing auth with upstream key
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (!HOP_BY_HOP.has(k.toLowerCase())) {
        headers[k] = Array.isArray(v) ? v.join(", ") : (v ?? "");
      }
    }
    headers["authorization"] = `Bearer ${upstreamKey}`;

    // Serialize body (already parsed by express.json())
    let body: string | undefined;
    if (req.method !== "GET" && req.method !== "HEAD" && req.body && Object.keys(req.body).length > 0) {
      body = JSON.stringify(req.body);
      headers["content-type"] = "application/json";
      headers["content-length"] = String(Buffer.byteLength(body));
    }

    logger.info({ method: req.method, target: targetUrl }, "Proxying request");

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      // @ts-ignore — Node 22+ fetch option
      duplex: "half",
    });

    // Forward status + headers (skip hop-by-hop)
    res.status(upstream.status);
    for (const [k, v] of upstream.headers.entries()) {
      if (!HOP_BY_HOP.has(k.toLowerCase())) {
        res.setHeader(k, v);
      }
    }

    // Stream the response body transparently (handles SSE and regular JSON)
    if (upstream.body) {
      Readable.fromWeb(upstream.body as import("stream/web").ReadableStream<Uint8Array>).pipe(res);
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
