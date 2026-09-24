export default async function handler(req: any, res: any) {
  const steps: Record<string, any> = {};

  const modules = [
    { name: "dotenv", path: "dotenv" },
    { name: "@google/genai", path: "@google/genai" },
    { name: "express", path: "express" },
    { name: "server/aiTypes", path: "./server/aiTypes" },
    { name: "server/aiProviders", path: "./server/aiProviders" },
    { name: "server/aiModelRegistry", path: "./server/aiModelRegistry" },
    { name: "server/aiProviderRouter", path: "./server/aiProviderRouter" },
    { name: "server/prismTypes", path: "./server/prismTypes" },
    { name: "server/prismSuperlativeValidator", path: "./server/prismSuperlativeValidator" },
    { name: "api/app", path: "./app" }
  ];

  for (const mod of modules) {
    try {
      steps[mod.name] = "importing...";
      const loaded = await import(mod.path);
      steps[mod.name] = { ok: true, keys: Object.keys(loaded).slice(0, 5) };
    } catch (err: any) {
      steps[mod.name] = { ok: false, error: err?.message || String(err), stack: err?.stack };
      // Stop on first failure to return structured diagnostics
      return res.status(200).json({
        diagnostics: "FAILED_STEP",
        failedModule: mod.name,
        steps,
        nodeVersion: process.version,
        env: {
          GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
          GROQ_API_KEY: !!process.env.GROQ_API_KEY,
          CEREBRAS_API_KEY: !!process.env.CEREBRAS_API_KEY,
          DEEPSEEK_API_KEY: !!process.env.DEEPSEEK_API_KEY,
          OPENAI_API_KEY: !!process.env.OPENAI_API_KEY
        }
      });
    }
  }

  res.status(200).json({
    diagnostics: "ALL_OK",
    steps,
    nodeVersion: process.version,
    env: {
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      GROQ_API_KEY: !!process.env.GROQ_API_KEY,
      CEREBRAS_API_KEY: !!process.env.CEREBRAS_API_KEY,
      DEEPSEEK_API_KEY: !!process.env.DEEPSEEK_API_KEY,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY
    }
  });
}
