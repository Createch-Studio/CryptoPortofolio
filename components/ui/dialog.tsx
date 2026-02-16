import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DialogProps = {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function Dialog({ open, onClose, title, children, footer }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
      <div
        className={cn(
          "w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl"
        )}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          {title && (
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">
              {title}
            </h2>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-200 text-sm"
            >
              ✕
            </button>
          )}
        </div>
        <div className="space-y-4">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

