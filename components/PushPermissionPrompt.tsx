'use client';

import { useEffect, useState } from 'react';
import { Bell, Loader2, X } from 'lucide-react';
import { enablePushNotifications } from '@/lib/push';

// Small dismissible banner offering to turn on push notifications
// (registration-opened / one-hour-before reminders). Hides itself once
// permission has already been granted or denied, or after the user
// dismisses it for this session.
export default function PushPermissionPrompt({ uid }: { uid: string }) {
  const [status, setStatus] = useState<NotificationPermission | 'unsupported' | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setStatus('unsupported');
      return;
    }
    setStatus(Notification.permission);
  }, []);

  if (!status || status === 'granted' || status === 'unsupported' || dismissed) return null;

  async function handleEnable() {
    setEnabling(true);
    const result = await enablePushNotifications(uid);
    setEnabling(false);
    if (result === 'granted') setStatus('granted');
    else if (result === 'denied') setStatus('denied');
  }

  return (
    <div className="rounded-2xl bg-violet-50 border border-violet-100 p-3.5 flex items-center gap-3">
      <span className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
        <Bell size={16} className="text-violet-600" />
      </span>
      <p className="flex-1 text-xs font-semibold text-slate-700 leading-relaxed">
        הפעילי התראות כדי לקבל תזכורת כשנפתחת הרשמה וכשעה לפני אימון או משחק
      </p>
      <button
        type="button"
        disabled={enabling}
        onClick={handleEnable}
        className="flex items-center gap-1.5 rounded-xl bg-violet-600 text-white px-3 py-2 min-h-[36px] text-xs font-bold hover:bg-violet-700 disabled:opacity-60 transition shrink-0"
      >
        {enabling ? <Loader2 size={13} className="animate-spin" /> : null}
        הפעלה
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="סגירה"
        className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-white/60 transition shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}
