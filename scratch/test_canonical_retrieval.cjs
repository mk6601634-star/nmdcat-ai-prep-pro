// Deterministic unit & integration test for getCanonicalMCQs & validateMCQForContext
// Workspace: c:\Users\mehra\Documents\for cline vs code

const fs = require('fs');
const path = require('path');

// We test the logic of canonical retrieval & validation directly
console.log('====================================================');
console.log('RUNNING CANONICAL MCQ RETRIEVAL & INTEGRITY SUITE');
console.log('====================================================\n');

// Mock sample MCQs spanning subjects, chapters, topics
const sampleBank = [
  {
    id: 'bio-1',
    question: 'What is the primary function of ribosomes in eukaryotic cells?',
    options: ['Protein synthesis', 'Lipid synthesis', 'DNA replication', 'ATP generation'],
    correctIndex: 0,
    explanation: 'Ribosomes are responsible for translating mRNA into polypeptide chains.',
    subject: 'Biology',
    chapter: 'Cell Biology & Organelles',
    topic: 'Cell Organelles',
    difficulty: 'Medium',
    status: 'PUBLISHED',
    sourceType: 'PAST_PAPER'
  },
  {
    id: 'chem-1',
    question: 'Which hybridization corresponds to a planar triangular geometry?',
    options: ['sp', 'sp2', 'sp3', 'dsp2'],
    correctIndex: 1,
    explanation: 'sp2 hybridization gives 120 degree bond angles and trigonal planar geometry.',
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
    explanation: 'Benevolent means well-meaning and kindly; generous is a synonym.',
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
    explanation: 'By transitive property of categorical syllogisms, all A are C.',
    subject: 'Logical Reasoning',
    chapter: 'Syllogisms',
    topic: 'Deductive Logic',
    difficulty: 'Medium',
    status: 'PUBLISHED',
    sourceType: 'SYSTEM'
  },
  {
    id: 'draft-1',
    question: 'Draft question not published',
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
    id: 'invalid-opt-1',
    question: 'Invalid option question',
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
    id: 'invalid-idx-1',
    question: 'Invalid correctIndex',
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 5, // Out of bounds
    explanation: 'Invalid',
    subject: 'Biology',
    chapter: 'Cell Biology & Organelles',
    topic: 'Cell Organelles',
    difficulty: 'Easy',
    status: 'PUBLISHED',
    sourceType: 'SYSTEM'
  }
];

// Let's import the compiled or ts-node mcqRetrievalService or test via tsx
console.log('Sample Bank prepared with 8 MCQs (5 valid canonical subjects, 1 draft, 2 malformed).');
