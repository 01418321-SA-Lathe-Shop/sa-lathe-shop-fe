// Browser client for docs/AUTH.md and UC1–UC3.md in SA-Lathe-Shop-BE.
// An instance belongs to one mounted session. Never persist its token or links.
export type Integer = number | string;
export type Account = { id: string; person_id: string; username: string; name: string; role: "customer" | "worker" | "admin"; is_active: boolean };
export type Login = { access_token: string; token_type: "Bearer"; expires_at: string; account: Account };
export type Customer = { id: string; customer_type: "individual" | "company"; name: string; is_owner: boolean };
export type JobRequest = { id: string; no_request: Integer; customer_id: string; description: string; qty: Integer; material_spec: string; deadline?: string; status: string; created_at: string };
export type Estimate = { material_cost: string; labor_cost: string; total_cost: string; minimum_price: string };
export type Quotation = { id: string; request_id: string; quotation_no: Integer; version: Integer; lock_version: Integer; status: string; final_price: string; internal_costs?: Estimate; sent_at?: string };
export type Terms = { customer_type: string; final_price: string; deposit_required: boolean; po_required: boolean; deposit_amount: string; balance_after_deposit: string; accepted_at: string; documents_due_at: string };
export type Decision = { quotation_id: string; request_id: string; actor_id: string; outcome: "accept" | "reject"; reason?: string; expected_lock_version: Integer; decided_at: string; rejection_count: number; request_status: string; terms?: Terms };
export type Attachment = { id: string; file_name: string; byte_size: number; content_type: string; state: string };
export type Notification = { id: string; request_id: string; title: string; created_at: string; read_at?: string };
export type Worker = Account & { employee_no: string; position?: string; email: string | null; phone: string | null };
export type EvidenceSubmission = { idempotency_key: string; attachment_id: string; kind: "deposit" | "po"; amount?: string; paid_at?: string };
export type Evidence = EvidenceSubmission & { id: string; quotation_id: string; submitted_by: string; status: "pending" | "approved" | "rejected"; version: Integer; submitted_at: string; reviewed_by: string | null; reviewed_at: string | null; reason?: string };
export type Fulfillment = { quotation_id: string; request_status: string; terms: Terms; evidence: Evidence[] | null; job: { id: string; quotation_id: string; request_id: string; status: string; deposit_amount: string; balance: string; due_at: string | null; created_at: string } | null; canceled_at: string | null };
export type Page<T> = { items: T[] | null; limit: number; offset: number };
export type SignedLink = { url: string; headers?: Record<string, string>; expires_at: string; attachment_id?: string };

export class ApiError extends Error {
  status: number;
  code: string;
  requestId?: string;
  constructor(status: number, code: string, message: string, requestId?: string) {
    super(message); this.name = "ApiError"; this.status = status; this.code = code; this.requestId = requestId;
  }
}

// PostgreSQL int64 quantities/sequence numbers can exceed JS's safe integer.
// Preserve those JSON number tokens as decimal strings before JSON.parse.
export function parseApiJSON(raw: string): unknown {
  return JSON.parse(raw.replace(/"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, (token) => {
    if (token.startsWith('"') || /[.eE]/.test(token)) return token;
    return Number.isSafeInteger(Number(token)) ? token : JSON.stringify(token);
  }));
}

export function positiveInt64(value: string): bigint {
  if (!/^[1-9]\d*$/.test(value) || BigInt(value) > BigInt("9223372036854775807")) throw new Error("Quantity must be a positive whole number up to 9223372036854775807.");
  return BigInt(value);
}

