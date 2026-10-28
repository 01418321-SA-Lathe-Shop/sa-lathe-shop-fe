"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BackendApi, type Account } from "../../lib/api/backend-api";

// One memory-only session for the whole designed shell. Client navigation keeps
// it; reload or sign-out discards it. Tokens never touch browser storage/URLs.
// All sessions use the configured real backend; failures never select fixtures.
export type ApiSession = { api: BackendApi; account: Account; expiresAt: string };
type SessionContext = {
  session: ApiSession | null;
  notice: string;
  liveBase: string;
  signIn: (username: string, password: string) => Promise<ApiSession>;
  signOut: () => Promise<string>;
};

const Context = createContext<SessionContext | null>(null);
export const LIVE_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export function ApiSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ApiSession | null>(null);
  const [notice, setNotice] = useState("");
  const active = useRef<BackendApi | null>(null);

  useEffect(() => () => active.current?.close(), []);
  useEffect(() => {
    if (!session) return;
    const expire = () => { session.api.close(); active.current = null; setSession(null); setNotice("Session expired. Please sign in again."); };
    const timer = window.setTimeout(expire, Math.max(0, Date.parse(session.expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [session]);

  const signIn = useCallback(async (username: string, password: string) => {
    const api = new BackendApi(LIVE_BASE, () => { if (active.current === api) { active.current = null; setSession(null); setNotice("Session expired or revoked. Please sign in again."); } });
    try {
      const login = await api.login(username, password);
      const account = await api.call<Account>("/auth/me");
      active.current?.close(); active.current = api;
      const next = { api, account, expiresAt: login.expires_at };
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

  const value = useMemo(() => ({ session, notice, liveBase: LIVE_BASE, signIn, signOut }), [session, notice, signIn, signOut]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useApiSession(): SessionContext {
  const value = useContext(Context);
  if (!value) throw new Error("useApiSession must be used inside ApiSessionProvider");
  return value;
}
