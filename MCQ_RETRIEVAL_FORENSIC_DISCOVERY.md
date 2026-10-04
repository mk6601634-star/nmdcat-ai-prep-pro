# MCQ RETRIEVAL — FORENSIC DISCOVERY REPORT (PHASE 1)

**Application:** NMDCAT AI Prep Pro  
**Date:** October 4, 2026  
**Auditor:** Antigravity Data Integrity Specialist  
**Active Production Firebase Project:** `nmdcat-prep-pro` (`projectId: "nmdcat-prep-pro"`, `storageBucket: "nmdcat-prep-pro.firebasestorage.app"`)  

---

## 1. Summary of All MCQ Retrieval Paths Found

| Path # | Retrieval Function / Mechanism | Source Location | Ingestion / Query Mechanism |
| :--- | :--- | :--- | :--- |
| **Path 1** | `subscribeToPublishedMcqs` | [`src/lib/firestoreService.ts#L781`](file:///c:/Users/mehra/Documents/for%20cline%20vs%20code/src/lib/firestoreService.ts#L781) | Direct Firestore listener on `collection('mcqs')` where `status == 'PUBLISHED'`. Feeds global `questionBank` state in `App.tsx` and mirrors to `localStorage['nmdcat_qbank']`. |
| **Path 2** | `getCanonicalMCQs` | [`src/lib/mcqRetrievalService.ts#L53`](file:///c:/Users/mehra/Documents/for%20cline%20vs%20code/src/lib/mcqRetrievalService.ts#L53) | Multi-tier retriever: checks in-memory `questionBank` against canonical subject/chapter/topic constraints; if count insufficient, queries Firestore with `where('status', '==', 'PUBLISHED')` and `where('subject', '==', label)`. |
| **Path 3** | `matchQuestionsFromBank` | [`src/utils/topicMatcher.ts#L79`](file:///c:/Users/mehra/Documents/for%20cline%20vs%20code/src/utils/topicMatcher.ts#L79) | In-memory token-similarity scoring on `questionBank`. Contains a broad "same-subject fallback" when token score $\le 0.5$. |
| **Path 4** | `filterDatabaseMCQsForTopic` | [`src/utils/topicMasteryUtils.ts#L192`](file:///c:/Users/mehra/Documents/for%20cline%20vs%20code/src/utils/topicMasteryUtils.ts#L192) | In-memory keyword and chapter matching on `questionBank`. Returns exact topic matches, same-chapter matches, or `[]` (empty array). |
| **Path 5** | Direct Firestore helpers: `fetchPublishedMcqsForTopic`, `fetchRandomPublishedMcqs`, `fetchPublishedMcqsBySubject` | [`src/lib/firestoreService.ts#L1000-L1110`](file:///c:/Users/mehra/Documents/for%20cline%20vs%20code/src/lib/firestoreService.ts#L1000-L1110) | Single-call Firestore queries using `getDocs(query(collection('mcqs'), where(...)))`. |
| **Path 6** | AI Generation Endpoints (`/api/generate-quiz`, `/api/generate-mcqs`, `/api/pdf-quiz-generator`) | [`server.ts`](file:///c:/Users/mehra/Documents/for%20cline%20vs%20code/server.ts) / [`app.ts`](file:///c:/Users/mehra/Documents/for%20cline%20vs%20code/app.ts) | On-demand synthetic question generation via Gemini API. Staged into Firestore `/mcqs` with `status: 'AI_GENERATED'` until admin approved. |
| **Path 7** | `subscribeToSavedMistakes` | [`src/lib/firestoreService.ts#L649`](file:///c:/Users/mehra/Documents/for%20cline%20vs%20code/src/lib/firestoreService.ts#L649) | User-scoped Firestore queries on `collection('savedMistakes')` where `userId == auth.uid`. |
| **Path 8** | `pastPapers` Collection | [`src/lib/firestoreService.ts#L2266`](file:///c:/Users/mehra/Documents/for%20cline%20vs%20code/src/lib/firestoreService.ts#L2266) | Authentic PDF past-paper records and metadata in `/pastPapers`. |

---

## 2. Consumer-to-Path Mapping Matrix

| Feature / UI Consumer Component | Retrieval Path(s) Used | Local vs Remote Filtering |
| :--- | :--- | :--- |
| **Topic Mastery (`PracticeMCQStage`)** | `questionBank` prop $\rightarrow$ Path 4 (`filterDatabaseMCQsForTopic`) | Broad subscription in `App.tsx` + In-memory client filter |
| **Topic Mastery (`FinalTestStage`)** | `questionBank` prop $\rightarrow$ Path 4 (`filterDatabaseMCQsForTopic`) | Broad subscription in `App.tsx` + In-memory client filter |
| **Practice Studio (`PracticeDrill`)** | `questionBank` prop $\rightarrow$ Path 2 (`getCanonicalMCQs`) | In-memory with remote Firestore fallback query |
| **Custom Test Builder (`CustomTestBuilder`)** | `questionBank` prop $\rightarrow$ Path 2 (`getCanonicalMCQs`) + Path 5 (`fetchPublishedMcqsForTopic`) | Hybrid: calls `getCanonicalMCQs` with topic fallback |
| **Mock Exam (`MockExam`)** | `questionBank` prop $\rightarrow$ Path 2 (`getCanonicalMCQs`) | In-memory with remote Firestore query |
| **Sequential Practice (`SequentialPracticeMode`)** | `questionBank` prop $\rightarrow$ Path 3 (`matchQuestionsFromBank`) | **In-memory token scoring with leaky same-subject fallback** |
| **Mistake Book (`MistakeVault`)** | Path 7 (`subscribeToSavedMistakes`) | Direct user-isolated Firestore listener |
| **Smart Revision (`SmartRevisionScheduler`)** | Path 7 (`savedMistakes`) + Syllabus Topics | In-memory grouping of user mistakes |
| **AI Quiz Generator (`SimpleAiQuizGenerator`)** | Path 6 (`/api/generate-quiz-simple`) | Real-time AI Generation (Bypasses DB) |
| **Admin CMS Suite (`AdminPlatformSuite`)** | `questionBank` prop + direct Firestore CRUD | Direct Firestore reads, batch imports, approvals |

---

## 3. Direct Firestore Queries vs Broad In-Memory Filtering

- **Broad In-Memory Paths:**
  - `App.tsx` starts a real-time listener:
    ```typescript
    subscribeToPublishedMcqs((remoteMcqs) => {
      setQuestionBank(remoteMcqs);
      localStorage.setItem('nmdcat_qbank', JSON.stringify(remoteMcqs));
    });
    ```
  - This loads all ~2,593 published MCQs into memory on app mount.
  - Consumers like `PracticeWorkspace`, `SequentialPracticeMode`, and `TopicMasteryWorkspace` filter this in-memory pool rather than executing distinct Firestore queries per topic.
- **Direct Query Paths:**
  - `getCanonicalMCQs` in [`src/lib/mcqRetrievalService.ts`](file:///c:/Users/mehra/Documents/for%20cline%20vs%20code/src/lib/mcqRetrievalService.ts) executes remote Firestore queries `where('status', '==', 'PUBLISHED')` and `where('subject', '==', subLabel)` when the in-memory pool has fewer questions than requested.

---

## 4. Fallback Behavior & Cross-Contamination Risk Analysis

1. **Vulnerability in `matchQuestionsFromBank` ([`src/utils/topicMatcher.ts#L110-L113`](file:///c:/Users/mehra/Documents/for%20cline%20vs%20code/src/utils/topicMatcher.ts#L110-L113)):**
   ```typescript
   // 2. Fallback to candidatePool (which is ALREADY strictly filtered by subject)
   if (results.length === 0) {
     results = [...candidatePool];
   }
   ```
   - **Risk:** If a student requests a specific topic in `SequentialPracticeMode` and 0 token matches are found, it falls back to **all questions in that subject**, injecting unrelated topics.
2. **Safety in `getCanonicalMCQs` ([`src/lib/mcqRetrievalService.ts`](file:///c:/Users/mehra/Documents/for%20cline%20vs%20code/src/lib/mcqRetrievalService.ts)):**
   - Enforces `assertSubjectIntegrity` and `toCanonicalSubjectId`.
   - Never returns foreign subject MCQs (e.g. Physics in Logical Reasoning).
   - If 0 matches exist, returns status `EMPTY` with `questions: []`.
3. **Safety in `filterDatabaseMCQsForTopic` ([`src/utils/topicMasteryUtils.ts`](file:///c:/Users/mehra/Documents/for%20cline%20vs%20code/src/utils/topicMasteryUtils.ts)):**
   - Returns exact topic matches, same-chapter matches, or `[]`. Does not leak cross-subject questions.

---

## 5. Hardcoded / Mock Data Inventory

- **Production Question Bank:** 0 hardcoded demo question arrays in client runtime. All questions originate from Firestore `/mcqs` or authentic PMDC syllabus definitions.
- **Syllabus Hierarchy:** Authoritative PMDC syllabus topics defined in [`src/data/nmdcatData.ts`](file:///c:/Users/mehra/Documents/for%20cline%20vs%20code/src/data/nmdcatData.ts).

---

## 6. Current Production Firestore MCQ Document Schema

Inspected live documents in `/mcqs`:

```typescript
export interface MCQQuestion {
  id: string;                         // Document ID (e.g. "mcq_17280..._a81" or auto-id)
  subject: SubjectType;               // 'Biology' | 'Chemistry' | 'Physics' | 'English' | 'Logical Reasoning'
  chapter: string;                    // e.g. "Cell Structure and Function"
  topic?: string;                     // e.g. "Plasma Membrane & Fluid Mosaic Model"
  chapterId?: string;                 // Canonical slug e.g. "cell-structure-and-function"
  topicId?: string;                   // Topic ID e.g. "bio-2"
  question: string;                   // Question text (supports KaTeX LaTeX math)
  options: string[];                  // Array of 4 option strings
  correctIndex: number;               // 0, 1, 2, or 3
  explanation: string;                // Detailed explanation & distractor breakdown
  difficulty: 'Easy' | 'Medium' | 'Hard';
  cognitiveLevel?: CognitiveLevel;    // 'Recall' | 'Understanding' | 'Application' | 'Analysis'
  pastPaperTag?: string;              // e.g. "UHS 2022", "NUMS 2021"
  source?: string;                    // 'DATABASE' | 'AI_GENERATED' | 'PAST_PAPER' | 'MANUAL_ENTRY'
  sourceType?: string;                // 'DATABASE' | 'AI_GENERATED' | 'PAST_PAPER'
  status?: AdminContentStatus;        // 'PUBLISHED' | 'AI_GENERATED' | 'PENDING_REVIEW' | 'ARCHIVED'
  verificationStatus?: string;        // 'VERIFIED' | 'AI_GENERATED' | 'UNDER_REVIEW'
  authorType?: 'AI' | 'HUMAN' | 'IMPORTED';
  createdAt?: string;
  updatedAt?: string;
}
```

---

## 7. Canonical Subject Taxonomy & Slugs

Canonical mapping from [`src/utils/subjectTaxonomy.ts`](file:///c:/Users/mehra/Documents/for%20cline%20vs%20code/src/utils/subjectTaxonomy.ts):

| Canonical ID (`subjectId`) | Display Label (`subject`) | PMDC Curriculum Weightage | Supported Aliases |
| :--- | :--- | :---: | :--- |
| `biology` | `Biology` | 34% (68 MCQs) | `bio`, `zoology`, `botany`, `biology xi`, `biology xii` |
| `chemistry` | `Chemistry` | 27% (54 MCQs) | `chem`, `organic chemistry`, `inorganic chemistry`, `physical chemistry` |
| `physics` | `Physics` | 27% (54 MCQs) | `phy`, `mechanics`, `electromagnetism`, `physics xi`, `physics xii` |
| `english` | `English` | 9% (18 MCQs) | `eng`, `grammar`, `vocabulary`, `english language` |
| `logical_reasoning` | `Logical Reasoning` | 3% (6 MCQs) | `lr`, `critical thinking`, `logical reasoning & critical thinking` |

---

## 8. Proposed Architectural Consolidation Plan

```mermaid
graph TD
    A[Consumer: PracticeDrill / CustomTest / MockExam / TopicMastery / SequentialPractice] --> B[Central Canonical MCQ Service: getCanonicalMCQs]
    B --> C{In-Memory QuestionBank Provided & Sufficient?}
    C -->|Yes| D[In-Memory Canonical Subject & Scope Filter]
    C -->|No| E[Firestore Query: where status == PUBLISHED & where subject == targetLabel]
    E --> D
    D --> F[Mandatory Validation Gate: validateMCQForContext]
    F -->|Valid Matches >= 1| G[Randomize / Slice to Requested Count]
    F -->|0 Valid Matches| H[Return Honest Status: EMPTY with questions: []]
    G --> I[Return Validated Question Set to Consumer]
```

### Key Rules of Central Service:
1. **Zero Global Fallback:** If 0 matches exist for a requested topic/chapter, return status `EMPTY` with `questions: []`. Never substitute random questions from the subject or global pool.
2. **Strict Canonical Validation Gate:** Every single returned question must pass `assertSubjectIntegrity(q.subject, requestedSubject)` and metadata match for requested chapter/topic.
3. **Source Separation:** `DATABASE`, `AI_GENERATED`, and `PAST_PAPER` question sources remain segregated. A database request never silently invokes AI or past paper bypasses.
4. **All Consumers Migrated:** Eliminate redundant filtering functions (`matchQuestionsFromBank`, `filterDatabaseMCQsForTopic`) by standardizing on `getCanonicalMCQs`.
