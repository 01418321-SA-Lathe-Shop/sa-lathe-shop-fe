// In-browser mock of the SA-Lathe-Shop-BE HTTP contract (AUTH, UC1–UC9).
// It exists so the connected UI can be built and previewed before the real
// Go/PostgreSQL/S3 stack is available. It is an explicit opt-in transport,
// never a fallback after a live API failure, and it is not business authority:
// the backend remains the source of truth for every rule mirrored here.
import { parseApiJSON, type Transport } from "../src/lib/api/backend-api.ts";
import { DecimalError } from "./mock-decimal.ts";

export type Role = "customer" | "worker" | "admin";
export type MockAccount = { id: string; person_id: string; username: string; password: string; name: string; role: Role; is_active: boolean; employee_no?: string; position?: string; email?: string | null; phone?: string | null };
export type Json = Record<string, unknown>;

export class MockError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
}
export const invalid = (message = "Invalid input") => new MockError(400, "invalid_input", message);
export const forbidden = () => new MockError(403, "forbidden", "This account cannot perform this action");
export const notFound = (what = "Record") => new MockError(404, "not_found", `${what} not found`);
export const conflict = (message = "This record changed or the action conflicts with its current state") => new MockError(409, "conflict", message);

export type Db = {
  seq: Record<string, number>;
  accounts: MockAccount[];
  sessions: Map<string, { account_id: string; expires_at: string }>;
  customers: { id: string; customer_type: "individual" | "company"; name: string; members: { account_id: string; is_owner: boolean }[] }[];
  invitations: Map<string, { customer_id: string; expires_at: string; used: boolean }>;
  notifications: { id: string; account_id: string; request_id: string; title: string; created_at: string; read_at?: string }[];
  requests: Json[];
  files: Map<string, Json>; // every private file record by id, tagged with its kind
  uploads: Map<string, { file_id: string; url: string; received?: Blob }>;
  objects: Map<string, Blob>; // signed download URL -> frozen object
  quotations: Json[];
  decisions: Json[];
  fulfillments: Map<string, Json>; // UC4 by quotation id
  evidence: Json[];
  jobs: Json[];
  units: Json[];
  materials: Json[];
  movements: Json[];
  suppliers: Json[];
  orders: Json[];
  idempotency: Map<string, { actor: string; scope: string; canonical: string; result: string }>;
};

export function emptyDb(): Db {
  return { seq: {}, accounts: [], sessions: new Map(), customers: [], invitations: new Map(), notifications: [], requests: [], files: new Map(), uploads: new Map(), objects: new Map(), quotations: [], decisions: [], fulfillments: new Map(), evidence: [], jobs: [], units: [], materials: [], movements: [], suppliers: [], orders: [], idempotency: new Map() };
}

export type Context = { db: Db; actor: MockAccount; body: Json; query: URLSearchParams; p: Record<string, string>; now: Date };
type Access = "public" | "session" | Role[];
export type Route = { method: string; parts: string[]; access: Access; handler: (c: Context) => unknown };
export function route(method: string, path: string, access: Access, handler: (c: Context) => unknown): Route {
  return { method, parts: path.split("/").filter(Boolean), access, handler };
}

export const STORAGE_ORIGIN = "https://mock-storage.lathe.invalid";
export const API_ORIGIN = "https://mock-api.lathe.invalid";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const uuid = () => crypto.randomUUID();
export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID.test(value) && !/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(value);
export function next(db: Db, name: string): number { db.seq[name] = (db.seq[name] ?? 0) + 1; return db.seq[name]; }
export const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

// Strict JSON like the Go handlers: unknown fields are rejected.
export function fields(body: Json, allowed: string[]) {
  for (const key of Object.keys(body)) if (!allowed.includes(key)) throw invalid(`Unknown field: ${key}`);
}
export function text(value: unknown, name: string, { max = 2000, required = true } = {}): string {
  if (value === undefined || value === null) { if (required) throw invalid(`${name} is required`); return ""; }
  if (typeof value !== "string") throw invalid(`${name} must be a string`);
  const trimmed = value.trim();
  if ((required && !trimmed) || [...trimmed].length > max || trimmed.includes("\0")) throw invalid(`${name} must be 1–${max} characters`);
  return trimmed;
}
export function version(value: unknown, name = "expected_version"): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (typeof parsed !== "number" || !Number.isSafeInteger(parsed) || parsed < 0) throw invalid(`${name} must be a nonnegative integer`);
  return parsed;
}
export function instant(value: unknown, name: string, { future = false, now }: { future?: boolean; now: Date }): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw invalid(`${name} must be an RFC 3339 time`);
  const date = new Date(value);
  if (!future && date.getTime() > now.getTime()) throw invalid(`${name} cannot be in the future`);
  return date.toISOString();
}
export function page<T>(items: T[], query: URLSearchParams, fallback = 20): T[] {
  const limit = Number(query.get("limit") ?? fallback); const offset = Number(query.get("offset") ?? 0);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) throw invalid("limit must be 1–100 and offset nonnegative");
  return items.slice(offset, offset + limit);
}
export function find<T extends Json>(items: T[], id: string, what: string): T {
  if (!isUuid(id)) throw invalid(`Invalid ${what.toLowerCase()} id`);
  const item = items.find((value) => value.id === id);
  if (!item) throw notFound(what);
  return item;
}

