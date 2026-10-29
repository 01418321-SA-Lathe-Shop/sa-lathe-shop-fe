import { ApiError, errorMessage } from "../../lib/api/backend-api.ts";

// UI opt-in only. Backend seed ownership/enablement remains the security boundary.
export function isLocalTestLoginEnabled(base: string, flag?: string): boolean {
  if (flag !== "true") return false;
  try {
    const url = new URL(base);
    return ["http:", "https:"].includes(url.protocol) && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && !url.username && !url.password && !url.search && !url.hash;
  } catch { return false; }
}

export function localTestLoginError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return "Backend ยังไม่เปิด Local test login ให้ผู้ดูแลเปิด LOCAL_TEST_ACCOUNT_ENABLE และเริ่ม API ใหม่";
    if (error.status === 401 || error.status === 403) return "บัญชีทดสอบยังไม่พร้อม อาจยังไม่ได้ seed หรือบัญชีถูกปิดใช้งาน กรุณาติดต่อผู้ดูแล";
    if (error.status === 429) return "เข้าสู่ระบบทดสอบถี่เกินไป กรุณารออย่างน้อย 1 นาทีแล้วกดใหม่ ไม่มีการลองซ้ำอัตโนมัติ";
  }
  return errorMessage(error);
}
