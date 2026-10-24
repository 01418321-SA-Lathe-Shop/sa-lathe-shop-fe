"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BackendApi, errorMessage } from "./backend-api";

// Responses for superseded keys are ignored. An explicit reload of the same
// path keeps showing the last server data (marked loading) so detail views do
// not collapse; a different path never shows another record's data.
export function useResource<T>(api: BackendApi, path: string) {
  const [revision, setRevision] = useState(0);
  const key = `${path}:${revision}`;
  const [state, setState] = useState<{ key: string; path: string; data?: T; error?: string }>({ key: "", path: "" });
  useEffect(() => {
    const controller = new AbortController();
    api.call<T>(path, "GET", undefined, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setState({ key, path, data }); },
      (error) => { if (!controller.signal.aborted) setState({ key, path, error: errorMessage(error) }); },
    );
    return () => controller.abort();
  }, [api, path, key]);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  const current = state.key === key;
  return { data: current || state.path === path ? state.data : undefined, error: current ? state.error : undefined, loading: !current, reload };
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

// A versioned, idempotent command. The first attempt freezes its exact path,
// key and payload; after an uncertain failure only an identical retry is
// offered (never automatic). Success clears the attempt and calls onDone.
type Write = { path: string; method: string; payload: Record<string, unknown> };
export function useRetryableWrite(api: BackendApi, onDone: () => void) {
  const command = useCommand();
  const [attempt, setAttempt] = useState<Write | null>(null);
  async function send(write: Write, signal: AbortSignal) {
    const { expected_version, ...rest } = write.payload;
    await api.call(write.path, write.method, expected_version === undefined ? rest : { ...rest, expected_version: BigInt(expected_version as number | string) }, signal);
    setAttempt(null); onDone();
  }
  function submit(path: string, method: string, build: () => Record<string, unknown> | null, success = "Saved by the server.") {
    void command.run(async (signal) => {
      const payload = build(); if (!payload) return;
      const write = { path, method, payload }; setAttempt(write); await send(write, signal);
    }, success);
  }
  function retry() { if (attempt) void command.run((signal) => send(attempt, signal), "Saved by the server."); }
  return { ...command, frozen: command.busy || Boolean(attempt), uncertain: Boolean(attempt) && Boolean(command.error) && !command.busy, submit, retry, discard: () => setAttempt(null) };
}
