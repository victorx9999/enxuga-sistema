"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      ref.current?.showModal();
    } else {
      ref.current?.close();
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="fixed inset-0 z-50 m-auto w-full max-w-lg bg-surface-2 border border-border-2 rounded-xl shadow-2xl text-text p-0 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="font-bold text-sm">{title}</h2>
        <button
          onClick={onClose}
          className="p-1.5 text-muted hover:text-text transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
    </dialog>
  );
}

export function FormField({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-muted mb-1.5">
        {label}
        {required && <span className="text-brand ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export const inputClass =
  "w-full h-10 px-3 bg-surface border border-border-2 text-text text-sm placeholder:text-muted/60 focus:outline-none focus:border-brand transition-colors rounded-lg";

export const btnPrimary =
  "h-10 px-5 bg-brand text-surface font-medium text-sm rounded-full hover:bg-brand-dark transition-colors disabled:opacity-50";

export const btnSecondary =
  "h-10 px-5 bg-surface-3 text-text font-medium text-sm rounded-full hover:bg-border transition-colors";
