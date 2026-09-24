import { 
  PrismClaim, 
  PrismSource, 
  ClaimType, 
  SuperlativeType, 
  HistoricalPriorityType, 
  VerificationLevel, 
  SemanticPreservationStatus 
} from './prismTypes';

/**
 * Superlative & Exception Term Matchers
 */
const HISTORICAL_PATTERNS: Array<{ type: HistoricalPriorityType; regex: RegExp }> = [
  { 
    type: 'FIRST_CRYSTALLIZED', 
    regex: /\b(first\s+(?:\w+\s+){0,4}crystalli[sz]ed|crystalli[sz]ed\s+(?:for\s+the\s+)?first\s+time)\b/i 
  },
  { 
    type: 'FIRST_SYNTHESIZED', 
    regex: /\b(first\s+(?:\w+\s+){0,4}synthesi[sz]ed|synthesi[sz]ed\s+(?:for\s+the\s+)?first\s+time|artificially\s+synthesi[sz]ed\s+first)\b/i 
  },
  { 
    type: 'FIRST_ISOLATED', 
    regex: /\b(first\s+(?:\w+\s+){0,4}(?:isolated|extracted|purified)|(?:isolated|extracted|purified)\s+(?:for\s+the\s+)?first\s+time)\b/i 
  },
  { 
    type: 'FIRST_OBSERVED', 
    regex: /\b(first\s+(?:\w+\s+){0,4}(?:observed|seen|visuali[sz]ed)|(?:observed|seen|visuali[sz]ed)\s+(?:for\s+the\s+)?first\s+time)\b/i 
  },
  { 
    type: 'FIRST_DISCOVERED', 
    regex: /\b(first\s+(?:\w+\s+){0,4}discovered|discovered\s+(?:for\s+the\s+)?first\s+time|initial\s+discovery\s+of)\b/i 
  },
  { 
    type: 'FIRST_DESCRIBED', 
    regex: /\b(first\s+(?:\w+\s+){0,4}(?:described|reported)|(?:described|reported)\s+(?:for\s+the\s+)?first\s+time)\b/i 
  },
  { 
    type: 'FIRST_IDENTIFIED', 
    regex: /\b(first\s+(?:\w+\s+){0,4}(?:identified|recogni[sz]ed)|(?:identified|recogni[sz]ed)\s+(?:for\s+the\s+)?first\s+time)\b/i 
  },
];

const SUPERLATIVE_PATTERNS: Array<{ type: SuperlativeType; regex: RegExp }> = [
  { type: 'LARGEST', regex: /\b(largest|greatest|biggest|most massive|highest capacity)\b/i },
  { type: 'SMALLEST', regex: /\b(smallest|tiniest|least massive|least size)\b/i },
  { type: 'LONGEST', regex: /\b(longest|most extensive)\b/i },
  { type: 'SHORTEST', regex: /\b(shortest|least extensive)\b/i },
  { type: 'HIGHEST', regex: /\b(highest|maximum|peak|maximal|greatest concentration|most abundant)\b/i },
  { type: 'LOWEST', regex: /\b(lowest|minimum|minimal|least abundant|least concentration)\b/i },
  { type: 'FASTEST', regex: /\b(fastest|quickest|most rapid|highest velocity|highest rate)\b/i },
  { type: 'SLOWEST', regex: /\b(slowest|least rapid|lowest velocity|lowest rate|rate-limiting)\b/i },
  { type: 'OLDEST', regex: /\b(oldest|earliest known|first evolved|most primitive)\b/i },
  { type: 'YOUNGEST', regex: /\b(youngest|most recent|latest evolved)\b/i },
  { type: 'MAXIMUM', regex: /\b(maximum|maximal|at most|up to a maximum)\b/i },
  { type: 'MINIMUM', regex: /\b(minimum|minimal|at least|down to a minimum)\b/i },
  { type: 'ONLY', regex: /\b(only|sole|exclusively|the single|the one and only)\b/i },
  { type: 'UNIQUE', regex: /\b(unique|uniquely|unprecedented|without parallel|peerless|sui generis)\b/i },
  { type: 'MOST', regex: /\b(most\s+\w+|most common|most prevalent|most frequent|predominant|predominantly|principal|principally|major|majority of|most widely)\b/i },
  { type: 'LEAST', regex: /\b(least\s+\w+|least common|least prevalent|least frequent|rarest|most scarce)\b/i },
  { type: 'FIRST', regex: /\b(first|earliest|initial discovery|original)\b/i },
  { type: 'LAST', regex: /\b(last|final|ultimate)\b/i },
];

