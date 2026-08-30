'use client';

import { useState } from 'react';
import {
  Target,
  ChevronDown,
  Play,
  Clock,
  Shield,
  Swords,
  Dumbbell,
  Megaphone,
  Pin,
  CheckCircle2,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type Category = 'הגנה' | 'התקפה' | 'כושר';
type Difficulty = 'קל' | 'בינוני' | 'מתקדם';

interface Drill {
  id: string;
  title: string;
  duration: string;
  difficulty: Difficulty;
}

interface Announcement {
  id: number;
  time: string;
  text: string;
  pinned?: boolean;
}

// ─── Content ────────────────────────────────────────────────────────────────

const TODAYS_DRILL = {
  title: 'הגנת 1 על 1 באזור הזריקה',
  category: 'הגנה' as Category,
  difficulty: 'בינוני' as Difficulty,
  duration: '20 דקות',
  steps: [
    'עמדי במרחק זרוע אחת מהיריבה, כפות רגליים ברוחב הכתפיים',
    'שמרי ידיים פתוחות וגבוה, לאורך קו הראייה של הזורקת',
    'זוזי בצעדים קטנים הצידה — בלי לקפוץ מוקדם מדי',
    'ברגע הזריקה, קפצי ישר למעלה ולא קדימה',
  ],
};

const CATEGORY_META: Record<Category, { icon: typeof Shield; hint: string }> = {
  הגנה: { icon: Shield, hint: 'עמידה, מרחק וסגירת קווי מסירה' },
  התקפה: { icon: Swords, hint: 'תנועה, מסירות ויצירת מרחב' },
  כושר: { icon: Dumbbell, hint: 'זריזות, כוח וסיבולת' },
};

const DRILL_LIBRARY: Record<Category, Drill[]> = {
  הגנה: [
    { id: 'd1', title: 'הגנת 1 על 1 באזור הזריקה', duration: '20 דק׳', difficulty: 'בינוני' },
    { id: 'd2', title: 'אינטרספציה ויירוט מסירות', duration: '15 דק׳', difficulty: 'מתקדם' },
    { id: 'd3', title: 'כיסוי שטח בהגנת אזור', duration: '15 דק׳', difficulty: 'קל' },
  ],
  התקפה: [
    { id: 'a1', title: 'מסירת חזה מדויקת', duration: '10 דק׳', difficulty: 'קל' },
    { id: 'a2', title: 'יצירת מרחב ותנועה ללא כדור', duration: '15 דק׳', difficulty: 'בינוני' },
    { id: 'a3', title: 'זריקה לטבעת תחת לחץ', duration: '20 דק׳', difficulty: 'מתקדם' },
  ],
  כושר: [
    { id: 'f1', title: 'חימום דינמי לפני משחק', duration: '10 דק׳', difficulty: 'קל' },
    { id: 'f2', title: 'אינטרוולים לזריזות רגליים', duration: '15 דק׳', difficulty: 'בינוני' },
    { id: 'f3', title: 'כוח פלייומטרי לקפיצה', duration: '20 דק׳', difficulty: 'מתקדם' },
  ],
};

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 1,
    time: 'לפני יום',
    text: 'האימון של יום שלישי עובר לאולם הישן השבוע — שיפוצים באולם הראשי 🏗️',
    pinned: true,
  },
  {
    id: 2,
    time: 'לפני 3 ימים',
    text: 'מזל טוב לקבוצה על העלייה לליגה הארצית! גאה בכן על העבודה הקשה 🎉🏆',
  },
  {
    id: 3,
    time: 'לפני 5 ימים',
    text: 'תזכורת: טופס הרשמה לטורניר הקיץ עד יום שישי, מי שעוד לא — זה הזמן 📝',
  },
];

