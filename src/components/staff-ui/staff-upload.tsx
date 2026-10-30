"use client";

import { useState } from "react";
import type { BackendApi } from "../../lib/api/backend-api";
import { useCommand } from "../../hooks/backend-hooks";
import type { ReadyFile } from "../ui/backend-ui";
import { Button, ErrorText, Field } from "./staff-ui";
import layout from "./staff-layout.module.css";

const MAX_BYTES = 100 * 1024 * 1024;
const FILES = ".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png";

// Each attempt is a fresh private upload; a failure offers "อัปโหลดอีกครั้ง".
export function ProofUpload({ api, intentPath, completePath, label, ready, onReady }: { api: BackendApi; intentPath: string; completePath: (id: string) => string; label: string; ready: ReadyFile | null; onReady: (file: ReadyFile | null) => void }) {
  const command = useCommand(); const [file, setFile] = useState<File | null>(null); const [failed, setFailed] = useState(false); const [tooBig, setTooBig] = useState(false);
  if (ready) return <div className={layout.submitBar}><span>แนบแล้ว: {ready.file_name}</span><Button variant="text" onClick={() => { onReady(null); setFile(null); }}>เลือกไฟล์อื่น</Button></div>;
  return <div className={layout.form}>
    <Field label={label} hint="PDF, Word, Excel, TXT, JPEG หรือ PNG ไม่เกิน 100 MB เป็นไฟล์ส่วนตัว"><input type="file" accept={FILES} disabled={command.busy} onChange={(event) => { const next = event.target.files?.[0] ?? null; setFailed(false); setTooBig(Boolean(next && next.size > MAX_BYTES)); setFile(next && next.size <= MAX_BYTES ? next : null); }} /></Field>
    {tooBig && <p className={layout.problem} role="alert">ไฟล์ใหญ่เกิน 100 MB เลือกไฟล์อื่น</p>}
    <div className={layout.actions}><Button disabled={command.busy || !file} onClick={() => { if (!file) return; void command.run(async (signal) => {
      try { onReady(await api.privateUpload<ReadyFile>(intentPath, completePath, file, signal)); setFailed(false); }
      catch (error) { if (!signal.aborted) setFailed(true); throw error; }
    }, ""); }}>{command.busy ? "กำลังอัปโหลด…" : failed ? "อัปโหลดอีกครั้ง" : "อัปโหลดหลักฐาน"}</Button></div>
    {failed && <p className={layout.muted}>อัปโหลดอีกครั้งจะเริ่มอัปโหลดใหม่ ไม่ใช้รายการที่ล้มเหลว</p>}
    <ErrorText error={command.error} />
  </div>;
}
