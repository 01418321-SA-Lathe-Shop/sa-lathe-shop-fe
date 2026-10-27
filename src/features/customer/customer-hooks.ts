"use client";

import { useCallback, useEffect, useState } from "react";
import type { BackendApi } from "../../lib/api/backend-api";
import { readCollection, type Collection } from "./customer-domain";

export function useCollection<T>(api: BackendApi, path: string) {
  const [revision, setRevision] = useState(0);
  const key = `${path}:${revision}`;
  const [state, setState] = useState<{ key: string; path: string; data?: Collection<T>; error?: string }>({ key: "", path: "" });
  useEffect(() => {
    const controller = new AbortController();
    readCollection<T>(api, path, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setState({ key, path, data }); },
      () => { if (!controller.signal.aborted) setState((old) => ({ key, path, data: old.path === path ? old.data : undefined, error: "โหลดข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง" })); },
    );
    return () => controller.abort();
  }, [api, key, path]);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  return { data: state.path === path ? state.data : undefined, loading: state.key !== key, error: state.key === key ? state.error : undefined, reload };
}

export function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0); const timer = window.setInterval(tick, 60000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, []);
  return now;
}
