import { AdminContentStatus, ContentVerificationStatus, CognitiveLevel, GenerationMode } from '../types';

/**
 * Content Status Lifecycle
 * AI_GENERATED → UNDER_REVIEW → VERIFIED → PUBLISHED
 * Any stage can transition to REJECTED or ARCHIVED
 */
export const CONTENT_STATUS_LIFECYCLE: Record<AdminContentStatus, AdminContentStatus[]> = {
  DRAFT: ['AI_GENERATED', 'PENDING_REVIEW', 'REJECTED', 'ARCHIVED'],
  AI_GENERATED: ['PENDING_REVIEW', 'REJECTED', 'ARCHIVED'],
  PENDING_REVIEW: ['APPROVED', 'REJECTED', 'ARCHIVED'],
  APPROVED: ['PUBLISHED', 'REJECTED', 'ARCHIVED'],
  PUBLISHED: ['ARCHIVED'],
  ARCHIVED: [],
  REJECTED: ['PENDING_REVIEW', 'ARCHIVED'],
};

/**
 * Student-facing content must be PUBLISHED
 * Admin content can be in any status
 */
export const STUDENT_FACING_STATUSES: AdminContentStatus[] = ['PUBLISHED'];

/**
 * AI-generated content is NOT student-facing until verified and published
 */
export const AI_GENERATED_STATUSES: AdminContentStatus[] = ['AI_GENERATED', 'PENDING_REVIEW'];

/**
 * Cognitive Level definitions for NMDCAT preparation
 */
export const COGNITIVE_LEVEL_DESCRIPTIONS: Record<CognitiveLevel, string> = {
  Recall: 'Basic recall of facts, definitions, and concepts',
  Understanding: 'Comprehension of meaning and interpretation',
  Application: 'Using knowledge in new situations',
  Analysis: 'Breaking down complex information into parts',
  Evaluation: 'Making judgments based on criteria',
  Synthesis: 'Combining elements to form new patterns',
};

/**
 * Generation Mode definitions for AI quiz generation
 */
export const GENERATION_MODE_DESCRIPTIONS: Record<GenerationMode, string> = {
  SIMPLE: 'Primarily recall/conceptual questions',
  ADVANCED: 'Application, reasoning, interpretation, and multi-step thinking',
  ULTRA_ADVANCED: 'High-level NMDCAT-style reasoning and challenging application',
};

/**
 * Generation Mode to Cognitive Level mapping
 */
export const GENERATION_MODE_TO_COGNITIVE_LEVELS: Record<GenerationMode, CognitiveLevel[]> = {
  SIMPLE: ['Recall', 'Understanding'],
  ADVANCED: ['Application', 'Analysis'],
  ULTRA_ADVANCED: ['Evaluation', 'Synthesis', 'Analysis'],
};

/**
 * Batch size for AI generation
 * Larger requests are split into batches to avoid token limits
 */
export const AI_GENERATION_BATCH_SIZE = 25;

/**
 * Maximum questions per generation request
 */
export const AI_GENERATION_MAX_QUESTIONS = 100;

/**
 * Minimum questions per generation request
 */
export const AI_GENERATION_MIN_QUESTIONS = 1;

/**
 * Similarity threshold for duplicate detection (0-1)
 * Higher = more strict
 */
export const DUPLICATE_SIMILARITY_THRESHOLD = 0.85;

/**
 * Default ease factor for SRS (SuperMemo-2)
 */
export const DEFAULT_SRS_EASE_FACTOR = 2.5;

/**
 * Default interval in days for new cards
 */
export const DEFAULT_SRS_INTERVAL_DAYS = 1;
