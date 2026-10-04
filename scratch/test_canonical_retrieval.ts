import { filterCanonicalMCQs, validateMCQForContext, MCQRetrievalContext } from '../src/lib/mcqRetrievalService';
import { MCQQuestion } from '../src/types';

console.log('================================================================');
console.log('CANONICAL MCQ RETRIEVAL & INTEGRITY TEST SUITE');
console.log('================================================================\n');

const mockBank: MCQQuestion[] = [
  {
    id: 'bio-1',
    question: 'What is the primary function of ribosomes in eukaryotic cells?',
    options: ['Protein synthesis', 'Lipid synthesis', 'DNA replication', 'ATP generation'],
    correctIndex: 0,
    explanation: 'Ribosomes translate mRNA into proteins.',
    subject: 'Biology',
    chapter: 'Cell Biology & Organelles',
    topic: 'Cell Organelles',
    difficulty: 'Medium',
    status: 'PUBLISHED',
    sourceType: 'PAST_PAPER'
  },
  {
    id: 'bio-2',
    question: 'Which organelle is known as the powerhouse of the cell?',
    options: ['Nucleus', 'Mitochondria', 'Chloroplast', 'Golgi apparatus'],
    correctIndex: 1,
    explanation: 'Mitochondria generate the majority of cellular ATP.',
    subject: 'Biology',
    chapter: 'Cell Biology & Organelles',
    topic: 'Cell Organelles',
    difficulty: 'Easy',
    status: 'PUBLISHED',
    sourceType: 'PAST_PAPER'
  },
  {
    id: 'chem-1',
    question: 'Which hybridization corresponds to a planar triangular geometry?',
    options: ['sp', 'sp2', 'sp3', 'dsp2'],
    correctIndex: 1,
    explanation: 'sp2 hybridization gives 120 degree bond angles.',
    subject: 'Chemistry',
    chapter: 'Chemical Bonding',
    topic: 'Hybridization',
    difficulty: 'Hard',
    status: 'PUBLISHED',
    sourceType: 'SYSTEM'
  },
  {
    id: 'phy-1',
    question: 'What is the SI unit of electric potential difference?',
    options: ['Ampere', 'Volt', 'Ohm', 'Coulomb'],
    correctIndex: 1,
    explanation: 'Electric potential difference is measured in Volts (J/C).',
    subject: 'Physics',
    chapter: 'Electrostatics',
    topic: 'Electric Potential',
    difficulty: 'Easy',
    status: 'PUBLISHED',
    sourceType: 'PAST_PAPER'
  },
  {
    id: 'eng-1',
    question: 'Choose the correct synonym for "Benevolent":',
    options: ['Malevolent', 'Generous', 'Cruel', 'Indifferent'],
    correctIndex: 1,
    explanation: 'Benevolent means well-meaning and kindly.',
    subject: 'English',
    chapter: 'Vocabulary',
    topic: 'Synonyms & Antonyms',
    difficulty: 'Medium',
    status: 'PUBLISHED',
    sourceType: 'SYSTEM'
  },
  {
    id: 'lr-1',
    question: 'If all A are B and all B are C, then:',
    options: ['All A are C', 'Some A are not C', 'No A is C', 'None of these'],
    correctIndex: 0,
    explanation: 'By transitive property, all A are C.',
    subject: 'Logical Reasoning',
    chapter: 'Syllogisms',
    topic: 'Deductive Logic',
    difficulty: 'Medium',
    status: 'PUBLISHED',
    sourceType: 'SYSTEM'
  },
  // Malformed / draft records to verify validation gates
  {
    id: 'draft-bio',
    question: 'Draft biology question',
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
    explanation: 'Draft',
    subject: 'Biology',
    chapter: 'Cell Biology & Organelles',
    topic: 'Cell Organelles',
    difficulty: 'Easy',
    status: 'DRAFT',
    sourceType: 'SYSTEM'
  },
  {
    id: 'invalid-opts-bio',
    question: 'Invalid options biology question',
    options: ['A', 'B'], // Less than 3 options
    correctIndex: 0,
    explanation: 'Invalid',
    subject: 'Biology',
    chapter: 'Cell Biology & Organelles',
    topic: 'Cell Organelles',
    difficulty: 'Easy',
    status: 'PUBLISHED',
    sourceType: 'SYSTEM'
  },
  {
    id: 'invalid-idx-bio',
    question: 'Invalid index biology question',
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 8, // Out of bounds
    explanation: 'Invalid',
    subject: 'Biology',
    chapter: 'Cell Biology & Organelles',
    topic: 'Cell Organelles',
    difficulty: 'Easy',
    status: 'PUBLISHED',
    sourceType: 'SYSTEM'
  }
];

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail: string = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testName} ${detail}`);
  } else {
    console.error(`[FAIL] ${testName} ${detail}`);
  }
}

// TEST GROUP 1: SUBJECT ISOLATION
console.log('--- TEST GROUP 1: SUBJECT ISOLATION ---');
const bioRes = filterCanonicalMCQs(mockBank, {
  subjectId: 'Biology',
  chapterId: 'Cell Biology & Organelles',
  topicId: 'Cell Organelles'
});
assert(bioRes.questions.length === 2, 'Biology Retrieval Count', `Expected 2 valid published questions, got ${bioRes.questions.length}`);
assert(bioRes.questions.every(q => q.subject.toLowerCase().includes('bio')), 'Biology Cross-Subject Purity', 'All returned questions belong to Biology');
assert(!bioRes.questions.some(q => q.id.includes('draft') || q.id.includes('invalid')), 'Biology Quality Gate', 'Draft & malformed questions excluded');

const chemRes = filterCanonicalMCQs(mockBank, {
  subjectId: 'Chemistry',
  chapterId: 'Chemical Bonding',
  topicId: 'Hybridization'
});
assert(chemRes.questions.length === 1 && chemRes.questions[0].id === 'chem-1', 'Chemistry Retrieval', `Got ${chemRes.questions.map(q => q.id).join(', ')}`);

const phyRes = filterCanonicalMCQs(mockBank, {
  subjectId: 'Physics',
  chapterId: 'Electrostatics',
  topicId: 'Electric Potential'
});
assert(phyRes.questions.length === 1 && phyRes.questions[0].id === 'phy-1', 'Physics Retrieval', `Got ${phyRes.questions.map(q => q.id).join(', ')}`);

const engRes = filterCanonicalMCQs(mockBank, {
  subjectId: 'English',
  chapterId: 'Vocabulary',
  topicId: 'Synonyms & Antonyms'
});
assert(engRes.questions.length === 1 && engRes.questions[0].id === 'eng-1', 'English Retrieval', `Got ${engRes.questions.map(q => q.id).join(', ')}`);

const lrRes = filterCanonicalMCQs(mockBank, {
  subjectId: 'Logical Reasoning',
  chapterId: 'Syllogisms',
  topicId: 'Deductive Logic'
});
assert(lrRes.questions.length === 1 && lrRes.questions[0].id === 'lr-1', 'Logical Reasoning Retrieval', `Got ${lrRes.questions.map(q => q.id).join(', ')}`);

// TEST GROUP 2: ZERO FALLBACK ON EMPTY TOPIC
console.log('\n--- TEST GROUP 2: ZERO FALLBACK ON EMPTY TOPIC ---');
const emptyRes = filterCanonicalMCQs(mockBank, {
  subjectId: 'Biology',
  chapterId: 'Nonexistent Chapter',
  topicId: 'Nonexistent Topic'
});
assert(emptyRes.questions.length === 0, 'Zero-Fallback Empty Count', `Expected 0, got ${emptyRes.questions.length}`);
assert(emptyRes.status === 'EMPTY', 'Zero-Fallback Status', `Expected EMPTY, got ${emptyRes.status}`);

// TEST GROUP 3: CROSS-CONTAMINATION REJECTION
console.log('\n--- TEST GROUP 3: CROSS-CONTAMINATION REJECTION ---');
const bioMCQ = mockBank[0];
const phyContext: MCQRetrievalContext = { subjectId: 'Physics' };
const crossValidation = validateMCQForContext(bioMCQ, phyContext);
assert(!crossValidation.valid, 'Cross-Subject Validation Rejection (Physics -> Bio MCQ)', `Reason: ${crossValidation.reason}`);

const lrContext: MCQRetrievalContext = { subjectId: 'Logical Reasoning' };
const crossValidation2 = validateMCQForContext(mockBank[1], lrContext);
assert(!crossValidation2.valid, 'Cross-Subject Validation Rejection (LR -> Bio MCQ)', `Reason: ${crossValidation2.reason}`);

const chemContext: MCQRetrievalContext = { subjectId: 'Chemistry' };
const crossValidation3 = validateMCQForContext(mockBank[3], chemContext); // phy-1
assert(!crossValidation3.valid, 'Cross-Subject Validation Rejection (Chem -> Phy MCQ)', `Reason: ${crossValidation3.reason}`);

// TEST GROUP 4: EXCLUSION FILTERING
console.log('\n--- TEST GROUP 4: EXCLUSION FILTERING ---');
const excludeRes = filterCanonicalMCQs(mockBank, {
  subjectId: 'Biology',
  excludeQuestionIds: ['bio-1']
});
assert(excludeRes.questions.length === 1 && excludeRes.questions[0].id === 'bio-2', 'Question Exclusion', `bio-1 excluded, got ${excludeRes.questions.map(q => q.id).join(', ')}`);

// TEST GROUP 5: DIFFICULTY & SOURCE FILTERING
console.log('\n--- TEST GROUP 5: DIFFICULTY & SOURCE TYPE FILTERING ---');
const diffRes = filterCanonicalMCQs(mockBank, {
  subjectId: 'Biology',
  difficulty: 'Easy'
});
assert(diffRes.questions.length === 1 && diffRes.questions[0].id === 'bio-2', 'Difficulty Filter (Easy)', `Expected bio-2, got ${diffRes.questions.map(q => q.id).join(', ')}`);

const sourceRes = filterCanonicalMCQs(mockBank, {
  subjectId: 'Chemistry',
  sourceType: 'SYSTEM'
});
assert(sourceRes.questions.length === 1 && sourceRes.questions[0].id === 'chem-1', 'Source Type Filter (SYSTEM)', `Expected chem-1, got ${sourceRes.questions.map(q => q.id).join(', ')}`);

console.log('\n================================================================');
console.log(`TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
if (passedTests === totalTests) {
  console.log('ALL DETERMINISTIC INTEGRITY TESTS PASSED 100%');
} else {
  console.error(`FAILED: ${totalTests - passedTests} tests failed.`);
  process.exit(1);
}
console.log('================================================================');
