"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, errorMessage, type BackendApi } from "../../lib/api/backend-api";

type State<T> = { path: string; revision: number; data?: T; error?: string };
// Optional paths avoid speculative per-day requests. Reads are cancelable;
// Failures never become fabricated data or a zero count.
export function useReport<T>(api: BackendApi, path: string | null) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<State<T>>();
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    api.call<T>(path, "GET", undefined, controller.signal).then(
      data => { if (!controller.signal.aborted) setState({ path, revision, data }); },
      error => {
        if (!controller.signal.aborted) setState(previous => ({ path, revision, data: previous?.path === path ? previous.data : undefined,
          error: error instanceof ApiError && [404, 501].includes(error.status) ? "Backend ยังไม่รองรับรายงานนี้ กรุณาอัปเดต Backend ที่มี dashboard API แล้วลองอีกครั้ง" : errorMessage(error) }));
      },
    );
    return () => controller.abort();
  }, [api, path, revision]);
  const current = state?.path === path && state.revision === revision;
  const reload = useCallback(() => setRevision(value => value + 1), []);
  return { data: state?.path === path ? state.data : undefined, error: current ? state?.error : undefined, loading: Boolean(path) && !current, reload };
}
