import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, isAdminConfigured } from '@/lib/firebaseAdmin';
import { verifyRequestUid } from '@/lib/verifyRequestUid';
import { sendPushToTeam } from '@/lib/notify';

// Fired right after the coach saves a new/rescheduled next event
// (EventEditor → saveTeamEvent), so "registration opened" lands immediately
// instead of waiting for the periodic cron check.
export async function POST(req: NextRequest) {
  if (!isAdminConfigured) {
    return NextResponse.json({ error: 'השרת עדיין לא מוגדר במלואו.' }, { status: 500 });
  }

  const uid = await verifyRequestUid(req);
  if (!uid) {
    return NextResponse.json({ error: 'עליך להתחבר.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const teamCode = typeof body?.teamCode === 'string' ? body.teamCode : null;
  const eventType = body?.eventType === 'game' ? 'game' : 'practice';
  if (!teamCode) {
    return NextResponse.json({ error: 'חסר teamCode.' }, { status: 400 });
  }

  // Only that team's own coach may trigger this (mirrors the team_events write rule).
  const callerDoc = await getAdminDb().collection('users').doc(uid).get();
  const caller = callerDoc.data() as { role?: string; teamCode?: string } | undefined;
  if (!caller || caller.role !== 'coach' || caller.teamCode !== teamCode) {
    return NextResponse.json({ error: 'אין הרשאה.' }, { status: 403 });
  }

  const title = eventType === 'game' ? 'נפתחה הרשמה למשחק הקרוב!' : 'נפתחה הרשמה לאימון הקרוב!';

  try {
    await sendPushToTeam(teamCode, title, 'היכנסי לאפליקציה כדי לאשר הגעה 🏐');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('notify-event-created failed:', err);
    return NextResponse.json({ error: 'שליחת ההתראה נכשלה.' }, { status: 500 });
  }
}