const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  קל: 'bg-teal-50 text-teal-700',
  בינוני: 'bg-amber-50 text-amber-700',
  מתקדם: 'bg-rose-50 text-rose-700',
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function NetballDashboard() {
  const [category, setCategory] = useState<Category>('הגנה');
  const [drillDone, setDrillDone] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Top navbar ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center shrink-0">
              <Target size={18} className="text-white" />
            </div>
            <span className="text-[17px] font-extrabold text-slate-800 tracking-tight">קבוצת כדורשת</span>
          </div>

          <button type="button" className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-slate-100 transition">
            <span className="text-sm font-semibold text-slate-700 hidden sm:inline">דנה כהן</span>
            <span className="w-8 h-8 rounded-full bg-slate-800 text-white text-sm font-bold flex items-center justify-center">
              ד
            </span>
            <ChevronDown size={15} className="text-slate-400 hidden sm:inline" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* ── Today's featured drill ───────────────────────────────────── */}
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid md:grid-cols-2">
            <div className="p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wide text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
                  האימון של היום
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${DIFFICULTY_STYLE[TODAYS_DRILL.difficulty]}`}>
                  {TODAYS_DRILL.difficulty}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 leading-snug text-balance">
                {TODAYS_DRILL.title}
              </h1>

              <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                <Clock size={15} />
                <span>{TODAYS_DRILL.duration}</span>
                <span className="text-slate-300">·</span>
                <span>{TODAYS_DRILL.category}</span>
              </div>

              <ol className="mt-5 flex flex-col gap-2.5">
                {TODAYS_DRILL.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600 leading-relaxed">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>

              <button
                type="button"
                onClick={() => setDrillDone((v) => !v)}
                className={`mt-6 self-start flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition ${
                  drillDone ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-teal-600 text-white hover:bg-teal-700'
                }`}
              >
                <CheckCircle2 size={17} />
                {drillDone ? 'בוצע היום ✓' : 'סימני כבוצע'}
              </button>
            </div>

            <div className="relative bg-slate-800 min-h-[220px] flex items-center justify-center">
              <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:18px_18px]" />
              <button
                type="button"
                aria-label="הפעילי סרטון הדגמה"
                className="relative w-16 h-16 rounded-full bg-white/15 hover:bg-white/25 transition flex items-center justify-center backdrop-blur"
              >
                <Play size={24} className="text-white ms-0.5" fill="currentColor" />
              </button>
              <span className="absolute bottom-4 text-xs text-white/60 font-medium">דיאגרמת תנועה — בקרוב</span>
            </div>
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Drill library ───────────────────────────────────────────── */}
          <section className="lg:col-span-2 rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-extrabold text-slate-800 mb-1">ספריית תרגילים</h2>
            <p className="text-sm text-slate-500 mb-4">{CATEGORY_META[category].hint}</p>

            <div className="flex gap-2 mb-5" role="tablist">
              {(Object.keys(DRILL_LIBRARY) as Category[]).map((cat) => {
                const Icon = CATEGORY_META[cat].icon;
                const isActive = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setCategory(cat)}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold transition ${
                      isActive ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    <Icon size={15} />
                    {cat}
                  </button>
                );
              })}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {DRILL_LIBRARY[category].map((drill) => (
                <div
                  key={drill.id}
                  className="rounded-2xl border border-slate-200 p-4 hover:border-teal-300 hover:shadow-sm transition cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-800 leading-snug">{drill.title}</h3>
                    <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${DIFFICULTY_STYLE[drill.difficulty]}`}>
                      {drill.difficulty}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock size={13} />
                    {drill.duration}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Coach's announcements ───────────────────────────────────── */}
          <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Megaphone size={18} className="text-slate-800" />
              <h2 className="text-lg font-extrabold text-slate-800">לוח מודעות מהמאמן</h2>
            </div>

            <div className="flex flex-col gap-3">
              {ANNOUNCEMENTS.map((note) => (
                <article
                  key={note.id}
                  className={`rounded-2xl p-4 ${note.pinned ? 'bg-teal-50/60 border border-teal-100' : 'bg-slate-50'}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center">
                        ר
                      </span>
                      <span className="text-xs font-bold text-slate-700">מאמנת רוני</span>
                    </div>
                    {note.pinned && <Pin size={13} className="text-teal-600" />}
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{note.text}</p>
                  <p className="mt-2 text-[11px] text-slate-400">{note.time}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
