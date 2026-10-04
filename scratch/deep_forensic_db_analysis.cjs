const fs = require('fs');
const path = require('path');

const dumpPath = path.join(process.cwd(), 'scratch', 'firestore_mcqs_dump.json');
const rawData = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));

console.log('Analyzing 2593 raw Firestore documents...');

const subjectTaxonomy = {
  Biology: ['cell', 'dna', 'rna', 'chromosome', 'protein', 'enzyme', 'photosynthesis', 'respiration', 'mitochondria', 'genetics', 'evolution', 'support', 'movement', 'circulation', 'nervous', 'reproduction', 'ecosystem', 'biotechnology', 'immunity', 'homeostasis'],
  Chemistry: ['stoichiometry', 'atomic structure', 'bonding', 'gases', 'liquids', 'solids', 'equilibrium', 'reaction kinetics', 'thermo-chemistry', 'electrochemistry', 'acids', 'bases', 'salts', 'periodic table', 'transition elements', 'hydrocarbons', 'alkyl halides', 'alcohols', 'aldehydes', 'ketones', 'carboxylic', 'macromolecules'],
  Physics: ['measurement', 'vectors', 'motion and force', 'work and energy', 'rotational', 'fluid dynamics', 'oscillations', 'waves', 'thermodynamics', 'electrostatics', 'current electricity', 'electromagnetism', 'electromagnetic induction', 'alternating current', 'physics of solids', 'electronics', 'dawn of modern physics', 'atomic spectra', 'nuclear physics'],
  English: ['vocabulary', 'grammar', 'synonyms', 'antonyms', 'prepositions', 'sentence completion', 'comprehension', 'spelling', 'tenses'],
  'Logical Reasoning': ['critical thinking', 'letter and symbol series', 'logical deduction', 'logical problems', 'course of action', 'cause and effect', 'syllogism']
};

const contaminatedList = [];
const chapterMismatches = [];
const topicMismatches = [];
const pastPaperList = [];
const aiGenList = [];
const systemList = [];
const genericTopicList = [];

// PMDC Subject Chapter Maps
const chemistryChapters = [
  'stoichiometry', 'atomic structure', 'theories of covalent bonding', 'states of matter', 'gases', 'liquids',
  'chemical equilibrium', 'reaction kinetics', 'thermo-chemistry', 'electrochemistry', 'chemical bonding',
  's and p block elements', 'transition elements', 'fundamental principles of organic chemistry', 'hydrocarbons',
  'alkyl halides', 'alcohols', 'aldehydes', 'carboxylic acids', 'macromolecules', 'acids, bases and salts', 'chemical kinetics'
];

const biologyChapters = [
  'cell structure', 'biological molecules', 'enzymes', 'bioenergetics', 'acellular life', 'prokaryotes',
  'diversity among animals', 'form and function in plants', 'digestion', 'circulation', 'immunity',
  'respiration', 'homeostasis', 'support and movement', 'nervous coordination', 'chemical coordination',
  'reproduction', 'development and aging', 'inheritance', 'chromosomes and dna', 'evolution', 'biotechnology'
];

const physicsChapters = [
  'measurement', 'vectors and equilibrium', 'motion and force', 'work and energy', 'rotational and circular motion',
  'fluid dynamics', 'oscillations', 'waves', 'physical optics', 'thermodynamics', 'electrostatics',
  'current electricity', 'electromagnetism', 'electromagnetic induction', 'alternating current',
  'physics of solids', 'electronics', 'dawn of modern physics', 'atomic spectra', 'nuclear physics'
];

