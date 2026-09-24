import { callWithFallback, extractJsonFromText } from './_lib/aiEngine.js';
import { verifyAuth } from './_lib/authEngine.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    return res.status(401).json({ error: authResult.error || 'Authentication required', code: 'auth/unauthorized' });
  }

  try {
    const { subject, topic, difficultyMode = 'NORMAL' } = req.body || {};

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const validSubject = subject || 'Physics';

    const prompt = `You are an expert NMDCAT formula sheet developer for Pakistani medical college entrance tests.
Generate a comprehensive formula reference for:
SUBJECT: ${validSubject.toUpperCase()}
Topic: ${topic}
Difficulty Mode: ${difficultyMode}

CRITICAL RULES:
1. Always format equations in LaTeX notation with $...$ or $$...$$.
2. Define all variables and standard SI units.

Return ONLY a valid JSON object with this exact structure:
{
  "formulas": [
    {
      "name": "Formula Name",
      "formula": "$$E = mc^2$$",
      "variables": [
        { "symbol": "E", "meaning": "Energy", "unit": "Joules (J)" },
        { "symbol": "m", "meaning": "Mass", "unit": "kg" },
        { "symbol": "c", "meaning": "Speed of light", "unit": "m/s" }
      ],
      "conditions": "Applicable for relativistic rest energy",
      "examTips": "Common NMDCAT calculation shortcut",
      "relatedConcepts": ["Mass-energy equivalence"]
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
    const formulas = parsed?.formulas || (Array.isArray(parsed) ? parsed : []);

    return res.status(200).json({
      success: true,
      formulas,
      provider: result.provider,
    });
  } catch (err: any) {
    console.error("[generate-formulas error]:", err);
    return res.status(500).json({
      error: "Failed to generate formulas",
      details: err?.message || String(err)
    });
  }
}
