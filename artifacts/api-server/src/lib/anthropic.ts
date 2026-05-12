import type { IncomingHttpHeaders } from "http";

const DEFAULT_ANTHROPIC_VERSION = process.env["ANTHROPIC_VERSION"] ?? "2023-06-01";

export function isAnthropicMessagesPath(path: string): boolean {
  return path === "/messages" || path === "/messages/count_tokens";
}

export function hasAnthropicClientHeaders(headers: IncomingHttpHeaders): boolean {
  return Boolean(headers["x-api-key"] || headers["anthropic-version"] || headers["anthropic-beta"]);
}

export function shouldUseAnthropicUpstreamAuth(path: string, headers: IncomingHttpHeaders): boolean {
  if (isAnthropicMessagesPath(path)) return true;
  return path === "/models" && hasAnthropicClientHeaders(headers);
}

export function applyAnthropicHeaders(headers: Record<string, string>): void {
  if (!headers["anthropic-version"]) {
    headers["anthropic-version"] = DEFAULT_ANTHROPIC_VERSION;
  }
}

export function prepareAnthropicMessagesBody(body: unknown): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const next = { ...(body as Record<string, unknown>) };
  delete next["context_management"];
  delete next["container"];
  delete next["mcp_servers"];
  delete next["service_tier"];
  return next;
}

function collectText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(collectText).join("\n");
  if (!value || typeof value !== "object") return "";

  const obj = value as Record<string, unknown>;
  if (typeof obj["text"] === "string") return obj["text"];
  if (typeof obj["content"] === "string" || Array.isArray(obj["content"])) {
    return collectText(obj["content"]);
  }
  return "";
}

export function estimateAnthropicInputTokens(body: unknown): number {
  if (!body || typeof body !== "object" || Array.isArray(body)) return 1;

  const obj = body as Record<string, unknown>;
  const parts = [
    collectText(obj["system"]),
    collectText(obj["messages"]),
    obj["tools"] ? JSON.stringify(obj["tools"]) : "",
  ].filter(Boolean);

  const chars = parts.join("\n").length;
  return Math.max(1, Math.ceil(chars / 3.5) + 16);
}
