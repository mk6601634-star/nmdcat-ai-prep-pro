import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  orderBy,
  limit,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import {
  AdminContentStatus,
  AdminUser,
  AdminUserRole,
  AuditLogEntry,
  BackupRecord,
  ContentVersion,
  CustomMCQ,
  CustomSyllabusMapping,
  DailyTarget,
  DefinitionItem,
  EnglishVocabWord,
  ExamAttempt,
  Flashcard,
  FormulaItem,
  MCQQuestion,
  MindMapNode,
  ReviewQueueItem,
  ReactionItem,
  SyllabusTopic,
  UserNote,
  SavedMistake,
  ConceptMindMap,
  AdminUserRole as UserRole,
  AdminContentStatus as ContentStatus,
  AuditLogEntry as LogEntry,
  BackupRecord as BackupRecordType,
  ContentVersion as VersionRecord,
  CustomSyllabusMapping as SyllabusMappingDocument,
  AdminUser as AdminUserDocument,
  SavedAiQuiz,
  GeneratedQuestion,
  ImportJob,
  AiConversation,
  PastPaper
} from '../types';
import type { PrismSession } from '../components/prism/prismTypes';

export interface UserProfileData {
  userName: string;
  examDate: string;
  targetScore?: number;
  email?: string;
  targetCollege?: string;
  role?: AdminUserRole;
  status?: 'Active' | 'Inactive' | 'Suspended';
  updatedAt: string;
}

export const adminCollections = {
  mcqs: 'mcqs',
  notes: 'notes',
  flashcards: 'flashcards',
  formulas: 'formulas',
  reactions: 'reactions',
  mindMaps: 'mindMaps',
  mnemonics: 'mnemonics',
  vocab: 'vocab',
  adminUsers: 'adminUsers',
  auditLogs: 'auditLogs',
  reviewQueue: 'reviewQueue',
  contentVersions: 'contentVersions',
  syllabusMappings: 'syllabusMappings',
  backups: 'backups',
  importJobs: 'importJobs'
};

function safeCreateId(collectionName: string) {
  return doc(collection(db, collectionName)).id;
}

function timestampValue() {
  return new Date().toISOString();
}

function handleError(message: string, err: unknown) {
  console.warn(message, err);
}

export async function initializeUserTopics(userId: string, initialTopics: SyllabusTopic[], fallbackTopics: SyllabusTopic[]) {
  if (!userId) return;
  try {
    const topicQuery = query(collection(db, 'topics'), where('userId', '==', userId), limit(1));
    const snapshot = await getDocs(topicQuery);
    if (!snapshot.empty) {
      return;
    }

    const topicsToSeed = initialTopics.length > 0 ? initialTopics : fallbackTopics;
    if (topicsToSeed.length === 0) {
      return;
    }

    const batch = writeBatch(db);
    topicsToSeed.forEach((topic) => {
      const topicRef = doc(db, 'topics', `${userId}_${topic.id}`);
      batch.set(topicRef, {
        ...topic,
        userId,
        createdAt: timestampValue(),
        updatedAt: timestampValue()
      });
    });
    await batch.commit();
  } catch (err) {
    handleError('Error initializing user topics:', err);
  }
}

// ------------------
// User Profile
// ------------------
export async function saveUserProfile(userId: string, profile: { userName: string; examDate: string; targetScore?: number; email?: string; targetCollege?: string }) {
  if (!userId) return;
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        ...profile,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    handleError('Failed to save user profile to Firestore:', err);
  }
}

export async function getUserProfile(userId: string): Promise<UserProfileData | null> {
  if (!userId) return null;
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfileData;
    }
  } catch (err) {
    handleError('Failed to fetch user profile:', err);
  }
  return null;
}

export function subscribeToUserProfile(userId: string, onUpdate: (profile: UserProfileData | null) => void) {
  if (!userId) return () => {};
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (snap) => {
    onUpdate(snap.exists() ? (snap.data() as UserProfileData) : null);
  }, (err) => {
    handleError('Error subscribing to user profile:', err);
  });
}

// ------------------
// Topics
// ------------------
export function subscribeToUserTopics(userId: string, onUpdate: (topics: SyllabusTopic[]) => void) {
  if (!userId) return () => {};
  const q = query(collection(db, 'topics'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const loadedTopics: SyllabusTopic[] = [];
    snapshot.forEach((d) => {
      loadedTopics.push(d.data() as SyllabusTopic);
    });
    loadedTopics.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    onUpdate(loadedTopics);
  }, (err) => {
    handleError('Error subscribing to topics:', err);
  });
}

export async function saveTopicStatusToFirestore(userId: string, topic: SyllabusTopic) {
  if (!userId) return;
  try {
    const topicRef = doc(db, 'topics', `${userId}_${topic.id}`);
    await setDoc(
      topicRef,
      {
        ...topic,
        userId,
        updatedAt: timestampValue()
      },
      { merge: true }
    );
  } catch (err) {
    handleError('Error saving topic to Firestore:', err);
    throw err;
  }
}

export async function deleteTopic(userId: string, topicId: string) {
  if (!userId || !topicId) return;
  try {
    const topicRef = doc(db, 'topics', `${userId}_${topicId}`);
    await deleteDoc(topicRef);
  } catch (err) {
    handleError('Error deleting topic from Firestore:', err);
  }
}

// ------------------
// Saved Mistakes
// ------------------
export function subscribeToSavedMistakes(userId: string, onUpdate: (mistakes: SavedMistake[]) => void) {
  if (!userId) return () => {};
  const q = query(collection(db, 'savedMistakes'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const mistakes: SavedMistake[] = [];
    snapshot.forEach((d) => {
      mistakes.push(d.data() as SavedMistake);
    });
    mistakes.sort((a, b) => new Date(b.dateAdded || 0).getTime() - new Date(a.dateAdded || 0).getTime());
    onUpdate(mistakes);
  }, (err) => {
    handleError('Error subscribing to saved mistakes:', err);
  });
}