const EXCEPTION_PATTERNS: RegExp[] = [
  /\b(exception|exceptions|with the exception of|except for|all except|all but)\b/i,
  /\b(unlike other|unlike most|in contrast to all other|deviates from the rule)\b/i,
  /\b(does not follow|does not conform|anomalous|anomaly|anomalously)\b/i,
  /\b(atypical|atypically|non-standard behavior|at variance with)\b/i,
  /\b(exceeds all other|outperforms all other|surpasses all other)\b/i,
];

// False positive ordinals to exclude from superlative/historical classification
const ORDINAL_FALSE_POSITIVES = [
  /\bfirst law\b/i,
  /\bfirst step\b/i,
  /\bfirst order\b/i,
  /\bfirst trimester\b/i,
  /\bfirst messenger\b/i,
  /\bfirst line\b/i,
  /\bfirst meiotic\b/i,
  /\bfirst polar body\b/i,
  /\bfirst degree\b/i,
  /\bfirst generation\b/i,
  /\bfirst stage\b/i,
  /\bfirst phase\b/i,
  /\bfirst branchial\b/i,
  /\bfirst heart sound\b/i,
  /\bfirst ionization energy\b/i,
  /\bfirst electron affinity\b/i,
  /\bsecond law\b/i,
  /\bsecond step\b/i,
  /\bsecond order\b/i,
  /\bthird law\b/i,
  /\bsecond trimester\b/i,
  /\blast step\b/i,
  /\blast phase\b/i,
];

const SCOPE_PATTERNS = [
  /\b(in\s+(?:the\s+)?(?:human\s+body|humans?|mammals?|vertebrates?|animals?|plants?|eukaryotes?|prokaryotes?|bacteria|viruses?|cells?|living organisms?|biological systems?|biosphere|nature|the periodic table|blood plasma|extracellular fluid|intracellular fluid|universe|earth))\b/i,
  /\b(among\s+(?:all\s+)?(?:vertebrates?|mammals?|animals?|plants?|elements?|known\s+\w+|enzymes?|proteins?|cells?))\b/i,
  /\b(of\s+all\s+(?:known\s+)?(?:elements?|organisms?|enzymes?|proteins?|cells?|compounds?|minerals?))\b/i,
  /\b(known\s+to\s+(?:science|date|modern medicine))\b/i,
  /\b(under\s+(?:standard|physiological|normal|cellular)\s+conditions?)\b/i,
];

/**
 * Checks if a string contains ordinal domain terms that should not be flagged as historical/superlative priorities.
 */
function isOrdinalFalsePositive(text: string): boolean {
  return ORDINAL_FALSE_POSITIVES.some((pattern) => pattern.test(text));
}

/**
 * Detects whether a statement or claim is a Superlative, Historical Priority, or Exception claim.
 */
