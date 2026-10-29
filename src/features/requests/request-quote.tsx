"use client";

import { useEffect, useState } from "react";
import { ApiError, moneyInput, type BackendApi, type Estimate, type JobRequest, type Quotation } from "../../lib/api/backend-api";
import { useCommand } from "../../hooks/backend-hooks";
import { bahtTH, dateTimeTH } from "../../components/staff-ui/staff-format";
import { Button, Collapsible, ConfirmDialog, ErrorText, Field, NextAction } from "../../components/staff-ui/staff-ui";
import layout from "../../components/staff-ui/staff-layout.module.css";
import { priceCheck, satang } from "./request-stage-domain";
import styles from "./requests.module.css";

const MONEY_HINT = "จำนวนเงินบาท ทศนิยมไม่เกิน 2 ตำแหน่ง";
const CONFLICT = "มีคนแก้ไขใบเสนอราคานี้ไปแล้ว โหลดข้อมูลล่าสุดก่อนแก้ต่อ";
const conflictAware = (error: unknown) => error instanceof ApiError && error.status === 409 ? new Error(CONFLICT) : error;
const same = (a: string, b: string | undefined) => b !== undefined && satang(a) !== null && satang(a) === satang(b);

/** A sent, approved or draft quotation's totals; internal costs reach Staff/Admin only. */
export function QuoteSummary({ quote }: { quote: Quotation }) {
  const costs = quote.internal_costs;
  return <dl className={layout.facts}>
    <div><dt>ราคาเสนอลูกค้า (ไม่มี VAT)</dt><dd>{bahtTH(quote.final_price)}</dd></div>
    {costs && <><div><dt>ต้นทุนรวม</dt><dd>{bahtTH(costs.total_cost)}</dd></div><div><dt>ราคาขั้นต่ำ</dt><dd>{bahtTH(costs.minimum_price)}</dd></div></>}
    <div><dt>{quote.sent_at ? "ส่งเมื่อ" : "สถานะ"}</dt><dd>{quote.sent_at ? dateTimeTH(quote.sent_at) : "ร่าง ยังไม่ส่ง"}</dd></div>
  </dl>;
}

