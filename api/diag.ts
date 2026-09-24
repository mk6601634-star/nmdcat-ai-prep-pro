import { MODEL_REGISTRY } from './server/aiModelRegistry';
import { providersMap } from './server/aiProviders';
import { callWithFallback } from './server/aiProviderRouter';
import app from './app';

export default function handler(req: any, res: any) {
  res.status(200).json({
    status: "ok",
    modelCount: MODEL_REGISTRY.length,
    models: MODEL_REGISTRY.map(m => m.id),
    providers: Object.keys(providersMap),
    appDefined: typeof app === 'function',
    env: {
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      GROQ_API_KEY: !!process.env.GROQ_API_KEY,
      CEREBRAS_API_KEY: !!process.env.CEREBRAS_API_KEY,
      DEEPSEEK_API_KEY: !!process.env.DEEPSEEK_API_KEY,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY
    }
  });
}