export function detectSuperlativeAndException(statement: string): {
  claimType: ClaimType;
  superlativeType?: SuperlativeType;
  historicalPriorityType?: HistoricalPriorityType;
  isSuperlative: boolean;
  isHighRiskSuperlative: boolean;
  matchedTerm?: string;
} {
  const cleanStmt = statement.trim();

  // 1. Check Historical Priority First (most specific)
  for (const item of HISTORICAL_PATTERNS) {
    const match = cleanStmt.match(item.regex);
    if (match) {
      // Check if it's an ordinal false positive (e.g. "first step of...")
      if (isOrdinalFalsePositive(cleanStmt)) {
        continue;
      }
      return {
        claimType: 'HISTORICAL',
        historicalPriorityType: item.type,
        superlativeType: 'FIRST',
        isSuperlative: true,
        isHighRiskSuperlative: true,
        matchedTerm: match[0],
      };
    }
  }

  // 2. Check Exception
  for (const regex of EXCEPTION_PATTERNS) {
    const match = cleanStmt.match(regex);
    if (match) {
      return {
        claimType: 'EXCEPTION',
        isSuperlative: false,
        isHighRiskSuperlative: true,
        matchedTerm: match[0],
      };
    }
  }

  // 3. Check Superlative
  for (const item of SUPERLATIVE_PATTERNS) {
    const match = cleanStmt.match(item.regex);
    if (match) {
      // If it's "first" or "last", verify it's not a standard ordinal false positive
      if ((item.type === 'FIRST' || item.type === 'LAST') && isOrdinalFalsePositive(cleanStmt)) {
        continue;
      }

      return {
        claimType: 'SUPERLATIVE',
        superlativeType: item.type,
        isSuperlative: true,
        isHighRiskSuperlative: true,
        matchedTerm: match[0],
      };
    }
  }

  return {
    claimType: 'OTHER',
    isSuperlative: false,
    isHighRiskSuperlative: false,
  };
}

/**
 * Extracts qualified scope from a claim statement (e.g., "in the human body", "among vertebrates", "in the biosphere").
 */
export function extractScope(statement: string): string | undefined {
  for (const pattern of SCOPE_PATTERNS) {
    const match = statement.match(pattern);
    if (match && match[0]) {
      return match[0].trim();
    }
  }
  return undefined;
}

/**
 * Checks semantic preservation between generated claim and source materials.
 * Ensures superlatives or exceptions were not diluted (e.g., "largest" degraded to "large", "first discovered" degraded to "early").
 */
export function checkSemanticPreservation(
  claimStatement: string,
  sourceSnippets: string[]
): {
  status: SemanticPreservationStatus;
  notes?: string;
} {
  const combinedSources = sourceSnippets.join(' ');
  const claimDetection = detectSuperlativeAndException(claimStatement);

  if (!claimDetection.isSuperlative && claimDetection.claimType !== 'EXCEPTION') {
    return { status: 'VERIFIED_PRESERVED' };
  }

  const matchedTerm = claimDetection.matchedTerm?.toLowerCase() || '';

  // Check if the source explicitly contained the exact or synonymous superlative/exception
  const sourceDetection = detectSuperlativeAndException(combinedSources);
  
  if (sourceDetection.matchedTerm || (matchedTerm && combinedSources.toLowerCase().includes(matchedTerm))) {
    // Check if the scope is qualified
    const claimScope = extractScope(claimStatement);
    const sourceScope = extractScope(combinedSources);

    if (claimScope || sourceScope) {
      return { 
        status: 'VERIFIED_PRESERVED',
        notes: `Scope verified: ${claimScope || sourceScope || 'standard context'}`
      };
    }

    // If source has a scope but claim dropped it, it's SCOPE_AMBIGUOUS
    if (sourceScope && !claimScope) {
      return {
        status: 'SCOPE_AMBIGUOUS',
        notes: `Source specified '${sourceScope}' but claim omitted scope qualifier.`
      };
    }

    return { status: 'VERIFIED_PRESERVED' };
  }

  // If source contains diluted words (e.g. "very large" when claim claims "largest")
  const dilutedWordPairs = [
    { claim: 'largest', diluted: /\b(very large|major|big|prominent)\b/i },
    { claim: 'first', diluted: /\b(early|earlier|previously|initial)\b/i },
    { claim: 'most', diluted: /\b(many|abundant|common)\b/i },
    { claim: 'only', diluted: /\b(mainly|mostly|primarily|chiefly)\b/i },
    { claim: 'fastest', diluted: /\b(rapid|fast|high speed)\b/i }
  ];

  for (const pair of dilutedWordPairs) {
    if (matchedTerm.includes(pair.claim) && pair.diluted.test(combinedSources) && !pair.claim.includes(sourceDetection.matchedTerm || '')) {
      return {
        status: 'POSSIBLE_DILUTION',
        notes: `Source mentions '${combinedSources.match(pair.diluted)?.[0]}' but claim makes an absolute '${pair.claim}' assertion.`
      };
    }
  }

  // If no support found in source snippets
  return {
    status: 'SCOPE_AMBIGUOUS',
    notes: 'Superlative claim has unclear source scope attribution.'
  };
}

