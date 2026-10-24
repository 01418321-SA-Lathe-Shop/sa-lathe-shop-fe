import { useState, type ReactNode } from "react";
import type { BackendApi } from "./backend-api";
import { useCommand } from "./backend-hooks";

export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="form-field"><span>{label}</span>{children}</label>; }
export function Feedback({ busy, error, message }: { busy?: boolean; error?: string; message?: string }) { return <>{busy && <p role="status">Working…</p>}{error && <p role="alert" className="workflow-error">{error}</p>}{message && <p role="status" className="workflow-success">{message}</p>}</>; }
export function Paging({ offset, count, busy, setOffset }: { offset: number; count: number; busy: boolean; setOffset: (offset: number) => void }) { return <div className="form-actions"><button disabled={busy || offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}>Previous</button><span>Page {offset / 20 + 1}</span><button disabled={busy || count < 20} onClick={() => setOffset(offset + 20)}>Next</button></div>; }
export function passwordError(password: string): string | undefined {
  if ([...password].length < 12 || new TextEncoder().encode(password).length > 128) return "Password needs at least 12 characters and at most 128 UTF-8 bytes (spaces are not trimmed).";
}
export function text(data: FormData, name: string) { return String(data.get(name) ?? ""); }

export function Status({ value }: { value: string }) { return <span className={`record-status status-${value}`}>{value.replace(/_/g, " ")}</span>; }

// Shown after a write whose response was lost: the command may have committed.
// The retry resends the frozen original key/payload; changed input needs a reload.
export function RetryNote({ busy, onRetry, label, children }: { busy: boolean; onRetry: () => void; label: string; children?: ReactNode }) {
  return <div className="workflow-note" role="status"><p>{children ?? "The response failed; the command may already have been saved. Reload to inspect the current state, or retry the identical original command. Changed input needs a new command after reloading."}</p><button type="button" disabled={busy} onClick={onRetry}>{label}</button></div>;
}

export type ReadyFile = { id: string; file_name: string; content_type: string; byte_size: number; state: string };
// Private signed upload: every attempt is a fresh intent; a failure offers
// "Upload again" (new intent, never automatic retry). Completion validates the
// file only; it is not approval of whatever the file proves.
export function PrivateUpload({ api, label, intentPath, completePath, images = false, ready, onReady }: { api: BackendApi; label: string; intentPath: string; completePath: (id: string) => string; images?: boolean; ready?: ReadyFile | null; onReady: (file: ReadyFile | null) => void }) {
  const command = useCommand(); const [file, setFile] = useState<File | null>(null); const [failed, setFailed] = useState(false);
  const accept = images ? ".jpg,.jpeg,.png" : ".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png";
  if (ready) return <div className="attachment-row" role="status"><span>Ready: {ready.file_name} · {ready.byte_size} bytes</span><button type="button" onClick={() => { onReady(null); setFile(null); }}>Choose another file</button></div>;
  return <div className="live-fields" aria-busy={command.busy}>
    <Field label={label}><input type="file" accept={accept} disabled={command.busy} onChange={(event) => { setFile(event.target.files?.[0] ?? null); setFailed(false); }} /></Field>
    <p>{images ? "JPEG or PNG" : "PDF, DOC/DOCX, XLS/XLSX, TXT, JPEG/PNG"}, 100 MB maximum. The file stays private.</p>
    <button type="button" disabled={command.busy || !file} onClick={() => { if (!file) return; void command.run(async (signal) => {
      try { onReady(await api.privateUpload<ReadyFile>(intentPath, completePath, file, signal, images ? (type) => type.startsWith("image/") : undefined)); setFailed(false); }
      catch (error) { if (!signal.aborted) setFailed(true); throw error; }
    }, ""); }}>{failed ? "Upload again" : "Upload & validate file"}</button>
    <Feedback busy={command.busy} error={command.error} />
  </div>;
}
