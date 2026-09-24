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
    const { imageBase64, mimeType = 'image/jpeg', userPrompt = '', subject = 'Biology' } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data (imageBase64) is required' });
    }

    const prompt = `You are an expert NMDCAT Medical Entrance Exam instructor and image diagnostic solver.
Analyze the provided medical / NMDCAT exam question or diagram image carefully.

SUBJECT: ${subject}
${userPrompt ? `STUDENT QUERY: "${userPrompt}"` : ''}

INSTRUCTIONS:
1. Transcribe or clearly state the question/diagram shown in the image.
2. Identify the correct answer option (if it's an MCQ) with a clear, step-by-step scientific rationale.
3. Highlight high-yield PMDC NMDCAT concepts, formulas, and common exam traps related to this problem.
4. Use clear formatting, bullet points, and KaTeX notation where applicable.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.4,
      maxTokens: 3000,
      task: 'explain',
      imageBase64,
      mimeType
    });

    const responseText = result.text || 'I could not process the diagram. Please ensure the image is clear and try again.';

    return res.status(200).json({
      success: true,
      text: responseText,
      reply: responseText,
      explanation: responseText,
      provider: result.provider
    });
  } catch (err: any) {
    console.error('[image-doubt-solver error]:', err);
    return res.status(500).json({
      error: 'Failed to solve image doubt',
      details: err?.message || String(err)
    });
  }
}
