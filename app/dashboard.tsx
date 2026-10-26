import Link from "next/link";
import { Logo, ThemeToggle } from "./appearance";
import { Hero } from "./landing-hero";
import "./landing.css";

const workflow = [
  { title: "Start with the details.", text: "Submit a manufacturing request with drawings and supporting documents." },
  { title: "Make the numbers clear.", text: "Review the quotation and confirm the deposit or purchase order required for your job." },
  { title: "Bring the work together.", text: "Plan materials, reserve stock, purchase supplies, and follow production." },
  { title: "Finish with confidence.", text: "Track delivery, inspection, invoices, and installment payments in the same workflow." },
];

export default function Dashboard() {
  return <main className="cinematic-page" lang="en">
    <Hero />
    <section className="cinematic-process" id="workflow" aria-labelledby="process-title">
      <div className="cinematic-section-heading"><h2 id="process-title">Every step.<br />Connected.</h2><p>One place for the people, materials, and decisions that move a custom job forward.</p></div>
      <ol className="cinematic-process-list">{workflow.map((step, index) => <li key={step.title}><span className="cinematic-step-number">0{index + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol>
    </section>
    <section className="cinematic-platform" id="capabilities" aria-labelledby="platform-title">
      <h2 id="platform-title">The whole shop.<br />In one flow.</h2>
      <div className="cinematic-capabilities">
        <article><h3>Production, in view.</h3><p>Follow job progress, record actual material use and labor time, and keep production photos with the work.</p><span>From plan to finished work</span></article>
        <article id="materials"><h3>Materials, accounted for.</h3><p>Search inventory, see available and reserved quantities, and connect supplier orders with receiving and claims.</p><span>From stock to shop floor</span></article>
        <article><h3>Payments, made clear.</h3><p>Keep quotation terms, deposits, invoices, payment evidence, and outstanding balances connected to each job.</p><span>From quotation to collection</span></article>
      </div>
    </section>
    <footer className="cinematic-footer"><Link href="/" aria-label="Lathe Shop Control home"><Logo /></Link><p>Custom work. One connected workflow.</p><div><ThemeToggle /><Link href="/register">Start a job <span aria-hidden="true">↗</span></Link></div></footer>
  </main>;
}
