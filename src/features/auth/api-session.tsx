"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BackendApi, type Account, type Login } from "../../lib/api/backend-api";
import { isLocalTestLoginEnabled, localTestLoginError } from "./local-test-login";

// One memory-only session for the whole designed shell. Client navigation keeps
// it; reload or sign-out discards it. Tokens never touch browser storage/URLs.
// All sessions use the configured real backend; failures never select fixtures.
export type ApiSession = { api: BackendApi; account: Account; expiresAt: string };
type SessionContext = {
  session: ApiSession | null;
  notice: string;
  liveBase: string;
  localTestEnabled: boolean;
  signIn: (username: string, password: string) => Promise<ApiSession>;
  signInLocalTest: (username: string) => Promise<ApiSession>;
  signOut: () => Promise<string>;
};

const Context = createContext<SessionContext | null>(null);
export const LIVE_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
const LOCAL_TEST_ENABLED = isLocalTestLoginEnabled(LIVE_BASE, process.env.NEXT_PUBLIC_LOCAL_TEST_LOGIN_ENABLED);

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

  const openSession = useCallback(async (authenticate: (api: BackendApi) => Promise<Login>) => {
    const api = new BackendApi(LIVE_BASE, () => { if (active.current === api) { active.current = null; setSession(null); setNotice("Session expired or revoked. Please sign in again."); } });
    try {
      const login = await authenticate(api);
      const account = await api.call<Account>("/auth/me");
      active.current?.close(); active.current = api;
      const next = { api, account, expiresAt: login.expires_at };
      setNotice(""); setSession(next);
      return next;
    } catch (error) { api.close(); throw error; }
  }, []);

  const signIn = useCallback((username: string, password: string) => openSession((api) => api.login(username, password)), [openSession]);
  const signInLocalTest = useCallback(async (username: string) => {
    if (!LOCAL_TEST_ENABLED) throw new Error("Local test login ไม่ได้เปิดใน Frontend นี้ กรุณาใช้ชื่อผู้ใช้และรหัสผ่าน");
    try { return await openSession((api) => api.loginLocalTest(username)); }
    catch (error) { throw new Error(localTestLoginError(error)); }
  }, [openSession]);

  const signOut = useCallback(async () => {
    const current = active.current; active.current = null; setSession(null);
    if (!current) return "";
    let message = "Signed out. Server session revoked.";
    try { await current.logout(); }
    catch { message = "Signed out locally. Server logout could not be confirmed; the remote session may remain valid until expiry."; }
    setNotice(message); return message;
  }, []);

  const value = useMemo(() => ({ session, notice, liveBase: LIVE_BASE, localTestEnabled: LOCAL_TEST_ENABLED, signIn, signInLocalTest, signOut }), [session, notice, signIn, signInLocalTest, signOut]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useApiSession(): SessionContext {
  const value = useContext(Context);
  if (!value) throw new Error("useApiSession must be used inside ApiSessionProvider");
  return value;
}
