import { Transform } from "stream";
import { recordStats } from "./state";

function extractFromJson(text: string, url: string): void {
  try {
    const obj = JSON.parse(text) as Record<string, unknown>;
    const u = obj["usage"] as Record<string, number> | undefined;
    if (!u) return;
    recordStats(url, {
      requests: 1,
      inputTokens: u["input_tokens"] ?? u["prompt_tokens"] ?? 0,
      outputTokens: u["output_tokens"] ?? u["completion_tokens"] ?? 0,
      cacheWriteTokens: u["cache_creation_input_tokens"] ?? 0,
      cacheHitTokens: u["cache_read_input_tokens"] ?? 0,
    });
  } catch {
    recordStats(url, { requests: 1 });
  }
}

function extractFromSSE(text: string, url: string): void {
  let inputTokens = 0, outputTokens = 0, cacheWriteTokens = 0, cacheHitTokens = 0;
  for (const line of text.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const data = line.slice(6).trim();
    if (data === "[DONE]") continue;
    try {
      const obj = JSON.parse(data) as Record<string, unknown>;
      if (obj["type"] === "message_start") {
        const msg = obj["message"] as Record<string, unknown> | undefined;
        const u = msg?.["usage"] as Record<string, number> | undefined;
        if (u) {
          inputTokens += u["input_tokens"] ?? 0;
          cacheWriteTokens += u["cache_creation_input_tokens"] ?? 0;
          cacheHitTokens += u["cache_read_input_tokens"] ?? 0;
        }
      }
      if (obj["type"] === "message_delta") {
        const u = obj["usage"] as Record<string, number> | undefined;
        if (u) outputTokens += u["output_tokens"] ?? 0;
      }
      const u = obj["usage"] as Record<string, number> | null | undefined;
      if (u && typeof u === "object" && "prompt_tokens" in u) {
        inputTokens = Math.max(inputTokens, u["prompt_tokens"] ?? 0);
        outputTokens = Math.max(outputTokens, u["completion_tokens"] ?? 0);
      }
    } catch { /* skip malformed chunks */ }
  }
  recordStats(url, { requests: 1, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens });
}

export function createStatsInterceptor(upstreamUrl: string, isStreaming: boolean): Transform {
  const chunks: Buffer[] = [];
  return new Transform({
    transform(chunk: Buffer, _enc, cb) {
      this.push(chunk);
      chunks.push(chunk);
      cb();
    },
    flush(cb) {
      const text = Buffer.concat(chunks).toString("utf8");
      if (isStreaming) {
        extractFromSSE(text, upstreamUrl);
      } else {
        extractFromJson(text, upstreamUrl);
      }
      cb();
    },
  });
}
