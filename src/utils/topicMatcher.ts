import { MCQQuestion, SubjectType } from '../types';
import { toCanonicalSubjectId, assertSubjectIntegrity } from './subjectTaxonomy';
import { filterCanonicalMCQs } from '../lib/mcqRetrievalService';

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
 * HARD INVARIANT: If subject is specified and does not match, score is strictly 0.
 */
export function scoreMcqMatch(
  q: MCQQuestion,
  subject?: string,
  chapter?: string,
  topic?: string
): number {
  if (subject && !assertSubjectIntegrity(q.subject, subject)) {
    return 0; // STRICT REJECT: Foreign subject
  }

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
  if (subject && assertSubjectIntegrity(q.subject, subject)) {
    score += 0.5;
  }

  return score;
}

/**
 * Filter and sort question bank for matching questions using Canonical MCQ Retrieval Engine.
 * STRICT INVARIANT: All returned questions MUST match the requested subject and topic with ZERO fallback.
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

  const result = filterCanonicalMCQs(questionBank, {
    subjectId: subject,
    chapterId: chapter,
    topicId: topic,
    difficulty: difficulty === 'Any' || difficulty === 'Mixed' ? undefined : difficulty,
    count: limit || 50,
    allowShuffle: false
  });

  return result.questions;
}
