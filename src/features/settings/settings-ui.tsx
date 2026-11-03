import type { ReactNode } from "react";
import styles from "./settings.module.css";

export function SettingsPanel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return <section className={styles.panel}><div className={styles.panelHead}><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>{children}</section>;
}
export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return <dl className={styles.facts}>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
export function ActiveState({ active }: { active: boolean }) {
  return <span className={styles.state} data-active={active || undefined}>{active ? "ใช้งานอยู่" : "ปิดใช้งาน"}</span>;
}
