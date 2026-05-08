import type { Request, Response, NextFunction } from "express";

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const password = process.env["ADMIN_PASSWORD"];

  if (!password) {
    res.status(503).json({
      error: "ADMIN_PASSWORD 未配置，请在环境变量中设置后重启服务",
    });
    return;
  }

  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (token !== password) {
    res.status(401).json({ error: "密码错误或未登录" });
    return;
  }

  next();
}
