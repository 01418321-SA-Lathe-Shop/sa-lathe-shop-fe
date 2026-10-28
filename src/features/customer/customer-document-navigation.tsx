"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { documentListHref } from "./customer-documents-domain";

type Snapshot = { hrefs: string[]; scroll: number };
type Navigation = { snapshots: Record<string, Snapshot>; capture: (key: string, hrefs: string[]) => void };
const Context = createContext<Navigation | null>(null);
export function DocumentNavigationProvider({ children }: { children: ReactNode }) {
  const [snapshots, setSnapshots] = useState<Record<string, Snapshot>>({});
  function capture(key: string, hrefs: string[]) { const scroll = window.scrollY; setSnapshots((old) => ({ ...Object.fromEntries(Object.entries(old).filter(([item]) => item !== key).slice(-19)), [key]: { hrefs, scroll } })); }
  return <Context.Provider value={{ snapshots, capture }}>{children}</Context.Provider>;
}
export function useDocumentNavigation() {
  const navigation = useContext(Context);
  if (!navigation) throw new Error("Document navigation requires its account-scoped provider");
  return navigation;
}
export function useDocumentScroll(key: string, ready: boolean) {
  const { snapshots } = useDocumentNavigation(); const snapshot = snapshots[key];
  useEffect(() => {
    if (!ready || !snapshot) return;
    let canceled = false; let frame = 0;
    void document.fonts.ready.then(() => { if (!canceled) frame = requestAnimationFrame(() => { if (!canceled) window.scrollTo(0, snapshot.scroll); }); });
    return () => { canceled = true; cancelAnimationFrame(frame); };
  }, [key, ready, snapshot]);
}
export function DocumentDetailNavigation({ blocked = false }: { blocked?: boolean }) {
  const path = usePathname(); const params = useSearchParams(); const { snapshots } = useDocumentNavigation();
  const section = path.endsWith("deposit-po") ? "deposit-po" : "quotations";
  const list = documentListHref(section, params); const hrefs = snapshots[list]?.hrefs ?? [];
  const index = hrefs.findIndex((href) => { const query = new URL(href, "http://local").searchParams; return query.get("quotation") === params.get("quotation") && query.get("evidence") === params.get("evidence"); });
  return <nav className="cust-document-navigation" aria-label="การนำทางเอกสาร">
    {blocked ? <span>บันทึกหรือตรวจสอบคำสั่งเดิมก่อนเปลี่ยนเอกสาร</span> : <Link href={list}>← กลับรายการเดิม</Link>}
    <div>{index > 0 && !blocked && <Link href={hrefs[index - 1]}>← เอกสารก่อนหน้า</Link>}{index >= 0 && index + 1 < hrefs.length && !blocked && <Link href={hrefs[index + 1]}>เอกสารถัดไป →</Link>}</div>
  </nav>;
}
