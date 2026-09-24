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
    const { topic, subject = 'Biology' } = req.body || {};

    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const prompt = `You are an expert NMDCAT curriculum mind map generator.
Create a comprehensive hierarchical conceptual mind map for:
SUBJECT: ${subject}
TOPIC: ${topic}

Return ONLY valid JSON with this exact schema:
{
  "id": "root",
  "title": "${topic}",
  "nodes": [
    {
      "id": "node_1",
      "label": "Key Concept 1",
      "description": "Brief explanation",
      "children": [
        {
          "id": "node_1_1",
          "label": "Sub-concept",
          "description": "Details"
        }
      ]
    }
  ]
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
      data: parsed || { id: "root", title: topic, nodes: [] },
      provider: result.provider
    });
  } catch (err: any) {
    console.error("[generate-mindmap error]:", err);
    return res.status(500).json({
      error: "Failed to generate mind map",
      details: err?.message || String(err)
    });
  }
}
