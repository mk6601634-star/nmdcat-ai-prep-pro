// api/health.ts
function handler(req, res) {
  res.status(200).json({
    status: "ok",
    version: "v2.5.1-tutor-fix",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    aiGateway: {
      geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
      fallbackKeyConfigured: !!(process.env.FALLBACK_API_KEY || process.env.GROQ_API_KEY)
    }
  });
}
export {
  handler as default
};
