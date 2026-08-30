'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { User, Users, ChevronRight, Loader2 } from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase';
import CoachDashboard from './CoachDashboard';
import CoachProfile from './CoachProfile';
import PlayerDashboard from './PlayerDashboard';

// ─── Types ──────────────────────────────────────────────────────────────────

type Role = 'player' | 'coach';
type Intent = 'login' | 'register';
type ScreenId = 1 | 2 | 3 | 4 | 5 | 6;

interface FormData {
  fullName: string;
  email: string;
  password: string;
  teamCode: string;
}

interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  role: Role;
  teamCode: string;
  avatarUrl?: string;
}

interface CoachData {
  uid: string;
  fullName: string;
  email: string;
  teamCode: string;
  avatarUrl?: string;
}

interface PlayerData {
  uid: string;
  fullName: string;
  email: string;
  teamCode: string;
  avatarUrl?: string;
}

const EMPTY_FORM: FormData = { fullName: '', email: '', password: '', teamCode: '' };

function generateTeamCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `MAMA-${new Date().getFullYear()}-${suffix}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AuthFlow() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [screen, setScreen] = useState<ScreenId>(1);
  const [role, setRole] = useState<Role | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [coach, setCoach] = useState<CoachData | null>(null);
  const [player, setPlayer] = useState<PlayerData | null>(null);

  // Restore an existing session on refresh, bypassing the login screen.
  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) {
      setCheckingSession(false);
      return;
    }

    const firestore = db;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCheckingSession(false);
        return;
      }

      try {
        const snap = await getDoc(doc(firestore, 'users', user.uid));
        if (!snap.exists()) {
          setCheckingSession(false);
          return;
        }

        const profile = snap.data() as UserProfile;
        setRole(profile.role);

        if (profile.role === 'coach') {
          setCoach({
            uid: user.uid,
            fullName: profile.fullName,
            email: profile.email,
            teamCode: profile.teamCode,
            avatarUrl: profile.avatarUrl,
          });
          setScreen(4);
        } else {
          setPlayer({
            uid: user.uid,
            fullName: profile.fullName,
            email: profile.email,
            teamCode: profile.teamCode,
            avatarUrl: profile.avatarUrl,
          });
          setScreen(6);
        }
      } catch (err) {
        console.error('Session restore failed:', err);
      } finally {
        setCheckingSession(false);
      }
    });

    return unsubscribe;
  }, []);

  function chooseRole(nextRole: Role) {
    setRole(nextRole);
    setScreen(2);
  }

  function chooseIntent(nextIntent: Intent) {
    setIntent(nextIntent);
    setScreen(3);
  }

  function updateField(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!role || !intent) return;
    setSubmitting(true);
    setAuthError(null);

    if (!isFirebaseConfigured || !auth || !db) {
      setAuthError('חיבור Firebase עדיין לא הוגדר — הוסיפי את פרטי הפרויקט ל-.env.local');
      setSubmitting(false);
      return;
    }

    try {
      // "הישארי מחוברת": local persistence survives closing the browser/tab;
      // session persistence clears when the browser session ends, requiring
      // login again next visit.
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

      if (intent === 'login') {
        const credential = await signInWithEmailAndPassword(auth, form.email, form.password);
        const snap = await getDoc(doc(db, 'users', credential.user.uid));
        if (!snap.exists()) throw new Error('לא נמצא פרופיל משתמש עבור החשבון הזה');

        const profile = snap.data() as UserProfile;
        setRole(profile.role);

        if (profile.role === 'coach') {
          setCoach({
            uid: credential.user.uid,
            fullName: profile.fullName,
            email: profile.email,
            teamCode: profile.teamCode,
            avatarUrl: profile.avatarUrl,
          });
          setScreen(4);
        } else {
          setPlayer({
            uid: credential.user.uid,
            fullName: profile.fullName,
            email: profile.email,
            teamCode: profile.teamCode,
            avatarUrl: profile.avatarUrl,
          });
          setScreen(6);
        }
      } else {
        const credential = await createUserWithEmailAndPassword(auth, form.email, form.password);
        const uid = credential.user.uid;
        const teamCode = role === 'coach' ? generateTeamCode() : form.teamCode.trim().toUpperCase();

        if (role === 'player') {
          const coachQuery = query(
            collection(db, 'users'),
            where('role', '==', 'coach'),
            where('teamCode', '==', teamCode),
          );
          const coachSnap = await getDocs(coachQuery);
          if (coachSnap.empty) {
            await credential.user.delete();
            throw new Error('קוד הקבוצה שהוזן לא נמצא. בדקי את הקוד עם המאמנת ונסי שוב.');
          }
        }

        await setDoc(doc(db, 'users', uid), {
          uid,
          fullName: form.fullName,
          email: form.email,
          role,
          teamCode,
          createdAt: serverTimestamp(),
        });

        if (role === 'coach') {
          setCoach({ uid, fullName: form.fullName, email: form.email, teamCode });
          setScreen(4);
        } else {
          setPlayer({ uid, fullName: form.fullName, email: form.email, teamCode });
          setScreen(6);
        }
      }
    } catch (err) {
      console.error('AuthFlow submit failed:', err);
      const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : null;
      const message = err instanceof Error ? err.message : 'משהו השתבש, נסי שוב';
      setAuthError(code ? `${message} [${code}]` : message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    if (auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Sign-out failed:', err);
      }
    }
    setScreen(1);
    setRole(null);
    setIntent(null);
    setForm(EMPTY_FORM);
    setCoach(null);
    setPlayer(null);
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[#003366]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-10">
        <div className="flex items-center justify-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="מאמאנט" className="w-14 h-14 rounded-2xl" />
        </div>

        {screen <= 3 && (
          <div className="flex items-center justify-center gap-1.5 mb-8" aria-hidden="true">
            {[1, 2, 3].map((step) => (
              <span
                key={step}
                className={`h-1.5 rounded-full transition-all ${
                  step === screen ? 'w-6 bg-[#003366]' : 'w-1.5 bg-slate-200'
                }`}
              />
            ))}
          </div>
        )}

        <div key={screen} className="animate-[fade-in_0.25s_ease-out]">
          {screen === 1 && <RoleScreen onChoose={chooseRole} />}
          {screen === 2 && role && (
            <IntentScreen role={role} onChoose={chooseIntent} onBack={() => setScreen(1)} />
          )}
          {screen === 3 && role && intent && (
            <FormScreen
              role={role}
              intent={intent}
              form={form}
              rememberMe={rememberMe}
              submitting={submitting}
              error={authError}
              onChange={updateField}
              onRememberMeChange={setRememberMe}
              onBack={() => setScreen(2)}
              onSubmit={handleSubmit}
            />
          )}
          {screen === 4 && coach && (
            <CoachDashboard
              coachName={coach.fullName}
              coachUid={coach.uid}
              teamCode={coach.teamCode}
              avatarUrl={coach.avatarUrl}
              onOpenProfile={() => setScreen(5)}
              onLogout={handleLogout}
            />
          )}
          {screen === 5 && coach && (
            <CoachProfile
              fullName={coach.fullName}
              email={coach.email}
              teamCode={coach.teamCode}
              avatarUrl={coach.avatarUrl}
              onSave={(fields) => setCoach((prev) => (prev ? { ...prev, ...fields } : prev))}
              onAvatarChange={(url) => setCoach((prev) => (prev ? { ...prev, avatarUrl: url } : prev))}
              onBack={() => setScreen(4)}
            />
          )}
          {screen === 6 && player && (
            <PlayerDashboard
              playerName={player.fullName}
              playerUid={player.uid}
              teamCode={player.teamCode}
              avatarUrl={player.avatarUrl}
              onAvatarChange={(url) => setPlayer((prev) => (prev ? { ...prev, avatarUrl: url } : prev))}
              onLogout={handleLogout}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Screen 1 — role selection ─────────────────────────────────────────────

function RoleScreen({ onChoose }: { onChoose: (role: Role) => void }) {
  return (
    <div className="flex flex-col gap-6 text-center">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 text-balance">ברוכות הבאות למאמאנט</h1>
        <p className="mt-2 text-sm text-slate-500">בחרי את התפקיד שלך בליגה:</p>
      </div>

      <div className="flex flex-col gap-3">
        <RoleButton icon={User} label="אני שחקנית" onClick={() => onChoose('player')} />
        <RoleButton icon={Users} label="אני מאמן/ת" onClick={() => onChoose('coach')} />
      </div>
    </div>
  );
}

function RoleButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof User;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border border-slate-200 px-5 py-4 text-right transition hover:border-[#003366]/40 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003366]/40"
    >
      <span className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-[#003366]" />
      </span>
      <span className="text-[15px] font-bold text-slate-800">{label}</span>
    </button>
  );
}

// ─── Screen 2 — intent selection ───────────────────────────────────────────

function IntentScreen({
  role,
  onChoose,
  onBack,
}: {
  role: Role;
  onChoose: (intent: Intent) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-6 text-center">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 text-balance">
          {role === 'player' ? 'מרחב שחקנית' : 'מרחב מאמן/ת'}
        </h1>
        <p className="mt-2 text-sm text-slate-500">מה תרצי לעשות?</p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => onChoose('login')}
          className="rounded-2xl bg-[#003366] text-white px-5 py-4 text-[15px] font-bold transition hover:bg-[#002850] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003366]/40"
        >
          התחברות
        </button>
        <button
          type="button"
          onClick={() => onChoose('register')}
          className="rounded-2xl border border-slate-200 px-5 py-4 text-[15px] font-bold text-slate-800 transition hover:border-[#003366]/40 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003366]/40"
        >
          הרשמה לליגה
        </button>
      </div>

      <BackButton onClick={onBack} />
    </div>
  );
}

// ─── Screen 3 — dynamic forms ───────────────────────────────────────────────

function FormScreen({
  role,
  intent,
  form,
  rememberMe,
  submitting,
  error,
  onChange,
  onRememberMeChange,
  onBack,
  onSubmit,
}: {
  role: Role;
  intent: Intent;
  form: FormData;
  rememberMe: boolean;
  submitting: boolean;
  error: string | null;
  onChange: (field: keyof FormData, value: string) => void;
  onRememberMeChange: (value: boolean) => void;
  onBack: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  const showFullName = intent === 'register';
  const showTeamCode = intent === 'register' && role === 'player';

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-slate-800 text-center text-balance">
        {intent === 'login' ? 'התחברות למערכת' : 'הרשמה חדשה'}
      </h1>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {showFullName && (
          <Field
            label="שם מלא"
            type="text"
            value={form.fullName}
            placeholder="לדוגמה: דנה כהן"
            onChange={(v) => onChange('fullName', v)}
          />
        )}

        <Field
          label="דוא״ל"
          type="email"
          value={form.email}
          placeholder="name@example.com"
          onChange={(v) => onChange('email', v)}
        />

        <Field
          label="סיסמה"
          type="password"
          value={form.password}
          placeholder="לפחות 6 תווים"
          onChange={(v) => onChange('password', v)}
        />

        {showTeamCode && (
          <Field
            label="קוד קבוצה"
            type="text"
            value={form.teamCode}
            placeholder="קוד שקיבלת מהמאמנת"
            onChange={(v) => onChange('teamCode', v)}
          />
        )}

        <label className="flex items-center justify-end gap-2.5 cursor-pointer select-none">
          <span className="text-sm font-semibold text-slate-600">הישארי מחוברת במכשיר הזה</span>
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => onRememberMeChange(e.target.checked)}
            className="w-4.5 h-4.5 rounded border-slate-300 text-[#003366] focus:ring-2 focus:ring-[#003366]/30"
          />
        </label>

        {error && (
          <p className="text-sm font-semibold text-rose-600 bg-rose-50 rounded-xl px-4 py-2.5 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-[#003366] text-white px-5 py-4 text-[15px] font-bold transition hover:bg-[#002850] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003366]/40"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          המשך
        </button>
      </form>

      <BackButton onClick={onBack} />
    </div>
  );
}

function Field({
  label,
  type,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  type: 'text' | 'email' | 'password';
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-right">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <input
        type={type}
        required
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-slate-200 px-4 py-3 text-[15px] text-slate-800 placeholder:text-slate-400 transition focus:outline-none focus:border-[#003366]/50 focus:ring-2 focus:ring-[#003366]/20"
      />
    </label>
  );
}

// ─── Shared ─────────────────────────────────────────────────────────────────

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-1 text-sm font-bold text-slate-400 hover:text-slate-600 transition"
    >
      <ChevronRight size={15} />
      חזרה
    </button>
  );
}
