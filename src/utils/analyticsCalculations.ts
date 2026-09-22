import NMDCAT_CONFIG from '../constants/nmdcatConfig';
import { ExamAttempt, SyllabusTopic, SubjectType, SavedMistake } from '../types';

export interface OverallAccuracyResult {
  totalSolved: number;
  totalCorrect: number;
  totalIncorrect: number;
  accuracyPercentage: number;
  formattedAccuracy: string;
  hasData: boolean;
}

export interface EstimatedScoreResult {
  estimatedScore: number | null;
  totalMarks: number;
  confidenceLevel: 'insufficient' | 'preliminary' | 'moderate' | 'high';
  attemptsCount: number;
  hasSufficientData: boolean;
  explanation: string;
}

export interface SyllabusCoverageResult {
  totalTopics: number;
  revisedCount: number;
  mcqsDoneCount: number;
  readingCount: number;
  notStartedCount: number;
  revisedPercentage: number;
  activeCoveragePercentage: number; // revised + mcqs-done
  totalSessionsCount: number;
}

export interface SubjectStatItem {
  subject: SubjectType;
  solved: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  formattedAccuracy: string;
  speedSec: number;
  target: number;
  hasData: boolean;
}

export interface ReadinessScoreResult {
  readinessScore: number;
  retentionIndex: number;
  avgSolvingSpeedSec: number;
  hasData: boolean;
}

export const ALL_SUBJECTS: SubjectType[] = [
  'Biology',
  'Chemistry',
  'Physics',
  'English',
  'Logical Reasoning'
];

/**
 * 1. Overall MCQ Accuracy Calculation
 * Computes exact sum of correct answers divided by total questions attempted.
 */
export function calculateOverallAccuracy(examHistory: ExamAttempt[] = []): OverallAccuracyResult {
  if (!examHistory || examHistory.length === 0) {
    return {
      totalSolved: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      accuracyPercentage: 0,
      formattedAccuracy: '0%',
      hasData: false
    };
  }

  const totalSolved = examHistory.reduce((acc, cur) => acc + (cur.totalQuestions || 0), 0);
  const totalCorrect = examHistory.reduce((acc, cur) => acc + (cur.score || 0), 0);
  const totalIncorrect = Math.max(0, totalSolved - totalCorrect);

  if (totalSolved <= 0) {
    return {
      totalSolved: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      accuracyPercentage: 0,
      formattedAccuracy: '0%',
      hasData: false
    };
  }

  const rawAccuracy = (totalCorrect / totalSolved) * 100;
  // Format to 1 decimal place if not a whole number (e.g. 26.25% -> 26.3% or 26.25%)
  const roundedAccuracy = Math.round(rawAccuracy * 10) / 10;
  const formattedAccuracy = Number.isInteger(roundedAccuracy)
    ? `${roundedAccuracy}%`
    : `${roundedAccuracy.toFixed(1)}%`;

  return {
    totalSolved,
    totalCorrect,
    totalIncorrect,
    accuracyPercentage: roundedAccuracy,
    formattedAccuracy,
    hasData: true
  };
}

/**
 * 2. Estimated NMDCAT Score Calculation
 * Calculates truthful extrapolation from practice performance scaled to total NMDCAT marks (180).
 * Exposes data confidence and sample size.
 */
