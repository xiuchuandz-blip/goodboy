# API 代理中转站

将上游 API 的真实地址和密钥隐藏起来，对外暴露一个自己的 OpenAI 兼容接口。

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — 启动 API 服务（端口 5000）
- `pnpm run typecheck` — 全量类型检查
- `pnpm run build` — 类型检查 + 构建所有包
- Required env secrets: `UPSTREAM_URL`、`UPSTREAM_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + http-proxy-middleware 3
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/routes/proxy.ts` — 核心代理逻辑
- `artifacts/api-server/src/routes/health.ts` — 健康检查 `/api/healthz`

## Architecture decisions

- 代理挂载在 `/api/v1/*`，pathRewrite 补回 `/v1` 前缀（Express 路由会剥去挂载路径）
- 所有来自调用方的 `Authorization` 头都被替换为真实的 `UPSTREAM_KEY`
- 支持流式响应（SSE），http-proxy-middleware 原生透传

## Product

调用方使用本项目的 URL 和任意 key（或无需 key），即可访问上游 API，无需知道上游真实地址和密钥。

## User preferences

- 对外不需要鉴权，拿到本项目 URL 即可使用

## Gotchas

- 修改代理配置后需要重新 build 并重启 workflow
- UPSTREAM_URL 不要带末尾斜杠

## Pointers

- 见 `pnpm-workspace` skill 了解 workspace 结构
