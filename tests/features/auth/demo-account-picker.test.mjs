import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(new URL("../../../src/features/auth/demo-account-picker.tsx", import.meta.url));
const source = readFileSync(new URL("../../../src/features/auth/demo-account-picker.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
const componentModule = { exports: {} };
runInNewContext(outputText, { module: componentModule, exports: componentModule.exports, require });
const { DemoAccountPicker } = componentModule.exports;

test("real demo picker exposes six usernames only and never submits", () => {
  const selected = [];
  const picker = DemoAccountPicker({ disabled: false, onSelect: (...args) => selected.push(args) });
  assert.equal(picker.type, "details");
  const buttons = picker.props.children[2].props.children;
  const usernames = ["pim.admin", "anan.staff", "kittipong.staff", "nida.company", "ploy.company", "somchai"];
  assert.deepEqual(Array.from(buttons, (button) => button.props.children[0].props.children), usernames);
  for (const button of buttons) {
    assert.equal(button.type, "button");
    assert.equal(button.props.type, "button");
    assert.equal(button.props.disabled, false);
    button.props.onClick();
  }
  assert.deepEqual(selected, usernames.map((username) => [username]));
});

test("every picker action is disabled while authentication is busy", () => {
  const picker = DemoAccountPicker({ disabled: true, onSelect() {} });
  for (const button of picker.props.children[2].props.children) assert.equal(button.props.disabled, true);
});

test("explicit local-test mode labels password-free access without changing username-only payloads", () => {
  const selected = [];
  const picker = DemoAccountPicker({ disabled: false, localTestEnabled: true, onSelect: (...args) => selected.push(args) });
  assert.match(picker.props.children[0].props.children, /เข้าสู่ระบบทันที/);
  assert.match(picker.props.children[1].props.children, /ไม่ใช้รหัสผ่าน/);
  picker.props.children[2].props.children[0].props.onClick();
  assert.deepEqual(selected, [["pim.admin"]]);
});
