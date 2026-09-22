# PRISM Engine — Complete Forensic Discovery & Reverse Engineering Report

**Document ID:** `PRISM_FORENSIC_DISCOVERY.md`  
**Investigation Date:** September 22, 2026  
**Status:** Investigation Only (Zero Code Modifications Applied)  
**Target Repository:** `mk6601634-star/nmdcat-ai-prep-pro`

---

## 1. Executive Summary

This report presents a thorough, empirical reverse engineering of the **PRISM Engine** (Precision Reference & Integrated Source-verified Material system) as implemented in the NMDCAT AI Prep Pro application. 

The investigation examined all source files, TypeScript interfaces, Express backend routes, prompt templates, Firestore collections, and frontend components to determine what PRISM **actually is**, how it behaves, and where discrepancies exist between its conceptual claims and physical implementation.

---

## 2. Core Question: "What is PRISM in this application?"

> **Precise Technical Definition:**  
> **"PRISM is currently an AI-driven, multi-stage knowledge synthesis and study material generation framework that uses prompt-engineered structured JSON generation (via Groq/Gemini/Cerebras) to convert textbook, syllabus, and scientific text into atomic claims, a 4-tier source provenance hierarchy, a textbook-versus-science conflict matrix, and downstream study assets (MCQs, Flashcards, Mnemonics, and Mind Maps), with local and Firestore session persistence."**

### Key Distinctions (What It Is vs. What It Is Not):
* **It IS:** A specialized prompt-engineered pipeline that forces LLMs to generate structured schemas containing source citations, qualifiers, deductive rules, and conflict annotations rather than free-form text.
* **It IS NOT:** An autonomous web crawler, automated PubMed/arXiv scraper, OCR/PDF parser, or deterministic multi-model consensus voting engine.

---

## 3. Actual PRISM Architecture & Data Flow

```
[ USER INPUT / PRESET ]
  ├─ Subject (Biology / Chemistry / Physics)
  ├─ Topic Name
  ├─ Prescribed Textbook Content (Textarea)
  ├─ Official Exam References (Textarea)
  ├─ External Scientific Snippets (Textarea)
  └─ Generation Mode (SIMPLE / ADVANCED / ULTRA_ADVANCED)
           │
           ▼
[ FRONTEND DISPATCH ] ─── POST /api/prism/synthesize
           │
           ▼
[ BACKEND ROUTER ] (app.ts -> server/aiProviderRouter.ts)
  ├─ Provider Selection (Groq LLaMA 3.3 / Gemini 3.5 / Cerebras)
  ├─ System Prompt Enforcement:
  │    - 4-Tier Source Classification
  │    - Atomic Claim Extraction with Qualifiers
  │    - Rule of Non-Silent Correction (Preserve Textbook AND Science)
  │    - Study Materials Generation (MCQs, Flashcards, Mnemonics, MindMap)
  └─ Structured JSON Enforcement (`extractJsonFromText`)
           │
           ▼
[ JSON RESPONSE PAYLOAD ]
  ├─ KnowledgeLayer:
  │    ├─ verifiedSummary (string)
  │    ├─ sources (PrismSource[])
  │    ├─ claims (PrismClaim[])
  │    ├─ rules (PrismRule[])
  │    ├─ textbookConflicts (TextbookConflict[])
  │    └─ disputes (DisputeItem[])
  └─ Materials:
       ├─ mcqs (PrismMCQ[])
       ├─ flashcards (PrismFlashcard[])
       ├─ mnemonics (PrismMnemonic[])
       └─ mindMap (ConceptMindMap)
           │
           ▼
[ PERSISTENCE LAYER ]
  ├─ Local: localStorage ('nmdcat_prism_sessions')
  └─ Cloud: Firestore Collection ('userPrismSessions')
           │
           ▼
[ MULTI-STAGE FRONTEND UI ] (PrismWorkspace.tsx)
  ├─ Stage 1: Input & Sources Form + Supplementary Research Queries
  ├─ Stage 2: Audited Evidence, Conflict Matrix & 4-Tier Provenance View
  ├─ Stage 3: Generated Materials Explorer (Flashcards, MindMap, Mnemonics)
  ├─ Stage 4: Interactive Quiz Runner with Mistake Vault Integration
  └─ Stage 5: Session Vault & History Loader
```

