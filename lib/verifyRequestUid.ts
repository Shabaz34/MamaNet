import type { NextRequest } from 'next/server';
import { getAdminAuth } from './firebaseAdmin';

export async function verifyRequestUid(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return null;

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    return decoded.uid;
  } catch (err) {
    console.error('ID token verification failed:', err);
    return null;
  }
}