export function calculateEstimatedScore(
  examHistory: ExamAttempt[] = [],
  totalMarks = NMDCAT_CONFIG.TOTAL_MCQS || 180
): EstimatedScoreResult {
  const accuracy = calculateOverallAccuracy(examHistory);
  const attemptsCount = examHistory ? examHistory.length : 0;

  if (!accuracy.hasData || accuracy.totalSolved === 0) {
    return {
      estimatedScore: null,
      totalMarks,
      confidenceLevel: 'insufficient',
      attemptsCount: 0,
      hasSufficientData: false,
      explanation: 'No test attempts recorded yet'
    };
  }

  // Linear scaling: (accuracy / 100) * totalMarks
  const rawScore = (accuracy.totalCorrect / accuracy.totalSolved) * totalMarks;
  const estimatedScore = Math.min(totalMarks, Math.max(0, Math.round(rawScore)));

  // Confidence grading based on question volume and attempt count
  let confidenceLevel: 'insufficient' | 'preliminary' | 'moderate' | 'high' = 'preliminary';
  let explanation = `Linear estimate based on ${accuracy.totalSolved} questions across ${attemptsCount} attempts`;

  if (accuracy.totalSolved < 30) {
    confidenceLevel = 'preliminary';
    explanation = `Preliminary estimate (${accuracy.totalSolved} questions solved)`;
  } else if (accuracy.totalSolved < 100 || attemptsCount < 5) {
    confidenceLevel = 'moderate';
    explanation = `Moderate confidence based on ${accuracy.totalSolved} questions`;
  } else {
    confidenceLevel = 'high';
    explanation = `High confidence based on ${accuracy.totalSolved} questions across ${attemptsCount} attempts`;
  }

  return {
    estimatedScore,
    totalMarks,
    confidenceLevel,
    attemptsCount,
    hasSufficientData: true,
    explanation
  };
}

/**
 * 3. Syllabus Coverage Calculation
 * Uses the genuine SyllabusTopic[] data model rather than fake session counts.
 */
export function calculateSyllabusCoverage(
  topics: SyllabusTopic[] = [],
  examHistory: ExamAttempt[] = []
): SyllabusCoverageResult {
  const totalSessionsCount = examHistory ? examHistory.length : 0;

  if (!topics || topics.length === 0) {
    return {
      totalTopics: 0,
      revisedCount: 0,
      mcqsDoneCount: 0,
      readingCount: 0,
      notStartedCount: 0,
      revisedPercentage: 0,
      activeCoveragePercentage: 0,
      totalSessionsCount
    };
  }

  const totalTopics = topics.length;
  const revisedCount = topics.filter(t => t.status === 'revised').length;
  const mcqsDoneCount = topics.filter(t => t.status === 'mcqs-done').length;
  const readingCount = topics.filter(t => t.status === 'reading').length;
  const notStartedCount = topics.filter(t => !t.status || t.status === 'not-started').length;

  const revisedPercentage = totalTopics > 0 ? Math.round((revisedCount / totalTopics) * 100) : 0;
  const activeCoveragePercentage = totalTopics > 0 ? Math.round(((revisedCount + mcqsDoneCount) / totalTopics) * 100) : 0;

  return {
    totalTopics,
    revisedCount,
    mcqsDoneCount,
    readingCount,
    notStartedCount,
    revisedPercentage,
    activeCoveragePercentage,
    totalSessionsCount
  };
}

/**
 * 4. Subject Analytics Matrix
 * Aggregates both single-subject attempts (attempt.subject) and multi-subject attempts (attempt.subjectBreakdown).
 * Unknown subjects are never defaulted to Biology.
 */
