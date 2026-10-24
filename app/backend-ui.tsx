import type { ReactNode } from "react";

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
