export type SubjectType = 'Biology' | 'Chemistry' | 'Physics' | 'English' | 'Logical Reasoning';

export type SyllabusStatus = 'not-started' | 'reading' | 'mcqs-done' | 'revised';

export type CognitiveLevel = 'Recall' | 'Understanding' | 'Application' | 'Analysis' | 'Evaluation' | 'Synthesis';

export type GenerationMode = 'SIMPLE' | 'ADVANCED' | 'ULTRA_ADVANCED';

export type ContentVerificationStatus = 'AI_GENERATED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';

export interface SyllabusTopic {
  id: string;
  subject: SubjectType;
  unit: string;
  topic: string;
  weightagePercentage: number;
  status: SyllabusStatus;
  keyPoints: string[];
  subtopics?: string[];
  highYieldRank?: number; // 1-10 priority
  pastPaperFrequency?: 'Extremely High' | 'High' | 'Moderate' | 'Occasional';
  expectedQuestionProbability?: number; // percentage e.g. 85%
  masteryPercentage?: number;
  lastStudiedDate?: string;
  nextRevisionDueDate?: string; // SRS Spaced Repetition
}

export type MCQType = 'Standard' | 'Assertion-Reason' | 'Case-Based' | 'Image-Based' | 'Drag-Match';

export interface DragMatchItem {
  term: string;
  match: string;
}

export interface MCQQuestion {
  id: string;
  subject: SubjectType;
  chapter: string;
  topic?: string;
  chapterId?: string;
  topicId?: string;
  learningObjective?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  cognitiveLevel?: CognitiveLevel;
  pastPaperTag?: string;
  mnemonics?: string;
  type?: MCQType;
  assertionText?: string;
  reasonText?: string;
  caseScenario?: string;
  imageUrl?: string;
  dragMatches?: DragMatchItem[];
  userConfidenceRating?: 'Low' | 'Medium' | 'High';
  source?: string;
  sourceReference?: string;
  syllabusMapping?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  status?: AdminContentStatus;
  verificationStatus?: ContentVerificationStatus;
  authorType?: 'AI' | 'HUMAN' | 'IMPORTED';
  generationRequestId?: string;
  generationModel?: string;
  rejectionReason?: string;
  contentHash?: string;
}

export interface FormulaItem {
  id: string;
  subject: 'Physics' | 'Chemistry';
  chapter: string;
  title: string;
  formula: string;
  variables: string[];
  derivationSummary: string;
  unitsAndDimensions: string;
  applications: string;
  commonMistakes: string;
  isHighYield: boolean;
}

export interface ReactionItem {
  id: string;
  subject: 'Chemistry';
  category: 'Organic' | 'Inorganic';
  chapter: string;
  reactionName: string;
  chemicalEquation: string;
  mechanism: string;
  conditions: string;
  catalysts: string;
  importantExceptions: string;
  isHighYield: boolean;
}

export interface DefinitionItem {
  id: string;
  subject: SubjectType;
  chapter: string;
  term: string;
  textbookDefinition: string;
  nmdcatShortDefinition: string;
  relatedTerms: string[];
  examNotes: string;
  title?: string;
  summary?: string;
  content?: string;
  topic?: string;
  weightagePercentage?: number;
  status?: AdminContentStatus;
  tags?: string[];
  createdBy?: string;
  updatedBy?: string;
}

export interface Flashcard {
  id: string;
  subject: SubjectType;
  topic: string;
  front: string;
  back: string;
  cardType?: 'standard' | 'cloze' | 'reverse' | 'image';
  clozeSentence?: string; // For fill in the blank e.g. "The [active site] of enzyme..."
  imageUrl?: string;
  keyFormulaOrConcept?: string;
  mnemonic?: string;
  easeFactor?: number; // Ebbinghaus SRS
  intervalDays?: number; // Days until next review
  repetitionCount?: number;
  nextReviewDate?: string;
  isCustomStudentCard?: boolean;
  status?: AdminContentStatus;
  tags?: string[];
  createdBy?: string;
  updatedBy?: string;
}

export interface MindMapNode {
  id: string;
  label: string;
  description: string;
  category?: string;
  subNodes?: { id: string; label: string; detail: string }[];
}

