import { SubjectType, MCQQuestion, Flashcard, ConceptMindMap, FormulaItem, ReactionItem, DefinitionItem } from '../../types';

export type { SubjectType };

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
  reliabilityScore: number; // 0 - 100
  notes?: string;
}

export interface PrismClaim {
  id: string;
  statement: string;
  category: string;
  sourceIds: string[];
  status: KnowledgeStatus;
  qualifier?: string; // e.g., "first isolated", "under standard conditions", "mainly"
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

export interface PrismMCQ extends MCQQuestion {
  sourceClaimIds: string[];
  knowledgeStatus: KnowledgeStatus;
  examTrap?: string;
  calculationSteps?: string[];
  textbookScienceConflict?: boolean;
}

export interface PrismFlashcard extends Flashcard {
  sourceClaimIds: string[];
  knowledgeStatus: KnowledgeStatus;
  explanation?: string;
}

export interface PrismMnemonic {
  id: string;
  type: 'acronym' | 'phrase' | 'association' | 'story' | 'visual';
  mnemonic: string;
  explanation: string;
  concept: string;
  topic: string;
  sourceClaimIds: string[];
}

export interface PrismGeneratedMaterials {
  mcqs: PrismMCQ[];
  flashcards: PrismFlashcard[];
  mnemonics: PrismMnemonic[];
  mindMap: ConceptMindMap;
  formulas?: FormulaItem[];
  reactions?: ReactionItem[];
  definitions?: DefinitionItem[];
}

export interface PrismSession {
  id: string;
  userId: string;
  subject: SubjectType;
  topic: string;
  textbookInput: string;
  examReferenceInput?: string;
  externalSnippetsInput?: string;
  knowledgeLayer: PrismKnowledgeLayer;
  materials: PrismGeneratedMaterials;
  createdAt: string;
  updatedAt: string;
  provider?: string;
}
