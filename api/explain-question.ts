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
    const { question, options, correctAnswer, explanation, subject, topic } = req.body || {};

    if (!question || !options) {
      return res.status(400).json({ error: "Question and options are required" });
    }

    const validSubject = subject || 'General Science';

    const prompt = `You are an expert NMDCAT faculty member. Provide a comprehensive pedagogical explanation for this question:
SUBJECT: ${validSubject.toUpperCase()}
Topic: ${topic || 'General'}
Question: ${question}
Options: ${JSON.stringify(options)}
Correct Answer: ${correctAnswer}
Provided Explanation: ${explanation || 'None'}

Provide an authoritative explanation covering:
1. Core concept and biological/physical/chemical mechanism
2. Step-by-step resolution to reach the correct answer
3. Why each distractor option is incorrect
4. High-yield memory takeaway for NMDCAT`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
    });

    return res.status(200).json({
      success: true,
      text: result.text,
      explanation: result.text,
      provider: result.provider,
    });
  } catch (err: any) {
    console.error("[explain-question error]:", err);
    return res.status(500).json({
      error: "Failed to generate explanation",
      details: err?.message || String(err)
    });
  }
}
