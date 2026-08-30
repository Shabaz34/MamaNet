import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, isAdminConfigured } from '@/lib/firebaseAdmin';
import { sendPushToTeam } from '@/lib/notify';
import { POLL_WINDOW_MS, resolveNextTraining, sessionDateTime } from '@/lib/trainingSchedule';

export const dynamic = 'force-dynamic';

const ONE_HOUR_MS = 60 * 60 * 1000;

// Polled every ~5 minutes by a GitHub Actions scheduled workflow (see
// .github/workflows/notify-cron.yml) — there's no Firestore write to hook
// into for either trigger, since both are purely time-based:
//   1. The weekly recurring training poll opens exactly 24h before the
//      session (see POLL_WINDOW_MS) — nothing gets written at that moment.
//   2. "1 hour before" reminders, for both the ad-hoc next game/practice
//      (team_events) and the recurring training, fire from a countdown.
// Each check is gated by a `notified*` flag stored on the relevant doc so
// re-running every 5 minutes only ever sends once per occurrence.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!isAdminConfigured) {
    return NextResponse.json({ error: 'admin sdk not configured' }, { status: 500 });
  }

  const db = getAdminDb();
  const now = new Date();
  const sent: string[] = [];

  // ── 1. Ad-hoc next game/practice (team_events) — "1 hour before" only.
  // "Registration opened" for these fires immediately on save instead,
  // via /api/notify-event-created.
  const eventsSnap = await db.collection('team_events').get();
  for (const eventDoc of eventsSnap.docs) {
    const teamCode = eventDoc.id;
    const data = eventDoc.data() as { type?: 'game' | 'practice'; date?: string; time?: string; notifiedOneHour?: boolean };
    if (!data.date || !data.time || data.notifiedOneHour) continue;

    const msUntilStart = sessionDateTime(data.date, data.time).getTime() - now.getTime();
    if (msUntilStart <= 0 || msUntilStart > ONE_HOUR_MS) continue;

    const title = data.type === 'game' ? 'עוד רגע המשחק!' : 'עוד רגע האימון!';
    await sendPushToTeam(teamCode, title, 'לא לשכוח מגנים, חולצת קבוצה וראבק! 🏐');
    await eventDoc.ref.set({ notifiedOneHour: true }, { merge: true });
    sent.push(`event:${teamCode}:oneHour`);
  }

  // ── 2. Recurring weekly training — "registration opened" (24h before)
  // and "1 hour before".
  const settingsSnap = await db.collection('team_training_settings').get();
  for (const settingsDoc of settingsSnap.docs) {
    const teamCode = settingsDoc.id;
    const settingsData = settingsDoc.data() as { weekday?: number; time?: string };
    if (typeof settingsData.weekday !== 'number' || !settingsData.time) continue;
    const settings = { weekday: settingsData.weekday, time: settingsData.time };

    // Peek at the default (never-overridden) slot to look up any override —
    // resolveNextTraining needs the override to compute the real `next`.
    const provisional = resolveNextTraining(settings, null, now)!;
    const overrideDoc = await db
      .collection('team_training_overrides')
      .doc(teamCode)
      .collection('dates')
      .doc(provisional.defaultDateKey)
      .get();
    const overrideData = overrideDoc.exists ? (overrideDoc.data() as { date?: string; time?: string }) : undefined;
    const override = overrideData?.date && overrideData?.time ? { date: overrideData.date, time: overrideData.time } : null;

    const next = resolveNextTraining(settings, override, now);
    if (!next) continue;

    const msUntilStart = sessionDateTime(next.dateKey, next.time).getTime() - now.getTime();
    const msUntilPollOpens = msUntilStart - POLL_WINDOW_MS;
    if (msUntilStart <= 0) continue;

    const sessionRef = db.collection('team_training_sessions').doc(teamCode).collection('dates').doc(next.dateKey);
    const sessionDoc = await sessionRef.get();
    const sessionData = sessionDoc.exists
      ? (sessionDoc.data() as { notifiedPollOpen?: boolean; notifiedOneHour?: boolean })
      : {};

    if (msUntilPollOpens <= 0 && !sessionData.notifiedPollOpen) {
      await sendPushToTeam(teamCode, 'נפתחה הרשמה לאימון הקרוב!', 'היכנסי לאפליקציה כדי לאשר הגעה 🏐');
      await sessionRef.set({ notifiedPollOpen: true }, { merge: true });
      sent.push(`training:${teamCode}:pollOpen`);
    }

    if (msUntilStart <= ONE_HOUR_MS && !sessionData.notifiedOneHour) {
      await sendPushToTeam(teamCode, 'עוד רגע האימון!', 'לא לשכוח מגנים, חולצת קבוצה וראבק! 🏐');
      await sessionRef.set({ notifiedOneHour: true }, { merge: true });
      sent.push(`training:${teamCode}:oneHour`);
    }
  }

  return NextResponse.json({ ok: true, sent });
}