---

## 4. Complete PRISM File Inventory

| File Path | Role / Layer | Imports | Database / API Calls | Active Status |
| :--- | :--- | :--- | :--- | :--- |
| `src/components/prism/prismTypes.ts` | **Shared Types** | `types.ts` | None | **Actively Used** |
| `src/components/prism/PrismWorkspace.tsx` | **Master UI Wizard** | Subcomponents, icons, `firestoreService`, `aiRequest` | Calls `/api/prism/synthesize`, `/api/prism/research-queries`, Firestore `userPrismSessions` | **Actively Used** |
| `src/components/prism/PrismSourceEvidenceView.tsx` | **Evidence & Conflict UI** | `prismTypes`, `PrismConflictBadge`, `FormattedMathContent` | None (Receives `knowledgeLayer` prop) | **Actively Used** |
| `src/components/prism/PrismConflictBadge.tsx` | **Status Badge UI** | `prismTypes`, icons | None | **Actively Used** |
| `src/components/prism/PrismQuizRunner.tsx` | **Practice Drill UI** | `prismTypes`, `firestoreService`, `FormattedMathContent` | Saves attempts to `examAttempts` and mistakes to `savedMistakes` | **Actively Used** |
| `src/components/prism/PrismMaterialsView.tsx` | **Study Assets UI** | `prismTypes`, `firestoreService`, `FormattedMathContent` | Saves flashcards/mindmaps to user collections | **Actively Used** |
| `app.ts` (lines 2138–2443) | **Backend Express Routes** | `aiProviderRouter`, `aiModelRegistry` | Routes `/api/prism/research-queries` and `/api/prism/synthesize` | **Actively Used** |
| `src/lib/firestoreService.ts` (lines 2160–2215) | **Data Access Layer** | Firebase Firestore SDK | CRUD on `userPrismSessions` | **Actively Used** |
| `src/App.tsx` (lines 19, 582) | **Application Host** | `React.lazy` | Mounts `PrismWorkspace` on `'prism'` tab | **Actively Used** |
| `src/components/Sidebar.tsx` | **Navigation** | `lucide-react` | Navigates to PRISM | **Actively Used** |
| `src/components/AIWorkspace.tsx` | **AI Hub Launcher** | `lucide-react` | Deep-links to PRISM | **Actively Used** |

---

## 5. PRISM Inputs Audit

| Input Type | Actual Support Status | Implementation Path |
| :--- | :--- | :--- |
| **Syllabus Topic Selection** | **SUPPORTED** | User selects subject and types or selects PMDC topic preset. |
| **Textbook Text** | **SUPPORTED** | User inputs or edits text in textbook textarea. |
| **Official Exam References** | **SUPPORTED** | User inputs exam syllabus guidelines in reference textarea. |
| **External Scientific Snippets** | **SUPPORTED** | User inputs secondary or research text in external textarea. |
| **Supplementary Research Queries** | **SUPPORTED** | Calls `/api/prism/research-queries` to suggest 6–10 search queries. |
| **Raw PDF / File Upload** | **NOT IMPLEMENTED** | No PDF parsing or file upload widget exists in PRISM. |
| **Automated Web Crawler** | **NOT IMPLEMENTED** | Research queries are text suggestions; no crawler executes them. |

---

## 6. Source Provenance Hierarchy

PRISM establishes a 4-tier source classification system in `prismTypes.ts`:

