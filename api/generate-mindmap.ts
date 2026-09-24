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
    const { subject, topic, difficultyMode = 'NORMAL' } = req.body || {};

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const validSubject = subject || 'General';

    const prompt = `You are an expert NMDCAT mind map generator.
Generate a structured conceptual mind map for:
SUBJECT: ${validSubject.toUpperCase()}
Topic: ${topic}
Difficulty: ${difficultyMode}

Return ONLY valid JSON with this structure:
{
  "centralConcept": "${topic}",
  "branches": [
    {
      "name": "Subtopic Branch Name",
      "subBranches": [
        {
          "name": "Sub-concept",
          "details": "Key high-yield fact or mechanism",
          "examRelevance": "Why this appears in NMDCAT"
        }
      ]
    }
  ],
  "keyFacts": ["Crucial fact 1", "Crucial fact 2"],
  "misconceptions": ["Common misconception 1"],
  "examTips": ["High-yield exam tip"]
}`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    const rawMindMap = extractJsonFromText(result.text) || {};
    const branches = Array.isArray(rawMindMap)
      ? rawMindMap
      : (rawMindMap.branches || rawMindMap.nodes || rawMindMap.subtopics || []);

    const normalizedMindMap = {
      centralConcept: rawMindMap.centralConcept || topic,
      branches: Array.isArray(branches) ? branches : [],
      keyFacts: rawMindMap.keyFacts || [],
      misconceptions: rawMindMap.misconceptions || [],
      examTips: rawMindMap.examTips || [],
    };

    return res.status(200).json({
      success: true,
      mindMap: normalizedMindMap,
      provider: result.provider,
    });
  } catch (err: any) {
    console.error("[generate-mindmap error]:", err);
    return res.status(500).json({
      error: "Failed to generate mind map",
      details: err?.message || String(err)
    });
  }
}
