# GLOBAL MATHEMATICAL & SCIENTIFIC NOTATION FORENSIC AUDIT

**Project:** NMDCAT AI Prep Pro  
**Date:** September 22, 2026  
**Auditor:** Antigravity Advanced Agentic Forensic Team  
**Scope:** Complete Codebase (Frontend UI, Backend Endpoints, AI Prompts, Normalization Pipeline, KaTeX Engine)  

---

## 1. Executive Summary & Problem Definition

During forensic exploration of the application, a widespread mathematical and scientific notation rendering breakdown was observed.

### Concrete Symptom
In the **Formula & Derivation Generator** (and across several quiz runners and practice drill interfaces), equations appear as raw programming-style plain text strings, e.g.:
```text
R = (v^2*sin(2θ))/g
```
instead of properly rendered, visually distinct mathematical typesetting:
$$R = \frac{v^2 \sin(2\theta)}{g}$$

### Root Causes Identified
1. **Backend Prompt Contracts Mandated ASCII Code:** The `/api/generate-formulas` prompt in `app.ts` explicitly instructed the AI: `"formula": "Primary formula equation (e.g. F = G*(m1*m2)/r^2)"`, resulting in ASCII/code syntax rather than LaTeX typesetting.
2. **Frontend UI Components Bypassed the Canonical Renderer:**
   - In `ReferenceLibraries.tsx` (AI Formula Generator preview), generated formulas were rendered in `<code className="font-mono">{f.formula}</code>` instead of `<FormattedMathContent content={f.formula} />`.
   - In `SimpleAiQuizGenerator.tsx`, `TopicQuizRunner.tsx`, `PracticeDrill.tsx`, `SequentialPracticeMode.tsx`, `MockExam.tsx`, `MistakeVault.tsx`, and `FlashcardsView.tsx`, question stems, options, and explanations were rendered as raw string interpolations (`{q.question}`, `{opt}`, `{q.explanation}`) rather than through `<FormattedMathContent />`.
3. **Normalization Gaps for General Physics & Mathematical Formulas:**
   - While `FormattedMathContent.tsx` had specific rules for blood gas pressures ($P_{\text{a}\text{O}_2}$) and enzyme constants ($V_{\max}, K_{\text{m}}$), it lacked a generalized parser for common physics formulas with fractions (`(v^2*sin(2θ))/g`), exponents, Greek symbols (`θ, α, β, λ, μ, ω`), and trigonometric functions.
4. **Internal Math Placeholder Leaks Under Edge Cases:**
   - Previous regex replacement mechanisms had potential collision vulnerabilities when AI responses contained nested formatting or unclosed delimiters.

---

## 2. Complete Inventory of Mathematical Content Paths

### A. Content Origins
1. **AI Endpoints (`app.ts`):**
   - `/api/generate-formulas` (Physics & Chemistry formulas)
   - `/api/generate-reactions` (Organic & Inorganic chemical reactions)
   - `/api/generate-definitions` (Medical & scientific definitions)
   - `/api/ai/quiz` & `/api/pdf-quiz-generator` (MCQ generation with formulas)
   - `/api/prism/synthesize` (PRISM multi-stage knowledge synthesis)
   - `/api/ai/solve-mcq-image` & `/api/ai/tutor-chat` (AI Tutor explanations & derivations)
   - `/api/generate-study-notes` (Concept notes & study guides)
2. **Static Databases (`src/data/nmdcatData.ts`):**
   - `FORMULA_DATABASE` (Physics and Physical Chemistry formulas)
   - `REACTION_DATABASE` (Organic chemistry reaction mechanisms)
   - `DEFINITION_DATABASE` (Core syllabus definitions)
   - `PMDC_SYLLABUS_TOPICS` & Practice Questions
3. **User-Generated / Firestore Storage (`src/lib/firestoreService.ts`):**
   - User saved formulas (`user_formulas`), reactions (`user_reactions`), custom MCQs (`custom_mcqs`), mistake vault (`mistakes`), and notes (`user_notes`).

---

## 3. Component Rendering Audit

