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
  selectedSubjects?: (SubjectType | string)[];
  chapter?: string;
  selectedChapters?: string[];
  topic?: string;
  selectedTopics?: string[];
  difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Mixed' | 'Any' | string;
  count?: number;
  sourceType?: 'DATABASE' | 'AI_GENERATED' | 'PAST_PAPER' | 'ALL';
  questionBank?: MCQQuestion[];
  allowShuffle?: boolean;
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

const normalizeText = (s?: string) => 
  (s || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Single Canonical Question Retrieval Service.
 * Enforces subject, chapter, and topic invariants with ZERO cross-subject leakage.
 */
export async function getCanonicalMCQs(options: MCQRetrievalOptions): Promise<MCQRetrievalResult> {
  const {
    subject,
    selectedSubjects,
    chapter,
    selectedChapters,
    topic,
    selectedTopics,
    difficulty,
    count = 10,
    sourceType = 'ALL',
    questionBank = [],
    allowShuffle = true
  } = options;

  // 1. Resolve target canonical subjects
  const targetSubjectIds = new Set<CanonicalSubjectId>();

  if (subject) {
    const cid = toCanonicalSubjectId(subject);
    if (cid) targetSubjectIds.add(cid);
  }

  if (Array.isArray(selectedSubjects) && selectedSubjects.length > 0) {
    for (const sub of selectedSubjects) {
      const cid = toCanonicalSubjectId(sub);
      if (cid) targetSubjectIds.add(cid);
    }
  }

  const targetSubjectList = Array.from(targetSubjectIds);
  const targetChapters = new Set<string>();
  if (chapter) targetChapters.add(normalizeText(chapter));
  if (Array.isArray(selectedChapters)) {
    selectedChapters.forEach(c => targetChapters.add(normalizeText(c)));
  }

  const targetTopics = new Set<string>();
  if (topic) targetTopics.add(normalizeText(topic));
  if (Array.isArray(selectedTopics)) {
    selectedTopics.forEach(t => targetTopics.add(normalizeText(t)));
  }

  // 2. Filter from local questionBank (if available)
  const candidateMap = new Map<string, MCQQuestion>();

  if (Array.isArray(questionBank) && questionBank.length > 0) {
    for (const q of questionBank) {
      if (!q || !q.question) continue;
      const qCanonicalSub = toCanonicalSubjectId(q.subject);

      // HARD SUBJECT INVARIANT: If subject filter requested, MUST match target subjects
      if (targetSubjectList.length > 0) {
        if (!qCanonicalSub || !targetSubjectIds.has(qCanonicalSub)) {
          continue; // REJECT: Foreign or unclassified subject
        }
      }

      // CHAPTER INVARIANT: If chapters requested, match chapter
      if (targetChapters.size > 0) {
        const normQChap = normalizeText(q.chapter);
        const matchesChap = Array.from(targetChapters).some(c => 
          normQChap === c || normQChap.includes(c) || c.includes(normQChap)
        );
        if (!matchesChap) continue;
      }

      // TOPIC INVARIANT: If topics requested, match topic
      if (targetTopics.size > 0) {
        const normQTop = normalizeText(q.topic);
        const normQText = normalizeText(q.question);
        const matchesTopic = Array.from(targetTopics).some(t => 
          normQTop === t || normQTop.includes(t) || t.includes(normQTop) || normQText.includes(t)
        );
        if (!matchesTopic) continue;
      }

      // DIFFICULTY INVARIANT:
      if (difficulty && difficulty !== 'Mixed' && difficulty !== 'Any') {
        if (q.difficulty && q.difficulty.toLowerCase() !== difficulty.toLowerCase()) {
          continue;
        }
      }

      // SOURCE TYPE INVARIANT:
      if (sourceType !== 'ALL') {
        if (sourceType === 'AI_GENERATED' && q.source !== 'AI_GENERATED') continue;
        if (sourceType === 'DATABASE' && q.source === 'AI_GENERATED') continue;
      }

      const qId = q.id || `${qCanonicalSub}_${q.question.slice(0, 40)}`;
      candidateMap.set(qId, q);
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
            const qCanonicalSub = toCanonicalSubjectId(item.subject);

            // HARD SUBJECT INVARIANT CHECK
            if (!qCanonicalSub || !targetSubjectIds.has(qCanonicalSub)) {
              return; // REJECT
            }

            // Chapter filter check
            if (targetChapters.size > 0) {
              const normQChap = normalizeText(item.chapter);
              const matchesChap = Array.from(targetChapters).some(c => 
                normQChap === c || normQChap.includes(c) || c.includes(normQChap)
              );
              if (!matchesChap) return;
            }

            // Topic filter check
            if (targetTopics.size > 0) {
              const normQTop = normalizeText(item.topic);
              const normQText = normalizeText(item.question);
              const matchesTopic = Array.from(targetTopics).some(t => 
                normQTop === t || normQTop.includes(t) || t.includes(normQTop) || normQText.includes(t)
              );
              if (!matchesTopic) return;
            }

            const qId = item.id || `${qCanonicalSub}_${item.question.slice(0, 40)}`;
            if (!candidateMap.has(qId)) {
              candidateMap.set(qId, item);
            }
          });
        }
      }
    } catch (err) {
      console.warn('Remote MCQ retrieval non-fatal warning:', err);
    }
  }

  // 4. Final Validation Gate (Zero Foreign Questions Allowed)
  let candidatePool = Array.from(candidateMap.values()).filter(q => {
    if (targetSubjectList.length === 0) return true;
    const qSubId = toCanonicalSubjectId(q.subject);
    return qSubId !== null && targetSubjectIds.has(qSubId);
  });

  const availableCount = candidatePool.length;

  if (availableCount === 0) {
    const subjectLabel = targetSubjectList.length > 0 
      ? targetSubjectList.map(id => CANONICAL_SUBJECTS[id].label).join(', ')
      : 'selected';
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

  // 5. Randomize & Take requested count (AFTER validation)
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
