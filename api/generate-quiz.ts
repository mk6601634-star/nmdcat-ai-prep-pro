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
    const { 
      subject = 'Biology', 
      chapter = 'General', 
      topic = 'General', 
      difficulty = 'Medium',
      cognitiveLevel = 'Application',
      generationMode = 'SIMPLE',
      quantity = 5,
      requestId
    } = req.body || {};

    const actualRequestId = requestId || `gen_${Date.now()}`;
    const count = Math.min(Math.max(Number(quantity) || 5, 1), 50);

    const prompt = `You are an expert Pakistani Medical College Admission Test (NMDCAT) question developer.
Generate ${count} authentic, high-quality Multiple Choice Questions with the following specifications:
- Subject: ${subject}
- Chapter/Unit: ${chapter}
- Topic: ${topic}
- Target Difficulty: ${difficulty}
- Cognitive Level: ${cognitiveLevel}
- Generation Mode: ${generationMode}

CRITICAL RULES:
1. Every question MUST have exactly 4 options labeled A, B, C, D.
2. Exactly ONE option must be scientifically correct according to Pakistani PMDC syllabus.
3. Distractors must reflect common student misconceptions.
4. Explanations must be thorough and scientifically sound.

Return ONLY a valid JSON object with this exact structure:
{
  "questions": [
    {
      "question": "Question text here",
      "options": {
        "A": "Option A text",
        "B": "Option B text",
        "C": "Option C text",
        "D": "Option D text"
      },
      "correctAnswer": "A",
      "explanation": "Detailed explanation",
      "difficulty": "${difficulty}",
      "cognitiveLevel": "${cognitiveLevel}",
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
    const rawQuestions = parsed?.questions || (Array.isArray(parsed) ? parsed : []);

    const mappedQuestions = rawQuestions.map((q: any, idx: number) => ({
      id: `${actualRequestId}_q${idx}`,
      subject,
      chapter,
      topic: q.topic || topic,
      question: q.question,
      options: [
        q.options?.A || q.options?.[0] || "A",
        q.options?.B || q.options?.[1] || "B",
        q.options?.C || q.options?.[2] || "C",
        q.options?.D || q.options?.[3] || "D"
      ],
      correctIndex: ['A', 'B', 'C', 'D'].includes(q.correctAnswer) ? ['A', 'B', 'C', 'D'].indexOf(q.correctAnswer) : 0,
      explanation: q.explanation || "Correct as per PMDC standards",
      difficulty: q.difficulty || difficulty,
      cognitiveLevel: q.cognitiveLevel || cognitiveLevel,
      type: 'Standard' as const,
      source: 'AI_GENERATED',
      sourceReference: `Generated for ${topic}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      status: 'AI_GENERATED',
      verificationStatus: 'AI_GENERATED',
      authorType: 'AI',
      generationModel: result.model,
      generationRequestId: actualRequestId
    }));

    return res.status(200).json({
      success: true,
      questions: mappedQuestions,
      items: mappedQuestions,
      metadata: {
        totalGenerated: mappedQuestions.length,
        subject,
        chapter,
        topic,
        difficulty,
        generationMode,
        model: result.model
      }
    });
  } catch (err: any) {
    console.error("[generate-quiz error]:", err);
    return res.status(500).json({
      error: "Failed to generate quiz questions",
      details: err?.message || String(err)
    });
  }
}
