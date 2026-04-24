import { existsSync } from "node:fs";
import { join } from "node:path";

function publicFileExists(relative: string): boolean {
  return existsSync(join(process.cwd(), "public", relative));
}

export function visualUrl(relative: string): string | null {
  const clean = relative.replace(/^\/+/, "");
  if (publicFileExists(clean)) return "/" + clean;
  return null;
}
