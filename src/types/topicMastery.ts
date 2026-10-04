import { SubjectType, MCQQuestion, AiChatMessage, Flashcard, FormulaItem, ReactionItem, DefinitionItem, ConceptMindMap } from '../types';

export type TopicMasteryStageId = 
  | 'tutor'
  | 'mindmap'
  | 'notes'
  | 'mnemonics'
  | 'formulas'
  | 'reactions'
  | 'definitions'
  | 'traps'
  | 'flashcards'
  | 'mcqs'
  | 'weak_areas'
  | 'final_test';

export interface TopicMasteryStageDefinition {
  id: TopicMasteryStageId;
  label: string;
  shortLabel: string;
  description: string;
  iconName: string;
  badge?: string;
}

export type TopicMasteryStatus = 'Not Started' | 'In Progress' | 'Practicing' | 'Strong' | 'Needs Review' | 'Mastered';

export interface TopicMasteryContext {
  subjectId: SubjectType;
  subjectName: string;
  chapterId: string;
  chapterName: string;
  topicId: string;
  topicName: string;
  sessionId: string;
}

export interface TopicMasteryMCQResult {
  questionId: string;
  questionText: string;
  selectedOption: number;
  correctIndex: number;
  isCorrect: boolean;
  timeSpentSeconds: number;
  explanation?: string;
}

export interface TopicMasteryFlashcardResult {
  cardId: string;
  front: string;
  recalled: boolean;
}

export interface TopicMasteryFinalTestResult {
  attemptId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeSpentSeconds: number;
  completedAt: string;
  userAnswers: Record<number, number>;
  questions: MCQQuestion[];
}

export interface TopicMasterySession {
  id: string;
  userId: string;
  subject: SubjectType;
  chapter: string;
  topicId: string;
  topic: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  currentStage: TopicMasteryStageId;
  completedStages: TopicMasteryStageId[];
  progressPercentage: number;
  masteryScore: number;
  masteryStatus: TopicMasteryStatus;
  tutorConversation: AiChatMessage[];
  mcqResults: TopicMasteryMCQResult[];
  flashcardResults: TopicMasteryFlashcardResult[];
  weakAreas: string[];
  finalTestResult?: TopicMasteryFinalTestResult;
  timeSpentMinutes: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  sessionNotes?: string;
}
