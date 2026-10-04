# TOPIC MASTERY — QA EVIDENCE AUDIT

**Audit Date:** October 4, 2026  
**Auditor:** Antigravity Forensic QA Team  
**Scope:** Real-Data Path Verification, Live vs Code Evidence Classification, AI Quota Analysis  

---

## PREVIOUS QA CLAIM:
> *"100% verified"*

## CORRECTED QA STATUS:
> **PARTIALLY VERIFIED & CODE PROVEN (AI LIVE-TESTING BLOCKED BY GEMINI 429 QUOTA EXHAUSTION; CLIENT-SIDE MCQ RETRIEVAL CONFIRMED)**

---

## 1. AI Tutor — Reclassification & Payload Forensics

During live verification, external calls to Gemini AI endpoints returned `RESOURCE_EXHAUSTED (429 - Individual quota reached)`. Therefore, all AI-dependent stages are rigorously reclassified below:

| AI Tutor Workflow | Status | Evidence Type | Technical Finding / Limitation |
| :--- | :---: | :---: | :--- |
| **Initial Tutor Response** | **BLOCKED** | BLOCKED BY AI QUOTA | `TutorStage.tsx` executes `handleSend(initialPrompt)` on mount, but live server returned HTTP 429 error. UI gracefully caught error in `AiActionStatus`. |
| **Multi-turn Conversation** | **CODE VERIFIED** | CODE VERIFIED ONLY | Payload construction verified at [`TutorStage.tsx#L124-L130`](file:///c:/Users/mehra/Documents/for%20cline%20vs%20code/src/components/topicMastery/stages/TutorStage.tsx#L124-L130): `messages: updated.map(m => ({ role: m.sender, content: m.text }))`. Live execution blocked by quota. |
| **Follow-up Context Retention** | **CODE VERIFIED** | CODE VERIFIED ONLY | Context header `TOPIC MASTERY LESSON: ${subject} > ${chapter} > ${topic}` is injected into every request payload (`body.context`). |
| **Refresh Persistence** | **CODE VERIFIED** | CODE VERIFIED ONLY | `session.tutorConversation` is bound to parent session state, but live roundtrip was blocked by provider quota. |
| **Resume Persistence** | **CODE VERIFIED** | CODE VERIFIED ONLY | `handleResumeSession` passes `currentSession.tutorConversation` back into `TutorStage` prop `messages`. |
| **Weak-Area $\rightarrow$ Tutor Revisit** | **CODE VERIFIED** | CODE VERIFIED ONLY | [`WeakAreaRepairStage.tsx#L96`](file:///c:/Users/mehra/Documents/for%20cline%20vs%20code/src/components/topicMastery/stages/WeakAreaRepairStage.tsx#L96) triggers `onAskTutor(prompt)` $\rightarrow$ switches `currentStage: 'tutor'` and sets `initialTutorPrompt`. |
| **Cross-Stage Docked Tutor Drawer** | **LIVE VERIFIED** | LIVE VERIFIED | Floating **"Ask AI Tutor"** button opens drawer; submits prompt to Tutor stage cleanly. |

---

## 2. MCQ Database — Real Data Path Trace

### Real Data Pipeline:
$$\text{Firestore: } \texttt{collection('mcqs')} \xrightarrow{\text{status == 'PUBLISHED'}} \text{App.tsx: } \texttt{setQuestionBank} \xrightarrow{\text{props}} \text{TopicMasteryWorkspace} \xrightarrow{\text{props}} \text{PracticeMCQStage} \xrightarrow{\text{filterDatabaseMCQsForTopic}} \text{Displayed MCQs}$$

### Explicit Answers to Architectural Questions:

- **A. Does Firestore itself filter by subjectId?**  
  **NO.** The Firestore subscription ([`firestoreService.ts#L781-L796`](file:///c:/Users/mehra/Documents/for%20cline%20vs%20code/src/lib/firestoreService.ts#L781-L796)) queries `where('status', '==', 'PUBLISHED')`. It fetches the entire published pool into `App.tsx` state and mirrors it in `localStorage['nmdcat_qbank']`.
- **B. Does Firestore itself filter by chapterId?**  
  **NO.** Firestore does not query chapter indexes on topic changes.
- **C. Does Firestore itself filter by topicId?**  
  **NO.** Firestore does not query topic indexes on topic changes.
- **D. Does the backend filter?**  
  **NO.** The client subscribes directly to Firestore SDK; no Express backend endpoint is queried for topic MCQs.
- **E. Does only the frontend filter?**  
  **YES.** All Subject, Chapter, and Topic filtering is executed in memory on the client inside [`filterDatabaseMCQsForTopic`](file:///c:/Users/mehra/Documents/for%20cline%20vs%20code/src/utils/topicMasteryUtils.ts#L190-L250).
- **F. Is there any global-question fallback anywhere?**  
  **NO.** If 0 matches exist for a given subject/chapter/topic, `filterDatabaseMCQsForTopic` returns `[]` (empty array), causing `PracticeMCQStage` and `FinalTestStage` to render the honest empty state. No cross-subject or random global fallback exists.

---

## 3. Final Test — Real Data Path

- **Question Source:** Real published database MCQs from `questionBank`.
- **Retrieval Mechanism:** [`FinalTestStage.tsx#L58-L68`](file:///c:/Users/mehra/Documents/for%20cline%20vs%20code/src/components/topicMastery/stages/FinalTestStage.tsx#L58-L68) executes:
  ```typescript
  const matched = filterDatabaseMCQsForTopic(questionBank, context.subjectId, context.chapterName, context.topicName);
  const pool = matched.slice(0, 10);
  setTestQuestions(pool);
  ```
- **Subject/Chapter/Topic Integrity:** Strictly inherits `filterDatabaseMCQsForTopic`. Zero AI-generated or mock questions are injected. If `matched.length === 0`, the test button is disabled and an informative empty notice is rendered.
- **Status:** **CODE VERIFIED & PROVEN**.

---

## 4. Session History — Code vs Live Verification

| Firestore / State Operation | Code Path | Evidence Type | Status |
| :--- | :--- | :---: | :---: |
| **Create Session** | [`TopicMasteryWorkspace.tsx#L125`](file:///c:/Users/mehra/Documents/for%20cline%20vs%20code/src/components/topicMastery/TopicMasteryWorkspace.tsx#L125) $\rightarrow$ `saveTopicMasterySession` | CODE VERIFIED | **CODE VERIFIED** |
| **Read Sessions** | `subscribeToUserTopicMasterySessions(userId, ...)` | CODE VERIFIED | **CODE VERIFIED** |
| **Update Session** | `updateSession(prev => ...)` $\rightarrow$ `saveSessionRef.current` | CODE VERIFIED | **CODE VERIFIED** |
| **Resume Session** | `handleResumeSession(session)` restores state without new ID | LIVE VERIFIED | **LIVE VERIFIED** |
| **Review Session** | `handleReviewSession(session)` sets `isReviewMode: true` | LIVE VERIFIED | **LIVE VERIFIED** |
| **Practice Again** | Spawns fresh `sessionId: tms_${Date.now()}_...` with same context | CODE VERIFIED | **CODE VERIFIED** |

### Practice Again Forensic Trace:
1. User clicks **"Practice Again"** on `Session A` (`sessionId: "tms_1001"`).
2. `handlePracticeAgain` constructs a fresh `TopicMasteryContext` with `sessionId: "tms_" + Date.now() + "_" + rand`.
3. `handleStartNewSession(context)` generates `Session B` (`sessionId: "tms_2002"`), with `completedStages: []`, `progress: 0`, `masteryScore: 0`, and `mcqPerformance: []`.
4. `saveTopicMasterySession` writes `Session B` to `/topicMasterySessions/tms_2002`.
5. Document `/topicMasterySessions/tms_1001` (`Session A`) is never targeted by this write and remains untouched in Firestore.

---

## 5. Multiple Attempts Claim Reclassification

- **Previous Claim:** *"3 consecutive attempts on the same topic appear as distinct entries in Session History."*
- **Actual Classification:** **CODE VERIFIED ONLY** (Algorithmically proven via immutable `sessionId` doc key separation; not a live multi-session user database dump).

---

## 6. Security & Firestore Rules

Inspected [`firestore.rules#L151-L156`](file:///c:/Users/mehra/Documents/for%20cline%20vs%20code/firestore.rules#L151-L156):

```javascript
match /topicMasterySessions/{docId} {
  allow create: if isUserCreate(); // request.resource.data.userId == request.auth.uid
  allow read: if isUserRead();     // resource.data.userId == request.auth.uid
  allow update: if isUserUpdate(); // resource.data.userId == request.auth.uid && request.resource.data.userId == request.auth.uid
  allow delete: if isUserDelete(); // resource.data.userId == request.auth.uid
}
```

- **Read Ownership:** Requires `resource.data.userId == request.auth.uid`. A user cannot read another student's session.
- **Create Ownership:** Requires `request.resource.data.userId == request.auth.uid`. A user cannot forge a session under another UID.
- **Update Ownership:** Requires both existing and incoming document `userId` to match `request.auth.uid`.
- **Delete Ownership:** Requires `resource.data.userId == request.auth.uid`.
- **Verdict:** **CODE VERIFIED & SECURE**.

---

## 7. Dynamic Topic Relevance — Algorithm Classification

- **Question:** Is stage selection Subject-aware only OR Subject + Chapter + Topic aware?
- **Actual Implementation:** **SUBJECT-AWARE ONLY.**
- **Code Reference:** [`src/utils/topicMasteryUtils.ts#L22-L186`](file:///c:/Users/mehra/Documents/for%20cline%20vs%20code/src/utils/topicMasteryUtils.ts#L22-L186):
  ```typescript
  export function getRelevantStagesForSubject(subject: SubjectType, topicName?: string): TopicMasteryStageDefinition[]
  ```
  The function evaluates:
  ```typescript
  if (subject === 'Physics') { ... }
  else if (subject === 'Chemistry') { ... }
  else if (subject === 'Biology') { ... }
  ```
- **Example:** Biology Topic A (*"Cell Structure"*) and Biology Topic B (*"Photosynthesis"*) receive the **exact same 10 stages**. The algorithm does not inspect topic keywords to toggle stages.

---

## 8. Final Consolidated Status Table

| Feature / Subsystem | Status | Evidence Type | Limitation / Note |
| :--- | :---: | :---: | :--- |
| **Topic Selector / Launcher** | **LIVE VERIFIED** | Browser UI Interaction | Subject/Chapter/Topic filtering works cleanly in browser. |
| **Dedicated Workspace Routing** | **LIVE VERIFIED** | Browser UI Navigation | Mounts under `activeTab === 'topic_mastery'`. |
| **Zero Subject Contamination** | **CODE VERIFIED** | Source Code Inspection | `filterDatabaseMCQsForTopic` strictly enforces `subject.toLowerCase()`. |
| **Client-Side MCQ Filtering** | **CODE VERIFIED** | Source Code Inspection | Filtering happens in memory from the subscribed published pool. |
| **Honest Empty Data State** | **CODE VERIFIED** | Source Code Inspection | Returns `[]` when 0 matches exist; disables final test and warns user. |
| **Dynamic Subject Stages** | **CODE VERIFIED** | Source Code Inspection | Subject-aware (Physics gets Formulas/Traps; Chemistry gets Reactions/Formulas). |
| **Stage Non-Linear Navigation** | **LIVE VERIFIED** | Browser UI Interaction | Tab clicking switches stages without locking wizard. |
| **KaTeX Math & Reaction Rendering** | **LIVE VERIFIED** | Browser UI Rendering | `FormattedMathContent` parses and formats equations with KaTeX. |
| **AI Medical Tutor (Live)** | **BLOCKED** | External Gemini API Error | Live multi-turn AI responses blocked by Gemini HTTP 429 quota exhaustion. |
| **AI Tutor (Request Payload)** | **CODE VERIFIED** | Source Code Inspection | Verified multi-turn history & context payload construction in code. |
| **Weak-Area Diagnostic $\rightarrow$ Tutor** | **CODE VERIFIED** | Source Code Inspection | Extracts wrong answers and passes `initialPrompt` to Tutor stage. |
| **Review Mode Read-Only Safety** | **LIVE VERIFIED** | Browser UI Interaction | Review banner renders; score/timestamps immutable. |
| **Resume Unfinished Session** | **LIVE VERIFIED** | Browser UI Interaction | Restores session state without creating duplicate session IDs. |
| **Practice Again (Session Forking)** | **CODE VERIFIED** | Source Code Inspection | Generates new `sessionId` and preserves prior session in History. |
| **Firestore Security Isolation** | **CODE VERIFIED** | Security Rules Audit | Rules strictly enforce `userId == request.auth.uid`. |
| **Production Build** | **LIVE VERIFIED** | CLI Build Execution | `npm run build` exits with code 0 (`TopicMasteryWorkspace` 125.80 kB). |
