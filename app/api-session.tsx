"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BackendApi, type Account } from "./backend-api";
import type { MockBackend } from "./mock-backend";

// One memory-only session for the whole designed shell. Client navigation keeps
// it; reload or sign-out discards it. Tokens never touch browser storage/URLs.
// "mock" sessions talk to the explicit in-browser mock backend, never as a
// fallback for live API failures.
export type ApiMode = "live" | "mock";
export type ApiSession = { api: BackendApi; account: Account; expiresAt: string; mode: ApiMode };
type SessionContext = {
  session: ApiSession | null;
  notice: string;
  liveBase: string;
  mock: MockBackend | null;
  signIn: (username: string, password: string, mode: ApiMode) => Promise<ApiSession>;
  signOut: () => Promise<string>;
  resetMock: () => void;
};

const Context = createContext<SessionContext | null>(null);
export const LIVE_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export function ApiSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ApiSession | null>(null);
  const [notice, setNotice] = useState("");
  const [mock, setMock] = useState<MockBackend | null>(null);
  const active = useRef<BackendApi | null>(null);
  const mockRef = useRef<MockBackend | null>(null);

  useEffect(() => () => active.current?.close(), []);
  useEffect(() => {
    if (!session) return;
    const expire = () => { session.api.close(); active.current = null; setSession(null); setNotice("Session expired. Please sign in again."); };
    const timer = window.setTimeout(expire, Math.max(0, Date.parse(session.expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [session]);

  const signIn = useCallback(async (username: string, password: string, mode: ApiMode) => {
    let backend = mockRef.current;
    if (mode === "mock" && !backend) {
      // Loaded on demand so live users never download the mock module.
      const { createLatheMockBackend } = await import("./mock-seed");
      backend = mockRef.current = createLatheMockBackend(); setMock(backend);
    }
    const api = new BackendApi(mode === "mock" && backend ? backend.base : LIVE_BASE, () => { if (active.current === api) { active.current = null; setSession(null); setNotice("Session expired or revoked. Please sign in again."); } }, mode === "mock" && backend ? backend.transport : undefined);
    try {
      const login = await api.login(username, password);
      const account = await api.call<Account>("/auth/me");
      active.current?.close(); active.current = api;
      const next = { api, account, expiresAt: login.expires_at, mode };
      setNotice(""); setSession(next);
      return next;
    } catch (error) { api.close(); throw error; }
  }, []);

  const signOut = useCallback(async () => {
    const current = active.current; active.current = null; setSession(null);
    if (!current) return "";
    let message = "Signed out. Server session revoked.";
    try { await current.logout(); }
    catch { message = "Signed out locally. Server logout could not be confirmed; the remote session may remain valid until expiry."; }
    setNotice(message); return message;
  }, []);

  const resetMock = useCallback(() => {
    if (session?.mode === "mock") { session.api.close(); active.current = null; setSession(null); }
    mockRef.current = null; setMock(null); setNotice("Mock data reset. Choose a test account to start again.");
  }, [session]);

  const value = useMemo(() => ({ session, notice, liveBase: LIVE_BASE, mock, signIn, signOut, resetMock }), [session, notice, mock, signIn, signOut, resetMock]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useApiSession(): SessionContext {
  const value = useContext(Context);
  if (!value) throw new Error("useApiSession must be used inside ApiSessionProvider");
  return value;
}
