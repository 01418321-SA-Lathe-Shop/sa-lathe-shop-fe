"use client";

import type { useRetryableWrite } from "../../hooks/backend-hooks";
import { ActionFeedback } from "./customer-ui";

export function CustomerWriteRetry({ write, onReload }: { write: ReturnType<typeof useRetryableWrite>; onReload: () => void }) {
  return <><ActionFeedback busy={write.busy} error={write.error} />{write.uncertain && <section className="cust-alert"><strong>ยังยืนยันผลการบันทึกไม่ได้</strong><p>คำสั่งอาจบันทึกแล้ว ระบบเก็บข้อมูลและรหัสคำสั่งเดิมไว้ ห้ามเปลี่ยนข้อมูลแล้วส่งซ้ำภายใต้รหัสเดิม</p><div className="cust-actions"><button disabled={write.busy} onClick={write.retry}>ลองคำสั่งเดิมอีกครั้ง</button><button disabled={write.busy} onClick={() => { write.discard(); onReload(); }}>ตรวจสถานะล่าสุดและเริ่มใหม่</button></div></section>}</>;
}
