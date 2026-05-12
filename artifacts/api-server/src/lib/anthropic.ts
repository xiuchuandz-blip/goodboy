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
