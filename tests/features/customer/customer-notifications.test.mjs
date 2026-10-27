import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../../../src/features/customer/customer-notifications.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
});

// Exercise the actual click handler without a DOM or additional test dependencies.
function renderBell(beforeOpen) {
  const events = [];
  let refIndex = 0;
  const componentModule = { exports: {} };
  const stubs = {
    react: {
      useEffect() {},
      useState: (initial) => [initial, (value) => events.push(value)],
      useRef: () => ({ current: refIndex++ === 0 ? { showModal: () => events.push("open") } : null }),
    },
    "./customer-hooks": { useCollection: () => ({ reload() {} }) },
    "../../components/appearance/icons": { Icon: () => null },
  };
  runInNewContext(outputText, {
    module: componentModule,
    exports: componentModule.exports,
    require: (name) => name === "react/jsx-runtime" ? require(name) : stubs[name] ?? {},
  });
  const element = componentModule.exports.NotificationBell({ api: {}, beforeOpen: beforeOpen && (() => beforeOpen(events)) });
  return { button: element.props.children[0], events };
}

test("desktop notification bell opens without a beforeOpen callback", () => {
  const { button, events } = renderBell();
  assert.doesNotThrow(() => button.props.onClick());
  assert.deepEqual(events, [1, true, "open"]);
});

test("mobile notification bell closes the menu before opening its dialog", () => {
  const { button, events } = renderBell((events) => events.push("close-menu"));
  button.props.onClick();
  assert.deepEqual(events, ["close-menu", 1, true, "open"]);
});
