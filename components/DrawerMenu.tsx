'use client';

import type { ReactNode } from 'react';
import { X, LogOut } from 'lucide-react';

interface DrawerItemProps {
  icon: typeof X;
  label: string;
  onClick: () => void;
}

function DrawerItem({ icon: Icon, label, onClick }: DrawerItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 min-h-[52px] text-[15px] font-bold text-slate-700 hover:bg-violet-50 transition text-right"
    >
      <span className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
        <Icon size={17} className="text-violet-600" />
      </span>
      {label}
    </button>
  );
}

export default function DrawerMenu({
  open,
  onClose,
  onLogout,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 animate-[fade-in_0.15s_ease-out]" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-y-0 right-0 z-50 w-72 max-w-[82%] bg-white shadow-2xl flex flex-col animate-[slide-in-right_0.22s_ease-out]"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="w-9 h-9 rounded-xl" />
            <span className="font-extrabold text-slate-800">התפריט שלי</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירת תפריט"
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">{children}</nav>

        <div className="p-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 min-h-[52px] text-[15px] font-bold text-rose-500 hover:bg-rose-50 transition text-right"
          >
            <span className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
              <LogOut size={17} className="text-rose-500" />
            </span>
            התנתקות
          </button>
        </div>
      </div>
    </>
  );
}

export { DrawerItem };
