import { LOCAL_TEST_ACCOUNTS } from "./demo-accounts.ts";

export function DemoAccountPicker({ disabled, onSelect, localTestEnabled = false }: { disabled: boolean; onSelect: (username: string) => void; localTestEnabled?: boolean }) {
  return <details className="auth-account-picker">
    <summary>{localTestEnabled ? "บัญชีทดสอบ Local · เข้าสู่ระบบทันที" : "เลือกบัญชีเดโมบน Backend จริง"}</summary>
    <p>{localTestEnabled ? "กดบัญชีเพื่อเข้าสู่ Backend จริงโดยไม่ใช้รหัสผ่าน เฉพาะเครื่องทดสอบที่ผู้ดูแลเปิดไว้ ไม่ใช่ Mock และห้ามเปิด API นี้ให้บุคคลทั่วไปเข้าถึง" : "กรอกเฉพาะชื่อผู้ใช้ให้คุณ ไม่ใช่ Mock และไม่เข้าสู่ระบบอัตโนมัติ กรุณาใส่รหัสผ่านที่ผู้ดูแลแจ้งเป็นส่วนตัว บัญชีต้องถูกเตรียมบน Backend ก่อน"}</p>
    <div className="auth-account-list">{LOCAL_TEST_ACCOUNTS.map(({ username, label }) => <button type="button" key={username} disabled={disabled} onClick={() => onSelect(username)}>
      <strong>{username}</strong><span>{label}</span>
    </button>)}</div>
  </details>;
}
