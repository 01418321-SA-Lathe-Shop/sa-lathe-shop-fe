"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { canAccessWorkspace, getWorkspaces, ROLE_DESCRIPTIONS, ROLES, type Role, type WorkspaceId } from "./demo-access";
import { getDemoRole, getServerDemoRole, setDemoRole, subscribeToDemoRole } from "./demo-session";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  const paths: Record<string, string[]> = {
    overview: ["M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z"],
    requests: ["M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h5"],
    quotations: ["M7 3h10v18H7z M10 7h4 M10 11h4 M10 15h1 M14 15h1 M10 18h1 M14 18h1"],
    "deposit-po": ["M4 5h16v14H4z M4 9h16 M7 14h4 M15 14h2"],
    materials: ["m12 3 9 5-9 5-9-5z M3 8v9l9 5 9-5V8 M12 13v9"],
    orders: ["M3 3h2l3 13h11l2-9H6 M9 20h.01 M18 20h.01"],
    receiving: ["M12 3v10 m-4-4 4 4 4-4 M4 14v7h16v-7"],
    production: ["M4 21V10l6 3V7l6 3V3h4v18z M7 17h1 M12 17h1 M17 17h1"],
    "delivery-payment": ["M3 5h11v12H3z M14 9h4l3 4v4h-7 M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4"],
    workers: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 7 M22 21v-2a4 4 0 0 0-3-4"],
    arrow: ["M4 12h16 m-6-6 6 6-6 6"],
    logout: ["M9 3H4v18h5 M11 12h10 m-4-4 4 4-4 4"],
    menu: ["M4 6h16 M4 12h16 M4 18h16"],
    close: ["m6 6 12 12 M6 18 18 6"],
    clock: ["M12 8v4l3 2 M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20"],
  };
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{(paths[name] ?? paths.requests).map((d) => <path key={d} d={d} />)}</svg>;
}

function Brand() {
  return <div className="brand"><span className="brand-mark" aria-hidden="true"><svg width="25" height="25" viewBox="0 0 28 28" fill="none"><path d="M4 22h20M6 22V8h5v14M11 11h11v7H11M22 7v15M15 11v7" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" /><circle cx="8.5" cy="5" r="2" fill="currentColor" /></svg></span><span>Lathe Shop<span className="brand-subtitle">WORKSHOP MANAGEMENT</span></span></div>;
}

