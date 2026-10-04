import { MCQQuestion, SubjectType } from '../types';
import { 
  CanonicalSubjectId, 
  toCanonicalSubjectId, 
  toCanonicalSubjectLabel, 
  assertSubjectIntegrity, 
  CANONICAL_SUBJECTS 
} from '../utils/subjectTaxonomy';
import { db } from './firebase';
import { collection, query, where, getDocs, limit as firestoreLimit } from 'firebase/firestore';
import { adminCollections } from './firestoreService';

export interface MCQRetrievalOptions {
  subject?: SubjectType | CanonicalSubjectId | string;
  subjectId?: CanonicalSubjectId | string;
  selectedSubjects?: (SubjectType | CanonicalSubjectId | string)[];
  chapter?: string;
  chapterId?: string;
  selectedChapters?: string[];
  topic?: string;
  topicId?: string;
  selectedTopics?: string[];
  difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Mixed' | 'Any' | string;
  count?: number;
  sourceType?: 'DATABASE' | 'AI_GENERATED' | 'PAST_PAPER' | 'ALL';
  excludeQuestionIds?: string[];
  questionBank?: MCQQuestion[];
  allowShuffle?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export interface MCQRetrievalResult {
  success: boolean;
  status: 'OK' | 'INSUFFICIENT_QUESTIONS' | 'EMPTY';
  requestedCount: number;
  availableCount: number;
  questions: MCQQuestion[];
  canonicalSubjects: CanonicalSubjectId[];
  warningMessage?: string;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const normalizeText = (s?: string): string => 
  (s || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Extract significant topic keywords (excluding trivial stop words)
 */
export function extractSignificantKeywords(str?: string): string[] {
  return normalizeText(str)
    .split(/\s+/)
    .filter(w => w.length > 2 && !['and', 'the', 'for', 'with', 'from', 'into', 'unit', 'chapter', 'topic', 'structure', 'function', 'general'].includes(w));
}

/**
 * MANDATORY VALIDATION GATE:
 * Validates a single MCQ against the exact requested retrieval context.
 * Enforces zero cross-subject, cross-chapter, or cross-topic contamination.
 */
export function validateMCQForContext(
  q: MCQQuestion,
  context: MCQRetrievalOptions
): ValidationResult {
  if (!q) {
    return { valid: false, reason: 'Question is null or undefined' };
  }

  // 1. Structural integrity
  if (!q.question || typeof q.question !== 'string' || q.question.trim().length === 0) {
    return { valid: false, reason: 'Missing question text' };
  }
  if (!Array.isArray(q.options) || q.options.length < 3) {
    return { valid: false, reason: 'Invalid options: requires at least 3 options' };
  }
  if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
    return { valid: false, reason: 'Invalid correctIndex bounds' };
  }

  // 2. Excluded IDs
  if (Array.isArray(context.excludeQuestionIds) && q.id && context.excludeQuestionIds.includes(q.id)) {
    return { valid: false, reason: 'Question is in excluded list' };
  }

  // 3. Status Check (Student-facing must be published or verified)
  if (q.status && q.status !== 'PUBLISHED' && q.status !== 'VERIFIED' && context.sourceType !== 'AI_GENERATED') {
    return { valid: false, reason: `Unpublished status: ${q.status}` };
  }

  // 4. Canonical Subject Validation (Hard Invariant)
  const qSubId = toCanonicalSubjectId(q.subject);
  if (!qSubId) {
    return { valid: false, reason: `Unrecognized subject: ${q.subject}` };
  }

  const targetSubjectIds = new Set<CanonicalSubjectId>();
  const primarySub = context.subjectId || context.subject;
  if (primarySub) {
    const cid = toCanonicalSubjectId(primarySub);
    if (cid) targetSubjectIds.add(cid);
  }
  if (Array.isArray(context.selectedSubjects)) {
    for (const sub of context.selectedSubjects) {
      const cid = toCanonicalSubjectId(sub);
      if (cid) targetSubjectIds.add(cid);
    }
  }

  if (targetSubjectIds.size > 0 && !targetSubjectIds.has(qSubId)) {
    return { valid: false, reason: `Subject mismatch: question is ${qSubId}, requested ${Array.from(targetSubjectIds).join(',')}` };
  }

  // 5. Chapter Validation
  const targetChapters = new Set<string>();
  if (context.chapterId) targetChapters.add(normalizeText(context.chapterId));
  if (context.chapter) targetChapters.add(normalizeText(context.chapter));
  if (Array.isArray(context.selectedChapters)) {
    context.selectedChapters.forEach(c => targetChapters.add(normalizeText(c)));
  }

  if (targetChapters.size > 0) {
    const qChapNorm = normalizeText(q.chapter);
    const qChapIdNorm = normalizeText(q.chapterId);
    const matchesChap = Array.from(targetChapters).some(c => 
      qChapNorm === c || qChapNorm.includes(c) || c.includes(qChapNorm) ||
      (qChapIdNorm && (qChapIdNorm === c || qChapIdNorm.includes(c) || c.includes(qChapIdNorm)))
    );
    if (!matchesChap) {
      return { valid: false, reason: `Chapter mismatch: question is "${q.chapter}", requested "${Array.from(targetChapters).join(',')}"` };
    }
  }

  // 6. Topic Validation (Hard Invariant: No same-subject fallback permitted)
  const targetTopics = new Set<string>();
  if (context.topicId) targetTopics.add(normalizeText(context.topicId));
  if (context.topic) targetTopics.add(normalizeText(context.topic));
  if (Array.isArray(context.selectedTopics)) {
    context.selectedTopics.forEach(t => targetTopics.add(normalizeText(t)));
  }

  if (targetTopics.size > 0) {
    const qTopNorm = normalizeText(q.topic);
    const qTopIdNorm = normalizeText(q.topicId);
    
    // Check direct normalized match
    let matchesTopic = Array.from(targetTopics).some(t => 
      qTopNorm === t || qTopNorm.includes(t) || t.includes(qTopNorm) ||
      (qTopIdNorm && (qTopIdNorm === t || qTopIdNorm.includes(t) || t.includes(qTopIdNorm)))
    );

    // If no direct topic string match, check significant keyword overlap
    if (!matchesTopic) {
      const topicKws = Array.from(targetTopics).flatMap(t => extractSignificantKeywords(t));
      if (topicKws.length > 0) {
        const qTopKws = extractSignificantKeywords(q.topic);
        const qTextKws = extractSignificantKeywords(q.question);
        matchesTopic = topicKws.some(kw => qTopKws.includes(kw) || qTextKws.includes(kw));
      }
    }

    if (!matchesTopic) {
      return { valid: false, reason: `Topic mismatch: question is "${q.topic}", requested "${Array.from(targetTopics).join(',')}"` };
    }
  }

  // 7. Difficulty Validation
  if (context.difficulty && context.difficulty !== 'Mixed' && context.difficulty !== 'Any') {
    if (q.difficulty && q.difficulty.toLowerCase() !== context.difficulty.toLowerCase()) {
      return { valid: false, reason: `Difficulty mismatch: question is ${q.difficulty}, requested ${context.difficulty}` };
    }
  }

  // 8. Source Type Validation
  if (context.sourceType && context.sourceType !== 'ALL') {
    const isAi = q.source === 'AI_GENERATED' || q.sourceType === 'AI_GENERATED';
    const isPastPaper = q.source === 'PAST_PAPER' || q.sourceType === 'PAST_PAPER' || !!q.pastPaperTag;

    if (context.sourceType === 'DATABASE' && isAi) {
      return { valid: false, reason: 'AI generated question rejected in DATABASE mode' };
    }
    if (context.sourceType === 'AI_GENERATED' && !isAi) {
      return { valid: false, reason: 'Non-AI question rejected in AI_GENERATED mode' };
    }
    if (context.sourceType === 'PAST_PAPER' && !isPastPaper) {
      return { valid: false, reason: 'Non-past-paper question rejected in PAST_PAPER mode' };
    }
  }

  return { valid: true };
}

/**
 * Synchronous pure in-memory canonical MCQ filter.
 * Validates candidate questions, enforces subject/chapter/topic isolation,
 * returns strict results with zero fallback.
 */
export function filterCanonicalMCQs(
  questionBank: MCQQuestion[] = [],
  options: MCQRetrievalOptions
): MCQRetrievalResult {
  const {
    subject,
    subjectId,
    selectedSubjects,
    count = 10,
    allowShuffle = true
  } = options;

  // 1. Resolve target canonical subjects
  const targetSubjectIds = new Set<CanonicalSubjectId>();
  const primarySub = subjectId || subject;
  if (primarySub) {
    const cid = toCanonicalSubjectId(primarySub);
    if (cid) targetSubjectIds.add(cid);
  }
  if (Array.isArray(selectedSubjects) && selectedSubjects.length > 0) {
    for (const sub of selectedSubjects) {
      const cid = toCanonicalSubjectId(sub);
      if (cid) targetSubjectIds.add(cid);
    }
  }
  const targetSubjectList = Array.from(targetSubjectIds);

  const candidateMap = new Map<string, MCQQuestion>();

  // 2. Validate all candidates
  for (const q of questionBank) {
    const validation = validateMCQForContext(q, options);
    if (validation.valid) {
      const qId = q.id || `${toCanonicalSubjectId(q.subject)}_${q.question.slice(0, 40)}`;
      candidateMap.set(qId, q);
    }
  }

  const candidatePool = Array.from(candidateMap.values());
  const availableCount = candidatePool.length;

  if (availableCount === 0) {
    const subjectLabel = targetSubjectList.length > 0 
      ? targetSubjectList.map(id => CANONICAL_SUBJECTS[id].label).join(', ')
      : 'selected context';
    return {
      success: false,
      status: 'EMPTY',
      requestedCount: count,
      availableCount: 0,
      questions: [],
      canonicalSubjects: targetSubjectList,
      warningMessage: `No database questions found matching ${subjectLabel}.`
    };
  }

  const ordered = allowShuffle ? shuffleArray(candidatePool) : candidatePool;
  const finalQuestions = ordered.slice(0, count);

  return {
    success: true,
    status: finalQuestions.length < count ? 'INSUFFICIENT_QUESTIONS' : 'OK',
    requestedCount: count,
    availableCount,
    questions: finalQuestions,
    canonicalSubjects: targetSubjectList,
    warningMessage: finalQuestions.length < count 
      ? `Only ${finalQuestions.length} questions available for this selection (requested ${count}).`
      : undefined
  };
}

/**
 * Single Canonical Database MCQ Retrieval Service.
 * Enforces subject, chapter, and topic invariants with ZERO cross-subject leakage.
 */
export async function getCanonicalMCQs(options: MCQRetrievalOptions): Promise<MCQRetrievalResult> {
  const {
    subject,
    subjectId,
    selectedSubjects,
    count = 10,
    questionBank = [],
    allowShuffle = true
  } = options;

  // 1. First check in-memory pool
  if (Array.isArray(questionBank) && questionBank.length > 0) {
    const inMemResult = filterCanonicalMCQs(questionBank, options);
    if (inMemResult.availableCount >= count) {
      return inMemResult;
    }
  }

  // 2. Resolve target canonical subjects
  const targetSubjectIds = new Set<CanonicalSubjectId>();
  const primarySub = subjectId || subject;
  if (primarySub) {
    const cid = toCanonicalSubjectId(primarySub);
    if (cid) targetSubjectIds.add(cid);
  }
  if (Array.isArray(selectedSubjects) && selectedSubjects.length > 0) {
    for (const sub of selectedSubjects) {
      const cid = toCanonicalSubjectId(sub);
      if (cid) targetSubjectIds.add(cid);
    }
  }
  const targetSubjectList = Array.from(targetSubjectIds);

  const candidateMap = new Map<string, MCQQuestion>();

  // Include in-memory validated items first
  if (Array.isArray(questionBank) && questionBank.length > 0) {
    for (const q of questionBank) {
      const validation = validateMCQForContext(q, options);
      if (validation.valid) {
        const qId = q.id || `${toCanonicalSubjectId(q.subject)}_${q.question.slice(0, 40)}`;
        candidateMap.set(qId, q);
      }
    }
  }

  // 3. Remote Firestore Fetch if local candidate pool is insufficient
  if (candidateMap.size < count) {
    try {
      const collectionRef = collection(db, adminCollections.mcqs);
      const subjectsToQuery = targetSubjectList.length > 0 
        ? targetSubjectList.map(id => CANONICAL_SUBJECTS[id].label)
        : [];

      if (subjectsToQuery.length > 0) {
        for (const subLabel of subjectsToQuery) {
          const qConstraints: any[] = [
            where('status', '==', 'PUBLISHED'),
            where('subject', '==', subLabel)
          ];
          const qDocs = await getDocs(query(collectionRef, ...qConstraints, firestoreLimit(count * 3)));
          
          qDocs.forEach((d) => {
            const data = d.data() as any;
            const item: MCQQuestion = { ...data, id: data.id || d.id };
            const validation = validateMCQForContext(item, options);
            if (validation.valid) {
              const qId = item.id || `${toCanonicalSubjectId(item.subject)}_${item.question.slice(0, 40)}`;
              if (!candidateMap.has(qId)) {
                candidateMap.set(qId, item);
              }
            }
          });
        }
      }
    } catch (err) {
      console.warn('Remote MCQ retrieval notice:', err);
    }
  }

  // 4. Final Validation Gate pass
  const candidatePool = Array.from(candidateMap.values()).filter(q => {
    return validateMCQForContext(q, options).valid;
  });

  const availableCount = candidatePool.length;

  // 5. Honest Empty State (Zero cross-subject / zero foreign-topic fallback)
  if (availableCount === 0) {
    const subjectLabel = targetSubjectList.length > 0 
      ? targetSubjectList.map(id => CANONICAL_SUBJECTS[id].label).join(', ')
      : 'selected context';
    return {
      success: false,
      status: 'EMPTY',
      requestedCount: count,
      availableCount: 0,
      questions: [],
      canonicalSubjects: targetSubjectList,
      warningMessage: `No database questions found matching ${subjectLabel}.`
    };
  }

  // 6. Deduplicate & Randomize & Slice (AFTER validation)
  const ordered = allowShuffle ? shuffleArray(candidatePool) : candidatePool;
  const finalQuestions = ordered.slice(0, count);

  return {
    success: true,
    status: finalQuestions.length < count ? 'INSUFFICIENT_QUESTIONS' : 'OK',
    requestedCount: count,
    availableCount,
    questions: finalQuestions,
    canonicalSubjects: targetSubjectList,
    warningMessage: finalQuestions.length < count 
      ? `Only ${finalQuestions.length} questions available for this selection (requested ${count}).`
      : undefined
  };
}
