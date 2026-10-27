import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const normalize = (file) => resolve(file).replaceAll("\\", "/");
function discover(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? discover(join(directory, entry.name)) : [join(directory, entry.name)]);
}
const files = ["app", "src", "tests"].flatMap((directory) => discover(join(root, directory))).filter((file) => /\.(tsx?|mjs)$/.test(file));
const config = ts.readConfigFile(join(root, "tsconfig.json"), ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, " "));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const graph = new Map();
const importedPackages = new Set();
for (const file of files) {
  const ast = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edges = [];
  function add(spec) {
    if (!spec || !ts.isStringLiteral(spec)) return;
    const value = spec.text;
    if (!value.startsWith(".") && !value.startsWith("@/") && !value.startsWith("node:")) importedPackages.add(value.startsWith("@") ? value.split("/").slice(0, 2).join("/") : value.split("/")[0]);
    const resolved = ts.resolveModuleName(value, file, parsed.options, ts.sys).resolvedModule;
    if (resolved) edges.push(normalize(resolved.resolvedFileName));
  }
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) add(node.moduleSpecifier);
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) add(node.arguments[0]);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  graph.set(normalize(file), edges);
}
const roots = files.filter((file) => /(?:^|[\\/])(?:page|layout|loading|error|not-found|route|template|default)\.[^.]+$/.test(file) || /\.test\./.test(file));
const seen = new Set();
function visit(file) {
  if (seen.has(file)) return;
  seen.add(file);
  for (const dependency of graph.get(file) ?? []) visit(dependency);
}
roots.forEach((file) => visit(normalize(file)));
const unreachable = files.filter((file) => !seen.has(normalize(file))).map((file) => relative(root, file));
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const unreferencedRuntimeDependencies = Object.keys(manifest.dependencies ?? {}).filter((name) => !importedPackages.has(name));
const program = ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: true, noUnusedLocals: true, noUnusedParameters: true });
const unusedDeclarations = ts.getPreEmitDiagnostics(program).filter((diagnostic) => [6133, 6192, 6196].includes(diagnostic.code) && diagnostic.file && normalize(diagnostic.file.fileName).startsWith(normalize(join(root, "src")) + "/")).map((diagnostic) => ({ file: relative(root, diagnostic.file.fileName), message: ts.flattenDiagnosticMessageText(diagnostic.messageText, " ") }));
const approvedRemovedAssets = ["file.svg", "globe.svg", "next.svg", "vercel.svg", "window.svg"];
const unexpectedRemainingStarterAssets = approvedRemovedAssets.filter((name) => existsSync(join(root, "public", name)));
const emptySourceFiles = files.filter((file) => statSync(file).size === 0).map((file) => relative(root, file));
console.log(JSON.stringify({ scanned: files.length, entrypoints: roots.length, unreachable, unreferencedRuntimeDependencies, unusedDeclarations, emptySourceFiles, unexpectedRemainingStarterAssets }, null, 2));
process.exitCode = [unreachable, unreferencedRuntimeDependencies, unusedDeclarations, emptySourceFiles, unexpectedRemainingStarterAssets].some((items) => items.length) ? 1 : 0;
