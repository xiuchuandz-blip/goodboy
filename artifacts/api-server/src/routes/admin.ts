import { Router } from "express";
import {
  getAccounts, addAccount, removeAccount, updateAccount,
  getSettings, updateSettings,
  getStats, resetStats,
  type Account, type Settings,
} from "../lib/state";

const router = Router();

router.get("/accounts", (_req, res) => {
  const accounts = getAccounts().map((a, i) => ({
    index: i,
    url: a.url,
    label: a.label,
    keyHint: a.key.length > 4 ? `****${a.key.slice(-4)}` : "****",
  }));
  res.json(accounts);
});

router.post("/accounts", (req, res) => {
  const { url, key, label } = req.body as Partial<Account>;
  if (!url || !key) {
    res.status(400).json({ error: "url and key are required" });
    return;
  }
  addAccount({ url, key, label: label || url });
  res.json({ ok: true });
});

router.patch("/accounts/:index", (req, res) => {
  const idx = parseInt(req.params["index"] ?? "", 10);
  if (isNaN(idx)) { res.status(400).json({ error: "invalid index" }); return; }
  const ok = updateAccount(idx, req.body as Partial<Account>);
  if (!ok) { res.status(404).json({ error: "account not found" }); return; }
  res.json({ ok: true });
});

router.delete("/accounts/:index", (req, res) => {
  const idx = parseInt(req.params["index"] ?? "", 10);
  if (isNaN(idx)) { res.status(400).json({ error: "invalid index" }); return; }
  const ok = removeAccount(idx);
  if (!ok) { res.status(404).json({ error: "account not found" }); return; }
  res.json({ ok: true });
});

router.get("/settings", (_req, res) => {
  res.json(getSettings());
});

router.put("/settings", (req, res) => {
  updateSettings(req.body as Partial<Settings>);
  res.json(getSettings());
});

router.get("/stats", (_req, res) => {
  res.json(getStats());
});

router.post("/stats/reset", (_req, res) => {
  resetStats();
  res.json({ ok: true });
});

export default router;
