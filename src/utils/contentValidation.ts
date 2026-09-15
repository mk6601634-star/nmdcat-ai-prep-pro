import { MCQQuestion, AdminContentStatus, CognitiveLevel } from '../types';
import { DUPLICATE_SIMILARITY_THRESHOLD } from '../constants/contentModel';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateType: 'EXACT' | 'SIMILAR' | 'NONE';
  similarQuestionId?: string;
  similarityScore?: number;
}

/**
 * Structural validation for MCQ questions
 */
export function validateQuestionStructure(question: MCQQuestion): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!question.question || question.question.trim().length === 0) {
    errors.push('Question text is missing or empty');
  }

  if (!question.options || !Array.isArray(question.options) || question.options.length !== 4) {
    errors.push('Exactly 4 options are required');
  }

  if (typeof question.correctIndex !== 'number' || question.correctIndex < 0 || question.correctIndex > 3) {
    errors.push('Correct index must be a number between 0 and 3');
  }

  if (!question.explanation || question.explanation.trim().length === 0) {
    errors.push('Explanation is missing or empty');
  }

  // Check for empty options
  if (question.options) {
    question.options.forEach((opt, idx) => {
      if (!opt || opt.trim().length === 0) {
        errors.push(`Option ${idx} is empty`);
      }
    });
  }

  // Check for duplicate options
  if (question.options && question.options.length === 4) {
    const normalizedOptions = question.options.map(o => o.trim().toLowerCase());
    const uniqueOptions = new Set(normalizedOptions);
    if (uniqueOptions.size < 4) {
      errors.push('Duplicate options detected');
    }
  }

  // Warnings
  if (question.question && question.question.length < 20) {
    warnings.push('Question text is very short');
  }

  if (question.explanation && question.explanation.length < 30) {
    warnings.push('Explanation is very brief');
  }

  if (!question.topic) {
    warnings.push('Topic is not specified');
  }

  if (!question.cognitiveLevel) {
    warnings.push('Cognitive level is not specified');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Academic validation for MCQ questions
 */
export function validateQuestionAcademic(question: MCQQuestion, expectedSubject: string, expectedTopic: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check subject alignment
  if (question.subject !== expectedSubject) {
    errors.push(`Question subject (${question.subject}) does not match expected subject (${expectedSubject})`);
  }

  // Check topic alignment
  if (question.topic && expectedTopic && question.topic !== expectedTopic) {
    errors.push(`Question topic (${question.topic}) does not match expected topic (${expectedTopic})`);
  }

  // Check for fabricated citations
  const citationPatterns = [
    /according to page \d+/i,
    /as stated in \w+ \d{4}/i,
    /see reference \d+/i,
    /source: page \d+/i
  ];

  if (citationPatterns.some(pattern => pattern.test(question.question)) ||
      citationPatterns.some(pattern => pattern.test(question.explanation))) {
    warnings.push('Possible fabricated citation detected');
  }

  // Check for obvious hallucination indicators
  const hallucinationPatterns = [
    /i don't have information/i,
    /i cannot confirm/i,
    /this is not in the syllabus/i,
    /beyond the scope/i
  ];

  if (hallucinationPatterns.some(pattern => pattern.test(question.explanation))) {
    errors.push('Explanation contains uncertainty or scope limitation');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Content validation for MCQ questions
 */
export function validateQuestionContent(question: MCQQuestion): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for irrelevant material
  const irrelevantKeywords = ['click here', 'http', 'www.', '.com', 'example.com'];
  const hasIrrelevant = irrelevantKeywords.some(kw =>
    question.question.toLowerCase().includes(kw) ||
    question.explanation.toLowerCase().includes(kw)
  );

  if (hasIrrelevant) {
    errors.push('Question contains irrelevant web references or links');
  }

  // Check for obvious templates
  const templatePatterns = [
    /\[.*\]/g, // Square brackets often indicate templates
    /<.*>/g,  // Angle brackets often indicate placeholders
    /_____+/g  // Underscores often indicate fill-in-the-blank templates
  ];

  const hasTemplates = templatePatterns.some(pattern =>
    pattern.test(question.question) ||
    pattern.test(question.options.join(' '))
  );

  if (hasTemplates) {
    errors.push('Question appears to contain template placeholders');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Normalizes text for deterministic content hashing
 */
export function normalizeForHash(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\d]/g, '') // remove all whitespace and punctuation
    .trim();
}

/**
 * Generates a deterministic 64-bit content hash string for an MCQ
 * based on normalized question stem, sorted normalized options, and correct option text.
 */
export function generateMcqContentHash(question: {
  question: string;
  options?: string[];
  correctIndex?: number;
}): string {
  const normQ = normalizeForHash(question.question || '');
  const opts = Array.isArray(question.options) ? question.options : [];
  const normOpts = opts.map(o => normalizeForHash(o)).sort().join('|');
  const correctOptText = (typeof question.correctIndex === 'number' && opts[question.correctIndex])
    ? normalizeForHash(opts[question.correctIndex])
    : '';

  const rawKey = `${normQ}#${normOpts}#${correctOptText}`;

  // Double FNV-1a 32-bit hash yielding 64-bit hex hash string
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < rawKey.length; i++) {
    const code = rawKey.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= (code + i);
    h2 = Math.imul(h2, 0x01000193);
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `hash_${hex1}${hex2}`;
}

/**
 * Check for duplicate questions using O(1) hash comparison
 */
export function checkDuplicate(
  question: MCQQuestion,
  existingQuestionsOrHashes: MCQQuestion[] | Set<string> = []
): DuplicateCheckResult {
  const qHash = question.contentHash || generateMcqContentHash(question);

  if (existingQuestionsOrHashes instanceof Set) {
    if (existingQuestionsOrHashes.has(qHash)) {
      return {
        isDuplicate: true,
        duplicateType: 'EXACT',
        similarityScore: 1.0
      };
    }
    return { isDuplicate: false, duplicateType: 'NONE' };
  }

  for (const existing of existingQuestionsOrHashes) {
    const existingHash = existing.contentHash || generateMcqContentHash(existing);
    if (qHash === existingHash) {
      return {
        isDuplicate: true,
        duplicateType: 'EXACT',
        similarQuestionId: existing.id,
        similarityScore: 1.0
      };
    }
  }

  return {
    isDuplicate: false,
    duplicateType: 'NONE'
  };
}

/**
 * Comprehensive validation pipeline
 */
export function validateQuestion(
  question: MCQQuestion,
  expectedSubject: string,
  expectedTopic: string,
  existingQuestions: MCQQuestion[] | Set<string> = []
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  duplicateCheck: DuplicateCheckResult;
} {
  if (!question.contentHash) {
    question.contentHash = generateMcqContentHash(question);
  }

  const structural = validateQuestionStructure(question);
  const academic = validateQuestionAcademic(question, expectedSubject, expectedTopic);
  const content = validateQuestionContent(question);
  const duplicate = checkDuplicate(question, existingQuestions);

  const allErrors = [...structural.errors, ...academic.errors, ...content.errors];
  const allWarnings = [...structural.warnings, ...academic.warnings, ...content.warnings];

  return {
    isValid: allErrors.length === 0 && !duplicate.isDuplicate,
    errors: allErrors,
    warnings: allWarnings,
    duplicateCheck: duplicate
  };
}

/**
 * Batch validation for multiple questions (O(N) performance for 50,000+ MCQs)
 */
export function validateQuestionsBatch(
  questions: MCQQuestion[],
  expectedSubject: string,
  expectedTopic: string,
  existingQuestions: MCQQuestion[] = []
): {
  valid: MCQQuestion[];
  rejected: MCQQuestion[];
  duplicates: MCQQuestion[];
  validationResults: Array<{
    question: MCQQuestion;
    isValid: boolean;
    errors: string[];
    warnings: string[];
    duplicateCheck: DuplicateCheckResult;
  }>;
} {
  const valid: MCQQuestion[] = [];
  const rejected: MCQQuestion[] = [];
  const duplicates: MCQQuestion[] = [];
  const validationResults: any[] = [];

  // Build Set of existing hashes for O(1) lookup
  const seenHashes = new Set<string>();
  for (const eq of existingQuestions) {
    seenHashes.add(eq.contentHash || generateMcqContentHash(eq));
  }

  for (const question of questions) {
    const hash = question.contentHash || generateMcqContentHash(question);
    question.contentHash = hash;

    const structural = validateQuestionStructure(question);
    const academic = validateQuestionAcademic(question, expectedSubject, expectedTopic);
    const content = validateQuestionContent(question);

    const isDup = seenHashes.has(hash);
    const duplicateCheck: DuplicateCheckResult = isDup
      ? { isDuplicate: true, duplicateType: 'EXACT', similarityScore: 1.0 }
      : { isDuplicate: false, duplicateType: 'NONE' };

    const allErrors = [...structural.errors, ...academic.errors, ...content.errors];
    const allWarnings = [...structural.warnings, ...academic.warnings, ...content.warnings];
    const isValid = allErrors.length === 0 && !isDup;

    validationResults.push({
      question,
      isValid,
      errors: allErrors,
      warnings: allWarnings,
      duplicateCheck
    });

    if (isDup) {
      duplicates.push(question);
    } else if (isValid) {
      valid.push(question);
      seenHashes.add(hash); // Add to seen set for subsequent batch items
    } else {
      rejected.push(question);
    }
  }

  return {
    valid,
    rejected,
    duplicates,
    validationResults
  };
}
