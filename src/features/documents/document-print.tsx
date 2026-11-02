"use client";

import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Sarabun } from "next/font/google";
import styles from "./documents.module.css";

// Sarabun is the customary typeface for formal Thai business documents.
const sarabun = Sarabun({ subsets: ["thai", "latin"], weight: ["400", "600", "700"], display: "block" });

type Trigger = (props: ButtonHTMLAttributes<HTMLButtonElement>) => ReactNode;
const PlainButton: Trigger = (props) => <button type="button" {...props} />;

/**
 * Renders the document into a body-level portal only while printing; print CSS
 * hides the application so the browser prints (or saves as PDF) just the paper.
 * `?print=1` (from document lists) prints once the data is ready.
 */
export function PrintDocument({ ready, footer, hint, label = "พิมพ์ / บันทึกเป็น PDF", button = PlainButton, children }: { ready: boolean; footer: string; hint?: string; label?: string; button?: Trigger; children: ReactNode }) {
  const params = useSearchParams(); const path = usePathname(); const router = useRouter();
  const [requested, setRequested] = useState(() => params.get("print") === "1"); const [printing, setPrinting] = useState(false);
  useEffect(() => {
    if (!requested || !ready) return;
    const timer = window.setTimeout(() => { setPrinting(true); setRequested(false); if (params.has("print")) { const next = new URLSearchParams(params); next.delete("print"); router.replace(`${path}?${next}`, { scroll: false }); } }, 0);
    return () => clearTimeout(timer);
  }, [requested, ready, params, path, router]);
  useEffect(() => {
    if (!printing) return;
    let canceled = false; let frame = 0;
    const finish = () => setPrinting(false); window.addEventListener("afterprint", finish);
    void document.fonts.ready.then(() => { if (!canceled) frame = requestAnimationFrame(() => { if (!canceled) window.print(); }); });
    return () => { canceled = true; cancelAnimationFrame(frame); window.removeEventListener("afterprint", finish); };
  }, [printing]);
  const font = sarabun.style.fontFamily;
  // @page lives in the portal so it applies only to these documents. Margin boxes carry page numbers.
  const page = `@page{size:A4;margin:16mm 15mm 18mm;@bottom-left{content:${JSON.stringify(footer)};font:8.5pt ${font};color:#555}@bottom-right{content:"หน้า " counter(page) " / " counter(pages);font:8.5pt ${font};color:#555}}`;
  return <>{button({ disabled: !ready || printing || requested, onClick: () => setPrinting(true), children: label })}
    {!ready && hint && <small>{hint}</small>}
    {printing && createPortal(<div className={`${styles.printRoot} ${sarabun.className}`} lang="th"><style>{page}</style>{children}</div>, document.body)}
  </>;
}
