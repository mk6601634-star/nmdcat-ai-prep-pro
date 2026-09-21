import NMDCAT_CONFIG from '../constants/nmdcatConfig.ts';
import type { MCQQuestion, SubjectType } from '../types.ts';

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
    // add/subtract from largest weight subject
    let idx = 0;
    let maxWeight = -Infinity;
    for (let i = 0; i < subjects.length; i++) {
      const w = NMDCAT_CONFIG.SUBJECTS[subjects[i]] || 10;
      if (w > maxWeight) { maxWeight = w; idx = i; }
    }
    raw[idx] = Math.max(0, raw[idx] + diff);
  }

  // Collect questions per subject, preserving official subject allocations.
  const perSubjectSelected: MCQQuestion[] = [];
  const usedIds = new Set<string>();

  // Pass 1: Allocate according to subject ratios
  subjects.forEach((sub, i) => {
    const need = Math.max(0, raw[i]);
    const pool = questionBank.filter(q => q.subject === sub && !usedIds.has(q.id));

    if (pool.length > 0) {
      const chosen = shuffle(pool).slice(0, Math.min(need, pool.length));
      chosen.forEach(q => {
        usedIds.add(q.id);
        perSubjectSelected.push(q);
      });
    }
  });

  // Pass 2: Backfill deficit from remaining unused pool across available subjects
  const targetCount = Math.min(totalCount, questionBank.length);
  if (perSubjectSelected.length < targetCount) {
    const candidatePool = questionBank.filter(
      q => !usedIds.has(q.id) && (selectedSubjects && selectedSubjects.length > 0 ? selectedSubjects.includes(q.subject) : true)
    );
    const deficit = targetCount - perSubjectSelected.length;
    const backfill = shuffle(candidatePool).slice(0, deficit);
    backfill.forEach(q => {
      usedIds.add(q.id);
      perSubjectSelected.push(q);
    });
  }

  // If still short due to subject restrictions, backfill from any unused question in the bank
  if (perSubjectSelected.length < targetCount && !selectedSubjects) {
    const fallbackPool = questionBank.filter(q => !usedIds.has(q.id));
    const deficit = targetCount - perSubjectSelected.length;
    const backfill = shuffle(fallbackPool).slice(0, deficit);
    backfill.forEach(q => {
      usedIds.add(q.id);
      perSubjectSelected.push(q);
    });
  }

  // Final shuffle for exam order
  return shuffle(perSubjectSelected);
}

export default generateExam;
