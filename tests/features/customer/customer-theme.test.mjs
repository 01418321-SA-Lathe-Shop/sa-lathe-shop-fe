import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../../../src/features/customer/customer.module.css", import.meta.url), "utf8");
const declarations = (body) => Object.fromEntries([...body.matchAll(/(--cust-[\w-]+):\s*(#[\da-f]+);/gi)].map((match) => [match[1], match[2]]));
const base = declarations(css.match(/^\.root \{([^}]+)\}/s)[1]);
const palette = (theme) => ({ ...base, ...declarations(css.match(new RegExp(`\\.root\\[data-customer-theme="${theme}"\\] \\{([^}]+)\\}`, "s"))[1]) });
const rgb = (hex) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
const luminance = (channels) => channels.map((value) => value / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((total, value, index) => total + value * [.2126, .7152, .0722][index], 0);
const ratio = (a, b) => { const values = [luminance(a), luminance(b)].sort((x, y) => y - x); return (values[0] + .05) / (values[1] + .05); };

for (const theme of ["light", "dark"]) {
  test(`${theme} shared palette keeps readable text, actions, focus and status tints`, () => {
    const p = palette(theme);
    for (const surface of ["--cust-bg", "--cust-surface", "--cust-surface-2", "--cust-tint"]) {
      for (const text of ["--cust-ink", "--cust-muted", "--cust-accent", "--cust-link-hover"]) {
        assert(ratio(rgb(p[text]), rgb(p[surface])) >= 4.5, `${text} on ${surface}`);
      }
      assert(ratio(rgb(p["--cust-focus"]), rgb(p[surface])) >= 3);
    }
    for (const action of ["--cust-action", "--cust-action-hover"]) assert(ratio(rgb("#121514"), rgb(p[action])) >= 4.5);
    assert(ratio(rgb(p["--cust-on-danger"]), rgb(p["--cust-red"])) >= 4.5);
    for (const status of ["--cust-blue", "--cust-green", "--cust-red"]) {
      const color = rgb(p[status]), background = rgb(p["--cust-surface"]);
      const tint = color.map((value, i) => .1 * value + .9 * background[i]);
      assert(ratio(color, tint) >= 4.5, `${status} badge text`);
    }
  });
}

test("navigation, forms and badges use shared theme tokens instead of dark-only overrides", () => {
  for (const name of ["cust-topbar", "cust-sidebar", "cust-mobile-menu", "cust-navbar"]) {
    const body = [...css.matchAll(new RegExp(`\\.root :global\\(\\.${name}\\) \\{([^}]+)\\}`, "g"))].map((match) => match[1]).join(" ");
    assert.match(body, /background: var\(--cust-bg\)/);
    assert.doesNotMatch(body, /rgba\(6, 7, 7/);
  }
  assert.match(css, /input::placeholder[^}]+opacity: 1;/);
  for (const color of ["green", "blue", "red"]) assert(css.includes(`background: color-mix(in srgb, var(--cust-${color}) 10%, var(--cust-surface))`));
});

test("Settings isolate native radio groups in retained App Router trees", () => {
  const source = readFileSync(new URL("../../../src/features/settings/settings-page.tsx", import.meta.url), "utf8");
  assert.match(source, /const preferenceId = useId\(\)/);
  assert(source.includes('name={`settings-size-${preferenceId}`}'));
  assert.doesNotMatch(source, /customer-theme-|saveTheme|<legend>ธีม/);
  assert.doesNotMatch(source, /name="settings-(?:size|theme)"/);
});

test("white quotation paper isolates its secondary ink from the workspace theme", () => {
  const source = readFileSync(new URL("../../../src/features/customer/customer-documents.module.css", import.meta.url), "utf8");
  const body = source.match(/\.paper \{([^}]+)\}/)[1];
  assert.match(body, /--cust-muted: #57615b/);
  assert.match(body, /--cust-ink: #202623/);
  assert.match(body, /color-scheme: light/);
  assert(ratio(rgb("#57615b"), rgb("#ffffff")) >= 4.5);
});
