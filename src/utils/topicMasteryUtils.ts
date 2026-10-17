import { 
  SubjectType, 
  MCQQuestion, 
  SyllabusTopic,
  FormulaItem, 
  ReactionItem, 
  DefinitionItem, 
  ConceptMindMap 
} from '../types';
import { 
  TopicMasteryStageId, 
  TopicMasteryStageDefinition, 
  TopicMasterySession, 
  TopicMasteryStatus,
  TopicMasteryMCQResult,
  TopicMasteryFlashcardResult
} from '../types/topicMastery';
import { filterCanonicalMCQs } from '../lib/mcqRetrievalService';
import { 
  Bot, 
  Network, 
  FileText, 
  Calculator, 
  AlertTriangle, 
  FlaskConical, 
  Brain, 
  BookOpen, 
  Layers, 
  CheckCircle2, 
  Zap, 
  Trophy 
} from 'lucide-react';

const STAGE_ICON_MAP: Record<string, any> = {
  Bot,
  Network,
  FileText,
  Calculator,
  AlertTriangle,
  FlaskConical,
  Brain,
  BookOpen,
  Layers,
  CheckCircle2,
  Zap,
  Trophy
};

/**
 * Returns dynamic list of relevant learning stages based on Subject & Topic characteristics
 */
export function getRelevantStagesForSubject(subject: SubjectType, topicName?: string): TopicMasteryStageDefinition[] {
  const s = (subject || '').toLowerCase();
  const stages: TopicMasteryStageDefinition[] = [];

  // Step 1: Core Concept Orientation & High-Yield Notes (Immediate understanding without clicking/asking)
  stages.push({
    id: 'notes',
    label: 'Smart Notes & Summary',
    shortLabel: '1. Summary & Notes',
    description: 'High-yield PMDC syllabus revision points, core facts, and checklist',
    iconName: 'FileText',
    badge: 'Step 1'
  });

  // Step 2: Subject-Specific High-Yield Tools (Formulas / Reactions / Definitions)
  if (s === 'physics') {
    stages.push({
      id: 'formulas',
      label: 'Formulas & Dimensions',
      shortLabel: '2. Formulas',
      description: 'Equations, variable breakdowns, units, and derivation notes',
      iconName: 'Calculator',
      badge: 'Step 2'
    });
    stages.push({
      id: 'traps',
      label: 'Exam Traps & Exceptions',
      shortLabel: '3. Traps',
      description: 'Common PMDC trick questions, edge cases, and sign conventions',
      iconName: 'AlertTriangle'
    });
  } else if (s === 'chemistry') {
    stages.push({
      id: 'reactions',
      label: 'Reactions & Mechanisms',
      shortLabel: '2. Reactions',
      description: 'Chemical equations, conditions, catalysts, and exceptions',
      iconName: 'FlaskConical',
      badge: 'Step 2'
    });
    stages.push({
      id: 'formulas',
      label: 'Physical Formulas & Constants',
      shortLabel: '3. Formulas',
      description: 'Gas laws, stoichiometry, thermochemistry & equilibrium formulas',
      iconName: 'Calculator'
    });
    stages.push({
      id: 'definitions',
      label: 'Core Definitions & Laws',
      shortLabel: '4. Definitions',
      description: 'Authoritative PMDC textbook definitions and terms',
      iconName: 'BookOpen'
    });
    stages.push({
      id: 'mnemonics',
      label: 'Chemistry Mnemonics',
      shortLabel: '5. Mnemonics',
      description: 'Memory hooks for periodic trends, reagents, and series',
      iconName: 'Brain'
    });
  } else if (s === 'biology') {
    stages.push({
      id: 'definitions',
      label: 'Key Terms & Definitions',
      shortLabel: '2. Key Terms',
      description: 'Standard textbook terminology, organelles, enzymes, and pathways',
      iconName: 'BookOpen',
      badge: 'Step 2'
    });
    stages.push({
      id: 'traps',
      label: 'Exam Traps & Distractors',
      shortLabel: '3. Traps',
      description: 'Frequently tested PMDC distractor patterns and exceptions',
      iconName: 'AlertTriangle'
    });
    stages.push({
      id: 'mnemonics',
      label: 'Biology Mnemonics',
      shortLabel: '4. Mnemonics',
      description: 'Memory hooks for cranial nerves, stages, taxonomy, and cycles',
      iconName: 'Brain'
    });
  } else if (s === 'english') {
    stages.push({
      id: 'definitions',
      label: 'Grammar Rules & Vocabulary',
      shortLabel: '2. Rules & Terms',
      description: 'Subject-verb agreement, modifiers, tenses, and context definitions',
      iconName: 'BookOpen',
      badge: 'Step 2'
    });
    stages.push({
      id: 'traps',
      label: 'Sentence Traps & Distractors',
      shortLabel: '3. Traps',
      description: 'Misleading options, dangling modifiers, and idioms in NMDCAT',
      iconName: 'AlertTriangle'
    });
    stages.push({
      id: 'mnemonics',
      label: 'Grammar Mnemonics',
      shortLabel: '4. Mnemonics',
      description: 'Tricks for irregular verbs, prepositions, and sentence structures',
      iconName: 'Brain'
    });
  } else {
    // Logical Reasoning
    stages.push({
      id: 'traps',
      label: 'Logic Patterns & Traps',
      shortLabel: '2. Patterns',
      description: 'Syllogisms, critical deduction, and sequence traps',
      iconName: 'AlertTriangle',
      badge: 'Step 2'
    });
  }

  // Step 3: Visual Concept Architecture
  stages.push({
    id: 'mindmap',
    label: 'Concept Mind Map',
    shortLabel: 'Mind Map',
    description: 'Visual hierarchical structure and concept connections',
    iconName: 'Network'
  });

  // Step 4: Practice & Verification (MCQs & Active Recall)
  stages.push({
    id: 'mcqs',
    label: 'Practice MCQs',
    shortLabel: 'Practice MCQs',
    description: 'Real PMDC past paper & syllabus questions with explanations',
    iconName: 'CheckCircle2',
    badge: 'Practice'
  });

  stages.push({
    id: 'flashcards',
    label: 'Active Recall Flashcards',
    shortLabel: 'Flashcards',
    description: 'Spaced repetition flashcards for rapid topic reinforcement',
    iconName: 'Layers'
  });

  stages.push({
    id: 'weak_areas',
    label: 'Weak Area Diagnostic & Repair',
    shortLabel: 'Weak Areas',
    description: 'Targeted remediation for misconceptions identified in testing',
    iconName: 'Zap'
  });

  // Step 5: Interactive AI Medical Tutor (Instant Socratic Q&A and doubt resolution)
  stages.push({
    id: 'tutor',
    label: 'AI Medical Tutor',
    shortLabel: 'AI Tutor',
    description: 'Interactive Socratic dialogue, core mechanisms, and unlimited Q&A',
    iconName: 'Bot',
    badge: 'Tutor'
  });

  // Step 6: Final Timed Mastery Test
  stages.push({
    id: 'final_test',
    label: 'Final Mastery Test',
    shortLabel: 'Final Test',
    description: '10-Question timed mastery assessment with verified score certificate',
    iconName: 'Trophy',
    badge: 'Exam'
  });

  return stages.map(stage => ({
    ...stage,
    icon: STAGE_ICON_MAP[stage.iconName] || Bot
  }));
}

