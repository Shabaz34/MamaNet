import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAdminDb, isAdminConfigured } from '@/lib/firebaseAdmin';
import { verifyRequestUid } from '@/lib/verifyRequestUid';
import { generateWithRetry, friendlyGeminiError } from '@/lib/generateWithRetry';

const SYSTEM_INSTRUCTION =
  'You are an expert assistant coach for a Mamanet catchball team, helping the head coach draft a new practice session plan (מערך אימון) in Hebrew. If reference materials are provided below, base the plan primarily on them; otherwise draft a solid general session from your own expertise. ' +
  'Respond in EXACTLY this format, nothing else: first line starts with "כותרת: " followed by a short session title, then a line containing only "---", then the plan body. ' +
  'Format the body for fast mobile scanning: bold micro-headings per section (e.g. **חימום**, **תרגול עיקרי**, **סיכום**) using double asterisks, bullet points with a leading "- " and generous spacing between them, bold critical keywords, and relevant sport emojis (🏐 ⏱️ 💡). Keep it realistic for a 60–90 minute practice.';

export async function POST(req: NextRequest) {
  if (!isAdminConfigured) {
    return NextResponse.json(
      { error: 'השרת עדיין לא מוגדר במלואו — חסר FIREBASE_SERVICE_ACCOUNT_KEY בקובץ .env.local.' },
      { status: 500 },
    );
  }

  const uid = await verifyRequestUid(req);
  if (!uid) {
    return NextResponse.json({ error: 'עליך להתחבר כדי ליצור מערך אימון.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const topic = typeof body?.topic === 'string' ? body.topic.trim() : '';

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return NextResponse.json({ error: 'מפתח ה-Gemini API עדיין לא הוגדר בשרת.' }, { status: 500 });
  }

  try {
    const snapshot = await getAdminDb().collection('coach_knowledge').where('uploadedBy', '==', uid).get();
    const context = snapshot.docs
      .map((docSnap) => (docSnap.data().content as string | undefined) ?? '')
      .filter((text) => text.trim().length > 0)
      .join('\n\n---\n\n');

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest', systemInstruction: SYSTEM_INSTRUCTION });

    const prompt = [
      context
        ? `Reference materials:\n${context}`
        : 'Reference materials: (none uploaded yet — draft from general expertise)',
      topic ? `Focus / topic for this session: ${topic}` : 'No specific topic given — draft a well-rounded general session.',
    ].join('\n\n');

    const raw = await generateWithRetry(model, prompt);

    const separatorIndex = raw.indexOf('---');
    let title = 'מערך אימון חדש';
    let notes = raw.trim();
    if (separatorIndex !== -1) {
      const titleLine = raw.slice(0, separatorIndex).trim();
      title = titleLine.replace(/^כותרת:\s*/, '').trim() || title;
      notes = raw.slice(separatorIndex + 3).trim();
    }

    return NextResponse.json({ title, notes });
  } catch (err) {
    console.error('generate-training-plan failed:', err);
    return NextResponse.json({ error: friendlyGeminiError(err) }, { status: 500 });
  }
}
