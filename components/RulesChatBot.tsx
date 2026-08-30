'use client';

import { auth } from '@/lib/firebase';
import { fetchWithTimeout, isTimeoutError } from '@/lib/fetchWithTimeout';
import ChatWidget from './ChatWidget';

const WELCOME_MESSAGE =
  'היי! אני עוזרת התקנון של מאמאנט. שאלי אותי כל דבר על חוקת המשחק הרשמית — אני עונה לפי התקנון בלבד, לא משנה לאיזו קבוצה את שייכת.';

async function fetchRulesResponse(playerQuestion: string): Promise<string> {
  if (!auth?.currentUser) {
    return 'עליך להתחבר כדי לשאול את הבוט.';
  }

  try {
    const idToken = await auth.currentUser.getIdToken();
    const res = await fetchWithTimeout('/api/ask-rules-bot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ playerQuestion }),
    });
    const data = await res.json();
    if (!res.ok) {
      return data.error ?? 'משהו השתבש בפנייה לעוזר החכם.';
    }
    return data.answer as string;
  } catch (err) {
    console.error('ask-rules-bot request failed:', err);
    if (isTimeoutError(err)) {
      return 'העוזר החכם לא הגיב בזמן — נסי שוב בעוד רגע.';
    }
    return 'משהו השתבש בפנייה לעוזר החכם. נסי שוב בעוד רגע.';
  }
}

export default function RulesChatBot({ onBack }: { onBack?: () => void }) {
  return (
    <ChatWidget
      titleMain="עוזרת התקנון"
      titleAccent="חוקת מאמאנט"
      welcomeMessage={WELCOME_MESSAGE}
      placeholder="שאלי שאלה על חוקת המשחק..."
      onAsk={fetchRulesResponse}
      onBack={onBack}
    />
  );
}