export default function Home() {
  const role = useSyncExternalStore(subscribeToDemoRole, getDemoRole, getServerDemoRole);
  const [selectedRole, setSelectedRole] = useState<Role>("Customer");
  const [activeId, setActiveId] = useState<WorkspaceId>("overview");
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!navOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setNavOpen(false);
      document.querySelector<HTMLButtonElement>(".mobile-menu")?.focus();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [navOpen]);

  function toggleNavigation() {
    setNavOpen((open) => !open);
    if (!navOpen) {
      requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(".sidebar .nav-item")?.focus());
    }
  }

  function navigate(id: WorkspaceId) {
    if (!role || !canAccessWorkspace(role, id)) return;
    setActiveId(id);
    setNavOpen(false);
    requestAnimationFrame(() => document.getElementById("workspace-title")?.focus());
  }

  function signOut() {
    setDemoRole(null);
    setActiveId("overview");
    setNavOpen(false);
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>("input[name='demo-role']:checked")?.focus());
  }

  if (!role) {
    return <main className="login-page">
      <section className="login-story">
        <Brand />
        <div className="login-story-content"><span className="eyebrow light">FROM REQUEST TO DELIVERY</span><h1>Good work.<br />Clear progress.</h1><p>A shared workspace for the people, materials, and decisions behind every custom job.</p>
          <ol className="story-steps">{["Request & quotation", "Confirmation & materials", "Production & delivery"].map((step, i) => <li key={step}><span>0{i + 1}</span>{step}</li>)}</ol>
        </div>
        <p className="story-footer"><span className="status-dot" />Built around your workshop.</p>
      </section>
      <section className="login-content" aria-labelledby="login-heading">
        <div className="login-card"><span className="demo-badge">DEMO WORKSPACE</span><h2 id="login-heading">Welcome to the shop.</h2><p className="text-muted login-intro">Choose a demo account to explore your workspace.</p>
          <form onSubmit={(event) => { event.preventDefault(); setActiveId("overview"); setDemoRole(selectedRole); }}>
            <fieldset className="role-options"><legend>Continue as</legend>{ROLES.map((option) => <label className={`role-option ${selectedRole === option ? "selected" : ""}`} key={option}>
              <input type="radio" name="demo-role" value={option} checked={selectedRole === option} onChange={() => setSelectedRole(option)} />
              <span className="role-option-icon"><Icon name={option === "Customer" ? "requests" : option === "Worker" ? "production" : "workers"} /></span>
              <span className="role-option-copy"><strong>{option}</strong><span>{ROLE_DESCRIPTIONS[option]}</span></span>
            </label>)}</fieldset>
            <button className="button-primary login-button" type="submit">Enter {selectedRole} demo<Icon name="arrow" /></button>
          </form>
          <p className="demo-explanation">Demo access only. No password needed, and no live business data is connected.</p>
        </div>
        <footer className="login-footer"><span>Custom manufacturing, connected.</span><span>Asia/Bangkok · THB · No VAT</span></footer>
      </section>
    </main>;
  }

  const workspaces = getWorkspaces(role);
  // Re-check selection after restored or changed demo roles.
  const active = canAccessWorkspace(role, activeId) ? workspaces.find((item) => item.id === activeId) : undefined;
  const isOverview = !active;

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to workspace</a>
    <aside id="workspace-navigation" className={`sidebar ${navOpen ? "is-open" : ""}`} aria-label="Workshop navigation">
      <Brand />
      <div className="sidebar-context"><span className="context-dot" /><span>{role} workspace</span><span className="sidebar-demo">DEMO</span></div>
      <nav aria-label={`${role} workspace`}><p className="nav-label">WORKSPACE</p>
        <button className={`nav-item ${isOverview ? "active" : ""}`} aria-current={isOverview ? "page" : undefined} onClick={() => navigate("overview")}><Icon name="overview" /><span>Overview</span></button>
        {workspaces.map((item) => <button key={item.id} className={`nav-item ${active?.id === item.id ? "active" : ""}`} aria-current={active?.id === item.id ? "page" : undefined} onClick={() => navigate(item.id)}><Icon name={item.id} /><span>{item.label}</span></button>)}
      </nav>
      <div className="sidebar-footer"><span className="avatar">{role[0]}</span><div><strong>Demo {role}</strong><span>Prototype account</span></div></div>
    </aside>
    <div className="workspace-body">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" aria-label={navOpen ? "Close navigation" : "Open navigation"} aria-expanded={navOpen} aria-controls="workspace-navigation" onClick={toggleNavigation}><Icon name={navOpen ? "close" : "menu"} /></button><span className="breadcrumb">Workspace<span>/</span><strong>{active?.label ?? "Overview"}</strong></span></div><div className="topbar-right"><span className="demo-badge compact">Demo mode</span><button className="signout-button" onClick={signOut}><Icon name="logout" /><span>Sign out</span></button></div></header>
      <main id="main-content" className="workspace-main" tabIndex={-1}>
        <div className="page-heading"><div><p className="eyebrow">{isOverview ? "YOUR WORKSHOP, AT A GLANCE" : active?.useCase}</p><h1 id="workspace-title" tabIndex={-1}>{isOverview ? `Welcome, ${role}.` : active?.label}</h1><p className="text-muted">{isOverview ? ROLE_DESCRIPTIONS[role] : active?.description}</p></div><span className="workspace-label"><span className="status-dot" />{role} workspace</span></div>
        <div className="demo-notice"><span className="notice-icon"><Icon name="production" /></span><p><strong>You’re exploring the demo workspace.</strong><span>Navigation is ready. Business records and actions will arrive in the next phases.</span></p></div>
        {isOverview ? <>
          <section aria-labelledby="workspaces-heading"><div className="section-heading"><h2 id="workspaces-heading">Your workspaces</h2><span>{workspaces.length} areas</span></div><div className="workspace-grid">{workspaces.map((item) => <button key={item.id} className="workspace-card" onClick={() => navigate(item.id)}><span className="workspace-card-top"><span className="card-icon"><Icon name={item.id} /></span><span className="uc-tag">{item.useCase}</span></span><strong>{item.label}</strong><span className="card-description">{item.description}</span><span className="card-link">Open workspace<Icon name="arrow" /></span></button>)}</div></section>
          <section className="journey-panel" aria-labelledby="journey-heading"><div><span className="eyebrow">THE BIG PICTURE</span><h2 id="journey-heading">Every job has a clear journey.</h2><p className="text-muted">One workflow, from the first conversation to the final handover.</p></div><ol className="journey-steps">{["Request", "Quotation", "Deposit / PO", "Production", "Delivery & payment"].map((step, i) => <li key={step}><span>{String(i + 1).padStart(2, "0")}</span><strong>{step}</strong></li>)}</ol></section>
        </> : active && <section className="empty-panel" aria-labelledby="empty-heading"><div className="empty-art" aria-hidden="true"><Icon name={active.id} /></div><span className="demo-badge">COMING IN A LATER PHASE</span><h2 id="empty-heading">{active.emptyTitle}</h2><p className="text-muted">{active.emptyDescription}</p><button className="button-secondary" onClick={() => navigate("overview")}>Back to overview<Icon name="arrow" /></button></section>}
        <footer className="workspace-footer"><span>Lathe Shop · Demo workspace</span><span><Icon name="clock" />Asia/Bangkok<span className="footer-divider">/</span>THB<span className="footer-divider">/</span>No VAT</span></footer>
      </main>
    </div>
  </div>;
}
