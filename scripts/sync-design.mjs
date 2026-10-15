import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Deterministic documentation generation; no network or application mutations.
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const start = '<!-- DESIGN-SNAPSHOT:START -->';
const end = '<!-- DESIGN-SNAPSHOT:END -->';
const documentPath = join(root, 'DESIGN.md');
const document = read('DESIGN.md');
const from = document.indexOf(start);
const to = document.indexOf(end);
if (from < 0 || to <= from || document.indexOf(start, from + start.length) !== -1 || document.indexOf(end, to + end.length) !== -1) {
  throw new Error('DESIGN.md must have exactly one ordered snapshot marker pair.');
}

function pages(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? pages(path) : entry.name === 'page.tsx' ? [relative(root, path).split('\\').join('/')] : [];
  }).sort();
}

const dashboard = read('app/dashboard.tsx');
const iconStart = dashboard.indexOf('function Icon(');
const iconEnd = dashboard.indexOf('function ThemeToggle(', iconStart);
if (iconStart < 0 || iconEnd < 0) throw new Error('Icon/Logo source boundaries changed; update the design generator.');
const fence = (language, source) => '```' + language + '\n' + source.trimEnd() + '\n```';
const snapshot = [
  '### A. Full CSS specification — app/globals.css',
  'Preserve order and media-query context when reproducing the design.',
  fence('css', read('app/globals.css')),
  '### B. Font loading and root layout — app/layout.tsx',
  fence('tsx', read('app/layout.tsx')),
  '### C. SVG geometry and brand markup — app/dashboard.tsx',
  fence('tsx', dashboard.slice(iconStart, iconEnd)),
  '### D. Route file inventory',
  pages(join(root, 'app')).map((path) => '- `' + path + '`').join('\n'),
].join('\n\n');
const updated = document.slice(0, from + start.length) + '\n\n' + snapshot + '\n\n' + document.slice(to);
if (process.argv.includes('--check')) {
  if (updated !== document) {
    console.error('DESIGN.md snapshot is stale. Update the prose, then run node scripts/sync-design.mjs.');
    process.exitCode = 1;
  } else console.log('DESIGN.md snapshot matches CSS, fonts, icons and routes.');
} else if (updated !== document) {
  writeFileSync(documentPath, updated);
  console.log('Updated DESIGN.md snapshot. Review prose and change log before handoff.');
} else console.log('DESIGN.md snapshot is already up to date.');
