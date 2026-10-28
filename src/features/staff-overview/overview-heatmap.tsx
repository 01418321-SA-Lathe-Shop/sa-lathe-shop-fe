import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import type { BackendApi } from "../../lib/api/backend-api";
import { countText, dayLabel, exactCount, jobsPath, type Day, type HeatmapData, type JobReport } from "./overview-domain";
import { calendarWeeks, heatLevel, keyboardDay } from "./heatmap-domain";
import { useReport } from "./overview-resource";
import { ReportError, Skeleton } from "./overview-panels";
import styles from "./overview.module.css";

export function OverviewHeatmap({ api, data, loading, selected, choose }: { api: BackendApi; data?: HeatmapData; loading: boolean; selected: string; choose: (date: string) => void }) {
  const title = useId();
  return <section className={`${styles.panel} ${styles.activity}`} aria-labelledby={title} aria-busy={loading}><h2 id={title}>ประวัติผลิตเสร็จ</h2><p className={styles.muted}>ย้อนหลัง 12 เดือน · หนึ่ง Job นับครั้งแรกเพียงครั้งเดียว</p>
    {data ? <CompletionCalendar api={api} data={data} selected={selected} choose={choose} /> : loading ? <Skeleton label="กำลังโหลดประวัติผลิตเสร็จ" /> : <p className={styles.noHistory}>ยังแสดงประวัติไม่ได้ กรุณาลองโหลดรายงานอีกครั้ง</p>}
  </section>;
}

