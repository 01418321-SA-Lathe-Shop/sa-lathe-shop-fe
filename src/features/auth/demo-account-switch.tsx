"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../../components/appearance/icons";
import { useApiSession } from "./api-session";
import { useCommand } from "../../hooks/backend-hooks";
import { API_ROLES } from "../workspace/workspace-access";
import { ROLE_ROOTS } from "../workspace/workspace-routes";
import { LOCAL_TEST_ACCOUNTS } from "./demo-accounts.ts";

// Session provenance is UI-only; the backend still authorizes every login.
export function DemoAccountSwitch({ onSwitched }: { onSwitched?: () => void } = {}) {
  const { session, localTestEnabled, signInLocalTest } = useApiSession();
  const router = useRouter();
  const action = useCommand();
  const menu = useRef<HTMLDetailsElement>(null);
  if (!localTestEnabled || !session?.localTest) return null;
  const currentUsername = session.account.username;
  function close() {
    if (!menu.current) return;
    menu.current.open = false;
    menu.current.querySelector("summary")?.focus();
  }
  function choose(username: string) {
    if (action.busy || username === currentUsername) return;
    void action.run(async () => {
      const next = await signInLocalTest(username);
      if (menu.current) menu.current.open = false;
      onSwitched?.();
      router.replace(ROLE_ROOTS[API_ROLES[next.account.role]]);
    }, "");
  }
  return <details ref={menu} className="demo-account-switcher" onKeyDown={(event) => {
    if (event.key === "Escape") { event.stopPropagation(); if (!action.busy) close(); }
  }}>
    <summary className="demo-account-switch" aria-disabled={action.busy} onClick={(event) => { if (action.busy) event.preventDefault(); }}><Icon name="arrow"/><span>สลับบัญชีทดสอบ</span></summary>
    <div className="demo-switch-panel" aria-busy={action.busy}>
      <p>เลือกบัญชีเพื่อสลับทันที · เฉพาะ Local test</p>
      {LOCAL_TEST_ACCOUNTS.map(({ username, label }) => <button type="button" key={username} disabled={action.busy || username === session.account.username} aria-current={username === session.account.username ? "true" : undefined} onClick={() => choose(username)}>
        <strong>{username}</strong><span>{username === session.account.username ? "บัญชีปัจจุบัน" : label}</span>
      </button>)}
      {action.busy && <p role="status">กำลังสลับบัญชี…</p>}
      {action.error && <p role="alert">{action.error}</p>}
      <button type="button" disabled={action.busy} onClick={close}>ยกเลิก</button>
    </div>
  </details>;
}
