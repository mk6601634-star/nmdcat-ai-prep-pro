<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/d09825a3-c9ca-4d98-9ba7-e45d01987c81

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Configure the Gemini API credentials in `.env.local` or `.env`:
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL="gemini-2.5-flash"`
3. Run the app:
   `npm run dev`

### Gemini Configuration
- SDK Library: `@google/genai` (Official Google Gen AI SDK)
- Model Name: `gemini-2.5-flash`
- Environment Variable Name: `GEMINI_API_KEY`
- Server Implementation: handled securely server-side in `server.ts` to protect your secret key.
- AI features powered by Gemini in this app:
  - AI Medical Tutor & Doubt Resolver (`/api/ai/chat`)
  - Automated MCQ & Material Generator/Extractor (`/api/ai/extract-material`)
  - Diagnostic Test Generator (`/api/ai/generate-diagnostic`)
  - Concept Explanations & Mnemonics Generator (`/api/ai/explain`)
