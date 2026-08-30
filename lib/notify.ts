// Server-only push-notification helpers (uses firebase-admin — never import
// this from a 'use client' file). Shared by the immediate "registration
// opened" notify route and the periodic cron notify route.
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, getAdminMessaging } from './firebaseAdmin';

const DEAD_TOKEN_ERRORS = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

// Sends one push to every device token registered by any user on this team
// (players + coach — everyone with a matching teamCode). Silently prunes
// tokens Firebase reports as dead (uninstalled app, expired registration)
// so the token list doesn't grow stale.
export async function sendPushToTeam(teamCode: string, title: string, body: string): Promise<void> {
  const db = getAdminDb();
  const usersSnap = await db.collection('users').where('teamCode', '==', teamCode).get();

  const tokenOwners = new Map<string, string>(); // token -> owning user doc id
  usersSnap.docs.forEach((d) => {
    const tokens = (d.data().fcmTokens as string[] | undefined) ?? [];
    tokens.forEach((t) => tokenOwners.set(t, d.id));
  });

  const tokens = Array.from(tokenOwners.keys());
  if (tokens.length === 0) return;

  const messaging = getAdminMessaging();
  // FCM caps multicast sends at 500 tokens per call — a single team is
  // always far smaller than that, but batch defensively anyway.
  const batches: string[][] = [];
  for (let i = 0; i < tokens.length; i += 500) batches.push(tokens.slice(i, i + 500));

  const deadTokensByOwner = new Map<string, string[]>();

  for (const batch of batches) {
    const res = await messaging.sendEachForMulticast({
      tokens: batch,
      notification: { title, body },
      webpush: { fcmOptions: { link: '/' } },
    });
    res.responses.forEach((r, i) => {
      if (r.success || !r.error || !DEAD_TOKEN_ERRORS.has(r.error.code)) return;
      const token = batch[i];
      const owner = tokenOwners.get(token);
      if (!owner) return;
      const list = deadTokensByOwner.get(owner) ?? [];
      list.push(token);
      deadTokensByOwner.set(owner, list);
    });
  }

  await Promise.all(
    Array.from(deadTokensByOwner.entries()).map(([uid, deadTokens]) =>
      db.collection('users').doc(uid).update({ fcmTokens: FieldValue.arrayRemove(...deadTokens) }),
    ),
  );
}
