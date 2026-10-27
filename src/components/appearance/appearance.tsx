"use client";
import { Icon } from "./icons";
import { createContext,useContext,useEffect,useId,useRef,useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { getServerTheme,getServerUiSize,getTheme,getUiSize,saveTheme,saveUiSize,subscribeAppearance,type Theme,type UiSize } from "./appearance-preferences";
const ThemeContext = createContext<{ theme: Theme; onTheme: (theme: Theme) => void; uiSize: UiSize; onUiSize: (size: UiSize) => void }>({ theme: "dark", onTheme: () => {}, uiSize: "medium", onUiSize: () => {} });

export function ThemeToggle() {
  const { onTheme, onUiSize } = useContext(ThemeContext);
  // This subtree can hydrate after the provider (inside the auth Suspense boundary).
  // Its own server snapshots keep the controlled radios in sync during hydration.
  const theme = useSyncExternalStore(subscribeAppearance, getTheme, getServerTheme);
  const uiSize = useSyncExternalStore(subscribeAppearance, getUiSize, getServerUiSize);
  const preferenceId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <button className="theme-toggle settings-trigger" type="button" aria-label="ตั้งค่า" onClick={() => dialog.current?.showModal()} aria-haspopup="dialog"><Icon name="grid"/><span>ตั้งค่า</span></button>
    <dialog ref={dialog} className="appearance-settings" aria-label="ตั้งค่าการแสดงผล">
      <div className="settings-heading"><div><span className="eyebrow">PREFERENCES</span><h2>ตั้งค่าการแสดงผล</h2></div><button type="button" aria-label="ปิดการตั้งค่า" onClick={() => dialog.current?.close()}><Icon name="close"/></button></div>
      <p>ปรับการแสดงผลให้เหมาะกับการใช้งานของคุณ</p>
      <fieldset><legend>ขนาดการแสดงผล</legend><div className="settings-options">{([['small', 'เล็ก'], ['medium', 'กลาง'], ['large', 'ใหญ่']] as const).map(([value, label]) => <label key={value}><input type="radio" name={`ui-size-${preferenceId}`} value={value} checked={uiSize === value} onChange={() => onUiSize(value)}/><span>{label}</span></label>)}</div></fieldset>
      <fieldset><legend>ธีม</legend><div className="settings-options">{([['light', 'สว่าง', 'sun'], ['dark', 'มืด', 'moon']] as const).map(([value, label, icon]) => <label key={value}><input type="radio" name={`appearance-theme-${preferenceId}`} value={value} checked={theme === value} onChange={() => onTheme(value)}/><span><Icon name={icon}/>{label}</span></label>)}</div></fieldset>
      <div className="settings-preview"><strong>ตัวอย่างการแสดงผล</strong><p>ติดตามงานผลิตและจัดการเอกสารได้ในที่เดียว</p></div>
      <small>ใช้กับทุกหน้า และจดจำไว้ในเบราว์เซอร์นี้</small>
      <button className="primary-button settings-done" type="button" onClick={() => dialog.current?.close()}>เสร็จสิ้น</button>
    </dialog>
  </>;
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeAppearance, getTheme, getServerTheme);
  const uiSize = useSyncExternalStore(subscribeAppearance, getUiSize, getServerUiSize);
  useEffect(()=>{
    document.documentElement.dataset.theme=theme;
    document.documentElement.dataset.uiSize=uiSize;
  },[theme,uiSize]);
  const changeTheme = (next: Theme) => {
    if (next === theme) return;
    const update = () => {
      flushSync(() => saveTheme(next));
    };
    if (document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.startViewTransition(update);
    } else {
      update();
    }
  };
  const changeUiSize = (size: UiSize) => {
    saveUiSize(size);
  };
  return <ThemeContext.Provider value={{ theme, onTheme: changeTheme, uiSize, onUiSize: changeUiSize }}><div className="theme-root" data-theme={theme}>{children}</div></ThemeContext.Provider>;
}
