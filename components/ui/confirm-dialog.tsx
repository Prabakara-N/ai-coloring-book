"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Info, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

type DialogVariant = "default" | "danger" | "info";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
}

interface AlertOptions {
  title?: string;
  message: string;
  okText?: string;
  variant?: DialogVariant;
}

interface DialogState extends ConfirmOptions {
  type: "confirm" | "alert";
  resolver: (ok: boolean) => void;
}

interface DialogContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export function useDialog(): DialogContextType {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error("useDialog() must be called inside <DialogProvider>");
  }
  return ctx;
}

const VARIANT_STYLES: Record<DialogVariant, { icon: typeof Info; iconClass: string; confirmClass: string }> = {
  default: {
    icon: Info,
    iconClass: "text-violet-300",
    confirmClass: "bg-linear-to-r from-violet-500 to-cyan-400 text-white hover:opacity-95",
  },
  danger: {
    icon: AlertTriangle,
    iconClass: "text-red-300",
    confirmClass: "bg-red-500 text-white hover:bg-red-600",
  },
  info: {
    icon: Info,
    iconClass: "text-cyan-300",
    confirmClass: "bg-linear-to-r from-violet-500 to-cyan-400 text-white hover:opacity-95",
  },
};

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setState({ ...options, type: "confirm", resolver: resolve });
        setVisible(true);
      }),
    [],
  );

  const alert = useCallback(
    (options: AlertOptions) =>
      new Promise<void>((resolve) => {
        setState({
          message: options.message,
          title: options.title,
          confirmText: options.okText ?? "OK",
          variant: options.variant,
          type: "alert",
          resolver: () => resolve(),
        });
        setVisible(true);
      }),
    [],
  );

  const close = (ok: boolean) => {
    state?.resolver(ok);
    setVisible(false);
  };

  // Clear state only after the exit animation finishes so the dialog
  // keeps rendering its content while AnimatePresence runs the close
  // tween. Without this, content vanishes the instant a button is
  // clicked and the closing animation looks empty.
  const onExitComplete = () => {
    if (!visible) setState(null);
  };

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {mounted
        ? createPortal(
            <AnimatePresence onExitComplete={onExitComplete}>
              {visible && state ? (
                <DialogShell key="dialog" state={state} onClose={close} />
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </DialogContext.Provider>
  );
}

interface DialogShellProps {
  state: DialogState;
  onClose: (ok: boolean) => void;
}

function DialogShell({ state, onClose }: DialogShellProps) {
  const variant = VARIANT_STYLES[state.variant ?? "default"];
  const Icon = variant.icon;
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(false);
      if (e.key === "Enter") onClose(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-message"
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onClose(false)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 4 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur-xl shadow-2xl shadow-black/60 p-5 space-y-4"
      >
        <button
          type="button"
          onClick={() => onClose(false)}
          className="absolute top-3 right-3 p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/5"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3">
          <div className={`shrink-0 w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center ${variant.iconClass}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 pt-1">
            {state.title && (
              <h3 id="dialog-title" className="text-base font-semibold text-white leading-tight">
                {state.title}
              </h3>
            )}
            <p
              id="dialog-message"
              className={`text-sm text-neutral-300 leading-relaxed whitespace-pre-line ${state.title ? "mt-1.5" : ""}`}
            >
              {state.message}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          {state.type === "confirm" && (
            <button
              type="button"
              onClick={() => onClose(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-neutral-200 hover:bg-white/10 border border-white/10"
            >
              {state.cancelText ?? "Cancel"}
            </button>
          )}
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onClose(true)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold shadow ${variant.confirmClass}`}
          >
            {state.confirmText ?? (state.type === "alert" ? "OK" : "Confirm")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
