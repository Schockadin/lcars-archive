"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { XIcon } from "@/lib/icons";

// Globales, app-weites Toast-System für kurze Benachrichtigungen (z.B.
// „Link kopiert", „Gespeichert"). Bewusst schlank und ohne externe Library:
// ein Context stellt showToast bereit, ein per Portal an <body> gehängtes,
// aria-live-Region rendert die aktuellen Toasts. Toasts blenden sich nach
// `duration` ms selbst aus (0 = bleibt bis zum manuellen Schließen).

export type ToastKind = "success" | "error" | "info";

export interface ToastOptions {
  kind?: ToastKind;
  // Millisekunden bis zum automatischen Ausblenden (0 = kein Auto-Ausblenden).
  duration?: number;
}

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastApi {
  showToast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

// Kein Throw bei fehlendem Provider: Komponenten sollen einen Toast auslösen
// können, ohne dass ihr Test/Isolations-Kontext zwingend den Provider mitziehen
// muss — ohne Provider ist showToast dann schlicht ein No-op.
const NOOP_API: ToastApi = { showToast: () => {} };

export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NOOP_API;
}

const KIND_CLASS: Record<ToastKind, string> = {
  success: "lcars-toast--success",
  error: "lcars-toast--error",
  info: "lcars-toast--info",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const nextId = useRef(0);

  // Portal erst NACH dem Mount rendern (document existiert beim SSR nicht).
  // Bewusst über einen Mount-Effect statt eines Initialwerts: würde das erste
  // Client-Render die Portal-Region schon zeigen, wiche es vom (leeren)
  // Server-Render ab (Hydration-Mismatch). Daher hier legitim ein setState im
  // Mount-Effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-you-might-not-need-an-effect/no-initialize-state
    setMounted(true);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const id = (nextId.current += 1);
      const kind = options.kind ?? "info";
      const duration = options.duration ?? 4000;
      setToasts((list) => [...list, { id, message, kind }]);
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted &&
        createPortal(
          <div
            className="lcars-toast-region"
            role="region"
            aria-label="Benachrichtigungen"
            aria-live="polite"
          >
            {toasts.map((t) => (
              <div key={t.id} className={`lcars-toast ${KIND_CLASS[t.kind]}`}>
                <span className="lcars-toast-message">{t.message}</span>
                <button
                  type="button"
                  className="lcars-toast-dismiss"
                  aria-label="Schließen"
                  title="Schließen"
                  onClick={() => dismiss(t.id)}
                >
                  <XIcon />
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
