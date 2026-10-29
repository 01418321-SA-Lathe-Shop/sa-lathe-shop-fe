// Public fictional usernames only; server responses determine actual roles.
export const LOCAL_TEST_ACCOUNTS = [
  { username: "pim.admin", label: "Admin" },
  { username: "anan.staff", label: "Staff · Anan" },
  { username: "kittipong.staff", label: "Staff · Kittipong" },
  { username: "nida.company", label: "ลูกค้าบริษัท · เจ้าของ" },
  { username: "ploy.company", label: "ลูกค้าบริษัท · สมาชิก" },
  { username: "somchai", label: "ลูกค้าบุคคลทั่วไป" },
] as const;
