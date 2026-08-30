import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, isAdminConfigured } from '@/lib/firebaseAdmin';
import { verifyRequestUid } from '@/lib/verifyRequestUid';
import { extractFileContent } from '@/lib/extractFileContent';

// Private to the uploading coach — never exposed to players, unlike
// team_files/team_knowledge. Used only to help generate training plans.

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

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'חסר קובץ.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const content = await extractFileContent(file.name, buffer);
  const hasContent = Boolean(content && content.trim().length > 0);

  const db = getAdminDb();
  const fileDoc = await db.collection('coach_files').add({
    fileName: file.name,
    uploadedBy: uid,
    hasContent,
    timestamp: FieldValue.serverTimestamp(),
  });

  if (hasContent) {
    await db.collection('coach_knowledge').add({
      uploadedBy: uid,
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
  const fileRef = db.collection('coach_files').doc(fileId);
  const fileSnap = await fileRef.get();

  if (!fileSnap.exists) {
    return NextResponse.json({ error: 'הקובץ לא נמצא.' }, { status: 404 });
  }
  if (fileSnap.data()?.uploadedBy !== uid) {
    return NextResponse.json({ error: 'אין הרשאה למחוק קובץ זה.' }, { status: 403 });
  }

  const knowledgeSnap = await db.collection('coach_knowledge').where('sourceFileId', '==', fileId).get();
  const batch = db.batch();
  knowledgeSnap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  batch.delete(fileRef);
  await batch.commit();

  return NextResponse.json({ success: true });
}
