# Canonical MCQ Retrieval & Central Service Implementation (Phase 2 & Phase 3)

**NMDCAT AI Prep Pro — Forensic Data Integrity Architecture**  
**Status:** Phase 2 & 3 Complete & Verified (Deterministic Tests: 15/15 Passed, Production Build: Code 0)

---

## 1. Canonical MCQ Contract

The canonical MCQ retrieval contract establishes the strict TypeScript schema and retrieval context based on production schema discoveries:

### `MCQQuestion` Canonical Schema
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | Unique identifier (e.g., Firestore doc ID, `pmdc_2023_bio_01`) |
| `question` | `string` | Yes | Question body with LaTeX math support |
| `options` | `string[]` | Yes | Array of choices (standard 4 options, minimum $\ge 3$) |
| `correctIndex` | `number` | Yes | Zero-based index of correct option ($0 \le \text{idx} < \text{len}$) |
| `explanation` | `string` | Yes | Pedagogical explanation and rationale |
| `subject` | `SubjectType \| string` | Yes | Raw or canonical subject name |
| `subjectId` | `CanonicalSubjectId` | Optional | Normalized canonical ID (`biology`, `chemistry`, `physics`, `english`, `logical_reasoning`) |
| `chapter` | `string` | Optional | PMDC syllabus chapter name |
| `chapterId` | `string` | Optional | Normalized chapter identifier |
| `topic` | `string` | Optional | PMDC syllabus topic / subtopic name |
| `topicId` | `string` | Optional | Normalized topic identifier |
| `difficulty` | `'Easy' \| 'Medium' \| 'Hard' \| string` | Optional | Calibrated cognitive difficulty |
| `status` | `'PUBLISHED' \| 'DRAFT' \| 'ARCHIVED' \| 'VERIFIED'` | Yes | Publication status (`PUBLISHED`/`VERIFIED` student-facing) |
| `source` / `sourceType` | `'PAST_PAPER' \| 'SYSTEM' \| 'AI_GENERATED' \| 'USER_CUSTOM'` | Optional | Provenance of the question record |
| `pastPaperYear` | `number \| string` | Optional | Past paper year if applicable (e.g., 2023, 2022) |
| `pastPaperTag` | `string` | Optional | Full provenance tag (e.g., `PMDC 2023 Provincial`) |

### `MCQRetrievalOptions` Context Schema
```typescript
export interface MCQRetrievalOptions {
  subject?: SubjectType | string;
  subjectId?: CanonicalSubjectId | string;
  selectedSubjects?: string[];
  chapter?: string;
  chapterId?: string;
  selectedChapters?: string[];
  topic?: string;
  topicId?: string;
  selectedTopics?: string[];
  difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Mixed' | 'Any' | string;
  count?: number;
  sourceType?: 'ALL' | 'DATABASE' | 'PAST_PAPER' | 'AI_GENERATED';
  excludeQuestionIds?: string[];
  questionBank?: MCQQuestion[];
  allowShuffle?: boolean;
}
```

---

## 2. Central Retrieval Service (`src/lib/mcqRetrievalService.ts`)

Two synchronized, strictly validated retrieval functions are now exported:

1. **`filterCanonicalMCQs(questionBank, options): MCQRetrievalResult`** (Synchronous)
   - Used for instant, reactive in-memory filtering (e.g., `useMemo` hooks, state-driven components).
   - Validates all candidate items through `validateMCQForContext`.
   - Returns strict empty results (`status: 'EMPTY'`, `questions: []`) with **zero cross-subject / zero foreign-topic fallback**.

2. **`getCanonicalMCQs(options): Promise<MCQRetrievalResult>`** (Asynchronous)
   - Single authoritative entry point for database queries.
   - Evaluates in-memory candidate bank first; if candidate count is insufficient, queries Firestore `mcqs` collection with composite filters (`status == 'PUBLISHED'`, `subject == target`).
   - Every candidate is passed through `validateMCQForContext`.
   - Applies deduplication, random shuffling (only *after* validation), and returns `MCQRetrievalResult`.

---

## 3. Pure Validation Gate (`validateMCQForContext`)

Every single question must satisfy all validation criteria before being returned to any student-facing UI:

1. **Structural & Bounds Check:**
   - `question` must be non-empty string.
   - `options` must be an array with $\ge 3$ choices.
   - `correctIndex` must be a valid integer where $0 \le \text{correctIndex} < \text{options.length}$.
2. **Exclusion Check:**
   - Question ID cannot be in `excludeQuestionIds`.
3. **Publication Status Check:**
   - Non-AI questions must have `status === 'PUBLISHED'` or `status === 'VERIFIED'`.
4. **Canonical Subject Isolation:**
   - Normalizes question subject via `toCanonicalSubjectId(q.subject)`.
   - Rejects question if canonical subject does not match requested subject(s).
5. **Chapter Matching:**
   - If chapter is requested, matches via exact normalized string or substring containment.
6. **Topic Matching (Zero Fallback):**
   - If topic is requested, enforces strict token and keyword matching.
   - **No fallback to unrelated chapters or subjects is permitted.**
7. **Difficulty & Source Matching:**
   - Validates difficulty level and provenance (`DATABASE` rejects `AI_GENERATED`, `PAST_PAPER` requires past paper provenance).