/**
 * Computes deterministic verification level for a claim based on source hierarchy and corroboration.
 */
export function computeVerificationLevel(
  claim: PrismClaim,
  sources: PrismSource[],
  rawCorpus: string = ''
): VerificationLevel {
  const claimSources = sources.filter((s) => claim.sourceIds?.includes(s.id));
  const isSuperlativeOrException = 
    claim.claimType === 'SUPERLATIVE' || 
    claim.claimType === 'HISTORICAL' || 
    claim.claimType === 'EXCEPTION' || 
    claim.isHighRiskSuperlative;

  if (claim.status === 'TEXTBOOK_SCIENCE_CONFLICT' || claim.status === 'DISPUTED') {
    return 'CONFLICTING_EVIDENCE';
  }

  if (claimSources.length === 0 && !rawCorpus) {
    return isSuperlativeOrException ? 'UNVERIFIED_SUPERLATIVE' : 'INSUFFICIENT_EVIDENCE';
  }

  const hasTier1or2 = claimSources.some((s) => s.tier === 1 || s.tier === 2);
  const multipleSources = claimSources.length >= 2;

  // Semantic check
  const sourceTexts = [
    ...claimSources.map((s) => `${s.title} ${s.contentSnippet} ${s.notes || ''}`),
    rawCorpus
  ];
  const preservation = checkSemanticPreservation(claim.statement, sourceTexts);

  if (preservation.status === 'SCOPE_AMBIGUOUS' || preservation.status === 'POSSIBLE_DILUTION') {
    return 'CONTEXT_AMBIGUOUS';
  }

  if (multipleSources && hasTier1or2) {
    return 'CROSS_SOURCE_CONSISTENT';
  }

  if (multipleSources) {
    return 'MULTI_SOURCE_SUPPORTED';
  }

  if (hasTier1or2 || claimSources.length === 1) {
    return 'SOURCE_SUPPORTED';
  }

  return isSuperlativeOrException ? 'UNVERIFIED_SUPERLATIVE' : 'INSUFFICIENT_EVIDENCE';
}

/**
 * Deterministically validates and enriches a PrismClaim with superlative, exception, and verification metadata.
 * Non-destructive and backward compatible.
 */
export function validateAndEnrichPrismClaim(
  claim: PrismClaim,
  sources: PrismSource[],
  rawCorpus: string = ''
): PrismClaim {
  // 1. Detect claim type and superlative metadata
  const detection = detectSuperlativeAndException(claim.statement);
  
  // 2. Extract scope
  const scope = extractScope(claim.statement) || extractScope(claim.qualifier || '');

  // 3. Check semantic preservation against source texts
  const claimSources = sources.filter((s) => claim.sourceIds?.includes(s.id));
  const sourceSnippets = [
    ...claimSources.map((s) => `${s.title} ${s.contentSnippet}`),
    rawCorpus
  ].filter(Boolean);

  const preservation = checkSemanticPreservation(claim.statement, sourceSnippets);

  // 4. Calculate verification level
  const preliminaryClaim: PrismClaim = {
    ...claim,
    claimType: detection.claimType !== 'OTHER' ? detection.claimType : claim.claimType || 'OTHER',
    superlativeType: detection.superlativeType || claim.superlativeType,
    historicalPriorityType: detection.historicalPriorityType || claim.historicalPriorityType,
    isHighRiskSuperlative: detection.isHighRiskSuperlative,
    detectedScope: scope,
    semanticPreservationStatus: preservation.status,
  };

  const verificationLevel = computeVerificationLevel(preliminaryClaim, sources, rawCorpus);

  return {
    ...preliminaryClaim,
    verificationLevel,
  };
}
