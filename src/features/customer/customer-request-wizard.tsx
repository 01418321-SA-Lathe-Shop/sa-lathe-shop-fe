"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, uploadType, type BackendApi, type Customer, type JobRequest } from "../../lib/api/backend-api";
import { useCommand, useResource } from "../../hooks/backend-hooks";
import { customerHref, dateTH } from "./customer-domain";
import { requestErrors, requestPayload, type RequestErrors } from "./customer-request-domain";
import { FILE_ACCEPT } from "./customer-upload";
import { ActionFeedback, Empty, Field, PageTitle, ResourceFeedback } from "./customer-ui";

type Picked = { file: File; state: "selected" | "ready" | "failed" };
const steps = ["ผู้สั่ง", "รายละเอียด", "ไฟล์แนบ", "ตรวจทาน"];
const SOURCE_LABELS: Record<"net" | "phone" | "line", string> = { net: "เว็บไซต์ (Net)", phone: "โทรศัพท์ (Phone)", line: "LINE" };

export function CustomerRequestWizard({ api }: { api: BackendApi }) {
  const router = useRouter(); const profiles = useResource<{ items: Customer[] | null }>(api, "/customers"); const action = useCommand();
  const [step, setStep] = useState(0); const [customerId, setCustomerId] = useState("");
  const [description, setDescription] = useState(""); const [qty, setQty] = useState("1"); const [material, setMaterial] = useState(""); const [deadline, setDeadline] = useState("");
  const [source, setSource] = useState<"net" | "phone" | "line">("net");
  const [files, setFiles] = useState<Picked[]>([]); const [error, setError] = useState(""); const [fieldErrors, setFieldErrors] = useState<RequestErrors>({}); const [created, setCreated] = useState<JobRequest | null>(null); const [uncertain, setUncertain] = useState(false); const [stage, setStage] = useState("");
  const profile = profiles.data?.items?.find((item) => item.id === customerId) ?? profiles.data?.items?.[0];
  const dirty = Boolean(description || material || deadline || files.length);
  useEffect(() => {
    if (!dirty && !uncertain) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const guardLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      const destination = new URL(link.href);
      if (destination.origin !== window.location.origin || destination.href === window.location.href) return;
      if (!window.confirm("ข้อมูลคำขอที่ยังไม่ได้ส่งจะหายไป ต้องการออกจากหน้านี้หรือไม่?")) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guardLink, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", guardLink, true); };
  }, [dirty, uncertain]);
  const input = () => ({ customerId: profile?.id ?? "", description, qty, material, deadline, source });
  // Field problems stay next to their inputs; the user fixes them on step 2 before going on.
  function check() {
    const errors = requestErrors(input(), Date.now(), { material: true, deadline: true }); setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }
  function payload() {
    if (!check()) { setStep(1); throw new Error("ข้อมูลคำขอยังไม่ครบหรือไม่ถูกต้อง แก้ไขช่องที่แจ้งเตือนแล้วส่งอีกครั้ง"); }
    return requestPayload(input(), Date.now());
  }
  function advance(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!profile) { setError("เลือกบัญชีผู้สั่งก่อนดำเนินการต่อ"); return; }
    if (step >= 1 && !check()) { setStep(1); setError("ข้อมูลคำขอยังไม่ครบหรือไม่ถูกต้อง แก้ไขช่องที่แจ้งเตือน"); return; }
    setStep(step + 1);
  }
  const edit = (field: keyof RequestErrors, set: (value: string) => void) => (value: string) => { set(value); setFieldErrors((old) => ({ ...old, [field]: undefined })); };
  async function send(signal: AbortSignal) {
    let request = created;
    const wasNew = !request;
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
    if (failed) {
      if (wasNew) {
        setStage("อัปโหลดไฟล์ไม่สำเร็จ · กำลังยกเลิกคำขอที่สร้างไว้ (Rollback)…");
        try {
          await api.call(`/requests/${request.id}`, "DELETE", undefined, signal);
          setCreated(null);
          setFiles((old) => old.map((item) => ({ ...item, state: "selected" })));
        } catch {
          // If rollback cannot complete, keep `created` so the user can retry uploading.
        }
        throw new Error("อัปโหลดไฟล์แนบไม่สำเร็จ ระบบได้ยกเลิกการสร้างคำขอแล้ว กรุณาตรวจสอบไฟล์แล้วกดส่งคำขอผลิตอีกครั้ง");
      }
      throw new Error(`สร้างคำขอ #${request.no_request} แล้ว แต่บางไฟล์อัปโหลดไม่สำเร็จ กดอัปโหลดอีกครั้งเพื่อส่งเฉพาะไฟล์ที่ยังไม่สำเร็จ`);
    }
    router.push(customerHref("requests", { request: request.id, created: "1" }));
  }
  return <><PageTitle title="ส่งคำขอผลิต" description="ส่งคำขอผ่านเว็บไซต์ · กรอกทีละขั้น แล้วตรวจทานก่อนส่ง" back="/customer/requests" />
    <ol className="cust-stepper" aria-label="ขั้นตอนส่งคำขอ">{steps.map((label, index) => <li key={label} aria-current={index === step ? "step" : undefined} className={index < step ? "done" : ""}><span>{index + 1}</span>{label}</li>)}</ol>
    <ResourceFeedback {...profiles} />
    {profiles.data && !profiles.data.items?.length ? <Empty title="ยังไม่มีบัญชีผู้สั่งที่ใช้งานได้" action={<Link className="cust-primary" href="/customer/memberships">ตรวจสอบบัญชีและบริษัท</Link>}>ตรวจสอบสมาชิกภาพก่อนส่งคำขอ</Empty> : <div className="cust-wizard-grid"><form className="cust-form-surface" onSubmit={step < 3 ? advance : (event) => { event.preventDefault(); void action.run(send, ""); }}>
      <h2>{created ? `คำขอ #${created.no_request} ถูกสร้างแล้ว` : `ขั้นที่ ${step + 1} · ${steps[step]}`}</h2>
      <fieldset disabled={action.busy || uncertain || Boolean(created)}>
        {step === 0 && <><Field label="สั่งในนาม *"><select value={profile?.id ?? ""} onChange={(e) => setCustomerId(e.target.value)} required>{profiles.data?.items?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><p>ประเภทลูกค้า: {profile?.customer_type === "company" ? "บริษัท" : "บุคคลทั่วไป"}</p><p className="cust-muted">ประเภทลูกค้าอ้างอิงบัญชีผู้สั่ง ไม่เปลี่ยนประเภทแยกในแต่ละคำขอ</p></>}
        {step === 1 && <><Field label="ช่องทางที่ส่งคำขอ (Source) *"><select value={source} onChange={(e) => setSource(e.target.value as "net" | "phone" | "line")} required><option value="net">เว็บไซต์ (Net)</option><option value="phone">โทรศัพท์ (Phone)</option><option value="line">LINE</option></select></Field><Field label="รายละเอียดงาน *" error={fieldErrors.description}><textarea maxLength={10000} aria-invalid={Boolean(fieldErrors.description) || undefined} value={description} onChange={(e) => edit("description", setDescription)(e.target.value)} placeholder="อธิบายชิ้นงาน ขนาด และสิ่งที่ต้องการให้ผลิต" /></Field><Field label="จำนวน *" error={fieldErrors.qty}><input inputMode="numeric" aria-invalid={Boolean(fieldErrors.qty) || undefined} value={qty} onChange={(e) => edit("qty", setQty)(e.target.value)} /></Field><Field label="ข้อกำหนดวัตถุดิบ *" error={fieldErrors.material}><textarea maxLength={2000} aria-invalid={Boolean(fieldErrors.material) || undefined} value={material} onChange={(e) => edit("material", setMaterial)(e.target.value)} placeholder="เช่น ชนิดเหล็ก หรือข้อกำหนดที่มี" /></Field><Field label="วันที่ต้องการรับงาน *" hint="เวลาไทย · เป็นวันที่ต้องการ ไม่ใช่กำหนดส่งที่ร้านยืนยัน" error={fieldErrors.deadline}><input type="datetime-local" aria-invalid={Boolean(fieldErrors.deadline) || undefined} value={deadline} onChange={(e) => edit("deadline", setDeadline)(e.target.value)} /></Field></>}
        {step === 2 && <><Field label="เลือกไฟล์แนบ (ไม่บังคับ)" hint="PDF, DOC/DOCX, XLS/XLSX, TXT, JPEG/PNG · ไม่เกิน 100 MB (100,000,000 bytes) ต่อไฟล์"><input type="file" multiple accept={FILE_ACCEPT} onChange={(event) => { setError(""); const picked = Array.from(event.target.files ?? []); try { picked.forEach(uploadType); setFiles((old) => [...old, ...picked.map((file): Picked => ({ file, state: "selected" }))]); } catch { setError("เลือกไฟล์ประเภทที่รองรับ ขนาดไม่เกิน 100 MB (100,000,000 bytes) และชนิดไฟล์ต้องตรงกับนามสกุล"); } event.target.value = ""; }} /></Field><p className="cust-muted">ไฟล์จะเริ่มอัปโหลดหลังสร้างคำขอในขั้นสุดท้าย หากอัปโหลดไฟล์ไม่สำเร็จระบบจะยกเลิกคำขออัตโนมัติ (Rollback)</p></>}
        {step === 3 && <><p className="cust-muted">ตรวจข้อมูลด้านล่างและไฟล์แนบ หากต้องการแก้ไขให้ย้อนกลับก่อนส่ง</p><RequestSummary profile={profile} source={source} description={description} qty={qty} material={material} deadline={deadline} /></>}
      </fieldset>
      {files.length > 0 && (step >= 2 || created) && <ul className="cust-file-list">{files.map((item, index) => <li key={`${item.file.name}:${index}`}><span>{item.file.name}<small>{(item.file.size / 1000000).toFixed(2)} MB · {item.state === "ready" ? "อัปโหลดและตรวจไฟล์แล้ว" : item.state === "failed" ? "อัปโหลดไม่สำเร็จ" : "รอส่ง"}</small></span>{!created && <button type="button" disabled={action.busy} onClick={() => setFiles(files.filter((_, n) => n !== index))}>นำออก</button>}</li>)}</ul>}
      {error && <p role="alert" className="cust-alert danger">{error}</p>}<ActionFeedback busy={action.busy} error={action.error} />{action.busy && <p role="status">{stage}</p>}
      {uncertain ? <div className="cust-alert"><strong>ยังยืนยันไม่ได้ว่าสร้างคำขอสำเร็จหรือไม่</strong><p>อย่าสร้างซ้ำ ตรวจรายการคำขอก่อน ระบบไม่มีคำสั่งสร้างแบบ idempotent สำหรับขั้นนี้</p><Link href="/customer/requests">ตรวจรายการคำขอ →</Link></div> : <div className="cust-actions">{step > 0 && !created && <button type="button" disabled={action.busy} onClick={() => { setStep(step - 1); setError(""); }}>ย้อนกลับ</button>}<button className="cust-primary" disabled={action.busy || profiles.loading || !profile} type="submit">{created ? "อัปโหลดอีกครั้ง" : step < 3 ? "ถัดไป" : "ส่งคำขอผลิต"}</button>{created && <Link href={customerHref("requests", { request: created.id })}>ไปที่คำขอที่สร้างแล้ว</Link>}</div>}
    </form><aside className="cust-wizard-summary"><h2>สรุปคำขอของคุณ</h2><RequestSummary profile={profile} source={source} description={description} qty={qty} material={material} deadline={deadline} /><p className="cust-muted">ยังไม่ใช่การยืนยันราคา หรือการรับเข้าคิวผลิต</p></aside></div>}
  </>;
}
function RequestSummary({ profile, source, description, qty, material, deadline }: { profile?: Customer; source: "net" | "phone" | "line"; description: string; qty: string; material: string; deadline: string }) {
  return <dl className="cust-definition"><div><dt>ผู้สั่ง</dt><dd>{profile?.name ?? "ยังไม่เลือก"}</dd></div><div><dt>ช่องทาง</dt><dd>{SOURCE_LABELS[source]}</dd></div><div><dt>รายละเอียดงาน</dt><dd>{description || "ยังไม่กรอก"}</dd></div><div><dt>จำนวน</dt><dd>{qty || "ยังไม่กรอก"}</dd></div><div><dt>วัตถุดิบ</dt><dd>{material || "ไม่ระบุ"}</dd></div><div><dt>วันที่ต้องการ</dt><dd>{deadline ? dateTH(`${deadline}:00+07:00`) : "ไม่ระบุ"}</dd></div></dl>;
}
