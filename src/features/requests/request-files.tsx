"use client";

import { useEffect, useState } from "react";
import type { Attachment, BackendApi } from "../../lib/api/backend-api";
import { canPreview } from "../../lib/api/private-preview";
import { useCommand, useResource } from "../../hooks/backend-hooks";
import { Button, ErrorText, LoadError } from "../../components/staff-ui/staff-ui";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./requests.module.css";

const fileSize = (bytes: number) => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
const isImage = (file: Attachment) => canPreview(file) && file.content_type.startsWith("image/");

// Customer request attachments (UC1) shown to staff on the request and on the job (UC8).
export function RequestFiles({ api, id, title = "ไฟล์แบบและรูปจากลูกค้า" }: { api: BackendApi; id: string; title?: string }) {
  const files = useResource<{ items: Attachment[] | null }>(api, `/requests/${id}/attachments`); const download = useCommand();
  const items = files.data?.items ?? [];
  return <section className={layout.section} aria-labelledby={`files-${id}`}>
    <h3 id={`files-${id}`}>{title}</h3>
    {files.loading && !files.data && <p className={layout.muted} role="status">กำลังโหลดไฟล์…</p>}
    {files.error && <LoadError title="โหลดรายการไฟล์ไม่สำเร็จ" onRetry={files.reload} />}
    <ImageThumbs api={api} files={items} alt="รูปอ้างอิงจากลูกค้า" />
    {files.data && (!items.length ? <p className={layout.muted}>ลูกค้ายังไม่ได้แนบไฟล์</p> : <ul className={styles.files}>{items.map((file) => <li key={file.id}>
      <span><strong>{file.file_name}</strong><small>{fileSize(file.byte_size)}</small></span>
      <Button variant="text" disabled={download.busy} onClick={() => void download.run((signal) => api.download(`/attachments/${file.id}/download`, file.file_name, signal), "")}>เปิดไฟล์</Button>
    </li>)}</ul>)}
    <ErrorText error={download.error && "เปิดไฟล์ไม่สำเร็จ ลองอีกครั้ง"} />
  </section>;
}

// Private images as clickable thumbnails. `path` gives each file's signed-link endpoint.
export function ImageThumbs({ api, files, alt, path }: { api: BackendApi; files: Attachment[]; alt: string; path?: (file: Attachment) => string }) {
  const images = files.filter(isImage);
  if (!images.length) return null;
  return <ul className={styles.thumbs}>{images.map((file) => <li key={file.id}><Thumb api={api} file={file} alt={alt} path={path?.(file)} /></li>)}</ul>;
}

// Private bytes are read through the signed link into a blob URL; no storage URL reaches the DOM.
function Thumb({ api, file, alt, path }: { api: BackendApi; file: Attachment; alt: string; path?: string }) {
  const [revision, setRevision] = useState(0); const [state, setState] = useState<{ revision: number; url?: string; error?: boolean }>({ revision: -1 });
  useEffect(() => {
    const controller = new AbortController(); let href: string | undefined;
    void api.preview(file, controller.signal, path).then((blob) => { if (!controller.signal.aborted) { href = URL.createObjectURL(blob); setState({ revision, url: href }); } }, () => { if (!controller.signal.aborted) setState({ revision, error: true }); });
    return () => { controller.abort(); if (href) URL.revokeObjectURL(href); };
  }, [api, file, revision, path]);
  if (state.revision !== revision) return <div className={styles.thumbState} role="status">กำลังโหลดรูป…</div>;
  if (state.error || !state.url) return <div className={styles.thumbState} role="alert"><span>โหลดรูปไม่สำเร็จ</span><Button variant="text" onClick={() => setRevision((old) => old + 1)}>ลองอีกครั้ง</Button></div>;
  // eslint-disable-next-line @next/next/no-img-element -- blob URL of a private file; next/image cannot optimize it.
  return <a href={state.url} target="_blank" rel="noopener noreferrer" title={`เปิดรูป ${file.file_name} ขนาดเต็ม`}><img src={state.url} alt={`${alt} ${file.file_name}`} /></a>;
}
