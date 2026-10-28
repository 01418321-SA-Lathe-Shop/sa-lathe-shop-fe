import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, relative } from "node:path";
import test from "node:test";
import ts from "typescript";

const root = fileURLToPath(new URL("../../", import.meta.url));
const slash = (value) => value.replaceAll("\\", "/");
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]);
}
const appFiles = files(join(root, "app")).map((file) => slash(relative(root, file))).sort();

test("App Router contains only unchanged route files, the global stylesheet and favicon", () => {
  const routeFiles = appFiles.filter((file) => /\.(tsx?|jsx?)$/.test(file));
  const expected = JSON.parse(readFileSync(new URL("./route-files.json", import.meta.url), "utf8"));
  assert.deepEqual(routeFiles, expected);
  assert(appFiles.every((file) => /\/(page|layout|loading|error|not-found|route|template|default)\.(tsx?|jsx?)$/.test(file) || ["app/globals.css", "app/favicon.ico"].includes(file)));
});

test("custom component styles are modules and app/globals.css is the only global stylesheet", () => {
  const css = [...files(join(root, "app")), ...files(join(root, "src"))].filter((file) => file.endsWith(".css"));
  assert.deepEqual(css.filter((file) => !file.endsWith(".module.css")).map((file) => slash(relative(root, file))), ["app/globals.css"]);
});

test("runtime contains no browser mock implementation or credential shortcuts", () => {
  const sourceFiles = files(join(root, "src"));
  assert.equal(sourceFiles.some((file) => slash(relative(root, file)).startsWith("src/mocks/")), false);
  for (const file of sourceFiles.filter((file) => /\.(tsx?|css)$/.test(file))) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /MOCK_LOGINS|createLatheMockBackend|resetMock|setLoseNextResponse|objectFor|mock-switcher|demo-bypass|bypass-actions/, relative(root, file));
  }
});

test("all relative source imports, exports and lazy imports resolve after the moves", () => {
  const missing = [];
  for (const file of [...files(join(root, "app")), ...files(join(root, "src"))].filter((file) => /\.tsx?$/.test(file))) {
    const ast = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function check(spec) {
      if (!spec || !ts.isStringLiteral(spec) || !spec.text.startsWith(".")) return;
      const base = fileURLToPath(new URL(spec.text, pathToFileURL(file)));
      if (![base, base + ".ts", base + ".tsx", base + ".mjs", join(base, "index.ts"), join(base, "index.tsx")].some(existsSync)) missing.push(`${relative(root, file)}: ${spec.text}`);
    }
    function visit(node) {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) check(node.moduleSpecifier);
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) check(node.arguments[0]);
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  assert.deepEqual(missing, []);
});

test("application source files stay below the agreed approximate 300-line boundary", () => {
  const oversized = files(join(root, "src")).filter((file) => /\.tsx?$/.test(file) && readFileSync(file, "utf8").split(/\r?\n/).length > 310);
  assert.deepEqual(oversized.map((file) => relative(root, file)), []);
});