// Staff only. The minimum price always comes from the server's estimate; the
// browser only compares the offered price with it. Send saves first when needed.
export function QuoteForm({ api, request, draft, revision, onSaved }: { api: BackendApi; request: JobRequest; draft?: Quotation; revision: boolean; onSaved: (message: string) => void }) {
  const [material, setMaterial] = useState(draft?.internal_costs?.material_cost ?? "");
  const [labor, setLabor] = useState(draft?.internal_costs?.labor_cost ?? "");
  const [price, setPrice] = useState(draft?.final_price ?? "");
  const [saved, setSaved] = useState<Quotation | undefined>(draft); // latest server copy, kept across a failed send
  const [estimate, setEstimate] = useState<{ key: string; value?: Estimate; failed?: boolean }>({ key: "" });
  const [confirming, setConfirming] = useState(false); const [problem, setProblem] = useState("");
  const action = useCommand();
  const costsValid = satang(material) !== null && satang(labor) !== null;
  const key = `${material.trim()}|${labor.trim()}`;
  useEffect(() => {
    if (!costsValid) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      api.call<Estimate>("/quotations/estimate", "POST", { material_cost: moneyInput(material.trim()), labor_cost: moneyInput(labor.trim()) }, controller.signal)
        .then((value) => setEstimate({ key, value }), () => { if (!controller.signal.aborted) setEstimate({ key, failed: true }); });
    }, 400);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [api, costsValid, key, material, labor]);
  const current = costsValid && estimate.key === key ? estimate : undefined;
  const minimum = current?.value?.minimum_price;
  const check = priceCheck(price, minimum);
  const dirty = !saved || !same(material, saved.internal_costs?.material_cost) || !same(labor, saved.internal_costs?.labor_cost) || !same(price, saved.final_price);

  function invalid(): string {
    if (!costsValid) return `กรอกค่าวัตถุดิบและค่าแรงเป็น${MONEY_HINT}`;
    if (check === "invalid") return `กรอกราคาเสนอเป็น${MONEY_HINT}`;
    if (check === "below") return `ราคาเสนอต่ำกว่าราคาขั้นต่ำ ${bahtTH(minimum)}`;
    return "";
  }
  async function save(signal: AbortSignal): Promise<Quotation> {
    const input = { material_cost: moneyInput(material.trim()), labor_cost: moneyInput(labor.trim()), final_price: moneyInput(price.trim()) };
    const result = saved ? await api.call<Quotation>(`/quotations/${saved.id}`, "PATCH", { ...input, expected_lock_version: BigInt(saved.lock_version) }, signal)
      : await api.call<Quotation>(`/requests/${request.id}/quotations`, "POST", input, signal);
    if (!result?.id || result.lock_version === undefined) throw new Error("บันทึกร่างแล้วแต่ยังไม่ได้รับข้อมูลล่าสุด โหลดข้อมูลล่าสุดก่อนส่ง");
    setSaved(result); return result;
  }
  function saveDraft() {
    const reason = invalid(); setProblem(reason); if (reason) return;
    void action.run(async (signal) => {
      try { await save(signal); } catch (error) { throw conflictAware(error); }
      onSaved("บันทึกร่างแล้ว");
    }, "");
  }
  function send() {
    setConfirming(false);
    void action.run(async (signal) => {
      let quote = saved; let savedNow = false;
      try {
        if (!quote || dirty) { quote = await save(signal); savedNow = true; }
        await api.call(`/quotations/${quote.id}/send`, "POST", { expected_lock_version: BigInt(quote.lock_version) }, signal);
      } catch (error) {
        const known = conflictAware(error);
        throw savedNow && !(known instanceof Error && known.message === CONFLICT) ? new Error("บันทึกร่างแล้ว แต่ยังส่งไม่สำเร็จ กด “ส่งใบเสนอราคา” อีกครั้ง") : known;
      }
      onSaved("ส่งใบเสนอราคาแล้ว · ลูกค้าจะเห็นในระบบ");
    }, "");
  }
  return <NextAction title={revision ? "ทำใบเสนอราคาฉบับใหม่" : draft ? "ตรวจร่างและส่งใบเสนอราคา" : "ทำใบเสนอราคา"}>
    {revision && <p className={layout.muted}>ลูกค้าปฏิเสธฉบับก่อน ดูเหตุผลได้ที่ประวัติด้านล่าง ฉบับใหม่จะเริ่มจากร่าง</p>}
    <form className={layout.form} onSubmit={(event) => { event.preventDefault(); const reason = invalid(); setProblem(reason); if (!reason) setConfirming(true); }}>
      <fieldset disabled={action.busy}>
        <legend className={layout.visuallyHidden}>ราคารวมทั้งคำขอ</legend>
        <div className={styles.moneyGrid}>
          <Field label="ค่าวัตถุดิบรวม (บาท)" hint="รวมทั้งคำขอ ไม่ใช่ราคาต่อชิ้น"><input inputMode="decimal" autoComplete="off" value={material} onChange={(event) => setMaterial(event.target.value)} /></Field>
          <Field label="ค่าแรงรวม (บาท)"><input inputMode="decimal" autoComplete="off" value={labor} onChange={(event) => setLabor(event.target.value)} /></Field>
        </div>
        <p className={styles.minimum} role="status">{!costsValid ? `กรอกต้นทุนทั้งสองช่องเพื่อดูราคาขั้นต่ำ (ต้นทุน + 60%)` : current?.value ? <>ต้นทุนรวม {bahtTH(current.value.total_cost)} · <strong>ราคาขั้นต่ำ {bahtTH(minimum)}</strong></> : current?.failed ? "คำนวณราคาขั้นต่ำไม่สำเร็จ ระบบจะตรวจอีกครั้งตอนบันทึก" : "กำลังคำนวณราคาขั้นต่ำ…"}</p>
        <Field label="ราคาเสนอลูกค้า (บาท, ไม่มี VAT)" error={price && check === "below" ? `ต่ำกว่าราคาขั้นต่ำ ${bahtTH(minimum)}` : price && check === "invalid" ? MONEY_HINT : undefined} hint={check === "ok" ? "✓ ไม่ต่ำกว่าราคาขั้นต่ำ" : undefined}><input inputMode="decimal" autoComplete="off" value={price} aria-invalid={price && (check === "below" || check === "invalid") ? true : undefined} onChange={(event) => setPrice(event.target.value)} /></Field>
      </fieldset>
      {problem && <p className={layout.problem} role="alert">{problem}</p>}
      <ErrorText error={action.error} />
      <div className={layout.submitBar} data-sticky="">
        <Button disabled={action.busy || (Boolean(saved) && !dirty)} onClick={saveDraft}>{saved && !dirty ? "บันทึกร่างแล้ว" : "บันทึกร่าง"}</Button>
        <button type="submit" className={layout.submit} disabled={action.busy}>ส่งใบเสนอราคา</button>
      </div>
    </form>
    <ConfirmDialog open={confirming} title={`ส่งใบเสนอราคา ${bahtTH(satang(price) === null ? undefined : moneyInput(price.trim()))} ให้ลูกค้า?`} confirmLabel="ส่งใบเสนอราคา" onClose={() => setConfirming(false)} onConfirm={send}>
      <p>ส่งแล้วแก้ไขไม่ได้ ถ้าลูกค้าปฏิเสธจะทำฉบับใหม่ได้{dirty ? " ระบบจะบันทึกร่างล่าสุดก่อนส่ง" : ""}</p>
    </ConfirmDialog>
  </NextAction>;
}