/**
 * Filter database MCQs strictly matching Subject and Topic/Chapter
 * Guarantees zero cross-subject contamination using canonical retrieval engine.
 */
export function filterDatabaseMCQsForTopic(
  allMcqs: MCQQuestion[],
  subject: SubjectType,
  chapter: string,
  topic: string
): MCQQuestion[] {
  if (!allMcqs || allMcqs.length === 0) return [];

  const result = filterCanonicalMCQs(allMcqs, {
    subjectId: subject,
    chapterId: chapter,
    topicId: topic,
    count: 50,
    allowShuffle: false
  });

  return result.questions;
}

/**
 * Determines recommended next stage given completed stages
 */
export function getRecommendedNextStage(
  subject: SubjectType | string,
  completedStages: TopicMasteryStageId[]
): TopicMasteryStageId | null {
  const stages = getRelevantStagesForSubject((subject || 'Biology') as SubjectType);
  for (const s of stages) {
    if (!completedStages.includes(s.id)) {
      return s.id;
    }
  }
  return null;
}

/**
 * Deterministic Mastery Score & Status Calculation
 * Formula:
 * - 20% Stage Progress (completing learning stages)
 * - 30% Practice MCQ Accuracy
 * - 20% Flashcard Retention Rate
 * - 30% Final Mastery Test Score
 */
