"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BackendApi, errorMessage } from "./backend-api";

export function useResource<T>(api: BackendApi, path: string) {
  const [revision, setRevision] = useState(0);
  const key = `${path}:${revision}`;
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>({ key: "" });
  useEffect(() => {
    const controller = new AbortController();
    api.call<T>(path, "GET", undefined, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setState({ key, data }); },
      (error) => { if (!controller.signal.aborted) setState({ key, error: errorMessage(error) }); },
    );
    return () => controller.abort();
  }, [api, path, key]);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  return { data: state.key === key ? state.data : undefined, error: state.key === key ? state.error : undefined, loading: state.key !== key, reload };
}

// Synchronous ref guard prevents double submits before React renders disabled.
// All work is canceled on unmount. A failed write is never automatically retried.
export function useCommand() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  async function run(action: (signal: AbortSignal) => Promise<void>, success = "Saved by the server.") {
    if (pending.current) return;
    const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError(""); setMessage("");
    try {
      await action(controller.signal);
      if (!controller.signal.aborted) setMessage(success);
    } catch (error) {
      if (!controller.signal.aborted) setError(errorMessage(error));
    } finally {
      if (!controller.signal.aborted) { pending.current = null; setBusy(false); }
    }
  }
  return { busy, error, message, run };
}
