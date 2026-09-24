import { callWithFallback } from './_lib/aiProviderRouter.js';
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
    const { prompt: userPrompt, subject = 'Biology', imageData } = req.body || {};

    if (!userPrompt && !imageData) {
      return res.status(400).json({ error: 'A prompt or image data is required' });
    }

    const options: any = {
      prompt: `You are an expert NMDCAT visual doubt solver for Pakistani medical entrance candidates.
Analyze this student's uploaded diagram, question snapshot, or reaction scheme.

SUBJECT: ${subject.toUpperCase()}
STUDENT QUERY / INSTRUCTIONS:
${userPrompt || 'Analyze this image and explain the key concept and steps.'}

Provide a clear, step-by-step breakdown of the solution, relevant PMDC syllabus principles, and any common mistakes to watch out for.`,
      temperature: 0.5,
      maxTokens: 4096,
    };

    if (imageData && imageData.startsWith('data:image/')) {
      const match = imageData.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        options.image = {
          mimeType: match[1],
          base64Data: match[2]
        };
      }
    }

    const result = await callWithFallback(options);

    return res.status(200).json({
      success: true,
      text: result.text,
      analysis: result.text,
      provider: result.provider
    });
  } catch (err: any) {
    console.error("[image-doubt-solver error]:", err);
    return res.status(500).json({
      error: "Failed to analyze image doubt",
      details: err?.message || String(err)
    });
  }
}
