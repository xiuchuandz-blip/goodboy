import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/login", (req, res) => {
  const password = process.env["ADMIN_PASSWORD"];

  if (!password) {
    res.status(503).json({
      error: "ADMIN_PASSWORD 未配置，请在环境变量中设置后重启服务",
    });
    return;
  }

  const input = (req.body as { password?: string })?.password ?? "";
  if (input !== password) {
    res.status(401).json({ error: "密码错误" });
    return;
  }

  res.json({ ok: true, token: password });
});

export default router;
