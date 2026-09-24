import { callWithFallback } from './_lib/aiProviderRouter';
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
    const { prompt: userPrompt, query, message, subject = 'General', mode = 'socratic', context } = req.body || {};
    const queryText = userPrompt || query || message || '';

    if (!queryText.trim()) {
      return res.status(400).json({ error: "Query is required" });
    }

    const prompt = `You are an expert NMDCAT (National Medical and Dental College Admission Test) AI Medical Tutor in Pakistan.
SUBJECT: ${subject.toUpperCase()}
Mode: ${mode}

${context ? `CONTEXT: ${context}\n` : ''}
STUDENT QUERY: "${queryText}"

CRITICAL FORMATTING RULES:
1. Always format math formulas, physics quantities, and chemical formulas in clean LaTeX notation with inline $...$ or display $$...$$.
2. Use clean markdown.
3. Be direct, scientifically accurate according to PMDC / FSc syllabus, and helpful.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
    });

    return res.status(200).json({
      success: true,
      text: result.text,
      answer: result.text,
      provider: result.provider,
      modeUsed: mode
    });
  } catch (err: any) {
    console.error("[ai-tutor error]:", err);
    return res.status(500).json({
      error: "Failed to generate AI Tutor response",
      details: err?.message || String(err)
    });
  }
}
