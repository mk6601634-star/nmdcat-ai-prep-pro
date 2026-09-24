import { callWithFallback, extractJsonFromText } from '../api/_lib/aiProviderRouter';
import { verifyAuth } from '../api/_lib/auth';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    return res.status(401).json({ error: authResult.error || 'Authentication required', code: 'auth/unauthorized' });
  }

  try {
    const { topic, subject = 'Biology', count = 5 } = req.body || {};

    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const prompt = `You are an expert NMDCAT flashcard creator.
Generate ${count} high-yield flashcards for:
SUBJECT: ${subject}
TOPIC: ${topic}

Return ONLY valid JSON with this exact schema:
{
  "flashcards": [
    {
      "front": "Front question/concept prompt",
      "back": "Back clear, concise high-yield answer/explanation",
      "tags": ["${subject}", "NMDCAT", "${topic}"]
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

    return res.status(200).json({
      success: true,
      flashcards: parsed?.flashcards || (Array.isArray(parsed) ? parsed : []),
      provider: result.provider
    });
  } catch (err: any) {
    console.error("[generate-flashcards error]:", err);
    return res.status(500).json({
      error: "Failed to generate flashcards",
      details: err?.message || String(err)
    });
  }
}
