"use client";

import { createContext, useContext, useEffect, useReducer, useRef, type ReactNode } from "react";
import { expireConfirmations, type Attachment } from "./customer-domain";
import { createCustomerDemo } from "./customer-fixtures";
import { createWorkshopDemo } from "./worker-fixtures";
import type { WorkshopState } from "./worker-domain";
import { reduceWorkshop, type WorkshopUpdate, type WorkshopViewState as ViewState } from "./workshop-state";

function createState(now: number): WorkshopState { return createWorkshopDemo(createCustomerDemo(now), now); }
type WorkshopContextValue = {
  state: ViewState;
  dispatch: (action: WorkshopUpdate) => void;
  registerFile: (file: File) => Attachment;
  getFile: (id: string) => File | undefined;
  resetDemo: (scope: string) => void;
};
const WorkshopContext = createContext<WorkshopContextValue | undefined>(undefined);

export function DemoWorkshopProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduceWorkshop, undefined, (): ViewState => ({ data: createState(Date.now()), message: "", error: "", generation: 0 }));
  const files = useRef(new Map<string, File>());
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      dispatch({ transform: (data) => {
        const customer = expireConfirmations(data, now);
        return customer === data ? data : { ...data, requests: customer.requests };
      } });
    };
    const timer = window.setInterval(check, 10_000);
    window.addEventListener("focus", check);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", check); };
  }, []);
  function registerFile(file: File): Attachment {
    const id = crypto.randomUUID();
    files.current.set(id, file);
    return { id, name: file.name, size: file.size, type: file.type };
  }
  function getFile(id: string) { return files.current.get(id); }
  function resetDemo(scope: string) {
    const now = Date.now();
    files.current.clear();
    dispatch({ transform: () => createState(now), scope, reset: true, message: "Sample data reset for all demo roles." });
  }
  return <WorkshopContext.Provider value={{ state, dispatch, registerFile, getFile, resetDemo }}>{children}</WorkshopContext.Provider>;
}

export function useWorkshop() {
  const context = useContext(WorkshopContext);
  if (!context) throw new Error("DemoWorkshopProvider is required.");
  return context;
}
