# AUDIT BASELINE — MASTER FORENSIC AUDIT
**Date/Time:** 2026-09-21 21:23 PKT  
**Repository Branch:** `main`  
**Baseline Commit:** `89f27bf`  
**Production Deployment URL:** https://nmdcat-ai-prep-pro.vercel.app  

---

## 1. System Architecture Baseline

| Layer | Technology | Details |
|---|---|---|
| **Frontend Framework** | React 19.0.1 + Vite 6.2.3 | Single Page Application (SPA), Tailwind CSS v4, Recharts, Motion, Lucide Icons |
| **Backend Framework** | Node.js + Express 4.21.2 | Dual-mode: Local Express listener on port 3000, Vercel Serverless Function on production |
| **Database** | Google Cloud Firestore | Firebase SDK v12.17.0, Multi-tab persistent local cache enabled |
| **Authentication** | Firebase Authentication | Google Sign-In (Popup) + Seamless Anonymous Guest Auth |
| **Primary AI Gateway** | Groq Cloud LPU Engine | Primary Model: `openai/gpt-oss-20b` with auto-failover to `qwen/qwen3.8-27b`, `llama-3.3-70b-versatile`, `openai/gpt-oss-120b`, `groq/compound-mini` |
| **Secondary AI Engines** | Cerebras Cloud, LongCat | Cerebras (`llama3.1-8b`), LongCat (`longcat-default`). Google Gemini temporarily paused per user mandate. |

---

## 2. Baseline Build & Test Status

- **`vite build && esbuild app.ts`**: Builds production bundle and `dist/server.cjs` (Exit 0).
- **`tsc --noEmit` (Static Type Checker)**: **FAILED (Exit 1)** with 15 TypeScript type errors:
  - `src/components/AdminPlatformSuite.tsx(597,9)`: Audit log action type mismatch (`'IMPORT'`).
  - `src/components/MockExam.tsx(100,57)`: `fetchRandomPublishedMcqs` signature mismatch.
  - `src/components/SimpleAiQuizGenerator.tsx(345,5)`: Unresolved reference `setFallbackSource`.
  - `src/components/SimpleAiQuizGenerator.tsx(550, 586)`: Property access on AI response wrapper objects.
  - `src/components/TopBar.tsx(437,22)`: Missing import `ShieldCheck`.
  - `src/lib/firebase.ts(25, 28, 36)`: Config property `firestoreDatabaseId` typing.
  - `src/lib/firestoreService.ts`: Missing properties on interface extensions.

---

## 3. Complete Initial Feature Inventory (62 Core Features)

### A. Authentication & Session
1. **Google Sign-In Popup** (`src/App.tsx`, `src/lib/firebase.ts`)
2. **Anonymous Guest Sign-In** (`src/lib/apiClient.ts`, `src/lib/firebase.ts`)
3. **Session Persistence & State Listener** (`onAuthStateChanged`)
4. **Token Refresh & Bearer Token Injection** (`src/lib/apiClient.ts`)
5. **Logout & Local Session Clear**

### B. Dashboard & Overview
6. **NMDCAT Exam Countdown & Target Days**
7. **Syllabus Progress Ring & Subject Breakdown**
8. **Daily Study Targets & Streak Tracker**
9. **Quick Action Floating Action Button (FAB) & Shortcuts**
10. **Recent Activity Feed**

### C. Learn & Syllabus Tracker
11. **Syllabus Topic Explorer** (Biology, Chemistry, Physics, English, Logical Reasoning)
12. **Topic Status Toggling** (Not Started, In Progress, Mastered)
13. **Sub-topic Checklist & Revision Scheduling**
14. **Topic-level MCQ Launchers**

### D. MCQ Practice System & Database Feeds
15. **Published MCQ Database Feed** (`fetchPublishedMcqs`, `fetchRandomPublishedMcqs`)
16. **Subject & Chapter Practice Workspace** (`PracticeWorkspace.tsx`, `PracticeDrill.tsx`)
17. **Sequential Practice Mode** (`SequentialPracticeMode.tsx`)
18. **Custom Test Builder** (`CustomTestBuilder.tsx`)
19. **Mock Exam Simulator** (`MockExam.tsx` — Full 200 MCQ PMDC Pattern)
20. **Topic Quiz Builder & Runner** (`TopicQuizBuilder.tsx`, `TopicQuizRunner.tsx`)
21. **Custom MCQ Creator** (User-authored MCQs)