export function RefuseRequest({ api, id, onSaved }: { api: BackendApi; id: string; onSaved: (message: string) => void }) {
  const [reason, setReason] = useState(""); const [confirming, setConfirming] = useState(false); const [problem, setProblem] = useState("");
  const action = useCommand();
  const trimmed = reason.trim();
  return <Collapsible title="รับงานไม่ได้? ปฏิเสธคำขอ">
    <form className={layout.form} onSubmit={(event) => { event.preventDefault(); const bad = !trimmed || [...trimmed].length > 2000; setProblem(bad ? "กรอกเหตุผล 1–2,000 ตัวอักษร" : ""); if (!bad) setConfirming(true); }}>
      <fieldset disabled={action.busy}>
        <legend className={layout.visuallyHidden}>ปฏิเสธคำขอนี้</legend>
        <Field label="เหตุผล (ลูกค้าจะเห็นข้อความนี้)" error={problem || undefined}><textarea rows={3} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} /></Field>
      </fieldset>
      <ErrorText error={action.error} />
      <div className={layout.actions}><Button type="submit" variant="danger" disabled={action.busy}>ปฏิเสธคำขอ</Button></div>
    </form>
    <ConfirmDialog open={confirming} danger title="ปฏิเสธคำขอ?" confirmLabel="ปฏิเสธคำขอ" onClose={() => setConfirming(false)} onConfirm={() => { setConfirming(false); void action.run(async (signal) => { await api.call(`/requests/${id}/reject`, "POST", { reason: trimmed }, signal); onSaved("ปฏิเสธคำขอแล้ว · ลูกค้าจะเห็นเหตุผล"); }, ""); }}>
      <p>คำขอจะถูกยกเลิก การปฏิเสธนี้ไม่นับเป็นการปฏิเสธใบเสนอราคาของลูกค้า</p>
    </ConfirmDialog>
  </Collapsible>;
}
