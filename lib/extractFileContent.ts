import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

/** Old binary .doc, images, etc. return null — recorded as metadata only, not searchable. */
export async function extractFileContent(fileName: string, buffer: Buffer): Promise<string | null> {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'txt') {
    return buffer.toString('utf-8');
  }

  if (ext === 'pdf') {
    try {
      const parsed = await pdfParse(buffer);
      return parsed.text;
    } catch (err) {
      console.error('PDF parsing failed:', err);
      return null;
    }
  }

  if (ext === 'docx') {
    try {
      const parsed = await mammoth.extractRawText({ buffer });
      return parsed.value;
    } catch (err) {
      console.error('DOCX parsing failed:', err);
      return null;
    }
  }

  return null;
}
