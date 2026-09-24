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
    const { question, options, correctAnswer, explanation, subject, topic } = req.body || {};

    if (!question || !correctAnswer) {
      return res.status(400).json({ error: 'Question and correctAnswer are required' });
    }

    const prompt = `You are an expert NMDCAT tutor. Explain the following question and its solution thoroughly.

QUESTION:
${question}

OPTIONS:
${Array.isArray(options) ? options.map((opt: string, i: number) => `${String.fromCharCode(65 + i)}: ${opt}`).join('\n') : ''}

CORRECT ANSWER: ${correctAnswer}
EXISTING EXPLANATION: ${explanation || 'N/A'}
${subject ? `SUBJECT: ${subject}` : ''}
${topic ? `TOPIC: ${topic}` : ''}

Provide a comprehensive, crystal-clear scientific explanation breakdown suitable for NMDCAT exam candidates.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
    });

    return res.status(200).json({
      success: true,
      explanation: result.text,
      provider: result.provider
    });
  } catch (err: any) {
    console.error("[explain-question error]:", err);
    return res.status(500).json({
      error: "Failed to explain question",
      details: err?.message || String(err)
    });
  }
}