function CompletionCalendar({ api, data, selected, choose }: { api: BackendApi; data: HeatmapData; selected: string; choose: (date: string) => void }) {
  const id = useId(); const grid = useRef<HTMLDivElement>(null); const scroll = useRef<HTMLDivElement>(null);
  const [activeDate, setActiveDate] = useState(""); const [open, setOpen] = useState(false);
  const active = data.days.find(day => day.date === activeDate);
  const [previewDay, setPreviewDay] = useState("");
  const [focusDate, setFocusDate] = useState(data.end_date);
  const weeks = useMemo(() => calendarWeeks(data.days), [data.days]);
  const max = data.summary.best_day_count;
  useEffect(() => {
    const node = scroll.current;
    if (!node) return;
    let positionedByUser = false;
    const position = () => { if (!positionedByUser) node.scrollLeft = node.scrollWidth; };
    const preserve = () => { positionedByUser = true; };
    const observer = new ResizeObserver(position);
    observer.observe(node); position();
    node.addEventListener("pointerdown", preserve); node.addEventListener("wheel", preserve, { passive: true }); node.addEventListener("keydown", preserve);
    return () => { observer.disconnect(); node.removeEventListener("pointerdown", preserve); node.removeEventListener("wheel", preserve); node.removeEventListener("keydown", preserve); };
  }, [data.end_date]);
  useEffect(() => {
    if (!active || !open) return;
    const timer = setTimeout(() => setPreviewDay(active.date), 140);
    return () => clearTimeout(timer);
  }, [active, open]);
  const preview = useReport<JobReport>(api, open && active && active.date === previewDay && exactCount(active.count) > BigInt(0) ? jobsPath({ day: active.date, range: "30d", status: "", offset: 0 }, 3) : null);
  function inspect(day: Day) { setActiveDate(day.date); setOpen(true); }
  function move(day: Day, key: string) {
    const index = data.days.findIndex(value => value.date === day.date);
    const next = data.days[keyboardDay(index, key, data.days.length)];
    setFocusDate(next.date); grid.current?.querySelector<HTMLButtonElement>(`button[data-date="${next.date}"]`)?.focus();
  }
  const summary = data.summary;
  return <div className={styles.heatmap} onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}>
    <div className={styles.heatmapMeta}><span>{dayLabel(data.start_date)} – {dayLabel(data.end_date)}</span><span>เวลาไทย</span></div>
    {!data.history_complete && <p className={styles.historyWarning} role="status">ข้อมูลย้อนหลังไม่ครบ · มี {countText(data.missing_history_jobs)} งานที่ขาดประวัติเสร็จครั้งแรก ตัวเลขด้านล่างเป็นเพียงประวัติที่พบ</p>}
    <p className={styles.srOnly} id={`${id}-help`}>ใช้ปุ่มลูกศรเพื่อเลื่อนวัน กด Enter เพื่อดูรายการ Home ไปวันแรก End ไปวันล่าสุด และ Escape ปิดรายละเอียดวันที่ หรือใช้ช่องเลือกวันที่ด้านล่าง</p>
    <div ref={scroll} className={styles.calendarScroll} tabIndex={0} role="region" aria-label="ปฏิทินผลิตเสร็จย้อนหลัง 12 เดือน เลื่อนภายในเพื่อดูทุกเดือน">
      <div className={styles.calendarFrame} style={{ "--weeks": weeks.length } as CSSProperties}>
        <div className={styles.months} aria-hidden="true">{weeks.map((week, i) => <span key={i}>{week.month}</span>)}</div>
        <div className={styles.calendarBody}><div className={styles.weekdays} aria-hidden="true"><span>จ.</span><span>พ.</span><span>ศ.</span></div><div ref={grid} className={styles.calendar} role="group" aria-label="วันผลิตเสร็จ" aria-describedby={`${id}-help`}>
          {weeks.map((week, i) => <div className={styles.week} key={i}>{week.days.map((day, row) => day ? <button key={day.date} className={styles.day} data-date={day.date} data-level={heatLevel(day.count, max)} data-selected={selected === day.date} tabIndex={focusDate === day.date ? 0 : -1} aria-pressed={selected === day.date} aria-label={`${dayLabel(day.date)} · ${data.history_complete ? "" : "พบ "}${countText(day.count)} งานผลิตเสร็จครั้งแรก`} aria-describedby={open && active?.date === day.date ? `${id}-tooltip` : undefined} onPointerEnter={() => inspect(day)} onFocus={() => { setFocusDate(day.date); inspect(day); }} onClick={() => { inspect(day); choose(day.date); }} onKeyDown={event => { if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); move(day, event.key); } }}><span className={styles.srOnly}>{countText(day.count)}</span></button> : <span key={`outside-${row}`} aria-hidden="true" />)}</div>)}
        </div></div>
      </div>
    </div>
    <div className={styles.legend}><span>น้อย</span>{[0, 1, 2, 3, 4].map(level => <i data-level={level} key={level} aria-hidden="true" />)}<span>มาก</span></div>
    <p className={styles.calendarHint}>เลื่อนในปฏิทินเพื่อดูเดือนอื่น หรือเลือกวันที่ด้านล่าง</p>
    <dl className={styles.completionStats}>
      <div><dt>{data.history_complete ? "ผลิตเสร็จครั้งแรก" : "พบประวัติผลิตเสร็จ"}</dt><dd>{countText(summary.total)}<small> งาน</small></dd></div>
      <div><dt>{data.history_complete ? "วันที่เสร็จมากที่สุด" : "วันที่พบมากที่สุด"}</dt><dd>{summary.best_day ? dayLabel(summary.best_day, true) : "—"}<small>{summary.best_day ? ` · ${countText(summary.best_day_count)} งาน` : " ยังไม่มีงานเสร็จ"}</small></dd></div>
      <div><dt>ต่อเนื่องล่าสุด</dt><dd>{summary.current_streak === null ? "—" : countText(summary.current_streak)}<small>{summary.current_streak === null ? " ประวัติไม่ครบ" : " วัน"}</small></dd></div>
      <div><dt>เฉลี่ยต่อสัปดาห์</dt><dd>{summary.average_per_week ?? "—"}<small>{summary.average_per_week === null ? " ประวัติไม่ครบ" : " งาน"}</small></dd></div>
    </dl>
    {data.history_complete && exactCount(summary.total) === BigInt(0) && <p className={styles.noHistory}>ยังไม่มีงานผลิตเสร็จในรอบ 12 เดือน เมื่อผลิตงานเสร็จ ประวัติจะปรากฏที่นี่</p>}
    <label className={styles.datePicker}>ดูงานตามวันที่ผลิตเสร็จ<input type="date" min={data.start_date} max={data.end_date} value={selected} onChange={event => { const value = event.target.value; if (value >= data.start_date && value <= data.end_date) choose(value); }} /></label>
    {open && active && <div className={styles.dayPreview}>
      <div role="tooltip" id={`${id}-tooltip`}><strong>{dayLabel(active.date)}</strong><p>{data.history_complete ? "" : "พบ "}{countText(active.count)} งานผลิตเสร็จครั้งแรก</p>
        {exactCount(active.count) === BigInt(0) ? <p className={styles.muted}>{data.history_complete ? "ไม่มีงานผลิตเสร็จครั้งแรกในวันนี้" : "ไม่พบประวัติผลิตเสร็จในวันนี้"}</p> : preview.data && active.date === previewDay ? <><ul>{preview.data.items.map(job => <li key={job.job_id}>{job.description}</li>)}</ul>{exactCount(preview.data.total) > BigInt(3) && <p className={styles.muted}>มีอีก {countText((exactCount(preview.data.total) - BigInt(3)).toString())} งานในรายการวันนั้น</p>}</> : !preview.error ? <p className={styles.muted} role="status">กำลังโหลดชื่องาน…</p> : null}
      </div><ReportError error={preview.error} retry={preview.reload} /><div className={styles.previewActions}><button onClick={() => choose(active.date)}>ดูงานของวันนี้</button><button onClick={() => setOpen(false)}>ปิดรายละเอียดวันที่</button></div>
    </div>}
  </div>;
}
