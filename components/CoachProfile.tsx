'use client';

import { useRef, useState } from 'react';
import { ChevronRight, ChevronDown, Copy, Check, Camera, Loader2, Crown } from 'lucide-react';
import { uploadAvatar } from '@/lib/uploadAvatar';
import { useTeamRoster, useTeamCaptain, setTeamCaptain } from '@/lib/teamHooks';

export default function CoachProfile({
  fullName,
  email,
  teamCode,
  avatarUrl,
  onSave,
  onAvatarChange,
  onBack,
}: {
  fullName: string;
  email: string;
  teamCode: string;
  avatarUrl?: string;
  onSave: (fields: { fullName: string; email: string }) => void;
  onAvatarChange: (url: string) => void;
  onBack: () => void;
}) {
  const [nameDraft, setNameDraft] = useState(fullName);
  const [emailDraft, setEmailDraft] = useState(email);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const roster = useTeamRoster(teamCode);
  const captainUid = useTeamCaptain(teamCode);
  const captain = roster.find((p) => p.uid === captainUid);
  const [captainPickerOpen, setCaptainPickerOpen] = useState(false);
  const [settingCaptainUid, setSettingCaptainUid] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  }

  function handleSave() {
    onSave({ fullName: nameDraft, email: emailDraft });
    showToast('✓ השינויים נשמרו בהצלחה');
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(teamCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast('לא ניתן להעתיק אוטומטית — סמני והעתיקי ידנית');
    }
  }

  async function handleSetCaptain(uid: string) {
    setSettingCaptainUid(uid);
    try {
      await setTeamCaptain(teamCode, uid);
      setCaptainPickerOpen(false);
      showToast('✓ הקפטנית עודכנה בהצלחה');
    } catch (err) {
      console.error('Failed to set captain:', err);
      showToast('עדכון הקפטנית נכשל');
    } finally {
      setSettingCaptainUid(null);
    }
  }

  async function handleAvatarFile(file: File | null) {
    if (!file) return;
    setUploadingAvatar(true);
    const { avatarUrl: newUrl, error } = await uploadAvatar(file);
    setUploadingAvatar(false);

    if (error) {
      showToast(error);
      return;
    }
    if (newUrl) {
      onAvatarChange(newUrl);
      showToast('✓ התמונה עודכנה בהצלחה');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold text-slate-800 text-center">פרופיל מאמן</h1>

      <div className="flex flex-col items-center gap-2">
        <div className="w-20 h-20 rounded-full bg-slate-800 text-white flex items-center justify-center text-2xl font-bold overflow-hidden">
          {uploadingAvatar ? (
            <Loader2 size={22} className="animate-spin" />
          ) : avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            nameDraft.trim().charAt(0) || 'מ'
          )}
        </div>
        <button
          type="button"
          disabled={uploadingAvatar}
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 transition disabled:opacity-50"
        >
          <Camera size={14} /> החלפת תמונה
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleAvatarFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-right">
          <span className="text-xs font-bold text-slate-500">שם מלא</span>
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3 text-[15px] text-slate-800 transition focus:outline-none focus:border-violet-600/50 focus:ring-2 focus:ring-violet-600/20"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-right">
          <span className="text-xs font-bold text-slate-500">אימייל</span>
          <input
            type="email"
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3 text-[15px] text-slate-800 transition focus:outline-none focus:border-violet-600/50 focus:ring-2 focus:ring-violet-600/20"
          />
        </label>

        <button
          type="button"
          onClick={handleSave}
          className="rounded-2xl bg-violet-600 text-white px-5 py-3.5 text-[15px] font-bold transition hover:bg-violet-700"
        >
          שמירת שינויים
        </button>
      </div>

      <div className="rounded-2xl bg-teal-50 border border-teal-100 p-4">
        <p className="text-xs text-teal-800 leading-relaxed mb-3">
          שתפי קוד זה עם השחקניות שלך בעת ההרשמה כדי לשייך אותן אוטומטית לקבוצה שלך.
        </p>
        <div className="flex items-center gap-2">
          <span className="flex-1 rounded-xl bg-white border border-teal-200 px-4 py-2.5 text-center font-mono font-bold text-slate-800 tracking-wide">
            {teamCode}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-xl bg-teal-600 text-white px-3.5 py-2.5 text-sm font-bold hover:bg-teal-700 transition shrink-0"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'הועתק' : 'העתק קוד'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50/40 overflow-hidden">
        <button
          type="button"
          onClick={() => setCaptainPickerOpen((v) => !v)}
          aria-expanded={captainPickerOpen}
          className="w-full flex items-center justify-between gap-2 p-4 min-h-[52px] text-right"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Crown size={16} className="text-amber-600" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-800">הגדר קפטנית</p>
              <p className="text-xs text-slate-500">{captain ? `קפטנית נוכחית: ${captain.fullName}` : 'טרם נבחרה קפטנית'}</p>
            </div>
          </div>
          <ChevronDown
            size={18}
            className={`text-slate-400 shrink-0 transition-transform ${captainPickerOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {captainPickerOpen && (
          <div className="px-4 pb-4 border-t border-amber-100 pt-3 animate-[fade-in_0.2s_ease-out]">
            {roster.length === 0 ? (
              <p className="text-sm text-slate-400">עוד לא נרשמו שחקניות עם קוד הקבוצה שלך.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {roster.map((p) => {
                  const isCaptain = p.uid === captainUid;
                  return (
                    <li key={p.uid}>
                      <button
                        type="button"
                        disabled={settingCaptainUid !== null}
                        onClick={() => handleSetCaptain(p.uid)}
                        className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 min-h-[48px] text-right transition disabled:opacity-60 ${
                          isCaptain ? 'bg-amber-100' : 'bg-white hover:bg-amber-50'
                        }`}
                      >
                        {p.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                        ) : (
                          <span className="w-7 h-7 rounded-full bg-slate-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {p.fullName.trim().charAt(0) || '?'}
                          </span>
                        )}
                        <span className="text-sm font-semibold text-slate-700 flex-1 truncate">{p.fullName}</span>
                        {settingCaptainUid === p.uid ? (
                          <Loader2 size={15} className="animate-spin text-amber-600 shrink-0" />
                        ) : isCaptain ? (
                          <Crown size={15} className="text-amber-600 shrink-0" fill="currentColor" />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="flex items-center justify-center gap-1 text-sm font-bold text-slate-400 hover:text-slate-600 transition"
      >
        <ChevronRight size={15} />
        חזרה למסך הבית
      </button>

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
