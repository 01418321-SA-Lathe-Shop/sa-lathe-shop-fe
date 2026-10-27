

type IconName = "grid" | "inbox" | "machine" | "truck" | "file" | "layers" | "wallet" | "clock" | "search" | "plus" | "arrow" | "bell" | "logout" | "close" | "sun" | "moon";


export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const p: Record<IconName, React.ReactNode> = { grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>, inbox: <><path d="M4 4h16v13H4z"/><path d="M4 13h4l2 3h4l2-3h4"/></>, machine: <path d="M5 20V8h14v12M8 8V4h8v4M9 13h6M12 10v6"/>, truck: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>, file: <path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h4"/>, layers: <path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>, wallet: <path d="M4 6h15v13H4zM4 9V5h12M15 13h6v4h-6z"/>, clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>, search: <><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></>, plus: <path d="M12 5v14M5 12h14"/>, arrow: <path d="m9 18 6-6-6-6"/>, bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>, logout: <path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9"/>, close: <path d="M6 6l12 12M18 6 6 18"/>, sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></>, moon: <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/> };
  return <svg aria-hidden="true" className="icon" width={`${size / 16}rem`} height={`${size / 16}rem`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{p[name]}</svg>;
}


export function Logo({ onClick }: { onClick?: () => void }) {
  const mark = <><span className="brand-mark"><span/></span><span><b>LATHE</b><small>SHOP CONTROL</small></span></>;
  return onClick ? <button className="brand brand-button" onClick={onClick} aria-label="กลับหน้าแรก">{mark}</button> : <div className="brand">{mark}</div>;
}
