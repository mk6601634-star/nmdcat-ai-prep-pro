import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config({ path: '.env.local' });

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const main = async () => {
  try {
    const result = await client.models.list();
    if (result?.pageInternal) {
      for (const model of result.pageInternal) {
        console.log(`${model.name} | ${model.displayName} | ${model.supportedActions?.join(', ')}`);
      }
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('Failed to list models', error);
    process.exit(1);
  }
};

main();
