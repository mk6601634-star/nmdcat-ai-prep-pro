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
    const {
      question,
      subject = 'Biology',
      mode = 'standard',
      context = '',
      messages = [],
      masteryState
    } = req.body || {};

    let studentQuery = typeof question === 'string' && question.trim() ? question.trim() : '';

    if (!studentQuery && Array.isArray(messages) && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      studentQuery = lastMsg?.text || lastMsg?.content || '';
    }

    if (!studentQuery) {
      return res.status(400).json({ error: 'A question or message is required' });
    }

    let dialogueHistory = '';
    if (Array.isArray(messages) && messages.length > 1) {
      dialogueHistory = messages
        .slice(-6, -1)
        .map((m: any) => {
          const sender = (m.sender === 'user' || m.role === 'user') ? 'Student' : 'Tutor';
          const text = m.text || m.content || '';
          return `${sender}: ${text}`;
        })
        .filter(Boolean)
        .join('\n');
    }

    let modeInstructions = '';
    switch (mode) {
      case 'socratic':
        modeInstructions = `PEDAGOGICAL MODE: SOCRATIC METHOD
- Guide the student by asking 1-2 sharp, thoughtful leading questions that trigger their own deduction.
- Don't just lecture the entire answer immediately; prompt them to connect prerequisite concepts to solve it.`;
        break;
      case 'stepByStep':
        modeInstructions = `PEDAGOGICAL MODE: STEP-BY-STEP BREAKDOWN
- Structure the explanation as a clear, numbered sequence (Step 1, Step 2, Step 3...).
- Break complex physiological pathways, chemical mechanisms, or physics derivations into bite-sized logical stages.`;
        break;
      case 'analogy':
        modeInstructions = `PEDAGOGICAL MODE: INTUITIVE ANALOGIES
- Anchor the explanation around a memorable, intuitive real-world or everyday physical analogy (e.g. factory assembly lines, electrical circuits, architectural structures).
- Then explicitly map the analogy components directly back to the scientific NMDCAT concept.`;
        break;
      case 'mastery':
        modeInstructions = `PEDAGOGICAL MODE: TEACH UNTIL MASTERY
- Deliver a thorough breakdown highlighting high-yield PMDC NMDCAT exam traps, common distractors, and subtle exceptions.
- End with a quick 1-question check-for-understanding MCQ or quick challenge to test their mastery.`;
        break;
      case 'standard':
      default:
        modeInstructions = `PEDAGOGICAL MODE: STANDARD DIRECT TUTORING
- Deliver a crystal-clear, structured, high-yield explanation tailored specifically for PMDC NMDCAT exam standards.
- Highlight key definitions, core mechanisms, formulas, and high-frequency exam points using clean formatting and bold highlights.`;
        break;
    }

    const prompt = `You are an elite, encouraging NMDCAT Medical Tutor for Pakistani medical college entrance aspirants.

SUBJECT: ${subject.toUpperCase()}
${modeInstructions}
${context ? `ADDITIONAL CONTEXT:\n${context}\n` : ''}
${dialogueHistory ? `RECENT CONVERSATION HISTORY:\n${dialogueHistory}\n` : ''}

STUDENT QUERY:
"${studentQuery}"

GUIDELINES:
1. Provide scientifically rigorous, curriculum-aligned explanations adhering to PMDC (Pakistan Medical & Dental Council) / UHS / NUMS / SZABMU standards.
2. Use clear formatting, bullet points, and KaTeX notation for math/chemistry equations where helpful (e.g. $E=mc^2$ or $\\text{H}_2\\text{O}$).
3. Be warm, supportive, and focused on building true conceptual mastery.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
    });

    const responseText = result.text || 'I could not generate an answer for that query. Please try asking again.';

    return res.status(200).json({
      success: true,
      text: responseText,
      reply: responseText,
      answer: responseText,
      modeUsed: mode,
      provider: result.provider
    });
  } catch (err: any) {
    console.error('[ai-tutor error]:', err);
    return res.status(500).json({
      error: 'Failed to get AI Tutor response',
      details: err?.message || String(err)
    });
  }
}
