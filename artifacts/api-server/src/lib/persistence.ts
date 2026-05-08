import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from "fs";
import { dirname, join } from "path";
import { logger } from "./logger";

const DATA_DIR = process.env["DATA_DIR"] ?? "./data";
const STATE_FILE = join(DATA_DIR, "state.json");
const TMP_FILE = join(DATA_DIR, "state.json.tmp");

export interface Snapshot {
  version: 1;
  accounts: unknown[];
  accessKeys: unknown[];
  settings: unknown;
  stats: Record<string, unknown>;
}

export function loadSnapshot(): Snapshot | null {
  if (!existsSync(STATE_FILE)) return null;
  try {
    const raw = readFileSync(STATE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Snapshot;
    if (parsed.version !== 1) {
      logger.warn({ version: parsed.version }, "Unknown state.json version, ignoring");
      return null;
    }
    logger.info({ file: STATE_FILE }, "Loaded state from disk");
    return parsed;
  } catch (err) {
    logger.error({ err, file: STATE_FILE }, "Failed to load state.json — starting fresh");
    return null;
  }
}

export function saveSnapshot(snapshot: Snapshot): void {
  try {
    mkdirSync(dirname(STATE_FILE), { recursive: true });
    writeFileSync(TMP_FILE, JSON.stringify(snapshot, null, 2), "utf-8");
    renameSync(TMP_FILE, STATE_FILE);
  } catch (err) {
    logger.error({ err, file: STATE_FILE }, "Failed to persist state.json");
  }
}

export const STATE_FILE_PATH = STATE_FILE;
