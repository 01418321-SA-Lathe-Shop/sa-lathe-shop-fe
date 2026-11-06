import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../../src/features/auth/backend-workspace.tsx", import.meta.url), "utf8");

test("login/register cannot natively submit credentials into the URL before hydration", () => {
  assert.match(source, /<form ref=\{loginForm\} method="post"/);
  assert.match(source, /useSyncExternalStore\(noSubscribe, \(\) => true, \(\) => false\)/);
  assert.match(source, /<fieldset disabled=\{action\.busy \|\| !hydrated\}/);
});

test("registration requires an address unless joining a company by invitation", () => {
  assert.match(source, /const joining = type === "company" && companyMode === "join";/);
  assert.match(source, /\.\.\.\(joining \? \{\} : \{ address: text\(data, "address"\), contact_name: text\(data, "contact_name"\) \}\)/);
  assert.match(source, /<input name="contact_name" required maxLength=\{200\}/);
  assert.match(source, /<textarea name="address" required maxLength=\{500\}/);
});

test("registration asks for the address on a second step", () => {
  assert.match(source, /if \(register && !joining && !addressStep\) \{/);
  assert.match(source, /input\.setCustomValidity\(passwordError\(input\.value\) \?\? ""\)/);
  assert.match(source, /<div className="register-step" hidden=\{addressStep\}>/);
  assert.match(source, /<input name="name" required maxLength=\{200\}/);
  assert.match(source, /<fieldset className="register-step" hidden=\{!addressStep\} disabled=\{!addressStep\}>/);
  assert.match(source, /"ถัดไป"/);
});

test("login and registration messages are Thai and the password rule is unchanged", () => {
  const ui = readFileSync(new URL("../../../src/components/ui/backend-ui.tsx", import.meta.url), "utf8");
  const session = readFileSync(new URL("../../../src/features/auth/api-session.tsx", import.meta.url), "utf8");
  assert.match(source, /"สร้างบัญชีแล้ว เข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่านของคุณ"/);
  assert.match(ui, /<p role="status">กำลังดำเนินการ…<\/p>/);
  assert.match(ui, /if \(\[\.\.\.password\]\.length < 12 \|\| new TextEncoder\(\)\.encode\(password\)\.length > 128\) return "รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร/);
  assert.doesNotMatch(source + session, /Account created|Session expired|Signed out|could not be confirmed|account changed/);
  assert.doesNotMatch(ui, /Working…|Password needs/);
});
