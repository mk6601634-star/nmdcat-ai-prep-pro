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
    const { results, quizSubject, quizTopic } = req.body || {};

    const prompt = `You are the lead academic strategist for NMDCAT medical college preparation in Pakistan.
Analyze this student's completed quiz performance and generate deep actionable insights.

SUBJECT: ${quizSubject || 'General NMDCAT'}
TOPIC: ${quizTopic || 'General'}
RESULTS DATA: ${JSON.stringify(results || [])}

Return ONLY valid JSON with this schema:
{
  "readinessScore": 85,
  "summary": "High-level diagnostic summary of performance",
  "strengths": ["Identified strong areas"],
  "weaknesses": ["Key high-priority gaps"],
  "recommendedTopics": ["Next topics to study"],
  "studyTip": "High-impact tactical exam advice"
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
      insights: parsed,
      provider: result.provider
    });
  } catch (err: any) {
    console.error("[deep-ai-insights error]:", err);
    return res.status(500).json({
      error: "Failed to generate deep insights",
      details: err?.message || String(err)
    });
  }
}
