import type { Attachment, SignedLink, Transport } from "./types.ts";

const PREVIEW_TYPES = new Map([
  ["pdf", "application/pdf"], ["png", "image/png"], ["jpg", "image/jpeg"], ["jpeg", "image/jpeg"],
]);
export function canPreview(file: Attachment): boolean {
  return file.state === "ready" && PREVIEW_TYPES.get(file.file_name.split(".").pop()?.toLowerCase() ?? "") === file.content_type;
}
// Metadata and bytes come from an authorized attachment. Never forward signed-link
// headers, API credentials or cookies to storage, or keep private URLs on disk.
export async function readPrivatePreview(file: Attachment, getLink: () => Promise<SignedLink>, transport: Transport, signal: AbortSignal): Promise<Blob> {
  signal.throwIfAborted();
  if (!canPreview(file) || !Number.isSafeInteger(file.byte_size) || file.byte_size < 1 || file.byte_size > 100000000) throw new Error("ไฟล์นี้ไม่รองรับการแสดงตัวอย่าง");
  const link = await getLink(); const url = new URL(link.url);
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || !Number.isFinite(Date.parse(link.expires_at)) || Date.parse(link.expires_at) <= Date.now()) throw new Error("ลิงก์ไฟล์ไม่พร้อมใช้งาน กรุณาลองอีกครั้ง");
  signal.throwIfAborted();
  let object = transport.objectFor?.(url.href);
  if (!object) {
    const response = await transport.fetch(url.href, { method: "GET", credentials: "omit", redirect: "error", referrerPolicy: "no-referrer", cache: "no-store", signal });
    if (!response.ok || !response.body) throw new Error("โหลดตัวอย่างไฟล์ไม่สำเร็จ กรุณาลองอีกครั้งหรือดาวน์โหลดต้นฉบับ");
    const reader = response.body.getReader(); const chunks: Uint8Array<ArrayBuffer>[] = []; let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        signal.throwIfAborted(); size += value.byteLength;
        if (size > file.byte_size || size > 100000000) throw new Error("ขนาดไฟล์ไม่ตรงกับข้อมูลที่ตรวจสอบแล้ว");
        chunks.push(new Uint8Array(value));
      }
      object = new Blob(chunks);
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  }
  signal.throwIfAborted();
  if (object.size !== file.byte_size) throw new Error("ขนาดไฟล์ไม่ตรงกับข้อมูลที่ตรวจสอบแล้ว");
  const bytes = new Uint8Array(await object.slice(0, 8).arrayBuffer());
  const valid = file.content_type === "application/pdf" ? String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-" : file.content_type === "image/png" ? [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v) : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!valid) throw new Error("ชนิดไฟล์ไม่ตรงกับข้อมูลที่ตรวจสอบแล้ว ดาวน์โหลดต้นฉบับเพื่อตรวจสอบ");
  signal.throwIfAborted();
  return new Blob([object], { type: file.content_type });
}