export function calculateSubjectAnalytics(
  examHistory: ExamAttempt[] = []
): Record<SubjectType, SubjectStatItem> {
  const result: Record<SubjectType, SubjectStatItem> = {
    'Biology': { subject: 'Biology', solved: 0, correct: 0, incorrect: 0, accuracy: 0, formattedAccuracy: '0%', speedSec: 0, target: 85, hasData: false },
    'Chemistry': { subject: 'Chemistry', solved: 0, correct: 0, incorrect: 0, accuracy: 0, formattedAccuracy: '0%', speedSec: 0, target: 85, hasData: false },
    'Physics': { subject: 'Physics', solved: 0, correct: 0, incorrect: 0, accuracy: 0, formattedAccuracy: '0%', speedSec: 0, target: 85, hasData: false },
    'English': { subject: 'English', solved: 0, correct: 0, incorrect: 0, accuracy: 0, formattedAccuracy: '0%', speedSec: 0, target: 85, hasData: false },
    'Logical Reasoning': { subject: 'Logical Reasoning', solved: 0, correct: 0, incorrect: 0, accuracy: 0, formattedAccuracy: '0%', speedSec: 0, target: 85, hasData: false }
  };

  const subjectTimeSums: Record<SubjectType, number> = {
    'Biology': 0,
    'Chemistry': 0,
    'Physics': 0,
    'English': 0,
    'Logical Reasoning': 0
  };

  if (!examHistory || examHistory.length === 0) {
    return result;
  }

  examHistory.forEach(attempt => {
    // Case 1: Multi-subject breakdown exists in attempt
    if (attempt.subjectBreakdown && typeof attempt.subjectBreakdown === 'object') {
      ALL_SUBJECTS.forEach(sub => {
        const stats = attempt.subjectBreakdown?.[sub];
        if (stats && typeof stats.total === 'number' && stats.total > 0) {
          result[sub].solved += stats.total;
          result[sub].correct += (stats.correct || 0);
          result[sub].incorrect += (stats.incorrect || 0);
        }
      });
    } 
    // Case 2: Root subject is defined on a single-subject attempt
    else if (attempt.subject && ALL_SUBJECTS.includes(attempt.subject)) {
      const sub = attempt.subject;
      const solved = attempt.totalQuestions || 0;
      const correct = attempt.score || 0;
      const timeSpent = attempt.timeSpentSeconds || 0;

      result[sub].solved += solved;
      result[sub].correct += correct;
      result[sub].incorrect += Math.max(0, solved - correct);
      if (timeSpent > 0) {
        subjectTimeSums[sub] += timeSpent;
      }
    }
  });

  // Calculate final subject accuracies and speeds
  ALL_SUBJECTS.forEach(sub => {
    const item = result[sub];
    if (item.solved > 0) {
      item.hasData = true;
      const rawAcc = (item.correct / item.solved) * 100;
      item.accuracy = Math.round(rawAcc * 10) / 10;
      item.formattedAccuracy = Number.isInteger(item.accuracy)
        ? `${item.accuracy}%`
        : `${item.accuracy.toFixed(1)}%`;
      const timeSum = subjectTimeSums[sub];
      item.speedSec = timeSum > 0 ? Math.round(timeSum / item.solved) : 0;
    }
  });

  return result;
}

/**
 * 5. Readiness & Retention Index Calculation
 */
export function calculateReadinessScore(
  examHistory: ExamAttempt[] = [],
  savedMistakes: SavedMistake[] = []
): ReadinessScoreResult {
  const accuracyResult = calculateOverallAccuracy(examHistory);
  if (!accuracyResult.hasData || accuracyResult.totalSolved === 0) {
    return {
      readinessScore: 0,
      retentionIndex: 0,
      avgSolvingSpeedSec: 0,
      hasData: false
    };
  }

  const totalSolved = accuracyResult.totalSolved;
  const overallAcc = accuracyResult.accuracyPercentage;
  const mistakePenalty = Math.min(15, (savedMistakes ? savedMistakes.length : 0) * 0.5);
  const volumeBonus = Math.min(10, totalSolved / 50);

  const readinessScore = parseFloat(
    Math.min(99.8, Math.max(10, overallAcc * 0.95 + volumeBonus - mistakePenalty)).toFixed(1)
  );

  const retentionIndex = parseFloat(
    Math.min(98, Math.max(40, overallAcc * 0.98 + (savedMistakes.length < 5 ? 5 : -2))).toFixed(1)
  );

  const totalTimeSec = examHistory.reduce((acc, cur) => acc + (cur.timeSpentSeconds || 0), 0);
  const avgSolvingSpeedSec = totalSolved > 0 ? Math.round(totalTimeSec / totalSolved) : 0;

  return {
    readinessScore,
    retentionIndex,
    avgSolvingSpeedSec,
    hasData: true
  };
}
