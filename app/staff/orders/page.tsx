import { redirect } from "next/navigation";
// UC6 supplier ordering is Admin-only (backend UC6.md); Staff receive under UC7.
export default function Page() { redirect("/staff/receiving"); }
