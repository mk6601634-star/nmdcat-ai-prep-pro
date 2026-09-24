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
    const { subject, topic, subtopic, difficulty = 'Medium', count = 10, mode } = req.body || {};

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const validSubject = subject || 'Biology';
    const quantity = Math.min(Math.max(Number(count) || 10, 1), 50);

    const prompt = `You are a premier NMDCAT question architect.
Generate ${quantity} high-yield multiple-choice questions for:
SUBJECT: ${validSubject.toUpperCase()}
TOPIC: ${topic}
${subtopic ? `SUBTOPIC: ${subtopic}` : ''}
DIFFICULTY: ${difficulty}
MODE: ${mode || 'standard'}

REQUIREMENTS:
1. Standard 4-option MCQs (A, B, C, D).
2. Exactly ONE option is strictly correct.
3. Plausible distractors designed around common misconceptions.
4. Comprehensive explanation for the answer.

Return ONLY a valid JSON object:
{
  "questions": [
    {
      "id": "q1",
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "A",
      "explanation": "Scientific justification",
      "difficulty": "${difficulty}",
      "topic": "${topic}"
    }
  ]
}`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 8192,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text);
    const questions = parsed?.questions || (Array.isArray(parsed) ? parsed : []);

    const validQuestions = questions.filter((q: any) => {
      return q.question &&
             Array.isArray(q.options) &&
             q.options.length === 4 &&
             ['A', 'B', 'C', 'D'].includes(q.correctAnswer) &&
             q.explanation;
    });

    return res.status(200).json({
      success: true,
      questions: validQuestions,
      requested: quantity,
      generated: validQuestions.length,
      provider: result.provider
    });
  } catch (err: any) {
    console.error("[generate-quiz error]:", err);
    return res.status(500).json({
      error: "Failed to generate quiz",
      details: err?.message || String(err)
    });
  }
}
