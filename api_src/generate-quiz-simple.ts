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
    const { subject, topic, difficultyMode = 'NORMAL', quantity = 5 } = req.body || {};

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const validSubject = subject || 'Biology';
    const count = Math.min(Math.max(Number(quantity) || 5, 1), 50);

    const prompt = `You are an expert NMDCAT question generator for Pakistani medical college entrance tests.
Generate ${count} multiple-choice questions for:
SUBJECT: ${validSubject.toUpperCase()}
Topic: ${topic}
Difficulty Mode: ${difficultyMode}

CRITICAL REQUIREMENTS:
1. Exactly ONE option must be correct (A, B, C, or D).
2. All distractors must be plausible but incorrect.
3. Explanation must justify the correct answer with scientific reasoning.
4. Questions must remain strictly within the specified subject "${validSubject}" and topic: ${topic}.

Return ONLY a valid JSON object with this exact structure:
{
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "correctAnswer": "A",
      "explanation": "Detailed explanation of why this answer is correct",
      "difficulty": "${difficultyMode}",
      "concept": "Specific concept tested by this question"
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
      requested: count,
      generated: validQuestions.length,
      provider: result.provider
    });
  } catch (err: any) {
    console.error("[generate-quiz-simple error]:", err);
    return res.status(500).json({
      error: "Failed to generate quiz questions",
      details: err?.message || String(err)
    });
  }
}
