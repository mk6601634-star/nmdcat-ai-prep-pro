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
    const { question, options, correctAnswer, userAnswer, explanation, topic, subject } = req.body || {};

    if (!question || !options || correctAnswer === undefined || userAnswer === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const validSubject = subject || 'General Science';

    const prompt = `You are an expert NMDCAT tutor analyzing a student's incorrect answer.
SUBJECT: ${validSubject.toUpperCase()}
Question: ${question}
Topic: ${topic || 'General'}

Options:
A: ${options[0]}
B: ${options[1]}
C: ${options[2]}
D: ${options[3]}

Correct Answer: ${correctAnswer}
Student's Answer: ${userAnswer}
Provided Explanation: ${explanation || 'None'}

Provide an in-depth analysis in JSON format:
{
  "whyWrong": "Specific explanation of why the student's selected answer is incorrect",
  "rootCause": "The conceptual misunderstanding or trap that led to this error",
  "keyConcept": "The core concept the student needs to understand",
  "eliminationLogic": {
    "A": "Why option A is right or wrong",
    "B": "Why option B is right or wrong",
    "C": "Why option C is right or wrong",
    "D": "Why option D is right or wrong"
  },
  "memoryHook": "A quick memory tip or mnemonic to remember this correctly in the exam",
  "similarTrapWarning": "A warning about similar tricky question patterns to watch for"
}
Return ONLY valid JSON.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    const analysis = extractJsonFromText(result.text) || {};

    return res.status(200).json({
      success: true,
      analysis,
      provider: result.provider,
    });
  } catch (err: any) {
    console.error("[analyze-wrong-answer error]:", err);
    return res.status(500).json({
      error: "Failed to analyze wrong answer",
      details: err?.message || String(err)
    });
  }
}
