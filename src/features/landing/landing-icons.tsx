import type { IconName } from "./landing-content";

/** Service icons in the shared inline-SVG style (24px grid, 1.8 stroke, round joins). */
const paths: Record<IconName, React.ReactNode> = {
  turning: <><path d="M3 9h3v6H3zM6 10.5h11v3H6z" /><path d="M17 11h2.5M19.5 9.5 21 12l-1.5 2.5" /><path d="M11 6l1.5 4.5M14 6l1.5 4.5" /></>,
  milling: <><path d="M10 3h4v5h-4zM11 8h2v6h-2z" /><path d="M9.5 14h5l-1 2h-3z" /><path d="M3 19h18M5 19v-2h14v2" /></>,
  thread: <><path d="M9 3h6v18H9z" /><path d="M9 6.5l6-2M9 10l6-2M9 13.5l6-2M9 17l6-2" /></>,
  repair: <><path d="M14.5 6.5a4 4 0 0 0-5 5L4 17l3 3 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z" /></>,
  prototype: <><path d="M12 3 4 7.5v9L12 21l8-4.5v-9z" /><path d="M4 7.5 12 12l8-4.5M12 12v9" /></>,
  batch: <><rect x="3" y="4" width="7" height="7" rx="1.5" /><rect x="14" y="4" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
};

export function ServiceIcon({ name }: { name: IconName }) {
  return <svg aria-hidden="true" className="landing-icon" width="1.5rem" height="1.5rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
