'use client';

import { useRef, useState, type FormEvent } from 'react';
import { ChevronRight, ChevronDown, Lock, Loader2, NotebookPen, Sparkles, Trash2, UploadCloud } from 'lucide-react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { fetchWithTimeout, isTimeoutError } from '@/lib/fetchWithTimeout';
import { useCoachFiles, useTeamPracticePlans } from '@/lib/teamHooks';
import FileBadge from './FileBadge';
import FormattedText from './FormattedText';

export default function TrainingPlanView({
  teamCode,
  coachUid,
  onBack,
}: {
  teamCode: string;
  coachUid: string;
  onBack: () => void;
}) {
  const trainingPlans = useTeamPracticePlans(teamCode);
  const coachFiles = useCoachFiles(coachUid);

  const coachFileInputRef = useRef<HTMLInputElement>(null);
  const [coachDragActive, setCoachDragActive] = useState(false);
  const [uploadingCoachFile, setUploadingCoachFile] = useState(false);

  const [planForm, setPlanForm] = useState({ title: '', date: '', notes: '' });
  const [savingPlan, setSavingPlan] = useState(false);
  const [draftTopic, setDraftTopic] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  }

  async function handleCoachFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || !auth?.currentUser) return;
    setUploadingCoachFile(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      await Promise.all(
        Array.from(fileList).map(async (file) => {
          const body = new FormData();
          body.append('file', file);
          const res = await fetch('/api/upload-coach-file', {
            method: 'POST',
            headers: { Authorization: `Bearer ${idToken}` },
            body,
          });
          if (!res.ok) {
            const data = await res.json().catch(() => null);
            console.error('Coach file upload failed:', data?.error ?? res.statusText);
          }
        }),
      );
    } finally {
      setUploadingCoachFile(false);
    }
  }

  async function handleRemoveCoachFile(fileId: string) {
    if (!auth?.currentUser) return;
    const idToken = await auth.currentUser.getIdToken();
    await fetch('/api/upload-coach-file', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ fileId }),
    });
  }

  async function handleGenerateDraft() {
    if (!auth?.currentUser) return;
    setGeneratingDraft(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetchWithTimeout('/api/generate-training-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ topic: draftTopic }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? 'יצירת הטיוטה נכשלה');
        return;
      }
      setPlanForm((p) => ({ ...p, title: data.title, notes: data.notes }));
      showToast('✓ טיוטה נוצרה — אפשר לערוך ולשמור למטה');
    } catch (err) {
      console.error('Draft generation failed:', err);
      showToast(isTimeoutError(err) ? 'יצירת הטיוטה לקחה יותר מדי זמן, נסי שוב' : 'יצירת הטיוטה נכשלה');
    } finally {
      setGeneratingDraft(false);
    }
  }

  async function handleCreatePlan(e: FormEvent) {
    e.preventDefault();
    if (!planForm.title.trim() || !auth?.currentUser || !db) return;
    setSavingPlan(true);
    try {
      await addDoc(collection(db, 'team_practice_plans'), {
        title: planForm.title,
        date: planForm.date,
        notes: planForm.notes,
        createdBy: auth.currentUser.uid,
        teamCode,
        timestamp: serverTimestamp(),
      });
      setPlanForm({ title: '', date: '', notes: '' });
      showToast('✓ מערך האימון נוצר בהצלחה');
    } catch (err) {
      console.error('Failed to save practice plan:', err);
      showToast('שמירת מערך האימון נכשלה');
    } finally {
      setSavingPlan(false);
    }
  }

  async function handleDeletePlan(planId: string) {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'team_practice_plans', planId));
    } catch (err) {
      console.error('Failed to delete practice plan:', err);
      showToast('מחיקת המערך נכשלה');
    }
  }

  const sortedPlans = [...trainingPlans].sort((a, b) => b.timestampMs - a.timestampMs);

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
        <h2 className="text-lg font-extrabold text-slate-800">בניית מערך אימון</h2>
      </div>

      <section className="rounded-3xl border border-emerald-100 bg-white shadow-sm p-5 flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
            <NotebookPen size={20} className="text-emerald-600" />
          </span>
          <div>
            <h3 className="font-extrabold text-slate-800 leading-snug">בניית מערך אימון חדש</h3>
            <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">תכנני מערך אימון חדש לקבוצה שלך במקום אחד</p>
          </div>
        </div>

        {/* Private reference materials, coach-only */}
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-indigo-500" />
            <span className="text-sm font-bold text-slate-800">חומרי עזר פרטיים למערכי אימון</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed -mt-1">
            קבצים כאן נשארים אצלך בלבד — השחקניות לא רואות אותם. הם משמשים ליצירת טיוטת מערך עם AI.
          </p>

          <div
            onClick={() => !uploadingCoachFile && coachFileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setCoachDragActive(true);
            }}
            onDragLeave={() => setCoachDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setCoachDragActive(false);
              handleCoachFiles(e.dataTransfer.files);
            }}
            role="button"
            tabIndex={0}
            aria-disabled={uploadingCoachFile}
            className={`w-full rounded-2xl border-2 border-dashed p-5 text-center transition-all duration-300 ${
              uploadingCoachFile
                ? 'border-slate-200 bg-white cursor-wait'
                : coachDragActive
                  ? 'border-indigo-400 bg-indigo-100/60 shadow-[0_0_0_6px_rgba(99,102,241,0.12)] cursor-pointer'
                  : 'border-indigo-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer'
            }`}
          >
            {uploadingCoachFile ? (
              <>
                <Loader2 size={22} className="mx-auto text-indigo-500 animate-spin" />
                <p className="mt-2 text-sm font-bold text-slate-700">מעלה ומעבדת...</p>
              </>
            ) : (
              <>
                <UploadCloud size={22} className="mx-auto text-indigo-500" />
                <p className="mt-2 text-sm font-bold text-slate-700">גררי קבצים או לחצי לבחירה</p>
                <p className="text-xs text-slate-400 mt-1">PDF, Word (docx) או TXT</p>
              </>
            )}
            <input
              ref={coachFileInputRef}
              type="file"
              multiple
              disabled={uploadingCoachFile}
              className="hidden"
              onChange={(e) => handleCoachFiles(e.target.files)}
            />
          </div>

          {coachFiles.length > 0 && (
            <ul className="flex flex-col gap-2">
              {coachFiles.map((f) => (
                <FileBadge
                  key={f.id}
                  fileName={f.fileName}
                  fullName
                  onRemove={() => handleRemoveCoachFile(f.id)}
                  trailing={
                    !f.hasContent && (
                      <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        לא זמין ל-AI
                      </span>
                    )
                  }
                />
              ))}
            </ul>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              value={draftTopic}
              onChange={(e) => setDraftTopic(e.target.value)}
              placeholder="נושא לאימון (רשות) — לדוגמה: הגנה"
              className="flex-1 rounded-xl border border-slate-200 px-3.5 py-3 min-h-[48px] text-sm text-slate-800 placeholder:text-slate-400 bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
            />
            <button
              type="button"
              onClick={handleGenerateDraft}
              disabled={generatingDraft}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 text-white px-4 py-3 min-h-[48px] text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 transition shrink-0"
            >
              {generatingDraft ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              צור טיוטה עם AI
            </button>
          </div>
        </div>

        <form onSubmit={handleCreatePlan} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-right">
            <span className="text-xs font-bold text-slate-500">שם האימון</span>
            <input
              required
              value={planForm.title}
              onChange={(e) => setPlanForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="לדוגמה: עבודת הגנה ומעברים"
              className="w-full rounded-xl border border-slate-200 px-4 py-3.5 min-h-[52px] text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-right">
            <span className="text-xs font-bold text-slate-500">תאריך</span>
            <input
              type="date"
              value={planForm.date}
              onChange={(e) => setPlanForm((p) => ({ ...p, date: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-3.5 min-h-[52px] text-[15px] text-slate-800 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-right">
            <span className="text-xs font-bold text-slate-500">מטרות / הערות</span>
            <textarea
              value={planForm.notes}
              onChange={(e) => setPlanForm((p) => ({ ...p, notes: e.target.value }))}
              rows={6}
              placeholder="על מה מתמקדות הפעם? (או לחצי 'צור טיוטה עם AI' למעלה)"
              className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-[15px] text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition"
            />
          </label>

          <button
            type="submit"
            disabled={savingPlan}
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-white px-5 py-4 min-h-[52px] text-[15px] font-bold hover:bg-emerald-700 disabled:opacity-60 transition"
          >
            {savingPlan && <Loader2 size={16} className="animate-spin" />}
            צור מערך אימון
          </button>
        </form>
      </section>

      {sortedPlans.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h3 className="text-sm font-extrabold text-slate-800">
            מערכי האימון שיצרת <span className="text-slate-400 font-semibold">({sortedPlans.length})</span>
          </h3>
          <ul className="flex flex-col gap-2">
            {sortedPlans.map((p) => {
              const isOpen = expandedPlanId === p.id;
              return (
                <li key={p.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedPlanId(isOpen ? null : p.id)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-2 p-4 min-h-[56px] text-right"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{p.title}</p>
                      {p.date && <p className="text-xs text-slate-400 mt-0.5">{p.date}</p>}
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3 animate-[fade-in_0.2s_ease-out]">
                      {p.notes ? (
                        <FormattedText text={p.notes} bulletColor="bg-emerald-400" />
                      ) : (
                        <p className="text-sm text-slate-400">אין הערות למערך זה.</p>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeletePlan(p.id)}
                        className="mt-3 flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-600 transition"
                      >
                        <Trash2 size={13} />
                        מחיקת מערך
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {toast && (
        <div className="fixed bottom-6 inset-x-0 flex justify-center z-50 px-4" aria-live="polite">
          <span className="bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-lg animate-[fade-in_0.2s_ease-out]">
            {toast}
          </span>
        </div>
      )}
    </div>
  );
}
