import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../../../src/lib/api/backend-api.ts";
import { isLocalTestLoginEnabled, localTestLoginError } from "../../../src/features/auth/local-test-login.ts";

test("local test UI is off by default and only accepts explicitly enabled loopback APIs", () => {
  for (const base of ["http://localhost:8080", "http://127.0.0.1:8080", "http://[::1]:8080"]) {
    assert.equal(isLocalTestLoginEnabled(base, "true"), true);
    for (const flag of [undefined, "false", "TRUE", "1"]) assert.equal(isLocalTestLoginEnabled(base, flag), false);
  }
  for (const base of ["https://api.example.com", "http://localhost.example.com", "http://user:secret@localhost", "http://localhost?key=x", "http://localhost#x", "file:///localhost", "bad-url"]) assert.equal(isLocalTestLoginEnabled(base, "true"), false);
});

test("local test failures explain disabled/unseeded/rate-limit states", () => {
  const error = (status) => new ApiError(status, "test", "server message");
  assert.match(localTestLoginError(error(404)), /LOCAL_TEST_ACCOUNT_ENABLE/);
  assert.match(localTestLoginError(error(401)), /seed/);
  assert.match(localTestLoginError(error(403)), /บัญชี/);
  assert.match(localTestLoginError(error(429)), /1 นาที/);
  assert.match(localTestLoginError(new TypeError("network")), /Cannot reach/);
});
