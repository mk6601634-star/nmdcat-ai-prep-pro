import NMDCAT_CONFIG from '../constants/nmdcatConfig';
import { MCQQuestion, SubjectType } from '../types';

function shuffle<T>(arr: T[]) {
  return arr.slice().sort(() => Math.random() - 0.5);
}

export function generateExam(
  questionBank: MCQQuestion[],
  totalCount: number,
  selectedSubjects?: SubjectType[]
): MCQQuestion[] {
  const subjectsOrder: SubjectType[] = ['Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning'];
  const subjects = selectedSubjects && selectedSubjects.length > 0 ? subjectsOrder.filter(s => selectedSubjects.includes(s)) : subjectsOrder;

  const weights = subjects.map(s => NMDCAT_CONFIG.SUBJECTS[s]);
  const weightSum = weights.reduce((a, b) => a + b, 0) || 1;

  // Compute raw allocation
  const raw = subjects.map((s, i) => Math.round((NMDCAT_CONFIG.SUBJECTS[s] / weightSum) * totalCount));
  // Adjust to match totalCount
  const sumRaw = raw.reduce((a, b) => a + b, 0);
  if (sumRaw !== totalCount) {
    const diff = totalCount - sumRaw;
    // add/subtract from largest weight subject
    let idx = 0;
    let maxWeight = -Infinity;
    for (let i = 0; i < subjects.length; i++) {
      const w = NMDCAT_CONFIG.SUBJECTS[subjects[i]];
      if (w > maxWeight) { maxWeight = w; idx = i; }
    }
    raw[idx] = raw[idx] + diff;
  }

  // Collect questions per subject, preserving official subject allocations.
  const perSubjectSelected: MCQQuestion[] = [];

  subjects.forEach((sub, i) => {
    const need = Math.max(0, raw[i]);
    const pool = questionBank.filter(q => q.subject === sub);

    // Only use available questions for each subject - do not repeat questions to fill quota
    if (pool.length > 0) {
      perSubjectSelected.push(...shuffle(pool).slice(0, Math.min(need, pool.length)));
    }
  });

  // Final shuffle for exam order - return only available verified questions
  return shuffle(perSubjectSelected);
}

export default generateExam;