function wireJSON(value: unknown): string {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return `[${value.map(wireJSON).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value).filter(([, v]) => v !== undefined).map(([k, v]) => `${JSON.stringify(k)}:${wireJSON(v)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function moneyInput(value: string): string {
  if (!/^\d{1,16}(?:\.\d{1,2})?$/.test(value)) throw new Error("Use a nonnegative THB amount with at most 16 whole digits and two decimal places.");
  const [whole, fraction = ""] = value.split(".");
  return `${BigInt(whole)}.${fraction.padEnd(2, "0")}`;
}

export function displayMoney(value: string): string {
  if (!/^\d+\.\d{2}$/.test(value)) return "Unavailable";
  const [whole, cents] = value.split(".");
  return `THB ${new Intl.NumberFormat("en-US").format(BigInt(whole))}.${cents}`;
}

const MIME: Record<string, string> = {
  pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", txt: "text/plain", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
};
export function uploadType(file: Pick<File, "name" | "size" | "type">): string {
  const type = MIME[file.name.split(".").pop()?.toLowerCase() ?? ""];
  if (!type) throw new Error("Supported files: PDF, DOC/DOCX, XLS/XLSX, TXT, JPEG and PNG.");
  if (file.size < 1 || file.size > 100000000) throw new Error("Choose a nonempty file no larger than 100 MB (100,000,000 bytes).");
  if (file.type && file.type !== type) throw new Error("The file MIME type must match its extension.");
  return type;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const suffix = error.requestId ? ` Reference: ${error.requestId}.` : "";
    if (error.status === 409) return `This record changed or the action conflicts with its current state. Reload before trying again.${suffix}`;
    if (error.status === 401) return "Your session has expired or was revoked. Please sign in again.";
    return `${error.message}${suffix}`;
  }
  return error instanceof Error && error.name !== "TypeError" ? error.message : "Cannot reach the API or storage. Check the connection and allowed origins, then retry the read. A failed save may already have reached the server; reload before resubmitting.";
}

// The live transport is the browser fetch. The explicit in-browser mock backend
// supplies its own fetch and a resolver for its private object links.
export type Transport = { fetch: typeof fetch; objectFor?: (url: string) => Blob | undefined };
const browserTransport: Transport = { fetch: (input, init) => fetch(input, init) };

export class BackendApi {
  private base: string;
  private token = "";
  private controller = new AbortController();
  private onUnauthorized: () => void;
  private transport: Transport;
  constructor(base: string, onUnauthorized: () => void = () => {}, transport: Transport = browserTransport) {
    const url = new URL(base);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error("Configure an HTTP(S) API base URL without credentials, query or fragment.");
    this.base = base.replace(/\/$/, ""); this.onUnauthorized = onUnauthorized; this.transport = transport;
  }
  get origin() { return this.base; }
  close() { this.token = ""; this.controller.abort(); }
  async call<T>(path: string, method = "GET", body?: unknown, signal?: AbortSignal): Promise<T> {
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) throw new Error("Invalid API path.");
    const headers: Record<string, string> = { Accept: "application/json" };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const response = await this.transport.fetch(`${this.base}${path}`, { method, headers, body: body === undefined ? undefined : wireJSON(body), cache: "no-store", credentials: "omit", redirect: "error", signal: signal ? AbortSignal.any([signal, this.controller.signal]) : this.controller.signal });
    if (!response.ok) {
      const envelope = await response.json().catch(() => null);
      if (response.status === 401 && this.token) { this.close(); this.onUnauthorized(); }
      throw new ApiError(response.status, envelope?.error?.code ?? "http_error", envelope?.error?.message ?? "The server could not complete this action.", envelope?.error?.request_id);
    }
    if (response.status === 204) return undefined as T;
    return parseApiJSON(await response.text()) as T;
  }
  async login(username: string, password: string): Promise<Login> {
    const session = await this.call<Login>("/auth/login", "POST", { username, password });
    if (session.token_type !== "Bearer" || !session.access_token || !["customer", "worker", "admin"].includes(session.account.role)) throw new Error("Unsupported login response.");
    this.token = session.access_token;
    return session;
  }
  async logout() { try { await this.call<void>("/auth/logout", "POST"); } finally { this.close(); } }
  async upload(requestId: string, file: File, signal?: AbortSignal): Promise<Attachment> {
    return this.privateUpload(`/requests/${requestId}/uploads`, (id) => `/uploads/${id}/complete`, file, signal);
  }
  // Shared signed-upload protocol: intent -> PUT bytes -> server validation.
  // Every call starts a fresh intent; failed completion is never reused.
  async privateUpload<T = Attachment>(intentPath: string, completePath: (id: string) => string, file: File, signal?: AbortSignal, allowed: (type: string) => boolean = () => true): Promise<T> {
    const type = uploadType(file);
    if (!allowed(type)) throw new Error("This upload accepts JPEG or PNG images only.");
    const link = await this.call<SignedLink>(intentPath, "POST", { file_name: file.name, content_type: type, byte_size: file.size }, signal);
    const url = new URL(link.url);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || !link.attachment_id) throw new Error("Invalid storage upload link. Upload again.");
    const headers = new Headers(link.headers);
    headers.delete("Authorization"); // Never forward API credentials to object storage.
    const response = await this.transport.fetch(url.href, { method: "PUT", headers, body: file, credentials: "omit", redirect: "error", signal: signal ? AbortSignal.any([signal, this.controller.signal]) : this.controller.signal });
    if (!response.ok) throw new Error("Storage upload failed. Upload again with a new upload intent.");
    return this.call<T>(completePath(link.attachment_id), "POST", undefined, signal);
  }
  // Requests a short-lived private link and opens it without keeping the URL in state.
  async download(path: string, fileName?: string, signal?: AbortSignal): Promise<void> {
    const link = await this.call<SignedLink>(path, "GET", undefined, signal);
    const url = new URL(link.url);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw new Error("Invalid private download link.");
    const object = this.transport.objectFor?.(url.href);
    const href = object ? URL.createObjectURL(object) : url.href;
    const anchor = document.createElement("a"); anchor.href = href; anchor.rel = "noreferrer noopener"; anchor.referrerPolicy = "no-referrer";
    if (fileName) anchor.download = fileName;
    document.body.append(anchor); anchor.click(); anchor.remove();
    if (object) window.setTimeout(() => URL.revokeObjectURL(href), 60000);
  }
}
