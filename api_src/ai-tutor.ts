import { callWithFallback } from '../api/_lib/aiProviderRouter';
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
    const { messages, context } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const lastMessage = messages[messages.length - 1]?.content || '';
    const history = messages.slice(0, -1).map((m: any) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n');

    const prompt = `You are an empathetic, highly knowledgeable NMDCAT AI Tutor specializing in Biology, Chemistry, Physics, and English for medical entrance exams in Pakistan.

${context ? `CONTEXT/SUBJECT: ${context}\n` : ''}
${history ? `CONVERSATION HISTORY:\n${history}\n` : ''}

STUDENT QUESTION:
${lastMessage}

INSTRUCTIONS:
1. Explain clearly with conceptual depth and NMDCAT relevance.
2. Use clear formatting, bullet points, and memory hooks where helpful.
3. Be encouraging, concise, and scientifically accurate.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
    });

    return res.status(200).json({
      success: true,
      reply: result.text,
      provider: result.provider
    });
  } catch (err: any) {
    console.error("[ai-tutor error]:", err);
    return res.status(500).json({
      error: "Failed to get AI Tutor response",
      details: err?.message || String(err)
    });
  }
}
