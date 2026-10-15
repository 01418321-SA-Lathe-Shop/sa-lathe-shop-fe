"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Attachment } from "./customer-domain";
import { FILE_ACCEPT, fileError, prepareDemoFile } from "./customer-files";

export function Dialog({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const opener = document.activeElement;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
      const target = opener instanceof HTMLElement && opener.isConnected ? opener : document.getElementById("workspace-title");
      target?.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={ref} className="customer-dialog" aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); close(); }}>
    <div className="dialog-heading"><h2 id={titleId}>{title}</h2><button type="button" className="button-secondary" aria-label="Close dialog" onClick={close}>Close</button></div>
    {children}
  </dialog>;
}

export function FilePreview({ attachment, url, close }: { attachment: Attachment; url: string; close: () => void }) {
  return (
    <Dialog title={attachment.name} close={close}>
      <p className="text-muted">Local demo attachment · {(attachment.size / 1000).toFixed(1)} KB</p>
      {attachment.sample && <p className="workflow-note">Synthetic sample document. This is not proof of a real order or payment.</p>}
      {url && attachment.type.startsWith("image/") ? (
        // A local Blob URL is intentionally rendered without a Next.js image optimization request.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="attachment-preview" src={url} alt={attachment.name} />
      ) : attachment.sample ? <pre className="sample-document">DEMO DOCUMENT{"\n\n"}{attachment.name}{"\n\n"}For prototype testing only.{"\n"}No real payment, order, or delivery is represented.</pre>
        : <p className="workflow-note">Use the download link to open this document in your preferred viewer.</p>}
      {url ? <a className="button-primary" href={url} download={attachment.name}>Download local file</a> : <p role="status">Preparing local preview…</p>}
    </Dialog>
  );
}

export function FilePicker({ label, onSelect, registerFile, busyChange, shouldFail }: {
  label: string; onSelect: (attachment: Attachment) => void;
  registerFile: (file: File) => Attachment; busyChange: (delta: number) => void; shouldFail: () => boolean;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId(), errorId = useId();
  const pending = useRef<{ controller: AbortController; finish: () => void } | undefined>(undefined);
  useEffect(() => () => {
    pending.current?.controller.abort();
    pending.current?.finish();
  }, []);

  async function select(file: File, sample = false) {
    if (pending.current) return;
    const invalid = fileError(file);
    setError(invalid ?? "");
    if (invalid) { if (input.current) input.current.value = ""; return; }
    const controller = new AbortController();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      busyChange(-1);
      if (pending.current?.controller === controller) pending.current = undefined;
    };
    pending.current = { controller, finish };
    setBusy(true);
    busyChange(1);
    try {
      const attachment = await prepareDemoFile(file, controller.signal, shouldFail, registerFile);
      if (attachment && !controller.signal.aborted) onSelect({ ...attachment, sample });
    } catch {
      if (!controller.signal.aborted) setError("The file could not be attached. Upload again by choosing a file anew.");
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        if (input.current) input.current.value = "";
      }
      finish();
    }
  }

  return <div className="file-picker" aria-busy={busy}>
    <label><span>{label}</span><input ref={input} type="file" accept={FILE_ACCEPT} disabled={busy} aria-invalid={!!error}
      aria-describedby={error ? `${hintId} ${errorId}` : hintId}
      onChange={(event) => { const file = event.target.files?.[0]; if (file) void select(file); }} /></label>
    <div className="file-picker-hint"><span id={hintId}>Documents and images · up to 100 MB each · local demo</span><button type="button" className="text-action" disabled={busy}
      onClick={() => void select(new File(["DEMO DOCUMENT — no real transaction.\n"], "demo-document.txt", { type: "text/plain" }), true)}>Use demo document</button></div>
    {busy && <p role="status">Preparing file locally…</p>}
    {error && <div id={errorId} className="field-error" role="alert"><p>{error}</p><button type="button" className="text-action" onClick={() => input.current?.click()}>Upload again</button></div>}
  </div>;
}
