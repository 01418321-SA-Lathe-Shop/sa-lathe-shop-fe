// Prototype document categories. Production allowlist/content scanning needs Backend agreement.
import type { Attachment } from "./customer-domain";
const DOCUMENT_TYPES = new Set(["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "rtf", "odt", "ods", "odp"]);
const IMAGE_TYPES = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "tif", "tiff", "svg", "avif", "heic", "heif"]);
export const FILE_ACCEPT = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods,.odp";

export function fileError(file: { name: string; size: number; type: string }): string | undefined {
  if (!Number.isFinite(file.size) || file.size <= 0) return "Choose a non-empty document or image.";
  if (file.size > 100_000_000) return "Each file must be 100 MB or smaller.";
  const extension = file.name.toLowerCase().split(".").at(-1) ?? "";
  if (!DOCUMENT_TYPES.has(extension) && !IMAGE_TYPES.has(extension)) return "Choose a supported document or image, such as PDF, Office, text, PNG, or JPEG.";
  return undefined;
}

// Local file preparation only. Aborted reads must not register orphan attachments.
export async function prepareDemoFile(file: File, signal: AbortSignal, shouldFail: () => boolean, registerFile: (file: File) => Attachment): Promise<Attachment | undefined> {
  if (signal.aborted) return undefined;
  const invalid = fileError(file);
  if (invalid) throw new Error(invalid);
  if (shouldFail()) throw new Error("Demo file preparation failed. Upload again by choosing a file anew.");
  await file.slice(0, 8).arrayBuffer();
  if (signal.aborted) return undefined;
  return registerFile(file);
}

// Demo input precision only; production NUMERIC precision/rounding is still open.
export function parsePaymentInput(value: string): number | undefined {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return undefined;
  const [whole, fraction = ""] = value.trim().split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(result) && result > 0 ? result : undefined;
}
