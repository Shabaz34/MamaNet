import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { resizeImageToDataUrl } from './resizeImage';

// Stay safely under Firestore's 1 MiB per-document limit (the rest of the
// user doc — name, email, teamCode, etc. — takes up a little room too).
const MAX_DATA_URL_LENGTH = 700_000;

export async function uploadAvatar(file: File): Promise<{ avatarUrl?: string; error?: string }> {
  if (!auth?.currentUser || !db) {
    return { error: 'עליך להתחבר כדי להעלות תמונה.' };
  }
  if (!file.type.startsWith('image/')) {
    return { error: 'יש להעלות קובץ תמונה בלבד.' };
  }

  try {
    const dataUrl = await resizeImageToDataUrl(file);
    if (dataUrl.length > MAX_DATA_URL_LENGTH) {
      return { error: 'התמונה גדולה מדי גם אחרי דחיסה — נסי תמונה אחרת.' };
    }

    await setDoc(doc(db, 'users', auth.currentUser.uid), { avatarUrl: dataUrl }, { merge: true });
    return { avatarUrl: dataUrl };
  } catch (err) {
    console.error('Avatar resize/save failed:', err);
    return { error: 'העלאת התמונה נכשלה. נסי שוב.' };
  }
}
