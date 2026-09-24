export default async function handler(req, res) {
  const logs = [];
  try {
    logs.push("Handler started");
    logs.push(`Method: ${req.method}`);
    logs.push(`GEMINI_API_KEY present: ${!!process.env.GEMINI_API_KEY}`);
    logs.push(`FALLBACK_API_KEY present: ${!!(process.env.FALLBACK_API_KEY || process.env.GROQ_API_KEY)}`);

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      logs.push("Testing Gemini fetch...");
      const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Ping: reply with pong" }] }]
        })
      });
      logs.push(`Gemini HTTP status: ${gRes.status}`);
      const gData = await gRes.json();
      logs.push(`Gemini response: ${JSON.stringify(gData).slice(0, 150)}`);
    }

    const groqKey = process.env.FALLBACK_API_KEY || process.env.GROQ_API_KEY;
    if (groqKey) {
      logs.push("Testing Groq fetch...");
      const qRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: [{ role: "user", content: "Ping: reply with pong" }],
          max_tokens: 20
        })
      });
      logs.push(`Groq HTTP status: ${qRes.status}`);
      const qData = await qRes.json();
      logs.push(`Groq response: ${JSON.stringify(qData).slice(0, 150)}`);
    }

    return res.status(200).json({
      success: true,
      logs
    });
  } catch (err) {
    return res.status(200).json({
      success: false,
      caughtError: err?.message,
      stack: err?.stack,
      logs
    });
  }
}