* **Tier 1 (`OFFICIAL_EXAM`):** PMDC NMDCAT Syllabus Guidelines and official past exam papers (Highest weight).
* **Tier 2 (`TEXTBOOK`):** Provincial Textbooks (Punjab, Sindh, KPK, Federal Boards).
* **Tier 3 (`SCIENTIFIC_REFERENCE`):** Peer-reviewed biomedical and chemical literature (Campbell Biology, Guyton, Harper's).
* **Tier 4 (`SECONDARY`):** Coaching notes, secondary study guides, encyclopedias.

### How Tier is Assigned:
* **Mechanism:** The prompt instructs the LLM to categorize the sources in its `sources` array into Tiers 1–4 and assign a `reliabilityScore` (0–100%).
* **Provenance:** The UI displays each source in a tier-coded card (`PrismSourceEvidenceView.tsx`), showing title, origin, tier, reliability percentage, and snippet.

---

## 7. Claim & Evidence Schema

### A. The Claim Schema (`PrismClaim`)
```typescript
export interface PrismClaim {
  id: string;                          // Unique claim ID (e.g., 'clm_1')
  statement: string;                   // Factual assertion with qualifier
  category: string;                    // 'Structure' | 'Mechanism' | 'Historical' | 'Exception' | 'Quantitative'
  sourceIds: string[];                 // Array of referenced source IDs (e.g., ['src_1'])
  status: KnowledgeStatus;             // VERIFIED | TEXTBOOK_SCIENCE_CONFLICT | etc.
  qualifier?: string;                  // Explicit conditions (e.g. "Under standard physiological conditions")
  textbookClaim?: string;              // What the textbook explicitly states
  scientificClaim?: string;            // What contemporary science demonstrates
  examRelevance: ExamRelevance;        // 'TEXTBOOK_CONVENTION' | 'SCIENTIFIC_FACT' | 'BOTH_ACCEPTED' | 'UNRESOLVED'
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';// Confidence level
  notes?: string;                      // Pedagogical context
}
```

### B. What "Evidence" Actually Means in Current PRISM:
* **Evidence Representation:** Evidence is stored as a `contentSnippet` string on each `PrismSource` object and linked via `claim.sourceIds`.
* **Preservation:** When the user provides explicit textbook or scientific text in the input stage, the LLM extracts and quotes snippets from that input. When input textboxes are left blank, default PMDC curriculum references are synthesized by the LLM.

---

## 8. Verification & Knowledge Status Investigation

### Exact Status Classification Rules (from `app.ts` prompt):

1. **`VERIFIED`**:
   * *Trigger:* When the prescribed textbook and scientific consensus agree, and evidence from Tiers 1–3 confirms the statement.
2. **`TEXTBOOK_SCIENCE_CONFLICT`**:
   * *Trigger:* When the prescribed textbook makes an outdated assertion (e.g., historical terminology, simplified mechanisms) that contradicts modern scientific literature.
   * *Core Requirement:* Both versions (`textbookVersion` and `scientificVersion`) must be explicitly output, along with an actionable exam recommendation (`recommendationForStudent`).
3. **`TEXTBOOK_ONLY`**:
   * *Trigger:* A convention or classification specific to the provincial textbooks with no direct modern equivalent.
4. **`SCIENTIFICALLY_OUTDATED`**:
   * *Trigger:* A claim superseded by modern biochemical/physiological consensus.
5. **`DISPUTED`**:
   * *Trigger:* Legitimate conflicting hypotheses across peer-reviewed literature.
6. **`INSUFFICIENT_EVIDENCE`**:
   * *Trigger:* Unsubstantiated or speculative claims lacking clear PMDC or textbook evidence.
7. **`REJECTED`**:
   * *Trigger:* Proven misconceptions or distractor traps.

### Forensic Finding on "Verified":
* In the current implementation, "Verified" means **the LLM was instructed under strict system prompts to verify the statement against PMDC textbook guidelines and scientific consensus, requiring supporting source IDs and qualifiers.** It is not an external cryptographic proof or manual human-in-the-loop sign-off.

---

## 9. Conflict Detection: "The Rule of Non-Silent Correction"

One of PRISM's most distinct architectural features is its explicit prohibition against silent correction:
* **Conventional AI Failure Mode:** If a textbook says $X$ (e.g. "Photosystem I absorbs only 700nm") and science says $Y$, a standard AI might silently "fix" it to $Y$, causing the student to fail a textbook-literal NMDCAT exam question.
* **PRISM Implementation:** The prompt mandates:  
  `"If the textbook states X and scientific consensus states Y, YOU MUST PRESERVE BOTH. Mark status as TEXTBOOK_SCIENCE_CONFLICT."`
* **UI Output:** Rendered inside `PrismSourceEvidenceView.tsx` as a high-visibility **Textbook ↔ Science Conflict Matrix**, displaying:
  1. *Prescribed Textbook Convention*
  2. *Current Scientific Literature*
  3. *Actionable PMDC Exam Guidance* (e.g., "In the NMDCAT exam, select Option B following Punjab Textbook Board, but note the scientific nuance").

---

## 10. AI Engine Involvement & Prompt Forensics

| Parameter | `/api/prism/research-queries` | `/api/prism/synthesize` |
| :--- | :--- | :--- |
| **Default Model** | LLaMA 3.3 70B (Groq) / Gemini 3.5 Flash | LLaMA 3.3 70B (Groq) / Gemini 3.5 Flash |
| **Temperature** | `0.5` | `0.6` |
| **Max Output Tokens** | `2048` | `8192` |
| **Structured Output** | `jsonMode: true` | `jsonMode: true` |
| **Fallback Chain** | Groq -> Cerebras -> Gemini -> OpenRouter | Groq -> Cerebras -> Gemini -> OpenRouter |
| **Timeout Guard** | `12000 ms` | `12000 ms` |

---

## 11. Database & Persistence Layer

* **Collection Name:** `userPrismSessions`
* **Document ID Format:** `prism_sess_${timestamp}_${random}`
* **Document Schema:**
  * `id`: string
  * `userId`: string (Firebase Auth UID)
  * `subject`: string ('Biology' | 'Chemistry' | 'Physics')
  * `topic`: string
  * `textbookInput`: string
  * `examReferenceInput`: string
  * `externalSnippetsInput`: string
  * `knowledgeLayer`: PrismKnowledgeLayer
  * `materials`: PrismGeneratedMaterials
  * `createdAt`: ISO string / Firestore Timestamp
  * `updatedAt`: ISO string / Firestore Timestamp
  * `provider`: string (AI model that generated the synthesis)
* **Local Storage Cache:** `localStorage.getItem('nmdcat_prism_sessions')` provides instant offline access.

---

## 12. Mathematical & Scientific Notation Handling

* **Observed Expressions:** Gas laws ($P_{\text{A}\text{CO}_2}$, $P_{\text{a}\text{O}_2}$, $P_{\text{H}_2\text{O}}$), ventilation rate ($\dot{V}_{\text{A}}$), enzyme kinetics ($V_{\max}$, $K_{\text{m}}$), and chemical reactions ($\text{H}_2\text{SO}_4$).
* **Pipeline:** All PRISM component text blocks (`verifiedSummary`, `textbookVersion`, `scientificVersion`, MCQ questions/explanations, flashcards, rules) pass through `<FormattedMathContent />`.
* **Renderer:** KaTeX math typesetting with pre-normalization (`normalizeScientificMathNotation`) and dual-tier LRU caching.

---

## 13. Capability Classification Table

| Feature / Capability | Actual Status | Description |
| :--- | :--- | :--- |
| **Multi-Stage Synthesis Wizard** | **FULLY IMPLEMENTED** | Interactive 5-stage UI with full input, audit, materials, and quiz stages. |
| **4-Tier Source Hierarchy** | **FULLY IMPLEMENTED** | Schema, prompt, and UI visualization for Tiers 1–4. |
| **Conflict Matrix (Textbook vs. Science)** | **FULLY IMPLEMENTED** | Preserves both versions with explicit student exam advice. |
| **Atomic Claim Extraction with Qualifiers** | **FULLY IMPLEMENTED** | Extracts claims, qualifiers, confidence, and categories. |
| **Deductive Rule Extraction** | **FULLY IMPLEMENTED** | Generates general rules, application conditions, and exceptions. |
| **Downstream Materials Generator** | **FULLY IMPLEMENTED** | Generates MCQs, Flip Flashcards, Mnemonics, and Concept Mind Maps. |
| **Practice Quiz Runner** | **FULLY IMPLEMENTED** | Runs interactive quiz, computes scores, and saves to Mistake Vault. |
| **Session Persistence (Cloud & Local)** | **FULLY IMPLEMENTED** | Saves to Firestore `userPrismSessions` and `localStorage`. |
| **Automated Live Web Crawler** | **NOT IMPLEMENTED** | Only generates research query suggestions; does not crawl URLs. |
| **Direct PDF / OCR Document Ingestion** | **NOT IMPLEMENTED** | Requires user to paste text into input textboxes. |
| **Multi-Model Consensus Voting Arbiter** | **NOT IMPLEMENTED** | Uses single fallback-managed AI provider turn per synthesis. |

---

## 14. Exception, Superlative & Unique Fact Handling (Part 27 Audit)

### A. Detection & Schema Structure
The current PRISM architecture addresses superlatives and exceptions through four explicit prompt-level and schema mechanisms:
1. **Explicit Qualifier Directive (`app.ts` line 2211):**  
   `"Preserve all qualifiers (e.g. 'first discovered', 'first isolated', 'under standard conditions', 'mainly', 'most abundant')."`
2. **Dedicated Claim Categories (`app.ts` line 2259):**  
   Claims are categorized as `Historical`, `Quantitative`, `Exception`, `Structure`, or `Mechanism`.
3. **Dedicated Qualifier Field (`PrismClaim.qualifier`):**  
   Stores restrictive boundary conditions (e.g., `"~40-50% of soluble leaf protein in C3 plants"`, `"first enzyme crystallized in pure form"`).
4. **Rule Exception Array (`PrismRule.exceptions`):**  
   Stores an explicit list of conditions where a generalized deductive rule fails (e.g., `["In non-C3 plants or under different growth conditions"]`).

### B. Empirical Trace & Test Results

| Test Category | Tested Input Statement | Extracted PRISM Claim | Extracted Qualifier | Category Assigned |
| :--- | :--- | :--- | :--- | :--- |
| **Historical Priority** | *"Diastase was the first enzyme discovered by Anselme Payen in 1833."* | `"Diastase was the first enzyme discovered by Anselme Payen in 1833"` | `"first enzyme discovered"` | `Historical` |
| **Isolation vs. Discovery** | *"Urease was the first enzyme crystallized in pure form by Sumner (1926)."* | `"Urease was the first enzyme crystallized and isolated in pure form by James Sumner in 1926"` | `"first enzyme crystallized and isolated in pure form"` | `Historical` |
| **Superlative Quantitative** | *"Rubisco is the most abundant enzyme on Earth (~40-50% in C3 plants)."* | `"Rubisco is the most abundant enzyme on Earth, constituting ~40-50% of soluble leaf protein in C3 plants"` | `"~40-50% of soluble leaf protein in C3 plants"` | `Quantitative` |
| **Rule with Exceptions** | *"If an enzyme constitutes >30% of soluble protein, it is the most abundant."* | Deductive Rule Generated | N/A (Rule Level) | Exceptions: `["In non-C3 plants", "under non-standard growth conditions"]` |

### C. Factual Preservation Fidelity:
* In controlled tests, superlative words (*"first"*, *"most abundant"*, *"isolated in pure form"*) **were successfully preserved** without being degraded into generic terms (*"early"*, *"common"*).
* The model correctly separated Anselme Payen (discovery of diastase) from James Sumner (crystallization of urease) without conflating the two distinct historical milestones.

### D. Critical Limitations & Vulnerabilities Found:
1. **No Deterministic Superlative Post-Validator:** There is no hardcoded regex or AST validator that scans generated claims to guarantee that superlative words from the source text are strictly retained.
2. **Single-Turn Grounding:** If the user provides a vague superlative (e.g. *"X is the largest cell"* without specifying human vs. animal vs. plant), PRISM relies entirely on the internal training weights of the LLM to disambiguate the context.
3. **No Dedicated Biological Extremes Lookup Table:** PRISM does not have an external curated database of record-holders (e.g., longest nerve cell, largest organelle, highest affinity transporter) to cross-verify disputed superlative claims.

---

## 15. Conclusion & Final Answer

> **"Can the CURRENT PRISM reliably identify and preserve first/largest/smallest/most/least/only/unique/exception-type facts?"**  
>  
> **Answer: PARTIALLY IMPLEMENTED.**  
> The current PRISM relies on prompt-enforced qualifier preservation (`qualifier?: string`), rule exception arrays (`exceptions: string[]`), and claim categorization (`Historical`, `Quantitative`, `Exception`). In empirical tests, it successfully captures exact superlative and historical priority distinctions. However, it lacks deterministic AST validators and curated lookup tables for automated verification.

*Investigation completed. Zero code or prompt modifications were made.*
