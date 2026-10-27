/** Keep the native modal's lifecycle aligned with the mobile navigation shell. */
export function bindCustomerMenu(dialog: HTMLDialogElement, trigger: HTMLButtonElement) {
  const document = dialog.ownerDocument;
  const desktop = document.defaultView!.matchMedia("(min-width: 1025px)");
  let restoreScroll: (() => void) | undefined;

  function sync() {
    trigger.setAttribute("aria-expanded", String(dialog.open));
    if (dialog.open && !restoreScroll) {
      const elements = [document.documentElement, document.body];
      const saved = elements.map(({ style }) => [style.getPropertyValue("overflow"), style.getPropertyPriority("overflow")]);
      elements.forEach(({ style }) => style.setProperty("overflow", "hidden"));
      restoreScroll = () => elements.forEach(({ style }, index) => {
        const [value, priority] = saved[index];
        if (value) style.setProperty("overflow", value, priority);
        else style.removeProperty("overflow");
      });
    } else if (!dialog.open && restoreScroll) {
      restoreScroll();
      restoreScroll = undefined;
    }
  }

  function handleResize() {
    if (desktop.matches && dialog.open) {
      dialog.close();
      sync();
    }
  }

  function keepFocusInside(event: KeyboardEvent) {
    if (event.key !== "Tab") return;
    const controls = [...dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')]
      .filter((element) => element.getClientRects().length > 0);
    const first = controls[0], last = controls.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  dialog.addEventListener("toggle", sync);
  dialog.addEventListener("close", sync);
  dialog.addEventListener("keydown", keepFocusInside);
  desktop.addEventListener("change", handleResize);
  sync();

  return () => {
    dialog.removeEventListener("toggle", sync);
    dialog.removeEventListener("close", sync);
    dialog.removeEventListener("keydown", keepFocusInside);
    desktop.removeEventListener("change", handleResize);
    if (dialog.open) dialog.close();
    restoreScroll?.();
    trigger.setAttribute("aria-expanded", "false");
  };
}
