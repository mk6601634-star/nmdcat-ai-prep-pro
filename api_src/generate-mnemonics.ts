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
    const { concept, topic, subject = 'Biology' } = req.body || {};
    const target = concept || topic;

    if (!target || typeof target !== 'string') {
      return res.status(400).json({ error: 'Concept or topic is required' });
    }

    const prompt = `You are an expert NMDCAT medical memorization specialist.
Create 3 high-yield mnemonics to easily memorize:
SUBJECT: ${subject}
CONCEPT/TOPIC: ${target}

Return ONLY valid JSON with this exact schema:
{
  "mnemonics": [
    {
      "title": "Mnemonic Catchphrase or Acronym",
      "expansion": "Explanation of what each letter/word stands for",
      "explanation": "Why this is effective for NMDCAT exam recall",
      "subject": "${subject}",
      "tags": ["NMDCAT", "${subject}"]
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
      mnemonics: parsed?.mnemonics || (Array.isArray(parsed) ? parsed : []),
      provider: result.provider
    });
  } catch (err: any) {
    console.error("[generate-mnemonics error]:", err);
    return res.status(500).json({
      error: "Failed to generate mnemonics",
      details: err?.message || String(err)
    });
  }
}
