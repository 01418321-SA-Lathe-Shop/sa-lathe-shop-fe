// Fictional accounts of the in-browser mock backend. Kept separate so the login
// page can list them without loading the mock module itself.
export type MockLogin = { username: string; password: string; role: "customer" | "worker" | "admin"; label: string; detail: string };
export const MOCK_PASSWORD = "mock-password-2026";
export const MOCK_LOGINS: MockLogin[] = [
  { username: "nida.company", password: MOCK_PASSWORD, role: "customer", label: "ลูกค้าบริษัท", detail: "Nida · Siam Precision Parts (owner)" },
  { username: "somchai", password: MOCK_PASSWORD, role: "customer", label: "ลูกค้าบุคคล", detail: "Somchai Jaidee · individual" },
  { username: "anan.staff", password: MOCK_PASSWORD, role: "worker", label: "Staff", detail: "Anan · lathe operator" },
  { username: "pim.admin", password: MOCK_PASSWORD, role: "admin", label: "Admin", detail: "Pim · shop administrator" },
];
