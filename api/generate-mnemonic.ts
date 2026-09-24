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
    const { subject, topic, concept, difficultyMode = 'NORMAL' } = req.body || {};

    if (!topic || !concept) {
      return res.status(400).json({ error: "Topic and concept are required" });
    }

    const validSubject = subject || 'General';

    const prompt = `You are an expert NMDCAT mnemonic generator for Pakistani medical college entrance tests.
Generate high-yield memory mnemonics for:
SUBJECT: ${validSubject.toUpperCase()}
Topic: ${topic}
Concept: ${concept}
Difficulty: ${difficultyMode}

Return ONLY valid JSON with this structure:
{
  "mnemonics": [
    {
      "mnemonic": "THE MEMORABLE PHRASE OR ACRONYM",
      "expansion": "Explanation of what each letter or word represents",
      "howToRemember": "A memorable mental visualization trick",
      "examContext": "How this concept appears in NMDCAT questions",
      "relatedConcepts": ["Related concept 1", "Related concept 2"]
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
    const mnemonics = parsed?.mnemonics || (Array.isArray(parsed) ? parsed : []);

    return res.status(200).json({
      success: true,
      mnemonics,
      provider: result.provider,
    });
  } catch (err: any) {
    console.error("[generate-mnemonics error]:", err);
    return res.status(500).json({
      error: "Failed to generate mnemonics",
      details: err?.message || String(err)
    });
  }
}
