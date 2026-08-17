"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}

export function Dialog({ open, onClose, title, description, children, className, footer }: DialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-full max-w-lg rounded-2xl border-0 bg-white p-0 shadow-[var(--shadow-pop)] backdrop:bg-navy-950/40 backdrop:backdrop-blur-sm",
        className,
      )}
    >
      {(title || description) && (
        <div className="flex items-start justify-between border-b border-navy-100 px-6 py-4">
          <div>
            {title && <h2 className="text-lg font-semibold text-navy-900">{title}</h2>}
            {description && <p className="mt-1 text-sm text-navy-400">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-navy-400 hover:bg-navy-50 hover:text-navy-700 cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      <div className="max-h-[75vh] overflow-y-auto px-6 py-5">{children}</div>
      {footer && <div className="flex items-center justify-end gap-3 border-t border-navy-100 px-6 py-4">{footer}</div>}
    </dialog>
  );
}
