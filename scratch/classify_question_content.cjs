const fs = require('fs');
const path = require('path');

const dumpPath = path.join(process.cwd(), 'scratch', 'firestore_mcqs_dump.json');
const rawData = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));

console.log('Classifying all 2593 questions by textual and pedagogical content...');

const bioKeywords = [
  'cell', 'dna', 'rna', 'chromosome', 'protein', 'enzyme', 'organelle', 'ribosome', 'mitochondria',
  'nucleus', 'membrane', 'osmosis', 'photosynthesis', 'respiration', 'glycolysis', 'krebs', 'atp synthase',
  'chloroplast', 'meiosis', 'mitosis', 'gamete', 'allele', 'gene', 'genotype', 'phenotype', 'inheritance',
  'okazaki', 'vertebrae', 'skeletal', 'muscle', 'neuron', 'synapse', 'action potential', 'hormone',
  'antibody', 'antigen', 'phagocyte', 'nephron', 'alveoli', 'hemoglobin', 'digestion', 'pancreas',
  'liver', 'virus', 'capsid', 'bacteriophage', 'bacteria', 'fungi', 'kingdom', 'phylum'
];

const chemKeywords = [
  'mole', 'stoichiometry', 'molarity', 'hybridization', 'orbital', 'sp2', 'sp3', 'electronegativity',
  'ionization energy', 'electron affinity', 'oxidation number', 'redox', 'enthalpy', 'entropy', 'gibbs',
  'activation energy', 'rate law', 'order of reaction', 'ksp', 'ph', 'poh', 'buffer', 'acid', 'base',
  'salt', 'titration', 'alkane', 'alkene', 'alkyne', 'benzene', 'aromatic', 'electrophile', 'nucleophile',
  'sn1', 'sn2', 'elimination', 'alcohol', 'phenol', 'aldehyde', 'ketone', 'carboxylic acid', 'ester',
  'ether', 'macromolecule', 'polymer', 'periodic table', 'transition element', 'ligand', 'coordination',
  'graham', 'dalton', 'boyle', 'charles', 'ideal gas equation', 'solubility product', 'common ion effect',
  'vsepr', 'dipole moment', 'covalent bond', 'ionic bond', 'hydrogen bond', 'lattice energy'
];

const phyKeywords = [
  'velocity', 'acceleration', 'momentum', 'inertia', 'force', 'newton', 'friction', 'torque', 'angular velocity',
  'centripetal', 'projectile', 'work', 'kinetic energy', 'potential energy', 'gravitational', 'escape velocity',
  'satellite', 'orbital speed', 'fluid', 'viscosity', 'bernoulli', 'terminal velocity', 'simple harmonic motion',
  'pendulum', 'oscillation', 'resonance', 'frequency', 'wavelength', 'sound intensity', 'doppler', 'interference',
  'diffraction', 'polarization', 'refraction', 'snell', 'lens', 'mirror', 'electric field', 'coulomb',
  'potential difference', 'volt', 'capacitance', 'capacitor', 'dielectric', 'resistor', 'ohm', 'kirchhoff',
  'potentiometer', 'wheatstone', 'magnetic field', 'biot-savart', 'ampere', 'lorentz force', 'solenoid',
  'faraday', 'lenz', 'induction', 'transformer', 'alternating current', 'rectification', 'diode',
  'transistor', 'logic gate', 'photoelectric', 'compton', 'de broglie', 'bohr model', 'rutherford',
  'half life', 'radioactivity', 'decay constant', 'binding energy', 'mass defect', 'fission', 'fusion'
];

function scoreKeywords(text, keywords) {
  let count = 0;
  for (const kw of keywords) {
    const reg = new RegExp(`\\b${kw}\\b`, 'i');
    if (reg.test(text)) count++;
  }
  return count;
}

const verifiedReclassifications = [];
const verifiedClean = [];

for (const q of rawData) {
  const docId = q._firestoreDocId || q.id;
  const storedSub = q.subject || 'Unknown';
  const storedChap = q.chapter || 'Unknown';
  const fullText = `${q.question || ''} ${q.explanation || ''} ${(q.options || []).join(' ')}`;

  const bioScore = scoreKeywords(fullText, bioKeywords);
  const chemScore = scoreKeywords(fullText, chemKeywords);
  const phyScore = scoreKeywords(fullText, phyKeywords);

  let predictedSub = storedSub;
  let reason = 'Matches stored subject';
  let confidence = 'NORMAL';

  if (storedSub === 'Physics') {
    if (chemScore >= 2 && chemScore > phyScore) {
      predictedSub = 'Chemistry';
      reason = `Content has strong Chemistry signals (score: ${chemScore} vs phy: ${phyScore})`;
      confidence = 'HIGH';
    } else if (bioScore >= 2 && bioScore > phyScore) {
      predictedSub = 'Biology';
      reason = `Content has strong Biology signals (score: ${bioScore} vs phy: ${phyScore})`;
      confidence = 'HIGH';
    }
  } else if (storedSub === 'Logical Reasoning') {
    if (phyScore >= 2 && phyScore > chemScore && phyScore > bioScore) {
      predictedSub = 'Physics';
      reason = `Content has strong Physics signals (score: ${phyScore})`;
      confidence = 'HIGH';
    }
  }

  if (predictedSub !== storedSub) {
    verifiedReclassifications.push({
      id: docId,
      storedSubject: storedSub,
      storedChapter: storedChap,
      questionText: q.question.slice(0, 90),
      predictedSubject: predictedSub,
      bioScore,
      chemScore,
      phyScore,
      reason,
      confidence
    });
  } else {
    verifiedClean.push(docId);
  }
}

console.log(`Content-Verified Reclassifications: ${verifiedReclassifications.length}`);
console.log(`Verified Clean Records: ${verifiedClean.length}`);

// Group by transfer
const transferMap = {};
for (const r of verifiedReclassifications) {
  const key = `${r.storedSubject} -> ${r.predictedSubject}`;
  transferMap[key] = (transferMap[key] || 0) + 1;
}
console.log('Transfer map:', transferMap);

fs.writeFileSync(
  path.join(process.cwd(), 'scratch', 'content_verified_reclassifications.json'),
  JSON.stringify({ count: verifiedReclassifications.length, transferMap, reclassifications: verifiedReclassifications }, null, 2),
  'utf8'
);