// Same key + actor + canonical payload replays the original snapshot; any
// change conflicts. Mirrors the backend's retry contract for commands.
export function idempotent<T>(c: Context, scope: string, run: () => T): T {
  const key = c.body.idempotency_key;
  if (!isUuid(key)) throw invalid("idempotency_key must be a UUID");
  const { idempotency_key: _, ...payload } = c.body;
  const canonical = JSON.stringify(sortKeys(payload));
  const stored = c.db.idempotency.get(key);
  if (stored) {
    if (stored.actor !== c.actor.id || stored.scope !== scope || stored.canonical !== canonical) throw conflict("This retry key was already used for a different command");
    return JSON.parse(stored.result);
  }
  const result = run();
  c.db.idempotency.set(key, { actor: c.actor.id, scope, canonical, result: JSON.stringify(result) });
  return result;
}
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, sortKeys(v)]));
  return value;
}

export function notify(db: Db, accountIds: string[], requestId: string, title: string) {
  const created_at = new Date().toISOString();
  for (const account_id of new Set(accountIds)) db.notifications.unshift({ id: uuid(), account_id, request_id: requestId, title, created_at });
}
export const activeIds = (db: Db, role: Role) => db.accounts.filter((a) => a.role === role && a.is_active).map((a) => a.id);

// Signed upload intents for the shared file protocol. Completion "validates"
// by checking the received size/type, then freezes a separate download object.
export const MIME_ALLOWED = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/plain", "image/jpeg", "image/png"];
export function startUpload(c: Context, kind: string, owner: Json, { images = false } = {}) {
  fields(c.body, ["file_name", "content_type", "byte_size"]);
  const name = text(c.body.file_name, "file_name", { max: 255 }); const type = c.body.content_type; const size = Number(c.body.byte_size);
  if (typeof type !== "string" || !MIME_ALLOWED.includes(type) || (images && !type.startsWith("image/"))) throw invalid(images ? "Only JPEG/PNG photos are accepted" : "Unsupported file type");
  if (!Number.isInteger(size) || size < 1 || size > 100000000) throw invalid("byte_size must be 1–100,000,000");
  const id = uuid(); const url = `${STORAGE_ORIGIN}/staging/${id}`; const expires_at = new Date(c.now.getTime() + 600000).toISOString();
  c.db.files.set(id, { id, kind, ...owner, uploaded_by: c.actor.id, file_name: name, content_type: type, byte_size: size, state: "pending", expires_at });
  c.db.uploads.set(id, { file_id: id, url });
  return { url, headers: { "Content-Type": type }, expires_at, attachment_id: id };
}
export function completeUpload(c: Context, id: string, kind: string): Json {
  if (!isUuid(id)) throw invalid("Invalid file id");
  const file = c.db.files.get(id); const upload = c.db.uploads.get(id);
  if (!file || file.kind !== kind || file.uploaded_by !== c.actor.id) throw notFound("Upload");
  if (file.state !== "pending" || !upload) throw conflict("This upload intent is already finished. Start a new upload.");
  c.db.uploads.delete(id);
  if (!upload.received || upload.received.size !== file.byte_size || (upload.received.type && upload.received.type !== file.content_type)) { file.state = "failed"; throw invalid("Uploaded content did not match the declared file. Upload again with a new intent."); }
  file.state = "ready"; c.db.objects.set(`${STORAGE_ORIGIN}/objects/${id}`, upload.received);
  return file;
}
export function downloadLink(c: Context, file: Json | undefined) {
  if (!file || file.state !== "ready") throw notFound("File");
  return { url: `${STORAGE_ORIGIN}/objects/${file.id}`, expires_at: new Date(c.now.getTime() + 600000).toISOString() };
}
export function publicFile(file: Json) {
  const { kind: _, ...rest } = file; return rest;
}

// ----- Transport -----

export type MockBackend = {
  base: string;
  transport: Transport;
  db: Db;
  // Development control: apply the next write, then lose its response, to
  // exercise the UI's uncertain-write recovery and identical-retry paths.
  loseNextResponse: boolean;
  latencyMs: number;
  dispatch: (method: string, path: string, token: string | null, body?: unknown) => { status: number; body: unknown };
};

