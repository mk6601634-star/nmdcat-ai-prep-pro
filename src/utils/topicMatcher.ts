import { MCQQuestion, SubjectType } from '../types';

/**
 * Tokenize string removing punctuation, special characters, and common stop words
 */
export function tokenizeText(str?: string): string[] {
  return (str || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['and', 'the', 'for', 'with', 'from', 'into', 'unit', 'chapter', 'topic'].includes(w));
}

/**
 * Calculate token overlap score between query string and target text (0 to 1)
 */
export function calculateTokenScore(queryStr?: string, targetStr?: string): number {
  const qTokens = tokenizeText(queryStr);
  const tTokens = tokenizeText(targetStr);
  if (qTokens.length === 0 || tTokens.length === 0) return 0;
  
  let matches = 0;
  for (const q of qTokens) {
    if (tTokens.some(t => t === q || t.includes(q) || q.includes(t))) {
      matches++;
    }
  }
  return matches / qTokens.length;
}

/**
 * Score how well an MCQ matches a given subject, chapter, and topic.
 */
export function scoreMcqMatch(
  q: MCQQuestion,
  subject?: string,
  chapter?: string,
  topic?: string
): number {
  const normSub = (subject || '').toLowerCase().trim();
  const qSub = (q.subject || '').toLowerCase().trim();
  if (normSub && qSub !== normSub) return 0;

  let score = 0;

  if (topic) {
    const tScore = Math.max(
      calculateTokenScore(topic, q.topic),
      calculateTokenScore(topic, q.chapter),
      calculateTokenScore(topic, q.question)
    );
    if (tScore >= 0.25) score += tScore * 3;
  }

  if (chapter) {
    const cScore = Math.max(
      calculateTokenScore(chapter, q.chapter),
      calculateTokenScore(chapter, q.topic),
      calculateTokenScore(chapter, q.question)
    );
    if (cScore >= 0.25) score += cScore * 2;
  }

  // Base score for matching subject
  if (normSub && qSub === normSub) {
    score += 0.5;
  }

  return score;
}

/**
 * Filter and sort question bank for matching questions with automatic fallback.
 */
export function matchQuestionsFromBank(
  questionBank: MCQQuestion[],
  options: {
    subject?: string;
    chapter?: string;
    topic?: string;
    difficulty?: string;
    limit?: number;
  }
): MCQQuestion[] {
  if (!questionBank || questionBank.length === 0) return [];

  const { subject, chapter, topic, difficulty, limit } = options;

  // 1. Score each question
  const scored = questionBank
    .map(q => ({ q, score: scoreMcqMatch(q, subject, chapter, topic) }))
    .filter(item => item.score > 0.5)
    .sort((a, b) => b.score - a.score);

  let results = scored.map(item => item.q);

  // 2. Fallback to subject pool if specific chapter/topic score returned too few
  if (results.length === 0 && subject) {
    const normSub = subject.toLowerCase().trim();
    results = questionBank.filter(q => (q.subject || '').toLowerCase().trim() === normSub);
  }

  // 3. Apply difficulty filter if specified and enough questions remain
  if (difficulty && difficulty !== 'Any' && difficulty !== 'Mixed') {
    const diffFiltered = results.filter(
      q => (q.difficulty || '').toLowerCase() === difficulty.toLowerCase()
    );
    if (diffFiltered.length >= 3) {
      results = diffFiltered;
    }
  }

  if (limit && limit > 0) {
    results = results.slice(0, limit);
  }

  return results;
}
