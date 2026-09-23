import { SubjectType } from '../types';

export type CanonicalSubjectId = 
  | 'biology' 
  | 'chemistry' 
  | 'physics' 
  | 'english' 
  | 'logical_reasoning';

export interface SubjectMetadata {
  id: CanonicalSubjectId;
  label: SubjectType;
  aliases: string[];
  pmdcWeightage: number; // Percentage in official PMDC curriculum
}

export const CANONICAL_SUBJECTS: Record<CanonicalSubjectId, SubjectMetadata> = {
  biology: {
    id: 'biology',
    label: 'Biology',
    aliases: ['biology', 'bio', 'biology xi', 'biology xii', 'zoology', 'botany'],
    pmdcWeightage: 34
  },
  chemistry: {
    id: 'chemistry',
    label: 'Chemistry',
    aliases: ['chemistry', 'chem', 'chemistry xi', 'chemistry xii', 'organic chemistry', 'inorganic chemistry', 'physical chemistry'],
    pmdcWeightage: 27
  },
  physics: {
    id: 'physics',
    label: 'Physics',
    aliases: ['physics', 'phy', 'physics xi', 'physics xii', 'mechanics', 'electromagnetism'],
    pmdcWeightage: 27
  },
  english: {
    id: 'english',
    label: 'English',
    aliases: ['english', 'eng', 'vocabulary', 'grammar', 'english language'],
    pmdcWeightage: 9
  },
  logical_reasoning: {
    id: 'logical_reasoning',
    label: 'Logical Reasoning',
    aliases: [
      'logical reasoning',
      'logical_reasoning',
      'logical-reasoning',
      'logical',
      'logical reasoning & critical thinking',
      'critical thinking',
      'logical reasoning and critical thinking',
      'lr'
    ],
    pmdcWeightage: 3
  }
};

/**
 * Normalizes any string representation of a subject to its canonical ID.
 * Returns null if the string cannot be reliably resolved to a valid subject.
 */
export function toCanonicalSubjectId(input?: string | null): CanonicalSubjectId | null {
  if (!input || typeof input !== 'string') return null;
  const clean = input.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return null;

  for (const [id, meta] of Object.entries(CANONICAL_SUBJECTS)) {
    if (clean === id || meta.aliases.includes(clean)) {
      return id as CanonicalSubjectId;
    }
  }

  // Substring / Prefix match for compound strings (e.g. "Logical Reasoning & Critical Thinking")
  if (clean.includes('logical') || clean.includes('reasoning') || clean.includes('critical think')) {
    return 'logical_reasoning';
  }
  if (clean.includes('bio')) {
    return 'biology';
  }
  if (clean.includes('chem')) {
    return 'chemistry';
  }
  if (clean.includes('phys')) {
    return 'physics';
  }
  if (clean.includes('eng')) {
    return 'english';
  }

  return null;
}

/**
 * Converts a subject string or ID to its official display label.
 */
export function toCanonicalSubjectLabel(input?: string | null): SubjectType | null {
  const canonicalId = toCanonicalSubjectId(input);
  if (!canonicalId) return null;
  return CANONICAL_SUBJECTS[canonicalId].label;
}

/**
 * Validates if two subject strings resolve to the exact same canonical subject.
 */
export function isMatchingSubject(subjectA?: string | null, subjectB?: string | null): boolean {
  const idA = toCanonicalSubjectId(subjectA);
  const idB = toCanonicalSubjectId(subjectB);
  if (!idA || !idB) return false;
  return idA === idB;
}

/**
 * Hard invariant check: Returns true if and only if the question's subject
 * matches the requested subject canonical ID.
 */
export function assertSubjectIntegrity(
  questionSubject?: string | null,
  requestedSubject?: string | null
): boolean {
  if (!requestedSubject) return true; // No subject constraint requested
  const reqId = toCanonicalSubjectId(requestedSubject);
  const qId = toCanonicalSubjectId(questionSubject);
  
  if (!reqId) return false; // Invalid requested subject
  if (!qId) return false; // Missing or unresolvable question subject

  return qId === reqId;
}