export function createMockBackend(routes: Route[], seed?: (db: Db, run: (username: string, method: string, path: string, body?: unknown) => Json) => void): MockBackend {
  const db = emptyDb();
  const backend: MockBackend = { base: API_ORIGIN, db, loseNextResponse: false, latencyMs: 180, dispatch, transport: { fetch: mockFetch, objectFor: (url) => db.objects.get(url) } };

  function dispatch(method: string, rawPath: string, token: string | null, body?: unknown): { status: number; body: unknown } {
    const url = new URL(rawPath, API_ORIGIN);
    const parts = url.pathname.split("/").filter(Boolean);
    const candidates = routes.filter((r) => r.parts.length === parts.length && r.parts.every((part, i) => part.startsWith(":") || part === parts[i]));
    const matched = candidates.find((r) => r.method === method);
    if (!matched) return candidates.length ? fail(new MockError(405, "method_not_allowed", "Method not allowed")) : fail(notFound("Endpoint"));
    const p: Record<string, string> = {};
    matched.parts.forEach((part, i) => { if (part.startsWith(":")) p[part.slice(1)] = decodeURIComponent(parts[i]); });
    try {
      let actor: MockAccount | undefined;
      if (matched.access !== "public") {
        const session = token ? db.sessions.get(token) : undefined;
        actor = session && Date.parse(session.expires_at) > Date.now() ? db.accounts.find((a) => a.id === session.account_id && a.is_active) : undefined;
        if (!actor) throw new MockError(401, "unauthorized", "Authentication required");
        if (Array.isArray(matched.access) && !matched.access.includes(actor.role)) throw forbidden();
      }
      if (body !== undefined && (body === null || typeof body !== "object" || Array.isArray(body))) throw invalid("Request body must be a JSON object");
      const result = matched.handler({ db, actor: actor as MockAccount, body: (body ?? {}) as Json, query: url.searchParams, p, now: new Date() });
      return result === undefined ? { status: 204, body: undefined } : { status: 200, body: clone(result) };
    } catch (error) {
      if (error instanceof MockError) return fail(error);
      if (error instanceof DecimalError) return fail(invalid(error.message));
      console.error("Mock backend handler failed", error);
      return fail(new MockError(500, "internal", "The mock backend could not complete this action."));
    }
  }
  function fail(error: MockError) {
    return { status: error.status, body: { error: { code: error.code, message: error.message, request_id: `mock-${uuid().slice(0, 8)}` } } };
  }

  async function mockFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const method = (init.method ?? "GET").toUpperCase(); const signal = init.signal ?? undefined;
    await delay(backend.latencyMs, signal);
    if (url.origin === STORAGE_ORIGIN) {
      const id = url.pathname.split("/").pop() ?? ""; const upload = db.uploads.get(id);
      if (method !== "PUT" || !upload || upload.url !== url.href) return new Response("Signed link is invalid or expired", { status: 403 });
      upload.received = init.body instanceof Blob ? init.body : new Blob([String(init.body ?? "")]);
      return new Response(null, { status: 200 });
    }
    if (url.origin !== API_ORIGIN) throw new TypeError("Failed to fetch");
    const auth = new Headers(init.headers).get("Authorization"); const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    const body = typeof init.body === "string" ? safeParse(init.body) : undefined;
    const result = body instanceof MockError ? fail(body) : dispatch(method, url.pathname + url.search, token, body);
    if (method !== "GET" && backend.loseNextResponse && result.status < 400) { backend.loseNextResponse = false; throw new TypeError("Failed to fetch"); }
    const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
    return result.status === 204 ? new Response(null, { status: 204 }) : new Response(JSON.stringify(result.body), { status: result.status, headers });
  }

  seed?.(db, (username, method, path, body) => {
    const account = db.accounts.find((a) => a.username === username);
    if (!account) throw new Error(`Seed account missing: ${username}`);
    const token = `seed-${account.id}`; db.sessions.set(token, { account_id: account.id, expires_at: new Date(Date.now() + 60000).toISOString() });
    const result = dispatch(method, path, token, body === undefined ? undefined : JSON.parse(JSON.stringify(body, (_, v) => typeof v === "bigint" ? v.toString() : v)));
    db.sessions.delete(token);
    if (result.status >= 400) throw new Error(`Seed ${method} ${path} failed: ${JSON.stringify(result.body)}`);
    return result.body as Json;
  });
  return backend;
}

function safeParse(raw: string): unknown {
  try { return parseApiJSON(raw); } catch { return invalid("Malformed JSON"); }
}
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
  });
}