---

## 4. Firestore Query Strategy

- **Target Collection:** `adminCollections.mcqs` (`mcqs`).
- **Query Constraints:**
  - `where('status', '==', 'PUBLISHED')`
  - `where('subject', '==', canonicalSubjectLabel)`
  - `limit(count * 3)` (fetching a small bounded batch to satisfy chapter/topic filtering without exceeding read quotas).
- **Client Validation:**
  - Even if Firestore returns a document, it must pass `validateMCQForContext` on the client before inclusion.

---

## 5. First Consumer Migration: `SequentialPracticeMode.tsx`

### Vulnerability Eliminated
- **Previous implementation:** Called `matchQuestionsFromBank` from `src/utils/topicMatcher.ts`, which contained a fallback: `if (results.length === 0) results = [...candidatePool];`. If a student selected an empty Chemistry topic, the entire question bank (including Biology and Physics questions) leaked into the practice session.
- **New implementation:** Migrated to `filterCanonicalMCQs(questionBank, { subjectId, chapterId, topicId, count: 5 })`.
- **Empty State UX:** Added an explicit UI notification if 0 questions exist: *"No published MCQs found for this specific objective. Questions for this specific objective are currently undergoing editorial indexing. Zero fallback applied to protect syllabus integrity."*

---

## 6. Deterministic Test Results (15/15 Passed)

Test runner executed via `npx tsx scratch/test_canonical_retrieval.ts`:

| Test Group | Test Name | Expected | Observed | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Group 1: Subject Isolation** | Biology Retrieval Count | 2 valid published | 2 returned | **PASS** |
| | Biology Subject Purity | All Biology | 100% Biology | **PASS** |
| | Biology Quality Gate | Exclude draft/malformed | Draft & malformed excluded | **PASS** |
| | Chemistry Retrieval | 1 Chemistry (`chem-1`) | `chem-1` | **PASS** |
| | Physics Retrieval | 1 Physics (`phy-1`) | `phy-1` | **PASS** |
| | English Retrieval | 1 English (`eng-1`) | `eng-1` | **PASS** |
| | Logical Reasoning Retrieval | 1 LR (`lr-1`) | `lr-1` | **PASS** |
| **Group 2: Zero Fallback** | Empty Topic Count | 0 questions | 0 questions | **PASS** |
| | Empty Topic Status | `EMPTY` | `EMPTY` | **PASS** |
| **Group 3: Cross-Contamination Rejection** | Physics Context $\rightarrow$ Bio MCQ | Rejection (`Subject mismatch`) | Rejected | **PASS** |
| | LR Context $\rightarrow$ Bio MCQ | Rejection (`Subject mismatch`) | Rejected | **PASS** |
| | Chemistry Context $\rightarrow$ Phy MCQ | Rejection (`Subject mismatch`) | Rejected | **PASS** |
| **Group 4: Exclusion Filtering** | Exclude `bio-1` | Only `bio-2` returned | `bio-2` | **PASS** |
| **Group 5: Difficulty & Source** | Difficulty Filter (`Easy`) | Only `bio-2` returned | `bio-2` | **PASS** |
| | Source Filter (`SYSTEM`) | Only `chem-1` returned | `chem-1` | **PASS** |

**Build Verification:** `npm run build` completed successfully (exit code 0, 12.17s).

---

## 7. Remaining Consumers Audit (Ready for Phase 4 Migration)

| Consumer File | Current Retrieval Method | Target Migration |
| :--- | :--- | :--- |
| `src/components/TopicMasteryWorkspace.tsx` | `filterDatabaseMCQsForTopic` / local filter | `getCanonicalMCQs` / `filterCanonicalMCQs` |
| `src/components/PracticeDrill.tsx` | Direct `questionBank` slice / filter | `filterCanonicalMCQs` |
| `src/components/CustomTestBuilder.tsx` | Custom subject/chapter reducer | `getCanonicalMCQs` |
| `src/components/TopicQuizBuilder.tsx` | Topic filter with slice fallback | `getCanonicalMCQs` |
| `src/components/MockExam.tsx` | Multi-subject bank distribution | `getCanonicalMCQs` for each subject quota |
| `src/components/ReviewWorkspace.tsx` | Mistake vault item mapper | `validateMCQForContext` validation pass |
| `src/components/AdaptiveLearningEngine.tsx` | Weakness topic selector | `getCanonicalMCQs` |

---

## 8. Firestore Indexes Required

For optimal performance on Firestore composite queries:
- Collection: `mcqs`
- Single Field Indexes: `status` (Ascending), `subject` (Ascending)
- Composite Index (Optional, for large banks): `status` (Ascending) + `subject` (Ascending) + `createdAt` (Descending)
- *Note:* In-memory client filtering on pre-cached `nmdcat_qbank` handles all chapter/topic/difficulty sorting with zero additional Firestore composite index requirements.

---

## 9. Risk Assessment & Next Step

- **Database Integrity Risk:** 0% (No Firestore documents were modified or deleted during Phase 2/3).
- **Fallback Risk:** 0% (Leaky fallback in `SequentialPracticeMode.tsx` eliminated).
- **Ready for Next Action:** Migrate remaining 7 consumers systematically to use `getCanonicalMCQs` and `filterCanonicalMCQs`.
