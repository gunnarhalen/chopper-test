import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeState } from "@habits/shared";

const here = path.dirname(fileURLToPath(import.meta.url));

export const DEFAULT_FILE = path.join(here, "data", "habits.json");

export function createStore(file = process.env.HABITS_FILE || DEFAULT_FILE) {
  const resolved = path.resolve(file);

  async function read() {
    let raw;
    try {
      raw = await readFile(resolved, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") return { habits: [] };
      throw error;
    }
    try {
      return normalizeState(JSON.parse(raw));
    } catch {
      return { habits: [] };
    }
  }

  async function write(state) {
    const normalized = normalizeState(state);
    await mkdir(path.dirname(resolved), { recursive: true });
    await writeFile(resolved, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
    return normalized;
  }

  return { file: resolved, read, write };
}
