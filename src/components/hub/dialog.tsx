"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface HubDialogProps {
  open: boolean;
  onClose: () => void;
  wide?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Native <dialog> wiring for Hub screens, styled purely with hub.css classes
 * (not src/components/ui/dialog.tsx -- its Tailwind classes aren't cleanly
 * overridable for the Hub's own design system). Renders inline, never via a
 * portal, so it stays a descendant of .hub-shell and inherits its tokens. */
export function HubDialog({ open, onClose, wide, className, children }: HubDialogProps) {
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
      className={cn(wide && "wide", className)}
    >
      {open && children}
    </dialog>
  );
}
