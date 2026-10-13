"use client";

import * as React from "react";
import { IconCircleCheck, IconAlertTriangle } from "@tabler/icons-react";

interface HubToastItem {
  id: number;
  message: string;
  variant: "success" | "error";
}

interface HubToastContextValue {
  show: (message: string, variant?: HubToastItem["variant"]) => void;
}

const HubToastContext = React.createContext<HubToastContextValue | null>(null);

export function useHubToast() {
  const ctx = React.useContext(HubToastContext);
  if (!ctx) throw new Error("useHubToast must be used within HubToastProvider");
  return ctx;
}

let nextId = 1;

export function HubToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<HubToastItem[]>([]);

  const show = React.useCallback((message: string, variant: HubToastItem["variant"] = "success") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  return (
    <HubToastContext.Provider value={{ show }}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.variant === "success" ? <IconCircleCheck className="i" stroke={1.75} /> : <IconAlertTriangle className="i" stroke={1.75} />}
            {t.message}
          </div>
        ))}
      </div>
    </HubToastContext.Provider>
  );
}
