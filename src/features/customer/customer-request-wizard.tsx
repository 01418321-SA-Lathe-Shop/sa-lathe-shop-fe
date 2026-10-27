"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, uploadType, type BackendApi, type Customer, type JobRequest } from "../../lib/api/backend-api";
import { useCommand, useResource } from "../../hooks/backend-hooks";
import { customerHref, dateTH } from "./customer-domain";
import { requestPayload } from "./customer-request-domain";
import { FILE_ACCEPT } from "./customer-upload";
import { ActionFeedback, Empty, Field, PageTitle, ResourceFeedback } from "./customer-ui";

type Picked = { file: File; state: "selected" | "ready" | "failed" };
const steps = ["ผู้สั่ง", "รายละเอียด", "ไฟล์แนบ", "ตรวจทาน"];

export function CustomerRequestWizard({ api }: { api: BackendApi }) {
  const router = useRouter(); const profiles = useResource<{ items: Customer[] | null }>(api, "/customers"); const action = useCommand();
  const [step, setStep] = useState(0); const [customerId, setCustomerId] = useState("");
  const [description, setDescription] = useState(""); const [qty, setQty] = useState("1"); const [material, setMaterial] = useState(""); const [deadline, setDeadline] = useState("");
  const [files, setFiles] = useState<Picked[]>([]); const [error, setError] = useState(""); const [created, setCreated] = useState<JobRequest | null>(null); const [uncertain, setUncertain] = useState(false); const [stage, setStage] = useState("");
  const profile = profiles.data?.items?.find((item) => item.id === customerId) ?? profiles.data?.items?.[0];
  const dirty = Boolean(description || material || deadline || files.length);
  useEffect(() => {
    if (!dirty && !uncertain) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, uncertain]);
  function payload() { return requestPayload({ customerId: profile?.id ?? "", description, qty, material, deadline }, Date.now()); }
  function advance(event: FormEvent) {
    event.preventDefault(); setError("");
    try { if (!profile) throw new Error("เลือกบัญชีผู้สั่งก่อนดำเนินการต่อ"); if (step >= 1) payload(); setStep(step + 1); } catch (error) { setError((error as Error).message); }
  }
  async function send(signal: AbortSignal) {
    let request = created;
    if (!request) {
      const input = payload(); setStage("กำลังสร้างคำขอผลิต…");
      try { request = await api.call<JobRequest>("/requests", "POST", input, signal); setCreated(request); }
      catch (error) { if (!(error instanceof ApiError && [400, 403, 409, 422].includes(error.status))) setUncertain(true); throw error; }
    }
    let failed = false;
    for (let i = 0; i < files.length; i++) {
      if (files[i].state === "ready") continue;
      setStage(`สร้างคำขอ #${request.no_request} แล้ว · กำลังอัปโหลดไฟล์ ${i + 1}/${files.length}`);
      try { await api.upload(request.id, files[i].file, signal); setFiles((old) => old.map((item, n) => n === i ? { ...item, state: "ready" } : item)); }
      catch { if (signal.aborted) return; failed = true; setFiles((old) => old.map((item, n) => n === i ? { ...item, state: "failed" } : item)); }
    }
    if (failed) throw new Error(`สร้างคำขอ #${request.no_request} แล้ว แต่บางไฟล์อัปโหลดไม่สำเร็จ กดอัปโหลดอีกครั้งเพื่อส่งเฉพาะไฟล์ที่ยังไม่สำเร็จ`);
    router.push(customerHref("requests", { request: request.id, created: "1" }));
  }
  return <><PageTitle title="ส่งคำขอผลิต" description="ส่งคำขอผ่านเว็บไซต์ · กรอกทีละขั้น แล้วตรวจทานก่อนส่ง" back="/customer/requests" />
    <ol className="cust-stepper" aria-label="ขั้นตอนส่งคำขอ">{steps.map((label, index) => <li key={label} aria-current={index === step ? "step" : undefined} className={index < step ? "done" : ""}><span>{index + 1}</span>{label}</li>)}</ol>
    <ResourceFeedback {...profiles} />
    {profiles.data && !profiles.data.items?.length ? <Empty title="ยังไม่มีบัญชีผู้สั่งที่ใช้งานได้" action={<Link className="cust-primary" href="/customer/memberships">ตรวจสอบบัญชีและบริษัท</Link>}>ตรวจสอบสมาชิกภาพก่อนส่งคำขอ</Empty> : <div className="cust-wizard-grid"><form className="cust-form-surface" onSubmit={step < 3 ? advance : (event) => { event.preventDefault(); void action.run(send, ""); }}>
      <h2>{created ? `คำขอ #${created.no_request} ถูกสร้างแล้ว` : `ขั้นที่ ${step + 1} · ${steps[step]}`}</h2>
      <fieldset disabled={action.busy || uncertain || Boolean(created)}>
        {step === 0 && <><Field label="สั่งในนาม *"><select value={profile?.id ?? ""} onChange={(e) => setCustomerId(e.target.value)} required>{profiles.data?.items?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><p>ประเภทลูกค้า: {profile?.customer_type === "company" ? "บริษัท" : "บุคคลทั่วไป"}</p><p className="cust-muted">ประเภทลูกค้าอ้างอิงบัญชีผู้สั่ง ไม่เปลี่ยนประเภทแยกในแต่ละคำขอ</p></>}
        {step === 1 && <><Field label="รายละเอียดงาน *"><textarea required maxLength={10000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="อธิบายชิ้นงาน ขนาด และสิ่งที่ต้องการให้ผลิต" /></Field><Field label="จำนวน *"><input required inputMode="numeric" pattern="[1-9][0-9]*" value={qty} onChange={(e) => setQty(e.target.value)} /></Field><Field label="ข้อกำหนดวัตถุดิบ (ไม่บังคับ)"><textarea maxLength={2000} value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="เช่น ชนิดเหล็ก หรือข้อกำหนดที่มี" /></Field><Field label="วันที่ต้องการรับงาน (ไม่บังคับ)" hint="เวลาไทย · เป็นวันที่ต้องการ ไม่ใช่กำหนดส่งที่ร้านยืนยัน"><input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field></>}
        {step === 2 && <><Field label="เลือกไฟล์แนบ (ไม่บังคับ)" hint="PDF, DOC/DOCX, XLS/XLSX, TXT, JPEG/PNG · ไม่เกิน 100 MB ต่อไฟล์"><input type="file" multiple accept={FILE_ACCEPT} onChange={(event) => { setError(""); const picked = Array.from(event.target.files ?? []); try { picked.forEach(uploadType); setFiles((old) => [...old, ...picked.map((file): Picked => ({ file, state: "selected" }))]); } catch { setError("เลือกไฟล์ประเภทที่รองรับ ขนาดไม่เกิน 100 MB และชนิดไฟล์ต้องตรงกับนามสกุล"); } event.target.value = ""; }} /></Field><p className="cust-muted">ไฟล์จะเริ่มอัปโหลดหลังสร้างคำขอในขั้นสุดท้าย ไม่ได้อัปโหลดทันทีที่เลือก</p></>}
        {step === 3 && <><p className="cust-muted">ตรวจข้อมูลด้านล่างและไฟล์แนบ หากต้องการแก้ไขให้ย้อนกลับก่อนส่ง</p><RequestSummary profile={profile} description={description} qty={qty} material={material} deadline={deadline} /></>}
      </fieldset>
      {files.length > 0 && (step >= 2 || created) && <ul className="cust-file-list">{files.map((item, index) => <li key={`${item.file.name}:${index}`}><span>{item.file.name}<small>{(item.file.size / 1000000).toFixed(2)} MB · {item.state === "ready" ? "อัปโหลดและตรวจไฟล์แล้ว" : item.state === "failed" ? "อัปโหลดไม่สำเร็จ" : "รอส่ง"}</small></span>{!created && <button type="button" disabled={action.busy} onClick={() => setFiles(files.filter((_, n) => n !== index))}>นำออก</button>}</li>)}</ul>}
      {error && <p role="alert" className="cust-alert danger">{error}</p>}<ActionFeedback busy={action.busy} error={action.error} />{action.busy && <p role="status">{stage}</p>}
      {uncertain ? <div className="cust-alert"><strong>ยังยืนยันไม่ได้ว่าสร้างคำขอสำเร็จหรือไม่</strong><p>อย่าสร้างซ้ำ ตรวจรายการคำขอก่อน ระบบไม่มีคำสั่งสร้างแบบ idempotent สำหรับขั้นนี้</p><Link href="/customer/requests">ตรวจรายการคำขอ →</Link></div> : <div className="cust-actions">{step > 0 && !created && <button type="button" disabled={action.busy} onClick={() => { setStep(step - 1); setError(""); }}>ย้อนกลับ</button>}<button className="cust-primary" disabled={action.busy || profiles.loading || !profile} type="submit">{created ? "อัปโหลดอีกครั้ง" : step < 3 ? "ถัดไป" : "ส่งคำขอผลิต"}</button>{created && <Link href={customerHref("requests", { request: created.id })}>ไปที่คำขอที่สร้างแล้ว</Link>}</div>}
    </form><aside className="cust-wizard-summary"><h2>สรุปคำขอของคุณ</h2><RequestSummary profile={profile} description={description} qty={qty} material={material} deadline={deadline} /><p className="cust-muted">ยังไม่ใช่การยืนยันราคา หรือการรับเข้าคิวผลิต</p></aside></div>}
  </>;
}
function RequestSummary({ profile, description, qty, material, deadline }: { profile?: Customer; description: string; qty: string; material: string; deadline: string }) {
  return <dl className="cust-definition"><div><dt>ผู้สั่ง</dt><dd>{profile?.name ?? "ยังไม่เลือก"}</dd></div><div><dt>รายละเอียดงาน</dt><dd>{description || "ยังไม่กรอก"}</dd></div><div><dt>จำนวน</dt><dd>{qty || "ยังไม่กรอก"}</dd></div><div><dt>วัตถุดิบ</dt><dd>{material || "ไม่ระบุ"}</dd></div><div><dt>วันที่ต้องการ</dt><dd>{deadline ? dateTH(`${deadline}:00+07:00`) : "ไม่ระบุ"}</dd></div></dl>;
}
