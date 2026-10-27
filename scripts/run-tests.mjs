import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
function discover(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? discover(file) : /\.test\.(ts|mjs)$/.test(entry.name) ? [file] : [];
  }).sort();
}

const files = discover(join(root, "tests"));
if (!files.length) throw new Error("No native test files were found.");
const result = spawnSync(process.execPath, ["--experimental-strip-types", "--test", ...process.argv.slice(2), ...files], { cwd: root, stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
