import Link from "next/link";
import { Logo } from "./appearance";

export function Nav() {
  return <nav className="cinematic-nav" aria-label="Main navigation" data-reveal>
    <Link href="/" className="cinematic-brand" aria-label="Lathe Shop Control home" data-intro-focus><Logo /></Link>
    <div className="cinematic-nav-pills">
      <a href="#workflow" data-intro-focus>Process</a>
      <a href="#materials" data-intro-focus>Materials</a>
      <a href="#capabilities" data-intro-focus>Platform</a>
    </div>
    <Link href="/login" className="cinematic-workspace" data-intro-focus>Open workspace <span aria-hidden="true">↗</span></Link>
  </nav>;
}
