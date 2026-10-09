import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Native modal dialogs provide focus trapping, Escape, and background inertness. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus(); };
  }, []);
  return createPortal(<dialog ref={ref} aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }} className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl border border-white/20 bg-slate-950 p-0 text-white shadow-2xl">{children}</dialog>, document.body);
}
