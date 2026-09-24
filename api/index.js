import app from '../app.ts';

export default function handler(req, res) {
  // Ensure original request URL is preserved if Vercel rewrite stripped it
  if (req.url === '/api' || req.url === '/api/') {
    const original = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.originalUrl;
    if (original && original !== '/api' && original !== '/api/') {
      req.url = original;
    }
  }
  return app(req, res);
}

