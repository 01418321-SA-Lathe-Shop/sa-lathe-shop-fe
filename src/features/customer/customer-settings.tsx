"use client";

import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";
import { getServerUiSize, getUiSize, saveTheme, saveUiSize, subscribeAppearance, type Theme, type UiSize } from "../../components/appearance/appearance-preferences";
import { getCustomerTheme, getServerCustomerTheme } from "./customer-preferences";
import { JOB_LABELS } from "./customer-domain";
import { Badge, PageTitle } from "./customer-ui";

export function CustomerSettings() {
  const preferenceId = useId();
  const theme = useSyncExternalStore(subscribeAppearance, getCustomerTheme, getServerCustomerTheme); const size = useSyncExternalStore(subscribeAppearance, getUiSize, getServerUiSize); const [stored, setStored] = useState<boolean | null>(null);
  function remember(kind: "theme" | "size", value: Theme | UiSize) {
    if (kind === "theme") saveTheme(value as Theme); else saveUiSize(value as UiSize);
    try { setStored(window.localStorage.getItem(kind === "theme" ? "lathe-theme" : "lathe-ui-size") === value); } catch { setStored(false); }
  }
  return <><PageTitle title="ตั้งค่าการแสดงผล" description="ปรับให้อ่านและใช้งานได้สะดวก เปลี่ยนการแสดงผลทันที" back="/customer" /><div className="cust-settings-layout"><section className="cust-document"><fieldset className="cust-preference"><legend>ขนาดการแสดงผล</legend>{([["small", "เล็ก"], ["medium", "กลาง"], ["large", "ใหญ่"]] as const).map(([value, label]) => <label key={value}><input type="radio" name={`customer-size-${preferenceId}`} value={value} checked={size === value} onChange={() => remember("size", value)} />{label}</label>)}</fieldset><fieldset className="cust-preference"><legend>ธีม</legend>{([["light", "สว่าง"], ["dark", "มืด"]] as const).map(([value, label]) => <label key={value}><input type="radio" name={`customer-theme-${preferenceId}`} value={value} checked={theme === value} onChange={() => remember("theme", value)} />{label}</label>)}</fieldset><p className="cust-muted">จดจำในเบราว์เซอร์นี้ ไม่ใช่การบันทึกบนบัญชีหรือข้อมูลเข้าสู่ระบบ</p>{stored !== null && <p role="status" className="cust-alert">{stored ? "จดจำการตั้งค่าในเบราว์เซอร์แล้ว" : "ใช้การตั้งค่านี้ได้ในหน้าปัจจุบัน แต่ยังบันทึกไว้ไม่ได้"}</p>}<Link className="cust-primary" href="/customer">เสร็จสิ้น</Link></section><aside className="cust-settings-preview"><h2>ตัวอย่างการแสดงผล</h2><h3>แม่พิมพ์อัดยาง</h3><p>ติดตามงานผลิตและตรวจเอกสารได้ในที่เดียว</p><Badge value="in_progress" labels={JOB_LABELS} /></aside></div></>;
}
