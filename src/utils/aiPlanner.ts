import { DailyTarget, SyllabusTopic, SavedMistake, ExamAttempt, SubjectType } from '../types';

/**
 * Generates a personalized daily AI study plan dynamically from the user's actual PMDC syllabus
 * progress, weak topics, saved mistakes, and exam attempt history.
 */
export function generateAiPlanFromActualData(
  topics: SyllabusTopic[],
  savedMistakes: SavedMistake[],
  examHistory: ExamAttempt[]
): DailyTarget[] {
  const todayStr = new Date().toISOString().slice(0, 10);
  const newTargets: DailyTarget[] = [];

  // 1. Unresolved Mistakes in Mistake Vault
  const unresolvedMistakes = savedMistakes.filter(m => !m.isResolved);
  if (unresolvedMistakes.length > 0) {
    const mainSubject = unresolvedMistakes[0].question.subject || 'Biology';
    newTargets.push({
      id: `ai-mistake-${Date.now()}`,
      title: `Mistake Vault: Practice ${unresolvedMistakes.length} Missed Question${unresolvedMistakes.length > 1 ? 's' : ''}`,
      subject: mainSubject,
      completed: false,
      dueDate: todayStr,
      duration: '15 min',
      priority: 'High',
      taskType: 'mistake_review'
    });
  }

  // 2. High-Yield Uncompleted Topics from real Syllabus (`topics`)
  const uncompletedTopics = topics.filter(t => t.status === 'not-started' || t.status === 'reading');
  const sortedTopics = [...uncompletedTopics].sort(
    (a, b) => (b.expectedQuestionProbability || 80) - (a.expectedQuestionProbability || 80)
  );

  // Take top 3 uncompleted topics
  const topTopics = sortedTopics.slice(0, 3);
  topTopics.forEach((topicItem, index) => {
    newTargets.push({
      id: `ai-topic-${topicItem.id}`,
      title: `${topicItem.subject}: ${topicItem.unit} – ${topicItem.topic}`,
      subject: topicItem.subject,
      completed: false,
      dueDate: todayStr,
      duration: index === 0 ? '30 min' : '20 min',
      priority: (topicItem.expectedQuestionProbability || 80) >= 85 ? 'High' : 'Medium',
      topicId: topicItem.id,
      topicName: topicItem.topic,
      taskType: 'topic_practice'
    });
  });

  // If no uncompleted topics left, create revision target
  if (topTopics.length === 0) {
    newTargets.push({
      id: `ai-revised-${Date.now()}`,
      title: 'Full Syllabus High-Yield Active Recall Drill',
      subject: 'Biology',
      completed: false,
      dueDate: todayStr,
      duration: '25 min',
      priority: 'Medium',
      taskType: 'topic_practice'
    });
  }

  // 3. Mock Exam Practice
  const completedExamToday = examHistory.some(e => e.date && e.date.startsWith(todayStr));
  newTargets.push({
    id: `ai-mock-${Date.now()}`,
    title: 'PMDC Practice Test / Mini-Quiz (50 Questions)',
    subject: 'Biology',
    completed: completedExamToday,
    dueDate: todayStr,
    duration: '45 min',
    priority: 'High',
    taskType: 'mock_exam',
    autoCovered: completedExamToday
  });

  // 4. English / Vocabulary Task
  newTargets.push({
    id: `ai-vocab-${Date.now()}`,
    title: 'English: Memorize 15 High-Yield Vocab & Grammar Rules',
    subject: 'English',
    completed: false,
    dueDate: todayStr,
    duration: '15 min',
    priority: 'Low',
    taskType: 'sequential_drill'
  });

  return newTargets;
}

/**
 * Automatically clears/marks as completed AI Planner tasks when the user covers that task in the app.
 */
export function autoClearPlannerTasks(
  targets: DailyTarget[],
  action: {
    type: 'topic_status' | 'exam' | 'objective' | 'mistake';
    subject?: SubjectType;
    topicId?: string;
    topicName?: string;
    objectiveId?: string;
    resolvedAllMistakes?: boolean;
  }
): DailyTarget[] {
  return targets.map(target => {
    if (target.completed) return target;

    let shouldClear = false;

    if (action.type === 'topic_status') {
      if (action.topicId && target.topicId === action.topicId) {
        shouldClear = true;
      } else if (action.topicName && target.topicName && target.topicName.toLowerCase().includes(action.topicName.toLowerCase())) {
        shouldClear = true;
      } else if (action.subject && target.subject === action.subject && target.taskType === 'topic_practice') {
        shouldClear = true;
      }
    } else if (action.type === 'exam') {
      if (target.taskType === 'mock_exam') {
        shouldClear = true;
      } else if (action.subject && target.subject === action.subject) {
        shouldClear = true;
      }
    } else if (action.type === 'objective') {
      if (action.objectiveId && target.objectiveId === action.objectiveId) {
        shouldClear = true;
      } else if (action.subject && target.subject === action.subject) {
        shouldClear = true;
      }
    } else if (action.type === 'mistake') {
      if (target.taskType === 'mistake_review' || action.resolvedAllMistakes) {
        shouldClear = true;
      }
    }

    if (shouldClear) {
      return { ...target, completed: true, autoCovered: true };
    }

    return target;
  });
}