### E. AI Quiz Generation System
22. **Simple AI Quiz Generator** (`SimpleAiQuizGenerator.tsx` — Direct generation on topic)
23. **Specification Mode AI Quiz Generator** (`AiQuizGenerator.tsx` — Cognitive levels, difficulty)
24. **PDF / Textbook Notes to MCQ Generator** (`/api/pdf-quiz-generator`)
25. **Dynamic MCQ Diagnostic Generator** (`/api/generate-mcqs`)

### F. Post-Quiz & Wrong Answer Intelligence
26. **Wrong Answer Analysis ("Why Was I Wrong?")** (`/api/analyze-wrong-answer`)
27. **Deep AI Insights Engine** (`/api/deep-ai-insights`)
28. **Solution Explainer** (`/api/explain-question`)
29. **Mistake Vault Logging & Storage** (`src/lib/firestoreService.ts`)
30. **Mistake Vault Resolution & Retry Mode** (`MistakeVault.tsx`)

### G. Resources & Academic Tool Suite
31. **Flashcard Deck System & Review** (`FlashcardsView.tsx`)
32. **AI Flashcard Generator** (`/api/generate-flashcards`)
33. **Spaced Repetition System (SRS) Scheduler** (SM-2 Interval Calculation)
34. **Interactive Mind Maps System** (`ReferenceLibraries.tsx`)
35. **AI Mind Map Generator** (`/api/generate-mindmap`)
36. **Mnemonic Vault & AI Generator** (`/api/generate-mnemonics`, `/api/generate-mnemonic`)
37. **Formula Bank & AI Generator** (`/api/generate-formulas`)
38. **Chemical Reaction Hub & AI Generator** (`/api/generate-reactions`)
39. **Definition Master & AI Generator** (`/api/generate-definitions`)
40. **Cross-Subject Knowledge Graph** (`/api/generate-knowledge-graph`)
41. **Multi-Level Tiered Concept Notes** (`/api/multilevel-notes`)
42. **PDF Textbook Parser & Study Suite Generator** (`/api/parse-pdf`, `/api/generate-textbook-study-suite`)

### H. AI Medical Tutor & Chat
43. **Interactive AI Tutor Chat** (`AiTutor.tsx`, `/api/ai-tutor`)
44. **Tutor Pedagogical Modes** (Standard, Socratic, Analogy, Numerical Derivation, Teach-Until-Understand)
45. **Multimodal Diagram / Note Doubt Solver** (`/api/image-doubt-solver`)

### I. PRISM Knowledge Synthesis Engine
46. **PRISM Multi-Stage Source Verification Pipeline** (`PrismWorkspace.tsx`, `/api/prism/synthesize`)
47. **PRISM Research Queries Generator** (`/api/prism/research-queries`)
48. **Conflict Detection Matrix** (Textbook vs Scientific Consensus)

### J. Review & Smart Revision
49. **Review Workspace & Analytics** (`ReviewWorkspace.tsx`)
50. **Smart Revision Scheduler** (`SmartRevisionScheduler.tsx` — Weak topic recommendation)

### K. Analytics & Performance Intelligence
51. **Readiness & Mastery Dashboard** (`AnalyticsReadinessDashboard.tsx`)
52. **Subject Accuracy & Weak Area Diagnostics** (`InsightsWorkspace.tsx`)
53. **Exam Attempt History & Score Trends**

### L. Admin Platform Suite & CMS
54. **Admin Role Gate & Verification** (`/api/admin/role-check`, `AdminPlatformSuite.tsx`)
55. **MCQ Management & Staging Queue** (Approve/Reject AI-generated MCQs)
56. **Resource CMS** (Notes, Flashcards, Formulas, Reactions, Mind Maps, Mnemonics)
57. **Automated Question Bank Audit Script** (`/api/validate-question-bank`)
58. **AI Provider Controls & Model Shifter** (`/api/admin/ai/config`, `/api/admin/ai/switch-model`)
59. **Audit Logs & Backup Management**

### M. Global Settings & Search
60. **Universal Search Modal** (`UniversalSearchModal.tsx`)
61. **User Profile & Target Settings** (`SettingsWorkspace.tsx`)
62. **Responsive Layout** (Sidebar, TopBar, RightSidebar, BottomMobileNav, QuickActionFAB)
