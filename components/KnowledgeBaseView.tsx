'use client';

import { useRef, useState } from 'react';
import { BookOpen, ChevronRight, Loader2, UploadCloud } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useTeamFiles } from '@/lib/teamHooks';
import FileBadge from './FileBadge';

export default function KnowledgeBaseView({ teamCode, onBack }: { teamCode: string; onBack: () => void }) {
  const files = useTeamFiles(teamCode);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || !auth?.currentUser) return;
    setUploading(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      await Promise.all(
        Array.from(fileList).map(async (file) => {
          const body = new FormData();
          body.append('file', file);
          body.append('teamCode', teamCode);
          const res = await fetch('/api/upload-team-file', {
            method: 'POST',
            headers: { Authorization: `Bearer ${idToken}` },
            body,
          });
          if (!res.ok) {
            const data = await res.json().catch(() => null);
            console.error('Upload failed:', data?.error ?? res.statusText);
          }
        }),
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveFile(fileId: string) {
    if (!auth?.currentUser) return;
    const idToken = await auth.currentUser.getIdToken();
    await fetch('/api/upload-team-file', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ fileId }),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="חזרה למסך הבית"
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-violet-50 hover:text-violet-600 transition shrink-0"
        >
          <ChevronRight size={20} />
        </button>
        <h2 className="text-lg font-extrabold text-slate-800">מאגר ידע קבוצתי (AI)</h2>
      </div>

      <section className="rounded-3xl border border-violet-100 bg-white shadow-sm p-5 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
            <BookOpen size={20} className="text-violet-600" />
          </span>
          <p className="text-xs text-slate-500 leading-relaxed">
            השחקניות יכולות לשאול את הבוט שאלות על הקבצים שתעלי כאן
          </p>
        </div>

        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFiles(e.dataTransfer.files);
          }}
          role="button"
          tabIndex={0}
          aria-disabled={uploading}
          className={`w-full rounded-2xl border-2 border-dashed p-7 text-center transition-all duration-300 ${
            uploading
              ? 'border-slate-200 bg-slate-50 cursor-wait'
              : dragActive
                ? 'border-emerald-400 bg-emerald-50 shadow-[0_0_0_6px_rgba(16,185,129,0.12)] cursor-pointer'
                : 'border-violet-200 bg-violet-50/50 hover:border-violet-300 hover:bg-violet-50 cursor-pointer'
          }`}
        >
          {uploading ? (
            <>
              <Loader2 size={28} className="mx-auto text-violet-600 animate-spin" />
              <p className="mt-2 text-sm font-bold text-slate-700">מעלה ומעבדת...</p>
            </>
          ) : (
            <>
              <UploadCloud size={28} className="mx-auto text-violet-600" />
              <p className="mt-2 text-sm font-bold text-slate-700">גררי קבצים או לחצי לבחירה</p>
              <p className="text-xs text-slate-400 mt-1">PDF, Word (docx) או TXT</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            multiple
            disabled={uploading}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {files.length > 0 && (
          <ul className="flex flex-col gap-2.5">
            {files.map((f) => (
              <FileBadge
                key={f.id}
                fileName={f.fileName}
                fullName
                onRemove={() => handleRemoveFile(f.id)}
                trailing={
                  !f.hasContent && (
                    <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      לא זמין לבוט
                    </span>
                  )
                }
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