export function calculateTopicMasteryScore(session: Partial<TopicMasterySession> | any): number {
  if (!session) return 0;
  const completedStages: TopicMasteryStageId[] = session.completedStages || [];
  const subject = (session.subjectName || session.subject || 'Biology') as SubjectType;
  const topicName = session.topicName || session.topic || '';
  const relevantStages = getRelevantStagesForSubject(subject, topicName);
  const totalStages = relevantStages.length || 10;

  // 1. Stage Progress (Max 20 points)
  const stageRatio = Math.min(1, completedStages.length / totalStages);
  const stageProgressPoints = Math.round(stageRatio * 20);

  // 2. Practice MCQ Accuracy (Max 30 points)
  const mcqResults = session.mcqPerformance || session.mcqResults || [];
  let mcqAccuracyPoints = 0;
  if (mcqResults.length > 0) {
    const correctCount = mcqResults.filter((r: any) => r.isCorrect).length;
    const accuracy = correctCount / mcqResults.length;
    mcqAccuracyPoints = Math.round(accuracy * 30);
  }

  // 3. Flashcard Retention (Max 20 points)
  const flashcardResults = session.flashcardPerformance || session.flashcardResults || [];
  let flashcardPoints = 0;
  if (flashcardResults.length > 0) {
    const recalledCount = flashcardResults.filter((r: any) => r.recalled).length;
    const ratio = recalledCount / flashcardResults.length;
    flashcardPoints = Math.round(ratio * 20);
  }

  // 4. Final Test Score (Max 30 points)
  let finalTestPoints = 0;
  if (session.finalTestResult) {
    const percentage = session.finalTestResult.percentage || 0;
    finalTestPoints = Math.round((percentage / 100) * 30);
  }

  const totalScore = Math.min(100, Math.max(0, stageProgressPoints + mcqAccuracyPoints + flashcardPoints + finalTestPoints));
  return totalScore;
}

/**
 * Identifies distinct conceptual weak areas from wrong MCQ choices and unrecalled flashcards
 */
export function identifyWeakAreasFromResults(
  mcqResults: TopicMasteryMCQResult[],
  flashcardResults: TopicMasteryFlashcardResult[]
): string[] {
  const weakAreas: Set<string> = new Set();

  // From incorrect MCQs
  for (const mcq of mcqResults) {
    if (!mcq.isCorrect) {
      if (mcq.questionText) {
        // Extract key phrase
        const clean = mcq.questionText
          .replace(/^(which of the following|what is the|how does|why is|in which|identify the|all of the following are true except)/i, '')
          .replace(/[?.:]/g, '')
          .trim();
        if (clean.length > 8) {
          weakAreas.add(clean.slice(0, 60));
        }
      }
    }
  }

  // From unrecalled flashcards
  for (const card of flashcardResults) {
    if (!card.recalled) {
      if (card.front) {
        weakAreas.add(card.front.replace(/[?.:]/g, '').trim().slice(0, 60));
      }
    }
  }

  return Array.from(weakAreas).slice(0, 8);
}
