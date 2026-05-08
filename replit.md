# API 代理中转站

将上游 API 的真实地址和密钥隐藏起来，对外暴露一个自己的 OpenAI 兼容接口。

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — 启动 API 服务（端口 8080）
- `pnpm run typecheck` — 全量类型检查
- `pnpm run build` — 类型检查 + 构建所有包

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + 原生 fetch 代理
- Build: esbuild (ESM bundle)

## Where things live

- `artifacts/api-server/src/routes/proxy.ts` — 核心代理逻辑（含调用方鉴权 + 按密钥白名单选上游）
- `artifacts/api-server/src/lib/state.ts` — 全局状态：上游账号、调用密钥、设置、统计（每次写操作落盘到 `./data/state.json`）
- `artifacts/api-server/src/lib/persistence.ts` — JSON 文件持久化（启动时加载 + 原子写）
- `artifacts/api-server/src/routes/admin.ts` — 上游账号 / 设置 / 统计 CRUD
- `artifacts/api-server/src/routes/keys.ts` — 调用密钥 CRUD（生成、改名、改白名单、删除）
- `artifacts/api-server/src/routes/auth.ts` — 管理员登录 `POST /api/auth/login`
- `artifacts/api-server/src/middleware/adminAuth.ts` — `/api/admin/*` Bearer 鉴权
- `artifacts/api-server/src/lib/keepalive.ts` — 定时 ping 防止上游睡眠
- `artifacts/api-server/src/lib/cache.ts` — Anthropic 缓存控制注入
- `artifacts/api-server/src/routes/health.ts` — 健康检查 `/api/healthz`
- `artifacts/landing/src/pages/Keys.tsx` — 调用密钥管理页（新建/复制/编辑白名单/删除）

## Environment Variables

### 上游配置（二选一）

**多上游（推荐）**
- `UPSTREAM_URLS` — 逗号分隔的上游 URL 列表，末尾不带 `/`
  - 例：`https://a.replit.dev/api,https://b.replit.dev/api`
- `UPSTREAM_KEYS` — 与 URL 顺序对应的 key 列表
  - 例：`key1,key2`

**单上游（向下兼容）**
- `UPSTREAM_URL` — 单个上游 URL
- `UPSTREAM_KEY` — 对应 key

### 路由策略

- `ROUTING_STRATEGY` — `round-robin`（默认，轮询）或某个具体的上游 URL（固定指向）

### 访问控制

- `ADMIN_PASSWORD` — **管理面板登录密码（必设）**。未设置时管理面板和 admin API 全部拒绝访问，前端显示登录页但无法登录
- 调用方鉴权：所有 `/v1/*` 请求都必须带匹配的 `Authorization: Bearer <key>`，密钥完全通过面板「密钥」页管理；密钥列表为空时代理拒绝所有调用（401）
- 每个密钥可选「全部上游」或「仅指定上游」白名单（数组形式，空数组 = 禁止任何上游 → 503）

### Keepalive

- `KEEPALIVE_ENABLED` — 设为 `true` 开启，每 3 分钟向所有上游发送 ping，防止 Replit 项目睡眠

### 缓存控制（Anthropic prompt caching）

- `CACHE_MODE` — `none`（默认，不注入）| `system-only` | `system+rolling`
- `CACHE_TTL` — `5m`（默认）| `1h`（需同时自动添加 `extended-cache-ttl-2025-04-11` beta header）

## Architecture decisions

- 代理挂载在 `/v1/*`，目标 URL 构造为 `${UPSTREAM_URL}/v1${path}`
- 上游若为 Replit 部署的同类代理，`UPSTREAM_URL` 需含 `/api` 后缀（如 `https://xxx.replit.dev/api`）
- 所有来自调用方的 `Authorization` 头都被替换为真实的上游 key
- 支持流式响应（SSE），原生 fetch + pipe 透传
- 轮询索引在进程内持久，重启后重置

## User preferences

- 单人自用代理：威胁模型不是多租户 SaaS，UI 取舍偏向"管理员永远能看到完整 key"而不是"明文只显示一次"
- 调用方密钥**只通过面板**管理，不读 ACCESS_KEY 环境变量；密钥为空时代理直接 401（默认拒绝，而不是默认开放）
- 管理面板必须设密码（`ADMIN_PASSWORD`），在 Zeabur 控制台配置

## Gotchas

- UPSTREAM_URL / UPSTREAM_URLS 不要带末尾斜杠
- 修改代理配置后需要重新 build 并重启 workflow
- CACHE_MODE=system+rolling 会修改请求体，仅对 Anthropic 兼容上游有效
- **持久化目录** `./data/`（相对 api-server cwd）：Zeabur 重新部署时容器是新的，**这个目录会被清空**。要么挂 Volume 到该路径，要么部署前先在面板「设置 → 备份与恢复」导出 JSON，部署后再导入恢复。可用 `DATA_DIR` 环境变量改路径。

## Pointers

- 见 `pnpm-workspace` skill 了解 workspace 结构
