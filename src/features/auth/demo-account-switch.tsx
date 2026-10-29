"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../../components/appearance/icons";
import { useApiSession } from "./api-session";

// Session provenance is UI-only; the backend still authorizes every login.
export function DemoAccountSwitch() {
  const { session, localTestEnabled, signOut } = useApiSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (!localTestEnabled || !session?.localTest) return null;
  async function switchAccount() {
    if (busy) return;
    setBusy(true);
    await signOut();
    router.push("/login?accounts=test");
  }
  return <button className="demo-account-switch" type="button" disabled={busy} aria-busy={busy} onClick={() => void switchAccount()}><Icon name="arrow"/><span>{busy ? "กำลังออกจากบัญชี…" : "สลับบัญชีทดสอบ"}</span></button>;
}
