export const NMDCAT_CONFIG = {
  TOTAL_MCQS: 180,
  SUBJECTS: {
    Biology: 81,
    Chemistry: 45,
    Physics: 36,
    English: 9,
    'Logical Reasoning': 9,
  } as const,
};

export type SubjectKey = keyof typeof NMDCAT_CONFIG.SUBJECTS;

export default NMDCAT_CONFIG;
