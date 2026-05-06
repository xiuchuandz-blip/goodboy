import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const upstreamUrl = process.env["UPSTREAM_URL"];
const upstreamKey = process.env["UPSTREAM_KEY"];

if (!upstreamUrl) {
  logger.warn("UPSTREAM_URL is not set — proxy routes will return 503");
}
if (!upstreamKey) {
  logger.warn("UPSTREAM_KEY is not set — proxy routes will return 503");
}

function checkConfig(req: Request, res: Response, next: NextFunction) {
  if (!upstreamUrl || !upstreamKey) {
    res.status(503).json({ error: "Proxy not configured: missing UPSTREAM_URL or UPSTREAM_KEY" });
    return;
  }
  next();
}

const proxy = upstreamUrl
  ? createProxyMiddleware<Request, Response>({
      target: upstreamUrl,
      changeOrigin: true,
      pathRewrite: { "^/api/v1": "/v1" },
      on: {
        proxyReq(proxyReq) {
          proxyReq.setHeader("Authorization", `Bearer ${upstreamKey}`);
        },
        error(err, _req, res) {
          logger.error({ err }, "Proxy error");
          (res as Response).status(502).json({ error: "Bad gateway" });
        },
      },
    })
  : null;

router.use("/v1", checkConfig, (req: Request, res: Response, next: NextFunction) => {
  if (proxy) {
    proxy(req, res, next);
  } else {
    res.status(503).json({ error: "Proxy not configured" });
  }
});

export default router;