export async function saveMistakeToFirestore(userId: string, mistake: SavedMistake) {
  if (!userId) return;
  try {
    const mRef = doc(db, 'savedMistakes', `${userId}_${mistake.questionId}`);
    await setDoc(
      mRef,
      {
        ...mistake,
        userId,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    handleError('Error saving mistake:', err);
  }
}

export async function removeMistakeFromFirestore(userId: string, questionId: string) {
  if (!userId) return;
  try {
    const mRef = doc(db, 'savedMistakes', `${userId}_${questionId}`);
    await deleteDoc(mRef);
  } catch (err) {
    handleError('Error deleting mistake:', err);
  }
}

// ------------------
// Exam Attempts
// ------------------
export function subscribeToExamAttempts(userId: string, onUpdate: (attempts: ExamAttempt[]) => void) {
  if (!userId) return () => {};
  const q = query(collection(db, 'examAttempts'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const attempts: ExamAttempt[] = [];
    snapshot.forEach((d) => {
      attempts.push(d.data() as ExamAttempt);
    });
    attempts.sort((a: any, b: any) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime());
    onUpdate(attempts);
  }, (err) => {
    handleError('Error subscribing to exam attempts:', err);
  });
}

export async function saveExamAttemptToFirestore(userId: string, attempt: ExamAttempt) {
  if (!userId) return;
  try {
    const aRef = doc(db, 'examAttempts', attempt.id);
    await setDoc(
      aRef,
      {
        ...attempt,
        userId,
        createdAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    handleError('Error saving exam attempt:', err);
  }
}

export async function deleteExamAttempt(userId: string, attemptId: string) {
  if (!userId || !attemptId) return;
  try {
    const attemptRef = doc(db, 'examAttempts', attemptId);
    await deleteDoc(attemptRef);
  } catch (err) {
    handleError('Error deleting exam attempt:', err);
  }
}

// ------------------
// Daily Targets
// ------------------
export function subscribeToDailyTargets(userId: string, onUpdate: (targets: DailyTarget[]) => void) {
  if (!userId) return () => {};
  const q = query(collection(db, 'dailyTargets'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const targets: DailyTarget[] = [];
    snapshot.forEach((d) => {
      targets.push(d.data() as DailyTarget);
    });
    targets.sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());
    onUpdate(targets);
  }, (err) => {
    handleError('Error subscribing to daily targets:', err);
  });
}

export async function saveDailyTargetToFirestore(userId: string, target: DailyTarget) {
  if (!userId) return;
  try {
    const tRef = doc(db, 'dailyTargets', `${userId}_${target.id}`);
    await setDoc(
      tRef,
      {
        ...target,
        userId,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    handleError('Error saving daily target:', err);
  }
}

export async function deleteDailyTarget(userId: string, targetId: string) {
  if (!userId || !targetId) return;
  try {
    const targetRef = doc(db, 'dailyTargets', `${userId}_${targetId}`);
    await deleteDoc(targetRef);
  } catch (err) {
    handleError('Error deleting daily target:', err);
  }
}

// ------------------
// User Notes Persistence & Offline Cache
// ------------------

const LOCAL_NOTES_KEY = 'nmdcat_user_notes_local_backup';

export function getLocalUserNotes(userId?: string): UserNote[] {
  try {
    const raw = localStorage.getItem(LOCAL_NOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (userId && userId !== 'anonymous') {
      return parsed.filter(n => n.userId === userId || !n.userId);
    }
    return parsed;
  } catch {
    return [];
  }
}

export function saveLocalUserNotes(notes: UserNote[]): void {
  try {
    localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(notes));
  } catch (err) {
    console.warn('Failed to save notes to localStorage cache:', err);
  }
}

/**
 * Save or create a user note in Firestore
 */
export async function saveUserNote(userId: string, note: Partial<UserNote> & { title: string; content: string; subject: SubjectType }): Promise<{ success: boolean; noteId?: string; error?: string }> {
  if (!userId || userId === 'anonymous') {
    const noteId = note.id || `local_note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullNote: UserNote = {
      id: noteId,
      userId: 'anonymous',
      title: note.title,
      subject: note.subject,
      chapter: note.chapter || 'General',
      topic: note.topic || note.title,
      detailLevel: note.detailLevel || 'STANDARD',
      noteType: note.noteType || 'STUDY NOTES',
      content: note.content,
      summary: note.summary || '',
      tags: note.tags || [],
      createdAt: note.createdAt || timestampValue(),
      updatedAt: timestampValue(),
      lastModified: timestampValue(),
      isAiGenerated: note.isAiGenerated ?? false,
      customInstructions: note.customInstructions || ''
    };
    const localNotes = getLocalUserNotes();
    const existingIdx = localNotes.findIndex(n => n.id === noteId);
    if (existingIdx >= 0) {
      localNotes[existingIdx] = fullNote;
    } else {
      localNotes.unshift(fullNote);
    }
    saveLocalUserNotes(localNotes);
    return { success: true, noteId };
  }

  try {
    const noteId = note.id || doc(collection(db, 'userNotes')).id;
    const noteDocRef = doc(db, 'userNotes', noteId);
    const timestamp = timestampValue();

    const notePayload: UserNote = {
      id: noteId,
      userId,
      title: note.title,
      subject: note.subject,
      chapter: note.chapter || 'General',
      topic: note.topic || note.title,
      topicId: note.topicId || '',
      detailLevel: note.detailLevel || 'STANDARD',
      noteType: note.noteType || 'STUDY NOTES',
      content: note.content,
      summary: note.summary || '',
      tags: note.tags || [],
      customInstructions: note.customInstructions || '',
      isAiGenerated: note.isAiGenerated ?? false,
      createdAt: note.createdAt || timestamp,
      updatedAt: timestamp,
      lastModified: timestamp
    };

    await setDoc(noteDocRef, notePayload);

    // Also update local cache for instant offline read
    const localNotes = getLocalUserNotes();
    const idx = localNotes.findIndex(n => n.id === noteId);
    if (idx >= 0) {
      localNotes[idx] = notePayload;
    } else {
      localNotes.unshift(notePayload);
    }
    saveLocalUserNotes(localNotes);

    return { success: true, noteId };
  } catch (err: any) {
    handleError('Error saving user note:', err);
    // Offline fallback
    const noteId = note.id || `offline_note_${Date.now()}`;
    const fallbackNote: UserNote = {
      id: noteId,
      userId,
      title: note.title,
      subject: note.subject,
      chapter: note.chapter || 'General',
      content: note.content,
      tags: note.tags || [],
      detailLevel: note.detailLevel || 'STANDARD',
      noteType: note.noteType || 'STUDY NOTES',
      createdAt: note.createdAt || timestampValue(),
      updatedAt: timestampValue(),
      lastModified: timestampValue()
    };
    const localNotes = getLocalUserNotes();
    localNotes.unshift(fallbackNote);
    saveLocalUserNotes(localNotes);
    return { success: true, noteId, error: err?.message };
  }
}

export async function createUserNote(note: UserNote) {
  const res = await saveUserNote(note.userId, note);
  return res.noteId;
}

/**
 * Update an existing user note in Firestore
 */
export async function updateUserNote(noteId: string, userIdOrUpdate: string | Partial<UserNote>, maybeUpdate?: Partial<UserNote>): Promise<{ success: boolean; error?: string }> {
  if (!noteId) return { success: false, error: 'Note ID is required' };

  const userId = typeof userIdOrUpdate === 'string' ? userIdOrUpdate : '';
  const update = typeof userIdOrUpdate === 'object' ? userIdOrUpdate : (maybeUpdate || {});

  try {
    const timestamp = timestampValue();
    if (userId && userId !== 'anonymous') {
      const noteDocRef = doc(db, 'userNotes', noteId);
      await updateDoc(noteDocRef, {
        ...update,
        updatedAt: timestamp,
        lastModified: timestamp
      });
    }

    // Update local cache
    const localNotes = getLocalUserNotes();
    const idx = localNotes.findIndex(n => n.id === noteId);
    if (idx >= 0) {
      localNotes[idx] = {
        ...localNotes[idx],
        ...update,
        updatedAt: timestamp,
        lastModified: timestamp
      };
      saveLocalUserNotes(localNotes);
    }

    return { success: true };
  } catch (err: any) {
    handleError('Error updating user note:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Delete a user note
 */
export async function deleteUserNote(noteId: string, userId?: string): Promise<{ success: boolean; error?: string }> {
  if (!noteId) return { success: false, error: 'Note ID is required' };

  try {
    if (userId && userId !== 'anonymous') {
      await deleteDoc(doc(db, 'userNotes', noteId));
    }

    // Remove from local cache
    const localNotes = getLocalUserNotes().filter(n => n.id !== noteId);
    saveLocalUserNotes(localNotes);

    return { success: true };
  } catch (err: any) {
    handleError('Error deleting user note:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Subscribe to user notes
 */
export function subscribeToUserNotes(userId: string, onUpdate: (notes: UserNote[]) => void) {
  if (!userId || userId === 'anonymous') {
    const local = getLocalUserNotes('anonymous');
    onUpdate(local);
    return () => {};
  }

  const q = query(collection(db, 'userNotes'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const notes: UserNote[] = [];
    snapshot.forEach((d) => notes.push(d.data() as UserNote));
    notes.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
    
    // Merge with any local notes
    const localNotes = getLocalUserNotes(userId);
    const mergedMap = new Map<string, UserNote>();
    notes.forEach(n => mergedMap.set(n.id, n));
    localNotes.forEach(n => {
      if (!mergedMap.has(n.id)) mergedMap.set(n.id, n);
    });
    const merged = Array.from(mergedMap.values()).sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
    
    onUpdate(merged);
  }, (err) => {
    handleError('Error subscribing to user notes:', err);
    // Fallback to local
    onUpdate(getLocalUserNotes(userId));
  });
}

export async function createCustomMCQ(userIdOrMcq: string | CustomMCQ, maybeMcq?: Omit<CustomMCQ, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) {
  const customMcq = typeof userIdOrMcq === 'string' 
    ? { ...maybeMcq, userId: userIdOrMcq } as CustomMCQ 
    : userIdOrMcq;

  if (!customMcq.userId) return;
  try {
    const mcqRef = doc(collection(db, 'customMCQs'));
    await setDoc(mcqRef, {
      ...customMcq,
      id: mcqRef.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return mcqRef.id;
  } catch (err) {
    handleError('Error creating custom MCQ:', err);
  }
}

export async function updateCustomMCQ(customMcqId: string, customMcq: Partial<CustomMCQ>) {
  if (!customMcqId) return;
  try {
    const mcqRef = doc(db, 'customMCQs', customMcqId);
    await updateDoc(mcqRef, {
      ...customMcq,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleError('Error updating custom MCQ:', err);
  }
}

export async function deleteCustomMCQ(customMcqId: string) {
  if (!customMcqId) return;
  try {
    const mcqRef = doc(db, 'customMCQs', customMcqId);
    await deleteDoc(mcqRef);
  } catch (err) {
    handleError('Error deleting custom MCQ:', err);
  }
}

export function subscribeToCustomMCQs(userId: string, onUpdate: (items: CustomMCQ[]) => void) {
  if (!userId) return () => {};
  const q = query(collection(db, 'customMCQs'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const items: CustomMCQ[] = [];
    snapshot.forEach((d) => items.push(d.data() as CustomMCQ));
    items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    onUpdate(items);
  }, (err) => {
    handleError('Error subscribing to custom MCQs:', err);
  });
}

// ------------------
// AI Tutor & Chat Conversations
// ------------------
export async function saveAiConversation(userId: string, conversation: Partial<AiConversation> & { id: string }): Promise<string> {
  if (!userId || !conversation?.id) return '';
  try {
    const timestamp = timestampValue();
    const docRef = doc(db, 'aiConversations', conversation.id);
    await setDoc(docRef, {
      ...conversation,
      userId,
      updatedAt: timestamp,
      createdAt: conversation.createdAt || timestamp
    }, { merge: true });
    return conversation.id;
  } catch (err) {
    handleError('Error saving AI conversation:', err);
    return '';
  }
}

export function subscribeToAiConversations(userId: string, onUpdate: (items: AiConversation[]) => void) {
  if (!userId) return () => {};
  const q = query(collection(db, 'aiConversations'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const items: AiConversation[] = [];
    snapshot.forEach((d) => items.push(d.data() as AiConversation));
    items.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
    onUpdate(items);
  }, (err) => {
    handleError('Error subscribing to AI conversations:', err);
  });
}

export async function deleteAiConversation(conversationId: string) {
  if (!conversationId) return;
  try {
    const docRef = doc(db, 'aiConversations', conversationId);
    await deleteDoc(docRef);
  } catch (err) {
    handleError('Error deleting AI conversation:', err);
  }
}

export async function getAiConversation(conversationId: string): Promise<AiConversation | null> {
  if (!conversationId) return null;
  try {
    const docRef = doc(db, 'aiConversations', conversationId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as AiConversation;
    }
    return null;
  } catch (err) {
    handleError('Error fetching AI conversation:', err);
    return null;
  }
}

// ------------------
// Admin Content
// ------------------
async function createAdminContent<T extends { id?: string; createdBy: string; updatedBy: string }>(collectionName: string, data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) {
  const ref = doc(collection(db, collectionName));
  await setDoc(ref, {
    ...data,
    id: ref.id,
    createdAt: timestampValue(),
    updatedAt: timestampValue()
  });
  return ref.id;
}

async function updateAdminContent<T>(collectionName: string, docId: string, data: Partial<T>) {
  const ref = doc(db, collectionName, docId);
  await updateDoc(ref, {
    ...data,
    updatedAt: timestampValue()
  });
}

export async function createAdminMcq(mcq: Omit<MCQQuestion, 'id'> & { createdBy: string; updatedBy: string; status: AdminContentStatus; version: number; tags?: string[]; publishedAt?: string; publishedBy?: string }) {
  try {
    return await createAdminContent(adminCollections.mcqs, mcq);
  } catch (err) {
    handleError('Error creating admin MCQ:', err);
  }
}

export async function updateAdminMcq(mcqId: string, update: Partial<MCQQuestion> & { updatedBy: string; status?: AdminContentStatus; publishedAt?: string; publishedBy?: string; version?: number; tags?: string[] }) {
  try {
    await updateAdminContent(adminCollections.mcqs, mcqId, update);
  } catch (err) {
    handleError('Error updating admin MCQ:', err);
  }
}

export async function deleteAdminMcq(mcqId: string) {
  if (!mcqId) return;
  try {
    await deleteDoc(doc(db, adminCollections.mcqs, mcqId));
  } catch (err) {
    handleError('Error deleting admin MCQ:', err);
  }
}

export function subscribeToAdminMcqs(onUpdate: (items: Array<MCQQuestion & { id: string; status: AdminContentStatus }>) => void, statusFilter?: AdminContentStatus) {
  const collectionRef = collection(db, adminCollections.mcqs);
  const q = statusFilter
    ? query(collectionRef, where('status', '==', statusFilter))
    : query(collectionRef);
  return onSnapshot(q, (snapshot) => {
    const items: Array<MCQQuestion & { id: string; status: AdminContentStatus }> = [];
    snapshot.forEach((d) => items.push(d.data() as MCQQuestion & { id: string; status: AdminContentStatus }));
    items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    onUpdate(items);
  }, (err) => {
    handleError('Error subscribing to admin MCQs:', err);
  });
}

export function subscribeToPublishedMcqs(onUpdate: (items: Array<MCQQuestion & { id: string; status: AdminContentStatus }>) => void) {
  const collectionRef = collection(db, adminCollections.mcqs);
  const q = query(collectionRef, where('status', '==', 'PUBLISHED'));

  return onSnapshot(q, (snapshot) => {
    const items: Array<MCQQuestion & { id: string; status: AdminContentStatus }> = [];
    snapshot.forEach((d) => {
      const data = d.data() as any;
      items.push({ ...data, id: data.id || d.id, status: data.status || 'PUBLISHED' });
    });
    items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    onUpdate(items);
  }, (err) => {
    handleError('Error subscribing to published MCQs:', err);
  });
}

/**
 * Stage AI-generated questions for review using chunked batch writes (max 400 per batch)
 */
export async function stageAiGeneratedQuestions(
  questions: Array<Omit<MCQQuestion, 'id'> & { id?: string }>,
  updatedBy: string,
  chunkSize = 400
): Promise<{ success: boolean; staged: number; failedChunks?: number[]; errors?: string[] }> {
  if (!questions || questions.length === 0) {
    return { success: true, staged: 0 };
  }

  const timestamp = timestampValue();
  let totalStaged = 0;
  const failedChunks: number[] = [];
  const errors: string[] = [];

  for (let i = 0; i < questions.length; i += chunkSize) {
    const chunkIndex = Math.floor(i / chunkSize);
    const chunk = questions.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    chunk.forEach((q) => {
      const docRef = q.id ? doc(db, adminCollections.mcqs, q.id) : doc(collection(db, adminCollections.mcqs));
      batch.set(docRef, {
        ...q,
        status: 'AI_GENERATED' as AdminContentStatus,
        verificationStatus: 'AI_GENERATED',
        updatedBy,
        updatedAt: timestamp,
        createdAt: q.createdAt || timestamp
      });
    });

    try {
      await batch.commit();
      totalStaged += chunk.length;
    } catch (err: any) {
      handleError(`Error staging AI-generated questions chunk ${chunkIndex}:`, err);
      failedChunks.push(chunkIndex);
      errors.push(err?.message || `Chunk ${chunkIndex} failed`);
    }
  }

  return {
    success: failedChunks.length === 0,
    staged: totalStaged,
    failedChunks: failedChunks.length > 0 ? failedChunks : undefined,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Bulk create or import MCQs into Firestore with chunked batches (max 400 per batch)
 */
export async function bulkCreateAdminMcqs(
  questions: Array<MCQQuestion & { status?: AdminContentStatus }>,
  createdBy: string,
  targetStatus: AdminContentStatus = 'PUBLISHED',
  chunkSize = 400
): Promise<{ success: boolean; count: number; failedChunks?: number[]; errors?: string[] }> {
  if (!questions || questions.length === 0) {
    return { success: true, count: 0 };
  }

  const timestamp = timestampValue();
  let totalSaved = 0;
  const failedChunks: number[] = [];
  const errors: string[] = [];

  for (let i = 0; i < questions.length; i += chunkSize) {
    const chunkIndex = Math.floor(i / chunkSize);
    const chunk = questions.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    chunk.forEach((q) => {
      const docRef = q.id ? doc(db, adminCollections.mcqs, q.id) : doc(collection(db, adminCollections.mcqs));
      batch.set(docRef, {
        ...q,
        id: docRef.id,
        status: q.status || targetStatus,
        verificationStatus: (q.status || targetStatus) === 'PUBLISHED' ? 'VERIFIED' : 'AI_GENERATED',
        authorType: q.authorType || 'IMPORTED',
        version: q.version || 1,
        createdBy: (q as any).createdBy || createdBy,
        updatedBy: createdBy,
        updatedAt: timestamp,
        createdAt: q.createdAt || timestamp,
        publishedAt: (q.status || targetStatus) === 'PUBLISHED' ? ((q as any).publishedAt || timestamp) : undefined,
        publishedBy: (q.status || targetStatus) === 'PUBLISHED' ? ((q as any).publishedBy || createdBy) : undefined
      }, { merge: true });
    });

    try {
      await batch.commit();
      totalSaved += chunk.length;
    } catch (err: any) {
      handleError(`Error bulk importing MCQs chunk ${chunkIndex}:`, err);
      failedChunks.push(chunkIndex);
      errors.push(err?.message || `Chunk ${chunkIndex} failed`);
    }
  }

  return {
    success: failedChunks.length === 0,
    count: totalSaved,
    failedChunks: failedChunks.length > 0 ? failedChunks : undefined,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Resumable Import Job Management
 */
export async function createImportJob(job: Omit<ImportJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const timestamp = timestampValue();
  const id = safeCreateId(adminCollections.importJobs);
  const docRef = doc(db, adminCollections.importJobs, id);
  await setDoc(docRef, {
    ...job,
    id,
    jobId: job.jobId || id,
    createdAt: timestamp,
    updatedAt: timestamp
  });
  return id;
}

export async function updateImportJobProgress(jobId: string, updates: Partial<ImportJob>) {
  try {
    const docRef = doc(db, adminCollections.importJobs, jobId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: timestampValue()
    });
  } catch (err) {
    handleError('Error updating import job progress:', err);
  }
}

export async function getImportJob(jobId: string): Promise<ImportJob | null> {
  try {
    const docRef = doc(db, adminCollections.importJobs, jobId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as ImportJob;
    }
    return null;
  } catch (err) {
    handleError('Error fetching import job:', err);
    return null;
  }
}

export function subscribeToImportJobs(onUpdate: (jobs: ImportJob[]) => void) {
  const collectionRef = collection(db, adminCollections.importJobs);
  const q = query(collectionRef, orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(q, (snapshot) => {
    const items: ImportJob[] = [];
    snapshot.forEach((d) => items.push(d.data() as ImportJob));
    onUpdate(items);
  }, (err) => {
    handleError('Error subscribing to import jobs:', err);
  });
}

/**
 * Approve a staged question (AI_GENERATED → VERIFIED → PUBLISHED)
 */
export async function approveStagedQuestion(questionId: string, approvedBy: string) {
  try {
    await updateDoc(doc(db, adminCollections.mcqs, questionId), {
      status: 'PUBLISHED' as AdminContentStatus,
      verificationStatus: 'VERIFIED',
      updatedBy: approvedBy,
      publishedAt: timestampValue(),
      publishedBy: approvedBy,
      updatedAt: timestampValue()
    });
    return { success: true };
  } catch (err) {
    handleError('Error approving staged question:', err);
    return { success: false };
  }
}

/**
 * Reject a staged question
 */
export async function rejectStagedQuestion(questionId: string, rejectedBy: string, rejectionReason: string) {
  try {
    await updateDoc(doc(db, adminCollections.mcqs, questionId), {
      status: 'REJECTED' as AdminContentStatus,
      verificationStatus: 'REJECTED',
      updatedBy: rejectedBy,
      rejectionReason,
      updatedAt: timestampValue()
    });
    return { success: true };
  } catch (err) {
    handleError('Error rejecting staged question:', err);
    return { success: false };
  }
}

/**
 * Subscribe to AI-generated questions for review
 */
export function subscribeToAiGeneratedQuestions(onUpdate: (items: Array<MCQQuestion & { id: string; status: AdminContentStatus }>) => void) {
  const collectionRef = collection(db, adminCollections.mcqs);
  const q = query(collectionRef, where('status', '==', 'AI_GENERATED'));
  return onSnapshot(q, (snapshot) => {
    const items: Array<MCQQuestion & { id: string; status: AdminContentStatus }> = [];
    snapshot.forEach((d) => items.push(d.data() as MCQQuestion & { id: string; status: AdminContentStatus }));
    items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    onUpdate(items);
  }, (err) => {
    handleError('Error subscribing to AI-generated questions:', err);
  });
}

/**
 * Fetch published MCQs for a specific subject/chapter/topic with intelligent fuzzy matching and fallback.
 */
export async function fetchPublishedMcqsForTopic(
  subject?: string,
  chapter?: string,
  topicName?: string,
  limitCount = 100
): Promise<Array<MCQQuestion & { id?: string }>> {
  try {
    const collectionRef = collection(db, adminCollections.mcqs);
    let constraints: any[] = [where('status', '==', 'PUBLISHED')];
    if (subject) {
      constraints.push(where('subject', '==', subject));
    }

    const q = query(collectionRef, ...constraints);
    const snapshot = await getDocs(q);
    let items: Array<MCQQuestion & { id?: string }> = snapshot.docs.map(d => {
      const data = d.data() as any;
      return { ...data, id: data.id || d.id, status: data.status || 'PUBLISHED' };
    });

    const norm = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

    if (chapter || topicName) {
      const normChap = norm(chapter);
      const normTop = norm(topicName);

      // 1. First priority: Exact or substring match on topic and chapter
      let filtered = items.filter(i => {
        const qChap = norm(i.chapter);
        const qTop = norm(i.topic);
        const qText = norm(i.question);

        const chapMatches = !normChap || qChap === normChap || qChap.includes(normChap) || normChap.includes(qChap);
        if (!chapMatches) return false;

        if (!normTop) return true;
        return qTop === normTop || qTop.includes(normTop) || normTop.includes(qTop) || qText.includes(normTop);
      });

      // 2. Second priority: If no exact topic match, match by chapter
      if (filtered.length === 0 && normChap) {
        filtered = items.filter(i => {
          const qChap = norm(i.chapter);
          return qChap === normChap || qChap.includes(normChap) || normChap.includes(qChap);
        });
      }

      // 3. Third priority: If filtered has items, use them, otherwise use all available subject items
      if (filtered.length > 0) {
        items = filtered;
      }
    }

    items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    if (limitCount && limitCount > 0) {
      items = items.slice(0, limitCount);
    }

    return items;
  } catch (err) {
    handleError('Error fetching published MCQs for topic:', err);
    return [];
  }
}

/**
 * Fetch random published MCQs bounded by count.
 */
export async function fetchRandomPublishedMcqs(options?: {
  subject?: string;
  limitCount?: number;
} | number): Promise<Array<MCQQuestion & { id?: string }>> {
  try {
    const opts = typeof options === 'number' ? { limitCount: options } : (options || {});
    const collectionRef = collection(db, adminCollections.mcqs);
    let constraints: any[] = [where('status', '==', 'PUBLISHED')];
    if (opts.subject) {
      constraints.push(where('subject', '==', opts.subject));
    }
    const q = query(collectionRef, ...constraints);
    const snapshot = await getDocs(q);
    let items = snapshot.docs.map(d => {
      const data = d.data() as any;
      return { ...data, id: data.id || d.id, status: data.status || 'PUBLISHED' };
    });
    items.sort(() => Math.random() - 0.5);
    if (opts.limitCount && opts.limitCount > 0) {
      items = items.slice(0, opts.limitCount);
    }
    return items;
  } catch (err) {
    handleError('Error fetching random published MCQs:', err);
    return [];
  }
}

/**
 * Count available published MCQs for a topic.
 */
export async function getPublishedMcqCountForTopic(subject: string, chapter?: string, topicName?: string): Promise<number> {
  const items = await fetchPublishedMcqsForTopic(subject, chapter, topicName, 500);
  return items.length;
}

function subscribeToPublishedCollection<T>(collectionName: string, onUpdate: (items: T[]) => void) {
  const collectionRef = collection(db, collectionName);
  const q = query(collectionRef, where('status', '==', 'PUBLISHED'));
  return onSnapshot(q, (snapshot) => {
    const items: T[] = [];
    snapshot.forEach((d) => items.push(d.data() as T));
    items.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    onUpdate(items);
  }, (err) => {
    handleError(`Error subscribing to published collection ${collectionName}:`, err);
  });
}

async function getPublishedCollection<T>(collectionName: string): Promise<T[]> {
  try {
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, where('status', '==', 'PUBLISHED'));
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map((docSnap) => docSnap.data() as T);
    items.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return items;
  } catch (err) {
    handleError(`Error fetching published collection ${collectionName}:`, err);
    return [];
  }
}

export function subscribeToPublishedFlashcards(onUpdate: (items: Array<Flashcard & { id: string; status: AdminContentStatus }>) => void) {
  return subscribeToPublishedCollection<Flashcard & { id: string; status: AdminContentStatus }>(adminCollections.flashcards, onUpdate);
}

export async function getPublishedFlashcards(): Promise<Array<Flashcard & { id: string; status: AdminContentStatus }>> {
  return getPublishedCollection<Flashcard & { id: string; status: AdminContentStatus }>(adminCollections.flashcards);
}

export function subscribeToPublishedNotes(onUpdate: (items: Array<DefinitionItem & { id: string; status: AdminContentStatus }>) => void) {
  return subscribeToPublishedCollection<DefinitionItem & { id: string; status: AdminContentStatus }>(adminCollections.notes, onUpdate);
}

export async function getPublishedNotes(): Promise<Array<DefinitionItem & { id: string; status: AdminContentStatus }>> {
  return getPublishedCollection<DefinitionItem & { id: string; status: AdminContentStatus }>(adminCollections.notes);
}

export function subscribeToPublishedFormulas(onUpdate: (items: Array<FormulaItem & { id: string; status: AdminContentStatus }>) => void) {
  return subscribeToPublishedCollection<FormulaItem & { id: string; status: AdminContentStatus }>(adminCollections.formulas, onUpdate);
}

export async function getPublishedFormulas(): Promise<Array<FormulaItem & { id: string; status: AdminContentStatus }>> {
  return getPublishedCollection<FormulaItem & { id: string; status: AdminContentStatus }>(adminCollections.formulas);
}

export function subscribeToPublishedReactions(onUpdate: (items: Array<ReactionItem & { id: string; status: AdminContentStatus }>) => void) {
  return subscribeToPublishedCollection<ReactionItem & { id: string; status: AdminContentStatus }>(adminCollections.reactions, onUpdate);
}

export async function getPublishedReactions(): Promise<Array<ReactionItem & { id: string; status: AdminContentStatus }>> {
  return getPublishedCollection<ReactionItem & { id: string; status: AdminContentStatus }>(adminCollections.reactions);
}

export function subscribeToPublishedMindMaps(onUpdate: (items: Array<ConceptMindMap & { id: string; status: AdminContentStatus }>) => void) {
  return subscribeToPublishedCollection<ConceptMindMap & { id: string; status: AdminContentStatus }>(adminCollections.mindMaps, onUpdate);
}

export async function getPublishedMindMaps(): Promise<Array<ConceptMindMap & { id: string; status: AdminContentStatus }>> {
  return getPublishedCollection<ConceptMindMap & { id: string; status: AdminContentStatus }>(adminCollections.mindMaps);
}

export function subscribeToPublishedMnemonics(onUpdate: (items: Array<Flashcard & { id: string; status: AdminContentStatus }>) => void) {
  return subscribeToPublishedCollection<Flashcard & { id: string; status: AdminContentStatus }>(adminCollections.mnemonics, onUpdate);
}

export async function getPublishedMnemonics(): Promise<Array<Flashcard & { id: string; status: AdminContentStatus }>> {
  return getPublishedCollection<Flashcard & { id: string; status: AdminContentStatus }>(adminCollections.mnemonics);
}

export function subscribeToPublishedVocab(onUpdate: (items: Array<EnglishVocabWord & { id: string; status: AdminContentStatus }>) => void) {
  return subscribeToPublishedCollection<EnglishVocabWord & { id: string; status: AdminContentStatus }>(adminCollections.vocab, onUpdate);
}

export async function getPublishedVocab(): Promise<Array<EnglishVocabWord & { id: string; status: AdminContentStatus }>> {
  return getPublishedCollection<EnglishVocabWord & { id: string; status: AdminContentStatus }>(adminCollections.vocab);
}

export async function publishAdminMcq(mcqId: string, publishedBy: string) {
  return updateAdminMcq(mcqId, { status: 'PUBLISHED', publishedAt: new Date().toISOString(), publishedBy, updatedBy: publishedBy });
}

export async function unpublishAdminMcq(mcqId: string, updatedBy: string) {
  return updateAdminMcq(mcqId, { status: 'ARCHIVED', updatedBy });
}

export async function publishAdminVocab(vocabId: string, publishedBy: string) {
  return updateAdminVocab(vocabId, { status: 'PUBLISHED', updatedBy: publishedBy });
}

export async function unpublishAdminVocab(vocabId: string, updatedBy: string) {
  return updateAdminVocab(vocabId, { status: 'ARCHIVED', updatedBy });
}

// ------------------
// Notes
// ------------------
export async function createAdminNote(note: Omit<DefinitionItem, 'id'> & { createdBy: string; updatedBy: string; status: AdminContentStatus; tags?: string[]; title: string; summary: string; content: string; topic?: string }) {
  try {
    return await createAdminContent(adminCollections.notes, note);
  } catch (err) {
    handleError('Error creating admin note:', err);
  }
}

export async function updateAdminNote(noteId: string, update: Partial<DefinitionItem> & { updatedBy: string; status?: AdminContentStatus; tags?: string[] }) {
  try {
    await updateAdminContent(adminCollections.notes, noteId, update);
  } catch (err) {
    handleError('Error updating admin note:', err);
  }
}

export async function deleteAdminNote(noteId: string) {
  if (!noteId) return;
  try {
    await deleteDoc(doc(db, adminCollections.notes, noteId));
  } catch (err) {
    handleError('Error deleting admin note:', err);
  }
}

export function subscribeToAdminNotes(onUpdate: (items: Array<DefinitionItem & { id: string; status: AdminContentStatus }>) => void, statusFilter?: AdminContentStatus) {
  const collectionRef = collection(db, adminCollections.notes);
  const q = statusFilter
    ? query(collectionRef, where('status', '==', statusFilter))
    : query(collectionRef);
  return onSnapshot(q, (snapshot) => {
    const items: Array<DefinitionItem & { id: string; status: AdminContentStatus }> = [];
    snapshot.forEach((d) => items.push(d.data() as DefinitionItem & { id: string; status: AdminContentStatus }));
    items.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    onUpdate(items);
  }, (err) => {
    handleError('Error subscribing to admin notes:', err);
  });
}

// ------------------
// Flashcards
// ------------------
export async function createAdminFlashcard(flashcard: Omit<Flashcard, 'id'> & { createdBy: string; updatedBy: string; status: AdminContentStatus; tags?: string[] }) {
  try {
    return await createAdminContent(adminCollections.flashcards, flashcard);
  } catch (err) {
    handleError('Error creating admin flashcard:', err);
  }
}

export async function updateAdminFlashcard(flashcardId: string, update: Partial<Flashcard> & { updatedBy: string; status?: AdminContentStatus; tags?: string[] }) {
  try {
    await updateAdminContent(adminCollections.flashcards, flashcardId, update);
  } catch (err) {
    handleError('Error updating admin flashcard:', err);
  }
}

export async function deleteAdminFlashcard(flashcardId: string) {
  if (!flashcardId) return;
  try {
    await deleteDoc(doc(db, adminCollections.flashcards, flashcardId));
  } catch (err) {
    handleError('Error deleting admin flashcard:', err);
  }
}

export function subscribeToAdminFlashcards(onUpdate: (items: Array<Flashcard & { id: string; status: AdminContentStatus }>) => void, statusFilter?: AdminContentStatus) {
  const collectionRef = collection(db, adminCollections.flashcards);
  const q = statusFilter
    ? query(collectionRef, where('status', '==', statusFilter))
    : query(collectionRef);
  return onSnapshot(q, (snapshot) => {
    const items: Array<Flashcard & { id: string; status: AdminContentStatus }> = [];
    snapshot.forEach((d) => items.push(d.data() as Flashcard & { id: string; status: AdminContentStatus }));
    items.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    onUpdate(items);
  }, (err) => {
    handleError('Error subscribing to admin flashcards:', err);
  });
}

// ------------------
// Formulas
// ------------------
export async function createAdminFormula(formula: Omit<FormulaItem, 'id'> & { createdBy: string; updatedBy: string; status: AdminContentStatus; tags?: string[] }) {
  try {
    return await createAdminContent(adminCollections.formulas, formula);
  } catch (err) {
    handleError('Error creating admin formula:', err);
  }
}

export async function updateAdminFormula(formulaId: string, update: Partial<FormulaItem> & { updatedBy: string; status?: AdminContentStatus; tags?: string[] }) {
  try {
    await updateAdminContent(adminCollections.formulas, formulaId, update);
  } catch (err) {
    handleError('Error updating admin formula:', err);
  }
}

export async function deleteAdminFormula(formulaId: string) {
  if (!formulaId) return;
  try {
    await deleteDoc(doc(db, adminCollections.formulas, formulaId));
  } catch (err) {
    handleError('Error deleting admin formula:', err);
  }
}

export function subscribeToAdminFormulas(onUpdate: (items: Array<FormulaItem & { id: string; status: AdminContentStatus }>) => void, statusFilter?: AdminContentStatus) {
  const collectionRef = collection(db, adminCollections.formulas);
  const q = statusFilter
    ? query(collectionRef, where('status', '==', statusFilter))
    : query(collectionRef);
  return onSnapshot(q, (snapshot) => {
    const items: Array<FormulaItem & { id: string; status: AdminContentStatus }> = [];
    snapshot.forEach((d) => items.push(d.data() as FormulaItem & { id: string; status: AdminContentStatus }));
    items.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    onUpdate(items);
  }, (err) => {
    handleError('Error subscribing to admin formulas:', err);
  });
}

// ------------------
// Reactions
// ------------------
export async function createAdminReaction(reaction: Omit<ReactionItem, 'id'> & { createdBy: string; updatedBy: string; status: AdminContentStatus; tags?: string[] }) {
  try {
    return await createAdminContent(adminCollections.reactions, reaction);
  } catch (err) {
    handleError('Error creating admin reaction:', err);
  }
}

export async function updateAdminReaction(reactionId: string, update: Partial<ReactionItem> & { updatedBy: string; status?: AdminContentStatus; tags?: string[] }) {
  try {
    await updateAdminContent(adminCollections.reactions, reactionId, update);
  } catch (err) {
    handleError('Error updating admin reaction:', err);
  }
}

export async function deleteAdminReaction(reactionId: string) {
  if (!reactionId) return;
  try {
    await deleteDoc(doc(db, adminCollections.reactions, reactionId));
  } catch (err) {
    handleError('Error deleting admin reaction:', err);
  }
}

export function subscribeToAdminReactions(onUpdate: (items: Array<ReactionItem & { id: string; status: AdminContentStatus }>) => void, statusFilter?: AdminContentStatus) {
  const collectionRef = collection(db, adminCollections.reactions);
  const q = statusFilter
    ? query(collectionRef, where('status', '==', statusFilter))
    : query(collectionRef);
  return onSnapshot(q, (snapshot) => {
    const items: Array<ReactionItem & { id: string; status: AdminContentStatus }> = [];
    snapshot.forEach((d) => items.push(d.data() as ReactionItem & { id: string; status: AdminContentStatus }));
    items.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    onUpdate(items);
  }, (err) => {
    handleError('Error subscribing to admin reactions:', err);
  });
}

// ------------------
// MindMaps
// ------------------
export async function createAdminMindMap(mindMap: Omit<ConceptMindMap, 'id'> & { createdBy: string; updatedBy: string; status: AdminContentStatus; tags?: string[] }) {
  try {
    return await createAdminContent(adminCollections.mindMaps, mindMap);
  } catch (err) {
    handleError('Error creating admin mind map:', err);
  }
}

export async function updateAdminMindMap(mindMapId: string, update: Partial<ConceptMindMap> & { updatedBy: string; status?: AdminContentStatus; tags?: string[] }) {
  try {
    await updateAdminContent(adminCollections.mindMaps, mindMapId, update);
  } catch (err) {
    handleError('Error updating admin mind map:', err);
  }
}

export async function deleteAdminMindMap(mindMapId: string) {
  if (!mindMapId) return;
  try {
    await deleteDoc(doc(db, adminCollections.mindMaps, mindMapId));
  } catch (err) {
    handleError('Error deleting admin mind map:', err);
  }
}

export function subscribeToAdminMindMaps(onUpdate: (items: Array<ConceptMindMap & { id: string; status: AdminContentStatus }>) => void, statusFilter?: AdminContentStatus) {
  const collectionRef = collection(db, adminCollections.mindMaps);
  const q = statusFilter
    ? query(collectionRef, where('status', '==', statusFilter))
    : query(collectionRef);
  return onSnapshot(q, (snapshot) => {
    const items: Array<ConceptMindMap & { id: string; status: AdminContentStatus }> = [];
    snapshot.forEach((d) => items.push(d.data() as ConceptMindMap & { id: string; status: AdminContentStatus }));
    items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    onUpdate(items);
  }, (err) => {
    handleError('Error subscribing to admin mind maps:', err);
  });
}

// ------------------
// Mnemonics
// ------------------
export async function createAdminMnemonic(mnemonic: Omit<CustomMCQ, 'id'> & { createdBy: string; updatedBy: string; status: AdminContentStatus; tags?: string[] }) {
  try {
    return await createAdminContent(adminCollections.mnemonics, mnemonic);
  } catch (err) {
    handleError('Error creating admin mnemonic:', err);
  }
}

export async function updateAdminMnemonic(mnemonicId: string, update: Partial<CustomMCQ> & { updatedBy: string; status?: AdminContentStatus; tags?: string[] }) {
  try {
    await updateAdminContent(adminCollections.mnemonics, mnemonicId, update);
  } catch (err) {
    handleError('Error updating admin mnemonic:', err);
  }
}

export async function deleteAdminMnemonic(mnemonicId: string) {
  if (!mnemonicId) return;
  try {
    await deleteDoc(doc(db, adminCollections.mnemonics, mnemonicId));
  } catch (err) {
    handleError('Error deleting admin mnemonic:', err);
  }
}

export async function createAdminVocab(vocab: Omit<EnglishVocabWord, 'id'> & { createdBy: string; updatedBy: string; status: AdminContentStatus; tags?: string[] }) {
  try {
    return await createAdminContent(adminCollections.vocab, vocab);
  } catch (err) {
    handleError('Error creating admin vocab entry:', err);
  }
}

export async function updateAdminVocab(vocabId: string, update: Partial<EnglishVocabWord> & { updatedBy: string; status?: AdminContentStatus; tags?: string[] }) {
  try {
    await updateAdminContent(adminCollections.vocab, vocabId, update);
  } catch (err) {
    handleError('Error updating admin vocab entry:', err);
  }
}

export async function deleteAdminVocab(vocabId: string) {
  if (!vocabId) return;
  try {
    await deleteDoc(doc(db, adminCollections.vocab, vocabId));
  } catch (err) {
    handleError('Error deleting admin vocab entry:', err);
  }
}

export function subscribeToAdminVocab(onUpdate: (items: Array<EnglishVocabWord & { id: string; status: AdminContentStatus }>) => void, statusFilter?: AdminContentStatus) {
  const collectionRef = collection(db, adminCollections.vocab);
  const q = statusFilter
    ? query(collectionRef, where('status', '==', statusFilter))
    : query(collectionRef);
  return onSnapshot(q, (snapshot) => {
    const items: Array<EnglishVocabWord & { id: string; status: AdminContentStatus }> = [];
    snapshot.forEach((d) => items.push(d.data() as EnglishVocabWord & { id: string; status: AdminContentStatus }));
    items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    onUpdate(items);
  }, (err) => {
    handleError('Error subscribing to admin vocab items:', err);
  });
}

export function subscribeToAdminMnemonics(onUpdate: (items: Array<CustomMCQ & { id: string; status: AdminContentStatus }>) => void, statusFilter?: AdminContentStatus) {
  const collectionRef = collection(db, adminCollections.mnemonics);
  const q = statusFilter
    ? query(collectionRef, where('status', '==', statusFilter))
    : query(collectionRef);
  return onSnapshot(q, (snapshot) => {
    const items: Array<CustomMCQ & { id: string; status: AdminContentStatus }> = [];
    snapshot.forEach((d) => items.push(d.data() as CustomMCQ & { id: string; status: AdminContentStatus }));
    items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    onUpdate(items);
  }, (err) => {
    handleError('Error subscribing to admin mnemonics:', err);
  });
}

// ------------------
// Syllabus Mapping
// ------------------
export async function createSyllabusMapping(mapping: Omit<SyllabusMappingDocument, 'id'> & { createdBy: string; updatedBy: string }) {
  try {
    return await createAdminContent(adminCollections.syllabusMappings, mapping);
  } catch (err) {
    handleError('Error creating syllabus mapping:', err);
  }
}

export async function updateSyllabusMapping(mappingId: string, update: Partial<SyllabusMappingDocument> & { updatedBy: string }) {
  try {
    await updateAdminContent(adminCollections.syllabusMappings, mappingId, update);
  } catch (err) {
    handleError('Error updating syllabus mapping:', err);
  }
}

export async function deleteSyllabusMapping(mappingId: string) {
  if (!mappingId) return;
  try {
    await deleteDoc(doc(db, adminCollections.syllabusMappings, mappingId));
  } catch (err) {
    handleError('Error deleting syllabus mapping:', err);
  }
}

export function subscribeToSyllabusMappings(onUpdate: (items: Array<SyllabusMappingDocument & { id: string }>) => void, boardFilter?: string) {
  const collectionRef = collection(db, adminCollections.syllabusMappings);
  const q = boardFilter
    ? query(collectionRef, where('board', '==', boardFilter))
    : query(collectionRef);
  return onSnapshot(q, (snapshot) => {
    const items: Array<SyllabusMappingDocument & { id: string }> = [];
    snapshot.forEach((d) => items.push(d.data() as SyllabusMappingDocument & { id: string }));
    items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    onUpdate(items);
  }, (err) => {
    handleError('Error subscribing to syllabus mappings:', err);
  });
}

// ------------------
// Admin Users
// ------------------
export async function createAdminUser(adminUser: Omit<AdminUser, 'createdAt' | 'updatedAt'>) {
  try {
    const ref = doc(db, adminCollections.adminUsers, adminUser.uid);
    await setDoc(ref, {
      ...adminUser,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return ref.id;
  } catch (err) {
    handleError('Error creating admin user:', err);
  }
}

export async function updateAdminUser(uid: string, update: Partial<Omit<AdminUser, 'uid' | 'createdBy' | 'createdAt'>>) {
  if (!uid) return;
  try {
    const userRef = doc(db, adminCollections.adminUsers, uid);
    await updateDoc(userRef, {
      ...update,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleError('Error updating admin user:', err);
  }
}

export function subscribeToAdminUsers(onUpdate: (users: AdminUser[]) => void) {
  const q = query(collection(db, adminCollections.adminUsers));
  return onSnapshot(q, (snapshot) => {
    const users: AdminUser[] = [];
    snapshot.forEach((d) => users.push(d.data() as AdminUser));
    users.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    onUpdate(users);
  }, (err) => {
    handleError('Error subscribing to admin users:', err);
  });
}

export async function deleteAdminUser(uid: string) {
  if (!uid) return;
  try {
    await deleteDoc(doc(db, adminCollections.adminUsers, uid));
  } catch (err) {
    handleError('Error deleting admin user:', err);
  }
}

export function subscribeToAdminUserProfile(uid: string, onUpdate: (user: AdminUser | null) => void) {
  if (!uid) return () => {};
  const userRef = doc(db, adminCollections.adminUsers, uid);
  return onSnapshot(userRef, (snapshot) => {
    onUpdate(snapshot.exists() ? (snapshot.data() as AdminUser) : null);
  }, (err) => {
    handleError('Error subscribing to admin user profile:', err);
  });
}

// ------------------
// Audit Logs
// ------------------
export async function createAuditLog(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>) {
  try {
    const ref = doc(collection(db, adminCollections.auditLogs));
    await setDoc(ref, {
      ...entry,
      id: ref.id,
      createdAt: new Date().toISOString()
    });
    return ref.id;
  } catch (err) {
    handleError('Error creating audit log entry:', err);
  }
}

export function subscribeToAuditLogs(onUpdate: (logs: AuditLogEntry[]) => void) {
  const q = query(collection(db, adminCollections.auditLogs), limit(100));
  return onSnapshot(q, (snapshot) => {
    const logs: AuditLogEntry[] = [];
    snapshot.forEach((d) => logs.push(d.data() as AuditLogEntry));
    logs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    onUpdate(logs);
  }, (err) => {
    handleError('Error subscribing to audit logs:', err);
  });
}

// ------------------
// Review Queue
// ------------------
export async function createReviewQueueItem(item: Omit<ReviewQueueItem, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const ref = doc(collection(db, adminCollections.reviewQueue));
    await setDoc(ref, {
      ...item,
      id: ref.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return ref.id;
  } catch (err) {
    handleError('Error creating review queue item:', err);
  }
}

export async function updateReviewQueueItem(itemId: string, update: Partial<ReviewQueueItem>) {
  if (!itemId) return;
  try {
    const ref = doc(db, adminCollections.reviewQueue, itemId);
    await updateDoc(ref, {
      ...update,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleError('Error updating review queue item:', err);
  }
}

export function subscribeToReviewQueue(onUpdate: (items: ReviewQueueItem[]) => void, statusFilter?: string) {
  const collectionRef = collection(db, adminCollections.reviewQueue);
  const q = statusFilter
    ? query(collectionRef, where('status', '==', statusFilter))
    : query(collectionRef);
  return onSnapshot(q, (snapshot) => {
    const items: ReviewQueueItem[] = [];
    snapshot.forEach((d) => items.push(d.data() as ReviewQueueItem));
    items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    onUpdate(items);
  }, (err) => {
    handleError('Error subscribing to review queue:', err);
  });
}

export async function deleteReviewQueueItem(itemId: string) {
  if (!itemId) return;
  try {
    await deleteDoc(doc(db, adminCollections.reviewQueue, itemId));
  } catch (err) {
    handleError('Error deleting review queue item:', err);
  }
}

// ------------------
// Content Versions
// ------------------
export async function createContentVersion(version: Omit<ContentVersion, 'id' | 'createdAt'>) {
  try {
    const ref = doc(collection(db, adminCollections.contentVersions));
    await setDoc(ref, {
      ...version,
      id: ref.id,
      createdAt: new Date().toISOString()
    });
    return ref.id;
  } catch (err) {
    handleError('Error creating content version:', err);
  }
}

export function subscribeToContentVersions(contentId: string, onUpdate: (versions: ContentVersion[]) => void) {
  const q = query(collection(db, adminCollections.contentVersions), where('contentId', '==', contentId));
  return onSnapshot(q, (snapshot) => {
    const versions: ContentVersion[] = [];
    snapshot.forEach((d) => versions.push(d.data() as ContentVersion));
    versions.sort((a, b) => (b.version || 0) - (a.version || 0));
    onUpdate(versions);
  }, (err) => {
    handleError('Error subscribing to content versions:', err);
  });
}

// ------------------
// Backup Records
// ------------------
export async function createBackupRecord(record: Omit<BackupRecord, 'id' | 'createdAt'>) {
  try {
    const ref = doc(collection(db, adminCollections.backups));
    await setDoc(ref, {
      ...record,
      id: ref.id,
      createdAt: new Date().toISOString()
    });
    return ref.id;
  } catch (err) {
    handleError('Error creating backup record:', err);
  }
}

export function subscribeToBackupRecords(onUpdate: (records: BackupRecord[]) => void) {
  const q = query(collection(db, adminCollections.backups), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const records: BackupRecord[] = [];
    snapshot.forEach((d) => records.push(d.data() as BackupRecord));
    onUpdate(records);
  }, (err) => {
    handleError('Error subscribing to backup records:', err);
  });
}

// ------------------
// AI Quiz Persistence
// ------------------

export type SaveAiQuizInput = Omit<SavedAiQuiz, 'id' | 'createdAt' | 'updatedAt' | 'attemptCount' | 'bestScore' | 'lastScore' | 'lastAttemptAt'> & Partial<Pick<SavedAiQuiz, 'createdAt' | 'updatedAt' | 'attemptCount' | 'bestScore' | 'lastScore' | 'lastAttemptAt'>>;

/**
 * Save a generated AI quiz to Firestore
 */
export async function saveAiQuiz(userId: string, quiz: SaveAiQuizInput): Promise<{ success: boolean; quizId?: string; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User not authenticated' };
  }

  try {
    const quizRef = doc(collection(db, 'aiQuizzes'));
    const quizId = quizRef.id;
    const timestamp = timestampValue();

    await setDoc(quizRef, {
      ...quiz,
      id: quizId,
      userId,
      createdAt: quiz.createdAt || timestamp,
      updatedAt: timestamp,
      attemptCount: quiz.attemptCount ?? 0,
      bestScore: quiz.bestScore ?? 0,
      lastScore: quiz.lastScore ?? 0,
      lastAttemptAt: quiz.lastAttemptAt || timestamp
    });

    return { success: true, quizId };
  } catch (err) {
    handleError('Error saving AI quiz:', err);
    return { success: false, error: 'Failed to save quiz' };
  }
}

/**
 * Subscribe to user's saved AI quizzes
 */
export function subscribeToAiQuizzes(userId: string, onUpdate: (quizzes: SavedAiQuiz[]) => void) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const q = query(collection(db, 'aiQuizzes'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const quizzes: SavedAiQuiz[] = [];
    snapshot.forEach((d) => quizzes.push(d.data() as SavedAiQuiz));
    quizzes.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    onUpdate(quizzes);
  }, (err) => {
    handleError('Error subscribing to AI quizzes:', err);
  });
}

/**
 * Update quiz attempt data
 */
export async function updateAiQuizAttempt(quizId: string, score: number, total: number): Promise<{ success: boolean; error?: string }> {
  try {
    const quizRef = doc(db, 'aiQuizzes', quizId);
    const currentDoc = await getDoc(quizRef);
    
    if (!currentDoc.exists()) {
      return { success: false, error: 'Quiz not found' };
    }

    const currentData = currentDoc.data() as SavedAiQuiz;
    const newBestScore = Math.max(currentData.bestScore, score);
    const newAttemptCount = currentData.attemptCount + 1;

    await updateDoc(quizRef, {
      lastScore: score,
      bestScore: newBestScore,
      attemptCount: newAttemptCount,
      lastAttemptAt: timestampValue(),
      updatedAt: timestampValue()
    });

    return { success: true };
  } catch (err) {
    handleError('Error updating AI quiz attempt:', err);
    return { success: false, error: 'Failed to update attempt' };
  }
}

/**
 * Delete a saved AI quiz
 */
export async function deleteAiQuiz(quizId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, 'aiQuizzes', quizId));
    return { success: true };
  } catch (err) {
    handleError('Error deleting AI quiz:', err);
    return { success: false, error: 'Failed to delete quiz' };
  }
}

// ------------------
// User-Owned AI Content
// ------------------

/**
 * Save user-generated AI flashcards
 */
export async function saveUserFlashcards(userId: string, flashcards: Omit<Flashcard, 'id'>[]): Promise<{ success: boolean; count?: number; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User not authenticated' };
  }

  try {
    const batch = writeBatch(db);
    const timestamp = timestampValue();

    flashcards.forEach((fc) => {
      const docRef = doc(collection(db, 'userFlashcards'));
      batch.set(docRef, {
        ...fc,
        id: docRef.id,
        userId,
        createdAt: (fc as any).createdAt || timestamp,
        updatedAt: timestamp,
        isCustomStudentCard: true
      });
    });

    await batch.commit();
    return { success: true, count: flashcards.length };
  } catch (err) {
    handleError('Error saving user flashcards:', err);
    return { success: false, error: 'Failed to save flashcards' };
  }
}

/**
 * Subscribe to user's flashcards
 */
export function subscribeToUserFlashcards(userId: string, onUpdate: (flashcards: Array<Flashcard & { id: string }>) => void) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const q = query(collection(db, 'userFlashcards'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const flashcards: Array<Flashcard & { id: string }> = [];
    snapshot.forEach((d) => flashcards.push(d.data() as Flashcard & { id: string }));
    flashcards.sort((a, b) => ((b as any).createdAt || '').localeCompare((a as any).createdAt || ''));
    onUpdate(flashcards);
  }, (err) => {
    handleError('Error subscribing to user flashcards:', err);
  });
}

/**
 * Save user-generated AI mind map
 */
export async function saveUserMindMap(userId: string, mindMap: Omit<ConceptMindMap, 'id'>): Promise<{ success: boolean; mindMapId?: string; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User not authenticated' };
  }

  try {
    const docRef = doc(collection(db, 'userMindMaps'));
    const mindMapId = docRef.id;
    const timestamp = timestampValue();

    await setDoc(docRef, {
      ...mindMap,
      id: mindMapId,
      userId,
      createdAt: (mindMap as any).createdAt || timestamp,
      updatedAt: timestamp
    });

    return { success: true, mindMapId };
  } catch (err) {
    handleError('Error saving user mind map:', err);
    return { success: false, error: 'Failed to save mind map' };
  }
}

/**
 * Subscribe to user's mind maps
 */
export function subscribeToUserMindMaps(userId: string, onUpdate: (mindMaps: Array<ConceptMindMap & { id: string }>) => void) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const q = query(collection(db, 'userMindMaps'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const mindMaps: Array<ConceptMindMap & { id: string }> = [];
    snapshot.forEach((d) => mindMaps.push(d.data() as ConceptMindMap & { id: string }));
    mindMaps.sort((a, b) => ((b as any).createdAt || '').localeCompare((a as any).createdAt || ''));
    onUpdate(mindMaps);
  }, (err) => {
    handleError('Error subscribing to user mind maps:', err);
  });
}

/**
 * Save user-generated AI mnemonic
 */
export async function saveUserMnemonic(userId: string, mnemonic: Omit<Flashcard, 'id'>): Promise<{ success: boolean; mnemonicId?: string; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User not authenticated' };
  }

  try {
    const docRef = doc(collection(db, 'userMnemonics'));
    const mnemonicId = docRef.id;
    const timestamp = timestampValue();

    await setDoc(docRef, {
      ...mnemonic,
      id: mnemonicId,
      userId,
      createdAt: (mnemonic as any).createdAt || timestamp,
      updatedAt: timestamp,
      cardType: 'standard'
    });

    return { success: true, mnemonicId };
  } catch (err) {
    handleError('Error saving user mnemonic:', err);
    return { success: false, error: 'Failed to save mnemonic' };
  }
}

/**
 * Subscribe to user's mnemonics
 */
export function subscribeToUserMnemonics(userId: string, onUpdate: (mnemonics: Array<Flashcard & { id: string }>) => void) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const q = query(collection(db, 'userMnemonics'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const mnemonics: Array<Flashcard & { id: string }> = [];
    snapshot.forEach((d) => mnemonics.push(d.data() as Flashcard & { id: string }));
    mnemonics.sort((a, b) => ((b as any).createdAt || '').localeCompare((a as any).createdAt || ''));
    onUpdate(mnemonics);
  }, (err) => {
    handleError('Error subscribing to user mnemonics:', err);
  });
}

/**
 * Save user-generated AI formula
 */
export async function saveUserFormula(userId: string, formula: Omit<FormulaItem, 'id'>): Promise<{ success: boolean; formulaId?: string; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User not authenticated' };
  }

  try {
    const docRef = doc(collection(db, 'userFormulas'));
    const formulaId = docRef.id;
    const timestamp = timestampValue();

    await setDoc(docRef, {
      ...formula,
      id: formulaId,
      userId,
      createdAt: (formula as any).createdAt || timestamp,
      updatedAt: timestamp
    });

    return { success: true, formulaId };
  } catch (err) {
    handleError('Error saving user formula:', err);
    return { success: false, error: 'Failed to save formula' };
  }
}

/**
 * Subscribe to user's formulas
 */
export function subscribeToUserFormulas(userId: string, onUpdate: (formulas: Array<FormulaItem & { id: string }>) => void) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const q = query(collection(db, 'userFormulas'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const formulas: Array<FormulaItem & { id: string }> = [];
    snapshot.forEach((d) => formulas.push(d.data() as FormulaItem & { id: string }));
    formulas.sort((a, b) => ((b as any).createdAt || '').localeCompare((a as any).createdAt || ''));
    onUpdate(formulas);
  }, (err) => {
    handleError('Error subscribing to user formulas:', err);
  });
}

/**
 * Save user-generated AI reaction
 */
export async function saveUserReaction(userId: string, reaction: Omit<ReactionItem, 'id'>): Promise<{ success: boolean; reactionId?: string; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User not authenticated' };
  }

  try {
    const docRef = doc(collection(db, 'userReactions'));
    const reactionId = docRef.id;
    const timestamp = timestampValue();

    await setDoc(docRef, {
      ...reaction,
      id: reactionId,
      userId,
      createdAt: (reaction as any).createdAt || timestamp,
      updatedAt: timestamp
    });

    return { success: true, reactionId };
  } catch (err) {
    handleError('Error saving user reaction:', err);
    return { success: false, error: 'Failed to save reaction' };
  }
}

/**
 * Subscribe to user's reactions
 */
export function subscribeToUserReactions(userId: string, onUpdate: (reactions: Array<ReactionItem & { id: string }>) => void) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const q = query(collection(db, 'userReactions'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const reactions: Array<ReactionItem & { id: string }> = [];
    snapshot.forEach((d) => reactions.push(d.data() as ReactionItem & { id: string }));
    reactions.sort((a, b) => ((b as any).createdAt || '').localeCompare((a as any).createdAt || ''));
    onUpdate(reactions);
  }, (err) => {
    handleError('Error subscribing to user reactions:', err);
  });
}

/**
 * Save user-generated AI definition
 */
export async function saveUserDefinition(userId: string, definition: Omit<DefinitionItem, 'id'>): Promise<{ success: boolean; definitionId?: string; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User not authenticated' };
  }

  try {
    const docRef = doc(collection(db, 'userDefinitions'));
    const definitionId = docRef.id;
    const timestamp = timestampValue();

    await setDoc(docRef, {
      ...definition,
      id: definitionId,
      userId,
      createdAt: (definition as any).createdAt || timestamp,
      updatedAt: timestamp
    });

    return { success: true, definitionId };
  } catch (err) {
    handleError('Error saving user definition:', err);
    return { success: false, error: 'Failed to save definition' };
  }
}

/**
 * Subscribe to user's definitions
 */
export function subscribeToUserDefinitions(userId: string, onUpdate: (definitions: Array<DefinitionItem & { id: string }>) => void) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const q = query(collection(db, 'userDefinitions'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const definitions: Array<DefinitionItem & { id: string }> = [];
    snapshot.forEach((d) => definitions.push(d.data() as DefinitionItem & { id: string }));
    definitions.sort((a, b) => ((b as any).createdAt || '').localeCompare((a as any).createdAt || ''));
    onUpdate(definitions);
  }, (err) => {
    handleError('Error subscribing to user definitions:', err);
  });
}

/**
 * Delete user-owned content
 */
export async function deleteUserContent(
  collectionName: 'userFlashcards' | 'userMindMaps' | 'userMnemonics' | 'userFormulas' | 'userReactions' | 'userDefinitions' | 'userPrismSessions' | 'userNotes',
  docId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, collectionName, docId));
    return { success: true };
  } catch (err) {
    handleError('Error deleting user content:', err);
    return { success: false, error: 'Failed to delete content' };
  }
}

/**
 * Save user PRISM synthesis session
 */
export async function saveUserPrismSession(userId: string, session: Omit<PrismSession, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User must be signed in to save PRISM session' };
  }

  try {
    const sessionId = session.id || `prism_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sessionDocRef = doc(db, 'userPrismSessions', sessionId);
    
    await setDoc(sessionDocRef, {
      ...session,
      id: sessionId,
      userId,
      createdAt: timestampValue(),
      updatedAt: timestampValue()
    });

    return { success: true, sessionId };
  } catch (err) {
    handleError('Error saving PRISM session:', err);
    return { success: false, error: 'Failed to save PRISM session' };
  }
}

/**
 * Subscribe to user's PRISM sessions
 */
export function subscribeToUserPrismSessions(userId: string, onUpdate: (sessions: PrismSession[]) => void) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const q = query(collection(db, 'userPrismSessions'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const sessions: PrismSession[] = [];
    snapshot.forEach((d) => sessions.push(d.data() as PrismSession));
    sessions.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    onUpdate(sessions);
  }, (err) => {
    handleError('Error subscribing to PRISM sessions:', err);
  });
}

/**
 * Delete user PRISM session
 */
export async function deleteUserPrismSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  return deleteUserContent('userPrismSessions', sessionId);
}

// ------------------
// Past Papers Vault (Authentic Source Documents)
// ------------------
const PAST_PAPERS_STORAGE_KEY = 'nmdcat_past_papers';

export function getLocalPastPapers(): PastPaper[] {
  try {
    const raw = localStorage.getItem(PAST_PAPERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalPastPapers(papers: PastPaper[]) {
  try {
    localStorage.setItem(PAST_PAPERS_STORAGE_KEY, JSON.stringify(papers));
  } catch (err) {
    handleError('Error saving local past papers:', err);
  }
}

/**
 * Subscribe to published past papers for Students (Global)
 * Strictly filters for status == 'published'
 */
export function subscribeToPublishedPastPapers(onUpdate: (papers: PastPaper[]) => void) {
  const collectionRef = collection(db, 'pastPapers');
  const q = query(collectionRef);

  return onSnapshot(
    q,
    (snapshot) => {
      const remotePapers: PastPaper[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as any;
        const paper: PastPaper = { ...data, id: data.id || d.id };
        // Student only sees published papers
        if (paper.status === 'published' || (paper.status as any) === 'PUBLISHED' || (!paper.status && paper.verificationStatus === 'VERIFIED_OFFICIAL')) {
          remotePapers.push(paper);
        }
      });
      remotePapers.sort((a, b) => {
        const yearDiff = Number(b.year || 0) - Number(a.year || 0);
        if (yearDiff !== 0) return yearDiff;
        return (b.publishedAt || b.uploadedAt || '').localeCompare(a.publishedAt || a.uploadedAt || '');
      });

      // Update local cache
      saveLocalPastPapers(remotePapers);
      onUpdate(remotePapers);
    },
    (err) => {
      handleError('Error subscribing to published past papers:', err);
      // Fallback to cached published papers
      const cached = getLocalPastPapers().filter(p => p.status === 'published' || (p.status as any) === 'PUBLISHED');
      onUpdate(cached);
    }
  );
}

/**
 * Subscribe to all past papers for Admin CMS (Drafts, Published, Archived)
 */
export function subscribeToAllPastPapersForAdmin(onUpdate: (papers: PastPaper[]) => void) {
  const collectionRef = collection(db, 'pastPapers');
  const q = query(collectionRef);

  return onSnapshot(
    q,
    (snapshot) => {
      const papers: PastPaper[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as any;
        papers.push({ ...data, id: data.id || d.id });
      });
      papers.sort((a, b) => {
        const yearDiff = Number(b.year || 0) - Number(a.year || 0);
        if (yearDiff !== 0) return yearDiff;
        return (b.uploadedAt || '').localeCompare(a.uploadedAt || '');
      });
      onUpdate(papers);
    },
    (err) => {
      handleError('Error subscribing to admin past papers:', err);
      onUpdate(getLocalPastPapers());
    }
  );
}

// Backward-compatible alias
export const subscribeToPastPapers = subscribeToPublishedPastPapers;

/**
 * Save / Update a Global Past Paper in Firestore
 */
export async function saveGlobalPastPaper(
  paper: PastPaper,
  adminUid: string
): Promise<{ success: boolean; id: string; duplicate?: boolean; error?: string }> {
  const paperId = paper.id || `past_paper_${Date.now()}`;
  const timestamp = timestampValue();

  const payload: PastPaper = {
    ...paper,
    id: paperId,
    status: paper.status || 'draft',
    uploadedAt: paper.uploadedAt || timestamp,
    uploadedBy: adminUid || paper.uploadedBy || 'admin',
    publishedAt: paper.status === 'published' ? (paper.publishedAt || timestamp) : paper.publishedAt,
    publishedBy: paper.status === 'published' ? (paper.publishedBy || adminUid) : paper.publishedBy,
    questionCount: paper.questions?.length || paper.questionCount || 0
  };

  try {
    const docRef = doc(db, 'pastPapers', paperId);
    await setDoc(docRef, payload, { merge: true });

    // Also persist individual questions into subcollection for scalability
    if (Array.isArray(paper.questions) && paper.questions.length > 0) {
      try {
        const batchOps = paper.questions.slice(0, 50).map(async (q, idx) => {
          const qId = q.id || `q_${idx + 1}`;
          const qDocRef = doc(db, 'pastPapers', paperId, 'questions', qId);
          return setDoc(qDocRef, { ...q, pastPaperId: paperId, originalQuestionNumber: q.originalQuestionNumber || idx + 1 }, { merge: true });
        });
        await Promise.all(batchOps);
      } catch (subErr) {
        console.warn('Subcollection sync error (non-fatal):', subErr);
      }
    }

    // Update local cache
    const localPapers = getLocalPastPapers();
    const existingIndex = localPapers.findIndex((p) => p.id === paperId);
    if (existingIndex >= 0) {
      localPapers[existingIndex] = payload;
    } else {
      localPapers.unshift(payload);
    }
    saveLocalPastPapers(localPapers);

    return { success: true, id: paperId };
  } catch (err: any) {
    handleError('Error saving global past paper:', err);
    return { success: false, id: paperId, error: err?.message };
  }
}

// Backward-compatible alias
export async function savePastPaper(
  userId: string,
  paper: PastPaper
): Promise<{ success: boolean; id: string; duplicate?: boolean; error?: string }> {
  return saveGlobalPastPaper(paper, userId);
}

/**
 * Publish a Past Paper globally so students can see and solve it
 */
export async function publishPastPaper(
  paperId: string, 
  adminUid: string
): Promise<{ success: boolean; error?: string }> {
  if (!paperId) return { success: false, error: 'Paper ID is required' };
  try {
    const docRef = doc(db, 'pastPapers', paperId);
    const publishedAt = timestampValue();
    await updateDoc(docRef, {
      status: 'published',
      publishedAt,
      publishedBy: adminUid || 'admin'
    });
    return { success: true };
  } catch (err: any) {
    handleError('Error publishing past paper:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Unpublish a Past Paper (revert to draft)
 */
export async function unpublishPastPaper(
  paperId: string
): Promise<{ success: boolean; error?: string }> {
  if (!paperId) return { success: false, error: 'Paper ID is required' };
  try {
    const docRef = doc(db, 'pastPapers', paperId);
    await updateDoc(docRef, {
      status: 'draft'
    });
    return { success: true };
  } catch (err: any) {
    handleError('Error unpublishing past paper:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Archive a Past Paper
 */
export async function archivePastPaper(
  paperId: string
): Promise<{ success: boolean; error?: string }> {
  if (!paperId) return { success: false, error: 'Paper ID is required' };
  try {
    const docRef = doc(db, 'pastPapers', paperId);
    await updateDoc(docRef, {
      status: 'archived'
    });
    return { success: true };
  } catch (err: any) {
    handleError('Error archiving past paper:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Update Past Paper Metadata & Questions
 */
export async function updatePastPaperMetadata(
  paperId: string,
  updates: Partial<PastPaper>
): Promise<{ success: boolean; error?: string }> {
  if (!paperId) return { success: false, error: 'Paper ID is required' };
  try {
    const docRef = doc(db, 'pastPapers', paperId);
    await updateDoc(docRef, updates as any);
    return { success: true };
  } catch (err: any) {
    handleError('Error updating past paper metadata:', err);
    return { success: false, error: err?.message };
  }
}

export async function deletePastPaper(paperId: string): Promise<{ success: boolean; error?: string }> {
  if (!paperId) return { success: false, error: 'Paper ID is required' };

  try {
    const docRef = doc(db, 'pastPapers', paperId);
    await deleteDoc(docRef);

    const localPapers = getLocalPastPapers().filter((p) => p.id !== paperId);
    saveLocalPastPapers(localPapers);

    return { success: true };
  } catch (err: any) {
    handleError('Error deleting past paper:', err);
    const localPapers = getLocalPastPapers().filter((p) => p.id !== paperId);
    saveLocalPastPapers(localPapers);
    return { success: true, error: err?.message };
  }
}

export async function getPastPaperById(paperId: string): Promise<PastPaper | null> {
  if (!paperId) return null;
  try {
    const docRef = doc(db, 'pastPapers', paperId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as PastPaper;
    }
  } catch (err) {
    handleError('Error getting past paper by ID from remote:', err);
  }

  const localPapers = getLocalPastPapers();
  const local = localPapers.find((p) => p.id === paperId);
  if (local) return local;

  return null;
}

// ------------------
// Firestore Health
// ------------------
export async function syncFirestoreNow(): Promise<boolean> {
  try {
    await Promise.all([
      getDocs(query(collection(db, adminCollections.mcqs), limit(1))),
      getDocs(query(collection(db, adminCollections.notes), limit(1))),
      getDocs(query(collection(db, adminCollections.flashcards), limit(1)))
    ]);
    return true;
  } catch (err) {
    handleError('Error syncing Firestore now:', err);
    return false;
  }
}


