// Browser client for docs/AUTH.md and UC1–UC3.md in SA-Lathe-Shop-BE.
// An instance belongs to one mounted session. Never persist its token or links.
export type Integer = number | string;
export type Account = { id: string; person_id: string; username: string; name: string; role: "customer" | "worker" | "admin"; is_active: boolean; created_at?: string };
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
// Browser fetch in the application; injectable fetch keeps transport tests isolated.
export type Transport = { fetch: typeof fetch };
