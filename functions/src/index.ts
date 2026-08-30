import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

initializeApp();

const geminiApiKey = defineSecret('GEMINI_API_KEY');

const SYSTEM_INSTRUCTION =
  "You are the strategic assistant coach of a Mamanet catchball team. Answer the player's question based ONLY on the provided team context. If the answer cannot be found in the context, reply with: 'המאמן עדיין לא העלה חומרי לימוד בנושא זה.' Do not hallucinate or use external internet knowledge.";

interface AskTeamBotData {
  playerQuestion: string;
  teamCode: string;
}

export const askTeamBot = onCall({ secrets: [geminiApiKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'עליך להתחבר כדי לשאול את הבוט.');
  }

  const { playerQuestion, teamCode } = (request.data ?? {}) as Partial<AskTeamBotData>;

  if (!playerQuestion || typeof playerQuestion !== 'string') {
    throw new HttpsError('invalid-argument', 'חסר playerQuestion.');
  }
  if (!teamCode || typeof teamCode !== 'string') {
    throw new HttpsError('invalid-argument', 'חסר teamCode.');
  }

  // ─── Retrieval: pull this team's uploaded knowledge from Firestore ────────
  const db = getFirestore();
  const snapshot = await db.collection('team_knowledge').where('teamCode', '==', teamCode).get();

  const context = snapshot.docs
    .map((docSnap) => (docSnap.data().content as string | undefined) ?? '')
    .filter((text) => text.trim().length > 0)
    .join('\n\n---\n\n');

  // ─── Generation: ground Gemini strictly in that context ───────────────────
  const genAI = new GoogleGenerativeAI(geminiApiKey.value());
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  const prompt = context
    ? `Team context:\n${context}\n\nPlayer question: ${playerQuestion}`
    : `Team context: (no materials have been uploaded yet)\n\nPlayer question: ${playerQuestion}`;

  const result = await model.generateContent(prompt);
  const answer = result.response.text();

  return { answer };
});
