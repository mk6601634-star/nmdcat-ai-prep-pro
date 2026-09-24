import { callWithFallback, extractJsonFromText } from './_lib/aiProviderRouter.js';
import { verifyAuth } from './_lib/auth.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    return res.status(401).json({ error: authResult.error || 'Authentication required', code: 'auth/unauthorized' });
  }

  try {
    const { question, options, selectedAnswer, correctAnswer, explanation, subject, topic } = req.body || {};

    if (!question || !selectedAnswer || !correctAnswer) {
      return res.status(400).json({ error: 'Question, selectedAnswer, and correctAnswer are required' });
    }

    const prompt = `You are a specialized NMDCAT exam diagnostic tutor analyzing a student's incorrect MCQ answer.

QUESTION:
${question}

OPTIONS:
${Array.isArray(options) ? options.map((opt: string, i: number) => `${String.fromCharCode(65 + i)}: ${opt}`).join('\n') : ''}

STUDENT'S WRONG ANSWER: ${selectedAnswer}
CORRECT ANSWER: ${correctAnswer}
ORIGINAL EXPLANATION: ${explanation || 'N/A'}
${subject ? `SUBJECT: ${subject}` : ''}
${topic ? `TOPIC: ${topic}` : ''}

Analyze why the student made this mistake and provide diagnostic feedback.
Return ONLY valid JSON with this schema:
{
  "whyWrong": "Explanation of the misconception that likely caused the student to pick the wrong option",
  "whyCorrect": "Clear scientific reasoning why the correct option is right",
  "rootMisconception": "The fundamental concept or principle that was misunderstood",
  "howToAvoid": "Rule of thumb or cognitive trick to avoid this trap in future NMDCAT questions",
  "recommendedAction": "Specific sub-topic or diagram the student should review"
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
      analysis: parsed,
      provider: result.provider
    });
  } catch (err: any) {
    console.error("[analyze-wrong-answer error]:", err);
    return res.status(500).json({
      error: "Failed to analyze wrong answer",
      details: err?.message || String(err)
    });
  }
}
