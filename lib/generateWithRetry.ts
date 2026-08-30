import type { GenerativeModel } from '@google/generative-ai';

/** Gemini occasionally returns 503 under high demand — worth one quick retry before giving up. */
export async function generateWithRetry(model: GenerativeModel, prompt: string, retries = 1): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 503 && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        continue;
      }
      throw err;
    }
  }
}

export function friendlyGeminiError(err: unknown): string {
  const status = (err as { status?: number })?.status;
  if (status === 503) {
    return 'העוזר החכם עמוס כרגע (עומס גבוה אצל Gemini) — נסי שוב בעוד כמה שניות.';
  }
  return 'משהו השתבש בפנייה לעוזר החכם.';
}
