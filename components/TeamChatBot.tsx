'use client';

import { auth } from '@/lib/firebase';
import { fetchWithTimeout, isTimeoutError } from '@/lib/fetchWithTimeout';
import ChatWidget from './ChatWidget';

const WELCOME_MESSAGE =
  'היי! אני העוזר המקצועי של הקבוצה שלך. שאל אותי כל דבר על התרגילים, החוקה או מערכי האימון שהמאמן העלה!';

async function fetchBotResponse(playerQuestion: string, teamCode: string): Promise<string> {
  if (!auth?.currentUser) {
    return 'עליך להתחבר כדי לשאול את הבוט.';
  }

  try {
    const idToken = await auth.currentUser.getIdToken();
    const res = await fetchWithTimeout('/api/ask-team-bot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ playerQuestion, teamCode }),
    });
    const data = await res.json();
    if (!res.ok) {
      return data.error ?? 'משהו השתבש בפנייה לעוזר החכם.';
    }
    return data.answer as string;
  } catch (err) {
    console.error('ask-team-bot request failed:', err);
    if (isTimeoutError(err)) {
      return 'העוזר החכם לא הגיב בזמן — נסי שוב בעוד רגע.';
    }
    return 'משהו השתבש בפנייה לעוזר החכם. נסי שוב בעוד רגע.';
  }
}

export default function TeamChatBot({ teamCode, onBack }: { teamCode: string; onBack?: () => void }) {
  return (
    <ChatWidget
      titleMain="העוזר החכם"
      titleAccent="של הקבוצה"
      welcomeMessage={WELCOME_MESSAGE}
      placeholder="שאלי אותי כל דבר על הקבוצה או החוקים..."
      onAsk={(question) => fetchBotResponse(question, teamCode)}
      onBack={onBack}
    />
  );
}
