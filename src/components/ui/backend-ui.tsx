export function Feedback({ busy, error, message }: { busy?: boolean; error?: string; message?: string }) { return <>{busy && <p role="status">กำลังดำเนินการ…</p>}{error && <p role="alert" className="workflow-error">{error}</p>}{message && <p role="status" className="workflow-success">{message}</p>}</>; }
export function passwordError(password: string): string | undefined {
  if ([...password].length < 12 || new TextEncoder().encode(password).length > 128) return "รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร และไม่เกิน 128 ไบต์ (UTF-8) ระบบไม่ตัดช่องว่างออก";
}
export function text(data: FormData, name: string) { return String(data.get(name) ?? ""); }

export type ReadyFile = { id: string; file_name: string; content_type: string; byte_size: number; state: string };
