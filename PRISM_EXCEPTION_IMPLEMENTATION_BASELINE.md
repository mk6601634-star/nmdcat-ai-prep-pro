# PRISM Exception / Superlative Verification — Pre-Implementation Baseline

**Document:** `PRISM_EXCEPTION_IMPLEMENTATION_BASELINE.md`  
**Date:** September 22, 2026  
**Status:** Pre-Implementation Baseline Recorded

---

## 1. Current Schema Inventory (`src/components/prism/prismTypes.ts`)

```typescript
export type SourceType = 'OFFICIAL_EXAM' | 'TEXTBOOK' | 'SCIENTIFIC_REFERENCE' | 'SECONDARY' | 'UNKNOWN';
export type SourceHierarchyTier = 1 | 2 | 3 | 4;
export type KnowledgeStatus = 
  | 'VERIFIED'
  | 'TEXTBOOK_ONLY'
  | 'SCIENTIFICALLY_OUTDATED'
  | 'TEXTBOOK_SCIENCE_CONFLICT'
  | 'DISPUTED'
  | 'REJECTED'
  | 'INSUFFICIENT_EVIDENCE';
export type ExamRelevance = 
  | 'TEXTBOOK_CONVENTION'
  | 'SCIENTIFIC_FACT'
  | 'BOTH_ACCEPTED'
  | 'UNRESOLVED';

export interface PrismSource {
  id: string;
  sourceType: SourceType;
  tier: SourceHierarchyTier;
  title: string;
  origin: string;
  contentSnippet: string;
  reliabilityScore: number;
  notes?: string;
}

export interface PrismClaim {
  id: string;
  statement: string;
  category: string;
  sourceIds: string[];
  status: KnowledgeStatus;
  qualifier?: string;
  textbookClaim?: string;
  scientificClaim?: string;
  examRelevance: ExamRelevance;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  notes?: string;
}

export interface PrismRule {
  id: string;
  ruleStatement: string;
  sourceClaimIds: string[];
  applicationConditions: string;
  exceptions: string[];
  subject: SubjectType;
}

export interface PrismKnowledgeLayer {
  topic: string;
  subject: SubjectType;
  sources: PrismSource[];
  claims: PrismClaim[];
  rules: PrismRule[];
  formulas?: FormulaItem[];
  reactions?: ReactionItem[];
  definitions?: DefinitionItem[];
  disputes: {
    claimId: string;
    variantA: string;
    variantB: string;
    sourceA: string;
    sourceB: string;
  }[];
  textbookConflicts: {
    claimId: string;
    textbookVersion: string;
    scientificVersion: string;
    examRelevance: ExamRelevance;
    recommendationForStudent: string;
  }[];
  verifiedSummary: string;
}
```

---

## 2. Current Synthesis Prompt in `app.ts` (lines 2205–2237)

The backend endpoint `POST /api/prism/synthesize` constructs:
* Core instructions: Non-silent correction, preserve qualifiers, assign status.
* Input injections: `subject`, `topic`, `textbookContent`, `examReferences`, `externalSnippets`, `generationMode`.
* Pipeline stages: Source classification, claim extraction, conflict detection, rule extraction, materials generation.

---

## 3. Current Verification & Claim Pipeline

* **Extraction:** Single LLM call (`callWithFallback`) produces JSON containing `knowledgeLayer` and `materials`.
* **Sanitization:** Backend validates arrays (`claims`, `sources`, `rules`, `textbookConflicts`) and provides default IDs if missing.
* **Storage:** Saved to `localStorage` (`nmdcat_prism_sessions`) and Firestore collection `userPrismSessions`.
* **Rendering:** `<PrismSourceEvidenceView />` renders summary, conflict matrix, 4-tier provenance cards, claims list with `<PrismConflictBadge />`, and deductive rules.

---

## 4. File Modification Scope

### Files to be Modified / Created:
1. `src/components/prism/prismTypes.ts` (Phase 2): Add backward-compatible optional fields (`claimType`, `superlativeType`, `historicalPriorityType`, `verificationLevel`, `semanticPreservationStatus`, `detectedScope`).
2. `src/components/prism/prismSuperlativeValidator.ts` (Phase 3–9): Implement deterministic post-processing detector and preservation validator (shared between backend and frontend).
3. `app.ts` (Phase 10 & 11): Enhance prompt for exact superlative preservation and attach deterministic validator in post-processing.
4. `src/components/prism/PrismConflictBadge.tsx` & `src/components/prism/PrismSourceEvidenceView.tsx` (Phase 12): Display clean verification level and superlative indicators on high-risk claims without UI clutter.

### Files That Must Remain Untouched:
* Firebase authentication (`src/lib/firebase.ts`)
* General chat / AI Tutor core routes (`/api/ai-tutor`, `AiTutor.tsx`)
* Existing Firestore collection structures for other workspaces (`admin_mcqs`, `userNotes`, `userFlashcards`, etc.)
* PMDC syllabus dataset (`src/data/nmdcatData.ts`)
* Existing KaTeX math formatting logic (`FormattedMathContent.tsx`)
