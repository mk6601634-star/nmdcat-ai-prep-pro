import { callWithFallback, extractJsonFromText } from './_lib/aiProviderRouter';
import { verifyAuth } from './_lib/auth';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    return res.status(401).json({ error: authResult.error || 'Authentication required', code: 'auth/unauthorized' });
  }

  try {
    const { subject, topic, difficultyMode = 'NORMAL', quantity = 5 } = req.body || {};

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const validSubject = subject || 'General';
    const count = Math.min(Math.max(Number(quantity) || 5, 1), 50);

    const prompt = `You are an expert NMDCAT flashcard generator for Pakistani medical college entrance tests.
Generate ${count} flashcards for:
SUBJECT: ${validSubject.toUpperCase()}
Topic: ${topic}
Difficulty Mode: ${difficultyMode}

Return ONLY a valid JSON object with this exact structure:
{
  "flashcards": [
    {
      "front": "Clear question, term, or prompt on the front of the card",
      "back": "Accurate, concise explanation or definition on the back of the card",
      "keyPoint": "One critical takeaway to memorize",
      "tags": ["Topic", "Subject"]
    }
  ]
}`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text);
    const flashcards = parsed?.flashcards || (Array.isArray(parsed) ? parsed : []);

    return res.status(200).json({
      success: true,
      flashcards,
      provider: result.provider,
    });
  } catch (err: any) {
    console.error("[generate-flashcards error]:", err);
    return res.status(500).json({
      error: "Failed to generate flashcards",
      details: err?.message || String(err)
    });
  }
}
