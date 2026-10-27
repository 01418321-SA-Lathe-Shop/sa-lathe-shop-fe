"use client";

import { useState } from "react";
import { uploadType, type Attachment, type BackendApi } from "../../lib/api/backend-api";
import { useCommand } from "../../hooks/backend-hooks";
import { Icon } from "../../components/appearance/icons";
import { ActionFeedback, Field } from "./customer-ui";

export const FILE_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png";
export function CustomerUpload({ api, requestId, intentPath, completePath, ready, onReady, disabled = false }: { api: BackendApi; requestId?: string; intentPath?: string; completePath?: (id: string) => string; ready: Attachment | null; onReady: (value: Attachment | null) => void; disabled?: boolean }) {
  const [file, setFile] = useState<File | null>(null); const [validation, setValidation] = useState(""); const [failed, setFailed] = useState(false); const action = useCommand();
  return <div className="cust-upload"><Icon name="file" size={24} />{ready ? <><strong>อัปโหลดและตรวจไฟล์แล้ว</strong><p>{ready.file_name}</p><button type="button" disabled={disabled} onClick={() => { onReady(null); setFile(null); setFailed(false); }}>เลือกไฟล์อื่น</button></> : <>
    <Field label="เลือกเอกสารหรือรูปภาพ *"><input type="file" accept={FILE_ACCEPT} disabled={disabled || action.busy} onChange={(event) => { const next = event.target.files?.[0] ?? null; setValidation(""); setFailed(false); try { if (next) uploadType(next); setFile(next); } catch { setFile(null); setValidation("เลือกไฟล์ PDF, DOC/DOCX, XLS/XLSX, TXT, JPEG หรือ PNG ขนาด 1 ไบต์–100 MB และชนิดไฟล์ต้องตรงกัน"); } }} /></Field>
    <p className="cust-muted cust-small">ไฟล์ส่วนตัว · ไม่เกิน 100 MB · PDF, Word, Excel, TXT, JPEG/PNG</p>
    <button type="button" disabled={!file || disabled || action.busy} onClick={() => { if (!file) return; void action.run(async (signal) => { try { const result = requestId ? await api.upload(requestId, file, signal) : await api.privateUpload<Attachment>(intentPath!, completePath!, file, signal); onReady(result); setFailed(false); } catch (error) { setFailed(true); throw error; } }, ""); }}>{action.busy ? "กำลังอัปโหลดและตรวจไฟล์…" : failed ? "อัปโหลดอีกครั้ง" : "อัปโหลดและตรวจไฟล์"}</button>
    {failed && <p className="cust-muted">อัปโหลดอีกครั้งจะเริ่มไฟล์ใหม่ ไม่ใช้ upload intent ที่ล้มเหลว</p>}
  </>}{validation && <p className="cust-alert danger" role="alert">{validation}</p>}<ActionFeedback busy={action.busy} error={action.error} /></div>;
}
