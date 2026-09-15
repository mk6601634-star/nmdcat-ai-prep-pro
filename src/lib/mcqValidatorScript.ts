import { MCQQuestion } from '../types';
import { aiFetch, getAiFriendlyMessage, isAiRequestCancelled } from './aiRequest';

export interface SuggestedCorrection {
  correctedIndex?: number;
  suggestedQuestion?: string;
  suggestedOptions?: string[];
  suggestedExplanation?: string;
  correctionReason?: string;
}

export interface ValidationItemResult {
  questionId: string;
  status: 'VALID' | 'NEEDS_CORRECTION' | 'AMBIGUOUS';
  accuracyScore: number;
  verifiedSource: string;
  issuesFound: string;
  suggestedCorrection?: SuggestedCorrection;
}

export interface ValidationReport {
  totalAudited: number;
  validCount: number;
  flaggedCount: number;
  accuracyPercentage: number;
  summaryNotes: string;
  results: ValidationItemResult[];
}

/**
 * Perform local heuristic structural sanity checks on questions before AI cross-referencing
 */
export function runLocalSanityCheck(questions: MCQQuestion[]): ValidationItemResult[] {
  const localResults: ValidationItemResult[] = [];

  questions.forEach((q) => {
    const issues: string[] = [];
    let status: 'VALID' | 'NEEDS_CORRECTION' | 'AMBIGUOUS' = 'VALID';

    // 1. Out of bounds index
    if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      issues.push(`Invalid correctIndex (${q.correctIndex}) for ${q.options.length} options.`);
      status = 'NEEDS_CORRECTION';
    }

    // 2. Duplicate choices
    const uniqueOptions = new Set(q.options.map((o) => o.trim().toLowerCase()));
    if (uniqueOptions.size < q.options.length) {
      issues.push('Duplicate option choices detected.');
      status = 'AMBIGUOUS';
    }

    // 3. Short / Missing explanation
    if (!q.explanation || q.explanation.trim().length < 10) {
      issues.push('Explanation is too brief or missing.');
      if (status === 'VALID') status = 'NEEDS_CORRECTION';
    }

    if (issues.length > 0) {
      localResults.push({
        questionId: q.id,
        status,
        accuracyScore: status === 'VALID' ? 100 : 60,
        verifiedSource: 'Structural Local Heuristic Check',
        issuesFound: issues.join(' '),
        suggestedCorrection: {
          correctedIndex: q.correctIndex < q.options.length ? q.correctIndex : 0,
          correctionReason: 'Fixed structural issue locally.'
        }
      });
    }
  });

  return localResults;
}

/**
 * Execute automated cross-reference validation script against Gemini & PMDC Textbooks
 */
export async function runAutomatedQuestionBankValidation(
  questions: MCQQuestion[],
  signal?: AbortSignal
): Promise<ValidationReport> {
  if (!questions || questions.length === 0) {
    return {
      totalAudited: 0,
      validCount: 0,
      flaggedCount: 0,
      accuracyPercentage: 100,
      summaryNotes: 'No questions provided for validation.',
      results: []
    };
  }

  try {
    const data = await aiFetch<ValidationReport>('/api/validate-question-bank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions })
    }, { signal });
    return data;
  } catch (err: any) {
    if (isAiRequestCancelled(err)) {
      throw err;
    }

    const message = getAiFriendlyMessage(err);
    console.error('Validation Script Call Failed:', message, err);
    // Fallback: Return local sanity check results if server API fails
    const local = runLocalSanityCheck(questions);
    return {
      totalAudited: questions.length,
      validCount: questions.length - local.length,
      flaggedCount: local.length,
      accuracyPercentage: Math.round(((questions.length - local.length) / questions.length) * 100),
      summaryNotes: 'Local fallback heuristic audit performed (Server connection issue).',
      results: local
    };
  }
}

/**
 * Apply suggested correction directly to an MCQ
 */
export function applyCorrectionToMcq(mcq: MCQQuestion, correction?: SuggestedCorrection): MCQQuestion {
  if (!correction) return mcq;

  return {
    ...mcq,
    question: correction.suggestedQuestion || mcq.question,
    options: correction.suggestedOptions && correction.suggestedOptions.length === 4
      ? (correction.suggestedOptions as [string, string, string, string])
      : mcq.options,
    correctIndex: typeof correction.correctedIndex === 'number' ? correction.correctedIndex : mcq.correctIndex,
    explanation: correction.suggestedExplanation
      ? `${correction.suggestedExplanation} [Auto-corrected via Gemini Validation Script]`
      : mcq.explanation
  };
}
