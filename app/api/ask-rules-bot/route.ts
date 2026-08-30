import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAdminDb, isAdminConfigured } from '@/lib/firebaseAdmin';
import { verifyRequestUid } from '@/lib/verifyRequestUid';
import { generateWithRetry, friendlyGeminiError } from '@/lib/generateWithRetry';

// Unlike /api/ask-team-bot, this bot is NOT scoped to any team — it answers
// from the same fixed official rulebook documents for every player, on every team.

const SYSTEM_INSTRUCTION =
  "You are the official rules assistant for Mamanet catchball leagues. Answer the player's question based ONLY on the official rulebook context provided below. If the answer cannot be found in it, reply with: 'התשובה לשאלה הזו לא נמצאת בתקנון הרשמי — כדאי לבדוק מול המאמנת או ועדת הליגה.' Do not hallucinate or use external internet knowledge. Note: the source documents may contain minor character-level extraction noise (occasional garbled characters) — do your best to read past that and focus on the substantive rule content. " +
  'Format every answer in Hebrew for fast mobile scanning: short bold micro-headings for each section (using **double asterisks**), bullet points with a leading "- " and generous spacing between them, bold the critical keywords, and sprinkle relevant sport/utility emojis (such as 🏐 📋 ⏱️ 🚫) where they aid clarity. Avoid dense paragraphs — prefer short structured sections.';

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

  if (!playerQuestion) {
    return NextResponse.json({ error: 'חסר playerQuestion.' }, { status: 400 });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return NextResponse.json({ error: 'מפתח ה-Gemini API עדיין לא הוגדר בשרת.' }, { status: 500 });
  }

  try {
    const snapshot = await getAdminDb().collection('official_rules_knowledge').get();

    const context = snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data() as { title?: string; content?: string };
        return data.content ? `[${data.title ?? 'מסמך'}]\n${data.content}` : '';
      })
      .filter((text) => text.trim().length > 0)
      .join('\n\n---\n\n');

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest', systemInstruction: SYSTEM_INSTRUCTION });

    const prompt = context
      ? `Official rulebook context:\n${context}\n\nPlayer question: ${playerQuestion}`
      : `Official rulebook context: (not loaded yet)\n\nPlayer question: ${playerQuestion}`;

    const answer = await generateWithRetry(model, prompt);
    return NextResponse.json({ answer });
  } catch (err) {
    console.error('ask-rules-bot failed:', err);
    return NextResponse.json({ error: friendlyGeminiError(err) }, { status: 500 });
  }
}
