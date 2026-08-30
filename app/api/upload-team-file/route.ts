import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, isAdminConfigured } from '@/lib/firebaseAdmin';
import { verifyRequestUid } from '@/lib/verifyRequestUid';
import { extractFileContent } from '@/lib/extractFileContent';

export async function POST(req: NextRequest) {
  if (!isAdminConfigured) {
    return NextResponse.json(
      { error: 'השרת עדיין לא מוגדר במלואו — חסר FIREBASE_SERVICE_ACCOUNT_KEY בקובץ .env.local.' },
      { status: 500 },
    );
  }

  const uid = await verifyRequestUid(req);
  if (!uid) {
    return NextResponse.json({ error: 'עליך להתחבר כדי להעלות קבצים.' }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get('file');
  const teamCode = formData?.get('teamCode');

  if (!(file instanceof File) || typeof teamCode !== 'string' || !teamCode) {
    return NextResponse.json({ error: 'חסרים פרטים: file ו-teamCode נדרשים.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const content = await extractFileContent(file.name, buffer);
  const hasContent = Boolean(content && content.trim().length > 0);

  const db = getAdminDb();
  const fileDoc = await db.collection('team_files').add({
    fileName: file.name,
    uploadedBy: uid,
    teamCode,
    hasContent,
    timestamp: FieldValue.serverTimestamp(),
  });

  if (hasContent) {
    await db.collection('team_knowledge').add({
      teamCode,
      fileName: file.name,
      content,
      sourceFileId: fileDoc.id,
    });
  }

  return NextResponse.json({ id: fileDoc.id, hasContent });
}

export async function DELETE(req: NextRequest) {
  if (!isAdminConfigured) {
    return NextResponse.json(
      { error: 'השרת עדיין לא מוגדר במלואו — חסר FIREBASE_SERVICE_ACCOUNT_KEY בקובץ .env.local.' },
      { status: 500 },
    );
  }

  const uid = await verifyRequestUid(req);
  if (!uid) {
    return NextResponse.json({ error: 'עליך להתחבר כדי למחוק קבצים.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const fileId = typeof body?.fileId === 'string' ? body.fileId : null;
  if (!fileId) {
    return NextResponse.json({ error: 'חסר fileId.' }, { status: 400 });
  }

  const db = getAdminDb();
  const fileRef = db.collection('team_files').doc(fileId);
  const fileSnap = await fileRef.get();

  if (!fileSnap.exists) {
    return NextResponse.json({ error: 'הקובץ לא נמצא.' }, { status: 404 });
  }
  if (fileSnap.data()?.uploadedBy !== uid) {
    return NextResponse.json({ error: 'אין הרשאה למחוק קובץ זה.' }, { status: 403 });
  }

  const knowledgeSnap = await db.collection('team_knowledge').where('sourceFileId', '==', fileId).get();
  const batch = db.batch();
  knowledgeSnap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  batch.delete(fileRef);
  await batch.commit();

  return NextResponse.json({ success: true });
}
