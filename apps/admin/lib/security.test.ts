import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? sources(file) : /\.(ts|tsx)$/.test(file) && !/\.test\./.test(file) ? [file] : [];
  });
}
const files = ["app", "features", "lib", "providers"].flatMap(dir => sources(path.join(root, dir))).map(file => ({ file: path.relative(root, file).replaceAll("\\", "/"), text: readFileSync(file, "utf8") }));

describe("admin privacy release gate", () => {
  it("allows only reviewed idle metadata storage and no persisted query cache", () => {
    const writers = files.filter(({ text }) => /(?:local|session)Storage\s*\.\s*setItem|createSyncStoragePersister|persistQueryClient/.test(text)).map(({ file }) => file).sort();
    expect(writers).toEqual(["features/auth/login-form.tsx", "features/console/shell.tsx"]);
    for (const { text } of files) {
      const keys = [...text.matchAll(/(?:local|session)Storage\.setItem\(\s*([^,)]+)/g)].map(m => m[1]);
      expect(keys.every(key => key === "ADMIN_IDLE_KEY")).toBe(true);
    }
  });

  it("does not log production data or place secrets in generated query URLs", () => {
    expect(files.filter(({ text }) => /\bconsole\.(log|debug|info|warn|error)\s*\(/.test(text)).map(({ file }) => file)).toEqual([]);
    expect(files.filter(({ text }) => /[?&](?:token|access_token|refresh_token|password|otp|phone|email|nin|address)=/i.test(text)).map(({ file }) => file)).toEqual([]);
  });
});
