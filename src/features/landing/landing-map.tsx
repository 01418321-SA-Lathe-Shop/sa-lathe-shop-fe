"use client";

import { useState } from "react";

/** Click-to-load facade: no third-party request until the visitor asks for the map. */
export function MapFacade({ embedUrl, address }: { embedUrl: string; address: string }) {
  const [loaded, setLoaded] = useState(false);
  if (loaded && embedUrl) return <iframe className="landing-map-frame" src={embedUrl} title={`แผนที่ร้าน ${address}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />;
  return <div className="landing-map-facade">
    <svg aria-hidden="true" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z" /><circle cx="12" cy="10" r="2.2" /></svg>
    {embedUrl
      ? <button type="button" onClick={() => setLoaded(true)}>แสดงแผนที่ <span aria-hidden="true">↗</span></button>
      : <p>[ใส่ลิงก์ Google Maps]</p>}
    <small>แผนที่จะโหลดจาก Google หลังจากกดแสดงเท่านั้น</small>
  </div>;
}
