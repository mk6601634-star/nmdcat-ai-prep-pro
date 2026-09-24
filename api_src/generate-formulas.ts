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
    const { topic, subject = 'Physics' } = req.body || {};

    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const prompt = `You are an expert NMDCAT Physics/Chemistry formula sheet generator.
Generate a comprehensive formula reference for:
SUBJECT: ${subject}
TOPIC: ${topic}

Return ONLY valid JSON with this exact schema:
{
  "formulas": [
    {
      "name": "Formula Name",
      "formula": "LaTeX or plain formula string, e.g. F = ma",
      "variables": "Variable definitions",
      "units": "SI units",
      "notes": "NMDCAT application tips or common traps"
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
      formulas: parsed?.formulas || (Array.isArray(parsed) ? parsed : []),
      provider: result.provider
    });
  } catch (err: any) {
    console.error("[generate-formulas error]:", err);
    return res.status(500).json({
      error: "Failed to generate formulas",
      details: err?.message || String(err)
    });
  }
}