for (const q of rawData) {
  const docId = q._firestoreDocId || q.id;
  const storedSub = (q.subject || '').trim();
  const storedChap = (q.chapter || '').trim();
  const storedTop = (q.topic || '').trim();
  const qText = q.question || '';
  const expText = q.explanation || '';
  const fullText = `${qText} ${expText} ${(q.options || []).join(' ')}`.toLowerCase();
  const chapLower = storedChap.toLowerCase();

  // Check 1: Chemistry chapter stored under Physics
  if (storedSub === 'Physics') {
    if (chemistryChapters.some(cc => chapLower.includes(cc))) {
      contaminatedList.push({
        id: docId,
        storedSubject: 'Physics',
        storedChapter: storedChap,
        storedTopic: storedTop,
        questionText: qText.slice(0, 90),
        reason: `Chemistry chapter ("${storedChap}") stored under Physics`,
        recommendedSubject: 'Chemistry',
        confidence: 'HIGH'
      });
    } else if (biologyChapters.some(bc => chapLower.includes(bc))) {
      contaminatedList.push({
        id: docId,
        storedSubject: 'Physics',
        storedChapter: storedChap,
        storedTopic: storedTop,
        questionText: qText.slice(0, 90),
        reason: `Biology chapter ("${storedChap}") stored under Physics`,
        recommendedSubject: 'Biology',
        confidence: 'HIGH'
      });
    }
  }

  // Check 2: Physics chapter stored under Chemistry
  if (storedSub === 'Chemistry') {
    if (physicsChapters.some(pc => chapLower.includes(pc) && !['thermodynamics', 'atomic structure'].includes(pc))) {
      contaminatedList.push({
        id: docId,
        storedSubject: 'Chemistry',
        storedChapter: storedChap,
        storedTopic: storedTop,
        questionText: qText.slice(0, 90),
        reason: `Physics chapter ("${storedChap}") stored under Chemistry`,
        recommendedSubject: 'Physics',
        confidence: 'HIGH'
      });
    }
  }

  // Check 3: Logical Reasoning containing physics questions
  if (storedSub === 'Logical Reasoning') {
    if (fullText.includes('volt') || fullText.includes('velocity') || fullText.includes('acceleration') || fullText.includes('resistor') || fullText.includes('capacitance') || fullText.includes('electric field')) {
      contaminatedList.push({
        id: docId,
        storedSubject: 'Logical Reasoning',
        storedChapter: storedChap,
        storedTopic: storedTop,
        questionText: qText.slice(0, 90),
        reason: 'Physics question stored under Logical Reasoning',
        recommendedSubject: 'Physics',
        confidence: 'HIGH'
      });
    }
  }

  // Check 4: Generic topic placeholder
  if (storedTop.includes('topic requires canonical subtopic mapping') || storedTop.includes('General') || storedTop === storedChap) {
    genericTopicList.push({
      id: docId,
      subject: storedSub,
      chapter: storedChap,
      topic: storedTop
    });
  }

  // Check 5: Source breakdown
  if (q.sourceType === 'PAST_PAPER' || q.source === 'PAST_PAPER' || q.pastPaperYear || q.pastPaperTag) {
    pastPaperList.push(docId);
  } else if (q.sourceType === 'AI_GENERATED' || q.source === 'AI_GENERATED') {
    aiGenList.push(docId);
  } else {
    systemList.push(docId);
  }
}

console.log(`\nContaminated Questions Identified: ${contaminatedList.length}`);
console.log(`Generic Topic Placeholders: ${genericTopicList.length}`);
console.log(`Past Paper Questions: ${pastPaperList.length}`);
console.log(`AI Generated Questions: ${aiGenList.length}`);
console.log(`Standard / System Questions: ${systemList.length}`);

// Group contamination by subject
const contamBySubject = {};
for (const c of contaminatedList) {
  const key = `${c.storedSubject} -> ${c.recommendedSubject}`;
  contamBySubject[key] = (contamBySubject[key] || 0) + 1;
}
console.log('Contamination Breakdown:', contamBySubject);

// Save detailed forensic log
const forensicLog = {
  totalRecordsAudited: rawData.length,
  contaminatedRecordsCount: contaminatedList.length,
  contaminationBreakdown: contamBySubject,
  contaminatedRecords: contaminatedList,
  genericTopicsCount: genericTopicList.length,
  sampleGenericTopics: genericTopicList.slice(0, 20)
};

fs.writeFileSync(path.join(process.cwd(), 'scratch', 'forensic_db_contamination.json'), JSON.stringify(forensicLog, null, 2), 'utf8');
console.log('Saved detailed forensic contamination report to scratch/forensic_db_contamination.json');
