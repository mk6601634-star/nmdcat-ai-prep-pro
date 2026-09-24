import NMDCAT_CONFIG from '../constants/nmdcatConfig.ts';
import type { MCQQuestion, SubjectType } from '../types.ts';
import { toCanonicalSubjectId, assertSubjectIntegrity } from './subjectTaxonomy.ts';

function shuffle<T>(arr: T[]) {
  return arr.slice().sort(() => Math.random() - 0.5);
}

export function generateExam(
  questionBank: MCQQuestion[],
  totalCount: number,
  selectedSubjects?: SubjectType[]
): MCQQuestion[] {
  if (!questionBank || questionBank.length === 0 || totalCount <= 0) return [];

  const subjectsOrder: SubjectType[] = ['Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning'];
  const subjects = selectedSubjects && selectedSubjects.length > 0 
    ? subjectsOrder.filter(s => selectedSubjects.includes(s)) 
    : subjectsOrder;

  const weights = subjects.map(s => NMDCAT_CONFIG.SUBJECTS[s] || 10);
  const weightSum = weights.reduce((a, b) => a + b, 0) || 1;

  // Compute raw allocation
  const raw = subjects.map(s => Math.round(((NMDCAT_CONFIG.SUBJECTS[s] || 10) / weightSum) * totalCount));
  // Adjust to match totalCount
  const sumRaw = raw.reduce((a, b) => a + b, 0);
  if (sumRaw !== totalCount) {
    const diff = totalCount - sumRaw;
    let idx = 0;
    let maxWeight = -Infinity;
    for (let i = 0; i < subjects.length; i++) {
      const w = NMDCAT_CONFIG.SUBJECTS[subjects[i]] || 10;
      if (w > maxWeight) { maxWeight = w; idx = i; }
    }
    raw[idx] = Math.max(0, raw[idx] + diff);
  }

  // Collect questions per subject, strictly preserving canonical subject allocations.
  const perSubjectSelected: MCQQuestion[] = [];
  const usedIds = new Set<string>();

  // Pass 1: Allocate according to subject ratios
  subjects.forEach((sub, i) => {
    const need = Math.max(0, raw[i]);
    const targetSubId = toCanonicalSubjectId(sub);
    const pool = questionBank.filter(q => toCanonicalSubjectId(q.subject) === targetSubId && !usedIds.has(q.id));

    if (pool.length > 0) {
      const chosen = shuffle(pool).slice(0, Math.min(need, pool.length));
      chosen.forEach(q => {
        usedIds.add(q.id);
        perSubjectSelected.push(q);
      });
    }
  });

  // Pass 2: Backfill deficit ONLY from allowed subjects (never foreign subjects)
  const targetSubIds = new Set(subjects.map(s => toCanonicalSubjectId(s)).filter(Boolean));
  const candidatePool = questionBank.filter(
    q => !usedIds.has(q.id) && targetSubIds.has(toCanonicalSubjectId(q.subject))
  );

  const targetCount = Math.min(totalCount, questionBank.length);
  if (perSubjectSelected.length < targetCount && candidatePool.length > 0) {
    const deficit = targetCount - perSubjectSelected.length;
    const backfill = shuffle(candidatePool).slice(0, deficit);
    backfill.forEach(q => {
      usedIds.add(q.id);
      perSubjectSelected.push(q);
    });
  }

  // Final Invariant Gate: Confirm every selected question belongs to an allowed subject
  const verified = perSubjectSelected.filter(q => targetSubIds.has(toCanonicalSubjectId(q.subject)));

  // Final shuffle for exam order
  return shuffle(verified);
}

export default generateExam;
