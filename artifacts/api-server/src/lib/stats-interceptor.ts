import { Transform } from "stream";
import { StringDecoder } from "string_decoder";
import { recordStats } from "./state";

interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheHitTokens: number;
}

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

function applySseUsageEvent(obj: Record<string, unknown>, totals: UsageTotals): void {
  if (obj["type"] === "message_start") {
    const msg = obj["message"] as Record<string, unknown> | undefined;
    const u = msg?.["usage"] as Record<string, number> | undefined;
    if (u) {
      totals.inputTokens += u["input_tokens"] ?? 0;
      totals.cacheWriteTokens += u["cache_creation_input_tokens"] ?? 0;
      totals.cacheHitTokens += u["cache_read_input_tokens"] ?? 0;
    }
  }
  if (obj["type"] === "message_delta") {
    const u = obj["usage"] as Record<string, number> | undefined;
    if (u) totals.outputTokens += u["output_tokens"] ?? 0;
  }
  const u = obj["usage"] as Record<string, number> | null | undefined;
  if (u && typeof u === "object" && "prompt_tokens" in u) {
    totals.inputTokens = Math.max(totals.inputTokens, u["prompt_tokens"] ?? 0);
    totals.outputTokens = Math.max(totals.outputTokens, u["completion_tokens"] ?? 0);
    totals.cacheWriteTokens = Math.max(totals.cacheWriteTokens, u["cache_creation_input_tokens"] ?? 0);
    totals.cacheHitTokens = Math.max(totals.cacheHitTokens, u["cache_read_input_tokens"] ?? 0);
  }
}

function processSseDataLine(line: string, totals: UsageTotals): void {
  if (!line.startsWith("data:")) return;
  const data = line.slice(5).trim();
  if (!data || data === "[DONE]") return;
  try {
    applySseUsageEvent(JSON.parse(data) as Record<string, unknown>, totals);
  } catch { /* skip malformed chunks */ }
}

export function createStatsInterceptor(upstreamUrl: string, isStreaming: boolean): Transform {
  if (isStreaming) {
    const decoder = new StringDecoder("utf8");
    const totals: UsageTotals = {
      inputTokens: 0,
      outputTokens: 0,
      cacheWriteTokens: 0,
      cacheHitTokens: 0,
    };
    let pending = "";

    const processText = (text: string) => {
      pending += text;
      let idx = pending.indexOf("\n");
      while (idx >= 0) {
        const line = pending.slice(0, idx).replace(/\r$/, "");
        pending = pending.slice(idx + 1);
        processSseDataLine(line, totals);
        idx = pending.indexOf("\n");
      }
    };

    return new Transform({
      transform(chunk: Buffer, _enc, cb) {
        this.push(chunk);
        processText(decoder.write(chunk));
        cb();
      },
      flush(cb) {
        processText(decoder.end());
        if (pending) processSseDataLine(pending.replace(/\r$/, ""), totals);
        recordStats(upstreamUrl, { requests: 1, ...totals });
        cb();
      },
    });
  }

  const chunks: Buffer[] = [];
  return new Transform({
    transform(chunk: Buffer, _enc, cb) {
      this.push(chunk);
      chunks.push(chunk);
      cb();
    },
    flush(cb) {
      const text = Buffer.concat(chunks).toString("utf8");
      extractFromJson(text, upstreamUrl);
      cb();
    },
  });
}
