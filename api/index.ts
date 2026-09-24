export default async function handler(req: any, res: any) {
  try {
    const appModule = await import("../app.ts");
    const app = appModule.default || appModule.app || appModule;
    return app(req, res);
  } catch (err: any) {
    console.error("[Vercel Handler Error]:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      error: "Vercel Serverless Function Boot Error",
      message: err?.message || String(err),
      stack: err?.stack || null
    }));
  }
}
