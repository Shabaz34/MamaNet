'use client';

import type { ReactNode } from 'react';
import { FileText, Image as ImageIcon, X } from 'lucide-react';

function iconFor(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return { Icon: FileText, color: 'text-rose-500', bg: 'bg-rose-50' };
  if (ext === 'doc' || ext === 'docx') return { Icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' };
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
    return { Icon: ImageIcon, color: 'text-violet-500', bg: 'bg-violet-50' };
  }
  return { Icon: FileText, color: 'text-slate-500', bg: 'bg-slate-100' };
}

export default function FileBadge({
  fileName,
  onRemove,
  trailing,
  fullName = false,
}: {
  fileName: string;
  onRemove?: () => void;
  trailing?: ReactNode;
  /** Show the complete file name (wraps to a second line) instead of truncating it. */
  fullName?: boolean;
}) {
  const { Icon, color, bg } = iconFor(fileName);

  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 min-h-[52px] transition hover:bg-violet-50/40 animate-[fade-in_0.2s_ease-out]">
      <div className={`flex items-center gap-2.5 ${fullName ? 'min-w-0' : 'overflow-hidden'}`}>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
          <Icon size={15} className={color} />
        </span>
        <span className={`text-sm font-semibold text-slate-700 ${fullName ? 'break-words' : 'truncate'}`}>
          {fileName}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {trailing}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="הסרת קובץ"
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </li>
  );
}
