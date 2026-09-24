export default function handler(req: any, res: any) {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    aiGateway: {
      geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
      fallbackKeyConfigured: !!(process.env.FALLBACK_API_KEY || process.env.GROQ_API_KEY)
    }
  });
}
