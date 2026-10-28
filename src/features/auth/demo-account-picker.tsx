// Public fictional usernames approved for the real-backend demo. No credentials,
// session IDs, role overrides or authentication behavior belong in this list.
const ACCOUNTS = [
  { username: "pim.admin", label: "Admin" },
  { username: "anan.staff", label: "Staff · Anan" },
  { username: "kittipong.staff", label: "Staff · Kittipong" },
  { username: "nida.company", label: "ลูกค้าบริษัท · เจ้าของ" },
  { username: "ploy.company", label: "ลูกค้าบริษัท · สมาชิก" },
  { username: "somchai", label: "ลูกค้าบุคคลทั่วไป" },
] as const;

export function DemoAccountPicker({ disabled, onSelect }: { disabled: boolean; onSelect: (username: string) => void }) {
  return <details className="auth-account-picker">
    <summary>เลือกบัญชีเดโมบน Backend จริง</summary>
    <p>กรอกเฉพาะชื่อผู้ใช้ให้คุณ ไม่ใช่ Mock และไม่เข้าสู่ระบบอัตโนมัติ กรุณาใส่รหัสผ่านที่ผู้ดูแลแจ้งเป็นส่วนตัว บัญชีต้องถูกเตรียมบน Backend ก่อน</p>
    <div className="auth-account-list">{ACCOUNTS.map(({ username, label }) => <button type="button" key={username} disabled={disabled} onClick={() => onSelect(username)}>
      <strong>{username}</strong><span>{label}</span>
    </button>)}</div>
  </details>;
}
