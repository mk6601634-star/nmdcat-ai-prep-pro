export default async function handler(req: any, res: any) {
  const steps: Record<string, any> = {};

  try {
    steps["dotenv"] = "testing...";
    const dotenv = await import("dotenv");
    steps["dotenv"] = "ok";

    steps["@google/genai"] = "testing...";
    const genai = await import("@google/genai");
    steps["@google/genai"] = "ok";

    steps["server/aiTypes"] = "testing...";
    const aiTypes = await import("../server/aiTypes");
    steps["server/aiTypes"] = "ok";

    steps["server/aiProviders"] = "testing...";
    const aiProviders = await import("../server/aiProviders");
    steps["server/aiProviders"] = "ok";

    steps["server/aiModelRegistry"] = "testing...";
    const aiModelRegistry = await import("../server/aiModelRegistry");
    steps["server/aiModelRegistry"] = "ok";

    steps["server/aiProviderRouter"] = "testing...";
    const aiProviderRouter = await import("../server/aiProviderRouter");
    steps["server/aiProviderRouter"] = "ok";

    steps["prismSuperlativeValidator"] = "testing...";
    const prismValidator = await import("../src/components/prism/prismSuperlativeValidator");
    steps["prismSuperlativeValidator"] = "ok";

    steps["app"] = "testing...";
    const appModule = await import("../app");
    steps["app"] = "ok";
    steps["app_keys"] = Object.keys(appModule);

    res.status(200).json({
      status: "success",
      steps,
      env: {
        GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
        GROQ_API_KEY: !!process.env.GROQ_API_KEY,
        CEREBRAS_API_KEY: !!process.env.CEREBRAS_API_KEY,
        DEEPSEEK_API_KEY: !!process.env.DEEPSEEK_API_KEY,
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || null
      }
    });
  } catch (err: any) {
    res.status(500).json({
      status: "error",
      steps,
      failedAt: Object.keys(steps).pop(),
      errorName: err?.name,
      errorMessage: err?.message,
      errorStack: err?.stack
    });
  }
}
