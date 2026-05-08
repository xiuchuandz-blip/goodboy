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

- `artifacts/api-server/src/routes/proxy.ts` — 核心代理逻辑
- `artifacts/api-server/src/lib/upstreams.ts` — 多上游管理与路由策略
- `artifacts/api-server/src/lib/keepalive.ts` — 定时 ping 防止上游睡眠
- `artifacts/api-server/src/lib/cache.ts` — Anthropic 缓存控制注入
- `artifacts/api-server/src/routes/health.ts` — 健康检查 `/api/healthz`

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

- `ACCESS_KEY` — 代理调用方鉴权（OpenAI 兼容接口）。不设置则完全开放；设置后调用方需在 Authorization 头中携带此 key
- `ADMIN_PASSWORD` — **管理面板登录密码（必设）**。未设置时管理面板和 admin API 全部拒绝访问，前端显示登录页但无法登录

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

- 代理接口对外不需要鉴权（`ACCESS_KEY` 留空），拿到本项目 URL 即可使用
- 管理面板必须设密码（`ADMIN_PASSWORD`），在 Zeabur 控制台配置

## Gotchas

- UPSTREAM_URL / UPSTREAM_URLS 不要带末尾斜杠
- 修改代理配置后需要重新 build 并重启 workflow
- CACHE_MODE=system+rolling 会修改请求体，仅对 Anthropic 兼容上游有效

## Pointers

- 见 `pnpm-workspace` skill 了解 workspace 结构
