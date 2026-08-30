import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAdminDb, isAdminConfigured } from '@/lib/firebaseAdmin';
import { verifyRequestUid } from '@/lib/verifyRequestUid';
import { generateWithRetry, friendlyGeminiError } from '@/lib/generateWithRetry';

const SYSTEM_INSTRUCTION =
  "You are the strategic assistant coach of a Mamanet catchball team. Answer the player's question based ONLY on the provided team context. If the answer cannot be found in the context, reply with: 'המאמן עדיין לא העלה חומרי לימוד בנושא זה.' Do not hallucinate or use external internet knowledge. " +
  'Format every answer in Hebrew for fast mobile scanning: short bold micro-headings for each section (using **double asterisks**), bullet points with a leading "- " and generous spacing between them, bold the critical keywords, and sprinkle relevant sport/utility emojis (such as 🏐 💡 🛑 ⏱️) where they aid clarity. Avoid dense paragraphs — prefer short structured sections.';

export async function POST(req: NextRequest) {
  if (!isAdminConfigured) {
    return NextResponse.json(
      { error: 'השרת עדיין לא מוגדר במלואו — חסר FIREBASE_SERVICE_ACCOUNT_KEY בקובץ .env.local.' },
      { status: 500 },
    );
  }

  const uid = await verifyRequestUid(req);
  if (!uid) {
    return NextResponse.json({ error: 'עליך להתחבר כדי לשאול את הבוט.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const playerQuestion = typeof body?.playerQuestion === 'string' ? body.playerQuestion : null;
  const teamCode = typeof body?.teamCode === 'string' ? body.teamCode : null;

  if (!playerQuestion || !teamCode) {
    return NextResponse.json({ error: 'חסרים פרטים: playerQuestion ו-teamCode נדרשים.' }, { status: 400 });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return NextResponse.json({ error: 'מפתח ה-Gemini API עדיין לא הוגדר בשרת.' }, { status: 500 });
  }

  try {
    const snapshot = await getAdminDb().collection('team_knowledge').where('teamCode', '==', teamCode).get();

    const context = snapshot.docs
      .map((docSnap) => (docSnap.data().content as string | undefined) ?? '')
      .filter((text) => text.trim().length > 0)
      .join('\n\n---\n\n');

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest', systemInstruction: SYSTEM_INSTRUCTION });

    const prompt = context
      ? `Team context:\n${context}\n\nPlayer question: ${playerQuestion}`
      : `Team context: (no materials have been uploaded yet)\n\nPlayer question: ${playerQuestion}`;

    const answer = await generateWithRetry(model, prompt);
    return NextResponse.json({ answer });
  } catch (err) {
    console.error('ask-team-bot failed:', err);
    return NextResponse.json({ error: friendlyGeminiError(err) }, { status: 500 });
  }
}
