import { landingConfig } from "./landing-config";

export function StatCards() {
  return <dl className="cinematic-stats" aria-label="ข้อมูลร้าน">
    {landingConfig.stats.map(stat => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}<span aria-hidden="true">↗</span></dd></div>)}
  </dl>;
}