export interface ConceptMindMap {
  id: string;
  subject: SubjectType;
  topic: string;
  title: string;
  centerConcept: string;
  nodes: MindMapNode[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ConceptNoteMultiLevel {
  id: string;
  topicId: string;
  subject: SubjectType;
  chapter: string;
  topicName: string;
  simplifiedSummary: string;
  detailedTextbookNotes: string;
  highYieldRevisionSheet: {
    keyFacts: string[];
    frequentlyTested: string[];
    lastMinuteTips: string[];
    tableData?: { headers: string[]; rows: string[][] };
  };
  explanations: {
    basic: string;
    intermediate: string;
    advanced: string;
    nmdcatLevel: string;
    medicalLevel: string;
  };
}

export interface MCQStagedItem {
  id: string;
  sourceType: 'PDF Upload' | 'Notes Scan' | 'OCR Image' | 'AI Text Generation';
  sourceTitle: string;
  question: MCQQuestion;
  qualityScore: number; // 0-100
  reviewStatus: 'Pending Review' | 'Approved' | 'Rejected';
  validationNotes: string;
  dateCreated: string;
}

export interface KnowledgeGraphNode {
  id: string;
  subject: SubjectType;
  name: string;
  mastery: number; // 0-100%
  status: 'Weak' | 'Moderate' | 'Strong' | 'Mastered';
  connectedTopics: string[];
  retentionDecayPercent: number; // 0-100%
  daysTillForgetting: number;
  nextReviewDays?: number;
}

export interface ExamAttempt {
  id: string;
  date: string;
  title: string;
  examTitle?: string;
  dateCompleted?: string;
  subject?: SubjectType;
  totalQuestions: number;
  score: number;
  totalMarks: number;
  percentage: number;
  timeSpentSeconds: number;
  timeSpentMinutes?: number;
  negativeMarking: boolean;
  subjectBreakdown: Record<SubjectType, { correct: number; incorrect: number; unattempted: number; total: number }>;
  userAnswers: Record<string, number>;
  confidenceRatings?: Record<string, 'Low' | 'Medium' | 'High'>;
  mode?: 'Timed' | 'Untimed' | 'Full Simulation' | 'Adaptive' | 'Weak Area' | 'Rapid Fire';
}

export interface SavedMistake {
  questionId: string;
  question: MCQQuestion;
  wrongAnswerIndex: number;
  dateAdded: string;
  notes?: string;
  isResolved: boolean;
  errorPattern?: 'Conceptual Gap' | 'Calculation Mistake' | 'Misread Question' | 'Time Rush';
}

export interface GeneratedQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: string;
  concept: string;
}

export interface SavedAiQuiz {
  id: string;
  userId: string;
  subject: SubjectType;
  topic: string;
  difficultyMode: 'NORMAL' | 'ADVANCED' | 'ULTRA_ADVANCED';
  questionCount: number;
  questions: GeneratedQuestion[];
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
  bestScore: number;
  lastScore: number;
  lastAttemptAt: string;
}

export interface Flashcard {
  id: string;
  subject: SubjectType;
  topic: string;
  front: string;
  back: string;
  cardType?: 'standard' | 'cloze' | 'reverse' | 'image';
  clozeSentence?: string; // For fill in the blank e.g. "The [active site] of enzyme..."
  imageUrl?: string;
  keyFormulaOrConcept?: string;
  mnemonic?: string;
  easeFactor?: number; // Ebbinghaus SRS
  intervalDays?: number; // Days until next review
  repetitionCount?: number;
  nextReviewDate?: string;
  isCustomStudentCard?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserDigitalNote {
  id: string;
  title: string;
  subject: SubjectType;
  chapter: string;
  content: string;
  tags: string[];
  highlightedText?: string[];
  voiceNoteUrl?: string; // Simulated/recorded voice memo
  voiceDurationSeconds?: number;
  aiSummary?: string;
  autoRevisionNotes?: string[];
  lastModified: string;
}

export interface GamificationState {
  xp: number;
  level: number;
  coins: number;
  streakDays: number;
  completedChallengesCount: number;
  achievements: {
    id: string;
    title: string;
    description: string;
    icon: string;
    unlocked: boolean;
    progress: number;
    maxProgress: number;
    xpReward: number;
  }[];
  dailyMissions: {
    id: string;
    task: string;
    xpReward: number;
    completed: boolean;
  }[];
  leaderboardRank: number;
}

export interface LeaderboardUser {
  rank: number;
  name: string;
  collegePreference: string;
  xp: number;
  streak: number;
  accuracy: number;
  avatar: string;
  isCurrentUser?: boolean;
}

export interface EnglishVocabWord {
  id: string;
  word: string;
  pos: string;
  meaning: string;
  definition?: string;
  example?: string;
  medicalSentence?: string;
  subject?: SubjectType | 'English';
  category?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard' | string;
  synonyms: string[];
  antonyms: string[];
  tags?: string[];
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DailyTarget {
  id: string;
  title: string;
  subject: SubjectType;
  completed: boolean;
  dueDate: string;
  duration?: string;
  priority?: 'High' | 'Medium' | 'Low';
  topicId?: string;
  topicName?: string;
  objectiveId?: string;
  taskType?: 'topic_practice' | 'mistake_review' | 'mock_exam' | 'sequential_drill' | 'custom';
  autoCovered?: boolean;
}

export type AdminContentStatus =
  | 'DRAFT'
  | 'AI_GENERATED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'ARCHIVED'
  | 'REJECTED';

export type AdminUserRole =
  | 'Super Admin'
  | 'Content Admin'
  | 'Subject Expert'
  | 'Reviewer'
  | 'Publisher';

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: AdminUserRole;
  status: 'Active' | 'Inactive' | 'Suspended';
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  lastLoginAt?: string;
  questionsReviewed?: number;
  approvedCount?: number;
}

export interface AuditLogEntry {
  id: string;
  actionType:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'PUBLISH'
    | 'REVIEW'
    | 'ARCHIVE'
    | 'ROLE_CHANGE'
    | 'BACKUP'
    | 'IMPORT';
  targetCollection: string;
  targetId: string;
  targetType: string;
  summary: string;
  details?: string;
  meta?: Record<string, any>;
  createdBy: string;
  createdAt: string;
}

export interface ReviewQueueItem {
  id: string;
  itemRef: string;
  itemType: 'MCQ' | 'NOTE' | 'FLASHCARD' | 'FORMULA' | 'REACTION' | 'MINDMAP' | 'MNEMONIC' | 'AI_STAGING';
  status: 'OPEN' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'CLOSED';
  assignedReviewer?: string;
  priority?: 'High' | 'Medium' | 'Low';
  sourceTitle?: string;
  qualityScore?: number;
  validationNotes?: string;
  question?: MCQQuestion;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  notes?: string;
  payload?: Record<string, any>;
  actionHistory?: Array<{
    actor: string;
    action: string;
    comment?: string;
    timestamp: string;
  }>;
}

export interface ContentVersion {
  id: string;
  contentId: string;
  contentType: string;
  version: number;
  createdAt: string;
  createdBy: string;
  changeSummary: string;
  snapshot: Record<string, any>;
}

export interface CustomMCQ extends MCQQuestion {
  userId: string;
  createdAt: string;
  updatedAt: string;
  status?: AdminContentStatus;
}

export type NoteDetailLevel = 'QUICK' | 'STANDARD' | 'DETAILED' | 'VERY DETAILED';

export type NoteType = 
  | 'STUDY NOTES' 
  | 'REVISION NOTES' 
  | 'CONCEPT EXPLANATION' 
  | 'CHEAT SHEET' 
  | 'HIGH-YIELD NOTES' 
  | 'BEGINNER NOTES' 
  | 'COMPARISON' 
  | 'FORMULA NOTES' 
  | 'CUSTOM';

export interface UserNote {
  id: string;
  userId: string;
  title: string;
  subject: SubjectType;
  chapter?: string;
  topic?: string;
  topicId?: string;
  detailLevel?: NoteDetailLevel;
  noteType?: NoteType;
  content: string;
  summary?: string;
  tags: string[];
  highlightedText?: string[];
  voiceNoteUrl?: string;
  voiceDurationSeconds?: number;
  aiSummary?: string;
  autoRevisionNotes?: string[];
  customInstructions?: string;
  isAiGenerated?: boolean;
  lastModified?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type UserCustomNote = UserNote;

export interface BackupRecord {
  id: string;
  backupType: 'FULL_EXPORT' | 'CONTENT_SNAPSHOT' | 'AUDIT_LOG';
  source: string;
  backupUrl?: string;
  dataScope: string[];
  fileName: string;
  fileSizeBytes?: number;
  checksum?: string;
  status: 'COMPLETED' | 'FAILED' | 'RESTORED';
  createdAt: string;
  createdBy: string;
  restoredAt?: string;
  restoredBy?: string;
  notes?: string;
}

export interface CustomSyllabusMapping {
  id: string;
  board: 'UHS' | 'KMU' | 'Dow' | 'SZABMU' | 'NUMS';
  subject: SubjectType;
  unit: string;
  topic: string;
  weightagePercentage: number;
  status: 'ACTIVE' | 'ARCHIVED';
  isPublic: boolean;
  tags?: string[];
  keyPoints?: string[];
  pastPaperFrequency?: 'Extremely High' | 'High' | 'Moderate' | 'Occasional';
  expectedQuestionProbability?: number;
  masteryPercentage?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface CollegeCutoff {
  name: string;
  province: string;
  city: string;
  lastYearAggregate: number;
  type: 'Public' | 'Private' | 'Federal';
}

export interface ImportJob {
  id: string;
  jobId: string;
  filename: string;
  totalItems: number;
  processedCount: number;
  successCount: number;
  duplicateCount: number;
  failedCount: number;
  lastProcessedIndex: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  errors?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type AiTeachingMode = 'standard' | 'socratic' | 'stepByStep' | 'analogy' | 'teachUntilUnderstand';

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  timestamp: number;
  modeUsed?: AiTeachingMode;
  error?: boolean;
}

export interface AiMasteryState {
  currentStage: number;
  totalStages: number;
  currentConcept?: string;
  masteredConcepts: string[];
  weakConcepts: string[];
  lastVerificationResult?: 'correct' | 'incorrect' | 'partial';
  isMastered?: boolean;
}

export interface AiConversation {
  id: string;
  userId: string;
  title: string;
  subject: SubjectType;
  mode: AiTeachingMode;
  messages: AiChatMessage[];
  masteryState?: AiMasteryState;
  createdAt: string;
  updatedAt: string;
}

