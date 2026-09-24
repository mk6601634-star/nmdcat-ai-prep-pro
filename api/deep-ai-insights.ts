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
    const { questions, userAnswers, subject, topic, difficultyMode = 'NORMAL' } = req.body || {};

    if (!questions || !userAnswers || !Array.isArray(questions)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const validSubject = subject || 'General Science';

    const quizSummary = questions.map((q: any, idx: number) => ({
      question: q.question,
      concept: q.concept,
      correctAnswer: q.correctAnswer,
      userAnswer: userAnswers[idx],
      isCorrect: userAnswers[idx] === q.correctAnswer
    }));

    const correctCount = quizSummary.filter((q: any) => q.isCorrect).length;
    const totalCount = quizSummary.length;
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    const prompt = `You are an expert NMDCAT learning coach analyzing a student's quiz performance.
SUBJECT: ${validSubject.toUpperCase()}
Topic: ${topic || 'General'}
Difficulty Mode: ${difficultyMode}
Accuracy: ${accuracy}% (${correctCount}/${totalCount} correct)

Quiz Results:
${JSON.stringify(quizSummary, null, 2)}

Provide comprehensive diagnostic insights in JSON format:
{
  "overallPerformance": "Brief summary of overall performance",
  "strongConcepts": ["List of concepts the student performed well on"],
  "weakConcepts": ["List of concepts the student struggled with"],
  "recurringMistakes": ["List of recurring mistake patterns observed"],
  "misconceptions": ["List of specific misconceptions identified"],
  "difficultyPerformance": "Analysis of performance across difficulty levels",
  "topicWeaknesses": ["List of topic-level weaknesses"],
  "reasoningErrors": ["List of reasoning errors observed"],
  "knowledgeGaps": ["List of knowledge gaps identified"],
  "recommendedRevision": ["List of specific concepts/topics to revise"],
  "recommendedNextDifficulty": "Suggested difficulty for next quiz (NORMAL/ADVANCED/ULTRA_ADVANCED)",
  "recommendedNextTopics": ["List of recommended topics to practice next"]
}
Return ONLY valid JSON.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    const insights = extractJsonFromText(result.text) || {};

    return res.status(200).json({
      success: true,
      insights,
      accuracy,
      correctCount,
      totalCount,
      provider: result.provider,
    });
  } catch (err: any) {
    console.error("[deep-ai-insights error]:", err);
    return res.status(500).json({
      error: "Failed to generate deep AI insights",
      details: err?.message || String(err)
    });
  }
}
