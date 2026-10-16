"use client";

import { useState } from "react";
import AuthPage from "./auth-page";
import BackendWorkspace from "./backend-workspace";

export default function AuthGateway({ register = false }: { register?: boolean }) {
  const [demo, setDemo] = useState(false);

  if (demo) return <AuthPage register={register} onConnected={() => setDemo(false)} />;
  return <BackendWorkspace initialRegister={register} onDemo={() => setDemo(true)} />;
}