| Component / Surface | Content Type | Current Rendering Method | Status | Target Action |
|---|---|---|---|---|
| **AI Formula Preview** (`ReferenceLibraries.tsx`) | Formulas, Reactions | `<code>{f.formula}</code>` | **FAIL** (Raw Text) | Migrate to `<FormattedMathContent />` |
| **Formula Library Cards** (`ReferenceLibraries.tsx`) | Formula expressions | `<FormattedMathContent />` | **PARTIAL** | Enhance fraction normalization |
| **Reaction Library Cards** (`ReferenceLibraries.tsx`) | Chemical equations | `<FormattedMathContent />` | **PARTIAL** | Enhance reaction arrow support |
| **AI Tutor Chat** (`AiTutor.tsx`) | Explanations & derivations | `<FormattedMathContent />` | **PASS** | Verify delimiter safety |
| **Notes Explorer** (`ConceptNotesExplorer.tsx`) | Comprehensive notes | `<FormattedMathContent />` | **PASS** | Verify split-view rendering |
| **Simple AI Quiz** (`SimpleAiQuizGenerator.tsx`) | Question, Options, Explanations | Raw `{q.question}`, `{opt}` | **FAIL** (Raw Text) | Migrate to `<FormattedMathContent />` |
| **Topic Quiz Runner** (`TopicQuizRunner.tsx`) | Question, Options, Explanations | Raw `{q.question}`, `{opt}` | **FAIL** (Raw Text) | Migrate to `<FormattedMathContent />` |
| **Practice Drill** (`PracticeDrill.tsx`) | Questions & Options | Raw `{currentQ.question}`, `{opt}` | **FAIL** (Raw Text) | Migrate to `<FormattedMathContent />` |
| **Sequential Practice** (`SequentialPracticeMode.tsx`) | Key Formulas & MCQs | Raw `{activeObjective.keyFormula}` | **FAIL** (Raw Text) | Migrate to `<FormattedMathContent />` |
| **Mock Exam** (`MockExam.tsx`) | Question & Options | Raw `{q.question}`, `{opt}` | **FAIL** (Raw Text) | Migrate to `<FormattedMathContent />` |
| **Mistake Vault** (`MistakeVault.tsx`) | Question & Notes | Raw `{m.question.question}` | **FAIL** (Raw Text) | Migrate to `<FormattedMathContent />` |
| **Flashcards View** (`FlashcardsView.tsx`) | Front / Back prompts | Raw `{card.front}`, `{card.back}` | **FAIL** (Raw Text) | Migrate to `<FormattedMathContent />` |
| **Smart Revision** (`SmartRevisionScheduler.tsx`) | Question preview | Raw `{item.question}` | **FAIL** (Raw Text) | Migrate to `<FormattedMathContent />` |
| **PRISM Materials** (`PrismMaterialsView.tsx`) | MCQs, Flashcards, Mnemonics | `<FormattedMathContent />` | **PASS** | Verify full coverage |
| **PRISM Evidence** (`PrismSourceEvidenceView.tsx`) | Claims, Conflicts, Rules | `<FormattedMathContent />` | **PASS** | Verified |
| **Universal Search** (`UniversalSearchModal.tsx`) | Search result snippets | Raw string snippet | **PARTIAL** | Upgrade math rendering |

---

## 4. Architectural Transformation Plan

### Phase 2: One Canonical Representation (LaTeX / KaTeX)
- **Inline math:** `$formula$` or `\(formula\)`
- **Display/Block math:** `$$formula$$` or `\[formula\]`
- **Fractions:** `\frac{numerator}{denominator}`
- **Powers/Exponents:** `x^{2}`, `10^{-6}`
- **Subscripts:** `v_{\text{initial}}`, `K_{\text{m}}`, `P_{\text{a}\text{CO}_2}`
- **Greek letters:** `\theta, \alpha, \beta, \gamma, \Delta, \lambda, \mu, \pi, \omega`
- **Chemistry:** `\text{H}_2\text{SO}_4`, `\text{Ca}^{2+}`, `\text{SO}_4^{2-}`
- **Reaction arrows:** `\rightarrow`, `\rightleftharpoons`

### Phase 3 & 5: Enhanced Safe Preprocessor (`FormattedMathContent.tsx`)
1. **Preserve Valid LaTeX:** Protect existing `$`, `$$`, `\(`, `\)`, `\[`, `\]`, and ```` ``` ```` blocks before running normalization.
2. **Fractions & Equations Normalizer:**
   - Detects patterns like `LHS = (numerator)/denominator` or `(A)/(B)` or `A/B` with scientific symbols and transforms to `\frac{...}{...}`.
   - Detects Greek unicode characters (`θ, α, β, γ, λ, μ, π, σ, ω, Δ`) and replaces with LaTeX commands.
   - Normalizes multiplication `*` to `\cdot` or `\times` inside mathematical expressions.
   - Normalizes common chemical formulas (`H2O`, `CO2`, `H2SO4`, `HNO3`, `CaCO3`, `C6H12O6`, `CH4`, `NH4+`, `HCO3-`, `SO4 2-`, `PO4 3-`, `Ca2+`, `Mg2+`, `Na+`, `K+`, `Cl-`).
3. **Guaranteed Zero Placeholder Leakage:**
   - Collision-free token replacement with fail-safe sanitization before DOM output.

### Phase 4 & 11: AI Prompt Standardizations (`app.ts`)
- Update `/api/generate-formulas` prompt to require standard LaTeX formulas (e.g. `R = \frac{v^2 \sin(2\theta)}{g}`).
- Update `/api/generate-reactions` prompt to require balanced equations with LaTeX/standard notation.
- Update `/api/ai/quiz` and other generators to mandate LaTeX math notation.

### Phase 8: Global Component Migration
- Replace all raw `{question}`, `{options}`, `{explanation}`, `{formula}`, `{card.front}`, `{card.back}` renders with `<FormattedMathContent />`.

---

## 5. Next Steps
1. Create implementation plan.
2. Update `FormattedMathContent.tsx` with enhanced generalized normalizer.
3. Update `app.ts` backend prompts.
4. Migrate all frontend components to `<FormattedMathContent />`.
5. Run automated unit tests & full production build.
6. Verify in browser and generate final report.
