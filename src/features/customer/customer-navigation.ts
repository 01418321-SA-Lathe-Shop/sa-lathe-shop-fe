// The one Customer menu: the desktop sidebar and the mobile dialog both render it.
export type CustomerNavItem = {
  href: string;
  label: string;
  icon: "grid" | "file" | "machine" | "clock" | "layers" | "wallet" | "inbox" | "sun";
};

export const CUSTOMER_NAV: { label: string; items: CustomerNavItem[] }[] = [
  { label: "WORKSPACE", items: [{ href: "/customer", label: "ภาพรวม", icon: "grid" }] },
  {
    label: "งานของฉัน",
    items: [
      { href: "/customer/requests", label: "คำขอผลิต", icon: "file" },
      { href: "/customer/jobs", label: "งานผลิต", icon: "machine" },
      { href: "/customer/jobs?view=history", label: "ประวัติ", icon: "clock" },
    ],
  },
  {
    label: "เอกสารและการชำระเงิน",
    items: [
      { href: "/customer/quotations", label: "ใบเสนอราคา", icon: "layers" },
      { href: "/customer/deposit-po", label: "มัดจำและ PO", icon: "wallet" },
      { href: "/customer/payments", label: "ใบแจ้งหนี้และการชำระเงิน", icon: "wallet" },
    ],
  },
  {
    label: "บัญชี",
    items: [
      { href: "/customer/memberships", label: "บัญชีและบริษัท", icon: "inbox" },
      { href: "/customer?view=settings", label: "ตั้งค่า", icon: "sun" },
    ],
  },
];
