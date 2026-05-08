import { Router, type IRouter } from "express";
import {
  getAccessKeys, addAccessKey, updateAccessKey, removeAccessKey,
} from "../lib/state";

const router: IRouter = Router();

/** Validate allowedUpstreams: must be null or an array of unique strings. */
function normalizeAllowed(v: unknown): { ok: true; value: string[] | null } | { ok: false; error: string } {
  if (v === null || v === undefined) return { ok: true, value: null };
  if (!Array.isArray(v)) return { ok: false, error: "allowedUpstreams 必须是数组或 null" };
  for (const item of v) {
    if (typeof item !== "string") return { ok: false, error: "allowedUpstreams 数组元素必须是字符串" };
  }
  return { ok: true, value: Array.from(new Set(v as string[])) };
}

router.get("/", (_req, res) => {
  res.json(getAccessKeys());
});

router.post("/", (req, res) => {
  const body = req.body as {
    name?: string;
    key?: string;
    allowedUpstreams?: string[] | null;
  };
  if (!body.name?.trim()) {
    res.status(400).json({ error: "name 必填" });
    return;
  }
  const norm = normalizeAllowed(body.allowedUpstreams);
  if (!norm.ok) { res.status(400).json({ error: norm.error }); return; }
  const created = addAccessKey({
    name: body.name,
    key: body.key,
    allowedUpstreams: norm.value,
  });
  res.json(created);
});

router.patch("/:id", (req, res) => {
  const id = req.params["id"]!;
  const body = req.body as {
    name?: string;
    allowedUpstreams?: string[] | null;
  };
  const patch: { name?: string; allowedUpstreams?: string[] | null } = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.allowedUpstreams !== undefined) {
    const norm = normalizeAllowed(body.allowedUpstreams);
    if (!norm.ok) { res.status(400).json({ error: norm.error }); return; }
    patch.allowedUpstreams = norm.value;
  }
  const ok = updateAccessKey(id, patch);
  if (!ok) { res.status(404).json({ error: "密钥不存在" }); return; }
  res.json({ ok: true });
});

router.delete("/:id", (req, res) => {
  const id = req.params["id"]!;
  const ok = removeAccessKey(id);
  if (!ok) { res.status(404).json({ error: "密钥不存在" }); return; }
  res.json({ ok: true });
});

export default router;
