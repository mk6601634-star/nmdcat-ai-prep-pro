import { 
  SyllabusTopic, 
  MCQQuestion, 
  Flashcard, 
  CollegeCutoff,
  FormulaItem,
  ReactionItem,
  DefinitionItem,
  ConceptMindMap,
  KnowledgeGraphNode
} from '../types';

export const PMDC_SYLLABUS_TOPICS: SyllabusTopic[] = [
  // BIOLOGY
  {
    id: 'bio-1',
    subject: 'Biology',
    unit: 'Cell Structure & Function',
    topic: 'Organelles, Endomembrane System, Fluid Mosaic Model',
    weightagePercentage: 6,
    status: 'not-started',
    keyPoints: [
      'Ribosomes are non-membrane bound organelles made of rRNA and proteins.',
      'Lysosomes contain acid hydrolases (pH ~4.5-5.0).',
      'Fluid mosaic model proposed by Singer and Nicolson in 1972.'
    ]
  },
  {
    id: 'bio-2',
    subject: 'Biology',
    unit: 'Biological Molecules',
    topic: 'Carbohydrates, Proteins, Lipids, Nucleic Acids',
    weightagePercentage: 6,
    status: 'not-started',
    keyPoints: [
      'Peptide bonds formed by dehydration synthesis between -COOH and -NH2.',
      'Phosphodiester bond connects 3\' carbon of one sugar to 5\' carbon of next.',
      'Saturated fatty acids contain no C=C double bonds.'
    ]
  },
  {
    id: 'bio-3',
    subject: 'Biology',
    unit: 'Enzymes',
    topic: 'Enzyme Kinetics, Active Site, Inhibitors, Co-factors',
    weightagePercentage: 5,
    status: 'not-started',
    keyPoints: [
      'Competitive inhibitors increase Km but do not affect Vmax.',
      'Non-competitive inhibitors lower Vmax while Km remains unchanged.',
      'Prosthetic group is a tightly bound non-protein organic cofactor.'
    ]
  },
  {
    id: 'bio-4',
    subject: 'Biology',
    unit: 'Bioenergetics',
    topic: 'Photosynthesis (Z-scheme, Calvin Cycle) & Respiration (Glycolysis, Krebs)',
    weightagePercentage: 7,
    status: 'not-started',
    keyPoints: [
      'Glycolysis occurs in cytosol; net yield = 2 ATP, 2 NADH, 2 Pyruvate.',
      'Krebs cycle takes place in mitochondrial matrix.',
      'Rubisco is the most abundant enzyme on Earth.'
    ]
  },
  {
    id: 'bio-5',
    subject: 'Biology',
    unit: 'Human Physiology & Coordination',
    topic: 'Nervous System, Synapse, Endocrine Glands, Action Potential',
    weightagePercentage: 8,
    status: 'not-started',
    keyPoints: [
      'Resting membrane potential is -70mV maintained by Na+/K+ ATPase (3 Na+ out, 2 K+ in).',
      'Insulin produced by Beta cells of Islets of Langerhans.',
      'Saltatory conduction occurs at Nodes of Ranvier.'
    ]
  },
  {
    id: 'bio-6',
    subject: 'Biology',
    unit: 'Genetics & Inheritance',
    topic: 'Mendel Laws, Sex-Linked Inheritance, DNA Replication',
    weightagePercentage: 6,
    status: 'not-started',
    keyPoints: [
      'Dihybrid cross phenotypic ratio is 9:3:3:1.',
      'Haemophilia and Color blindness are X-linked recessive disorders.',
      'DNA polymerase III synthesizes new DNA strand in 5\' to 3\' direction.'
    ]
  },

  // CHEMISTRY
  {
    id: 'chem-1',
    subject: 'Chemistry',
    unit: 'Fundamental Concepts & Stoichiometry',
    topic: 'Mole Concept, Avogadro Number, Limiting Reactant, Yield',
    weightagePercentage: 5,
    status: 'not-started',
    keyPoints: [
      '1 mole of any gas at STP occupies 22.414 dm3.',
      'Limiting reactant controls the total amount of product formed.',
      'Percentage yield = (Actual Yield / Theoretical Yield) * 100.'
    ]
  },
  {
    id: 'chem-2',
    subject: 'Chemistry',
    unit: 'Atomic Structure & Quantum Numbers',
    topic: 'Bohr Model, Quantum Numbers (n, l, m, s), Electronic Configuration',
    weightagePercentage: 5,
    status: 'not-started',
    keyPoints: [
      'Aufbau principle: Electrons fill lower energy orbitals first.',
      'Hund Rule: Electrons occupy degenerate orbitals singly before pairing.',
      'Azimuthal quantum number (l) for s=0, p=1, d=2, f=3.'
    ]
  },
  {
    id: 'chem-3',
    subject: 'Chemistry',
    unit: 'Chemical Equilibrium & pH',
    topic: 'Le Chatelier Principle, Kc, Kp, Buffer Solutions, Solubility Product',
    weightagePercentage: 5,
    status: 'not-started',
    keyPoints: [
      'Buffer solution resists pH changes upon addition of small acid/base.',
      'Acidic buffer = Weak acid + its salt with strong base (e.g., CH3COOH + CH3COONa).',
      'Kp = Kc(RT)^Δn.'
    ]
  },
  {
    id: 'chem-4',
    subject: 'Chemistry',
    unit: 'Hydrocarbons & Organic Mechanisms',
    topic: 'Alkanes, Alkenes, Alkynes, Electrophilic Addition, Resonance',
    weightagePercentage: 7,
    status: 'not-started',
    keyPoints: [
      'Markovnikov Rule: In asymmetric addition, H attaches to carbon with more H atoms.',
      'Benzene is unusually stable due to delocalized pi electron cloud.',
      'Alkyne acidity increases in terminal alkynes (sp hybridized carbon).'
    ]
  },
  {
    id: 'chem-5',
    subject: 'Chemistry',
    unit: 'Alcohols, Phenols & Carbonyls',
    topic: 'Nucleophilic Addition, Aldol Condensation, Cannizzaro Reaction',
    weightagePercentage: 6,
    status: 'not-started',
    keyPoints: [
      'Lucas reagent (conc. HCl + ZnCl2): Tertiary alcohols react instantly.',
      'Formaldehyde undergoes Cannizzaro reaction because it lacks alpha-hydrogens.',
      'Tollens reagent (Ammoniacal AgNO3) gives silver mirror test with Aldehydes.'
    ]
  },

  // PHYSICS
  {
    id: 'phy-1',
    subject: 'Physics',
    unit: 'Force & Motion',
    topic: 'Newton Laws, Momentum, Impulse, Projectile Motion',
    weightagePercentage: 6,
    status: 'not-started',
    keyPoints: [
      'Time of flight T = (2*Vo*sinθ)/g.',
      'Maximum range occurs at launching angle θ = 45°.',
      'Rate of change of momentum equals applied Force (F = dp/dt).'
    ]
  },
  {
    id: 'phy-2',
    subject: 'Physics',
    unit: 'Work & Energy',
    topic: 'Work Done by Constant & Variable Force, Power, Energy Conservation',
    weightagePercentage: 5,
    status: 'not-started',
    keyPoints: [
      'Work W = F * d * cosθ.',
      'Power P = F * v.',
      'Escape velocity from Earth surface is approximately 11.2 km/s.'
    ]
  },
  {
    id: 'phy-3',
    subject: 'Physics',
    unit: 'Electrostatics',
    topic: 'Coulomb Law, Electric Field Intensity, Capacitors, Gauss Law',
    weightagePercentage: 6,
    status: 'not-started',
    keyPoints: [
      'Coulomb force F = (k * q1 * q2) / r^2.',
      'Capacitance of parallel plate capacitor C = (εo * εr * A) / d.',
      'Energy stored in capacitor E = 0.5 * C * V^2.'
    ]
  },
  {
    id: 'phy-4',
    subject: 'Physics',
    unit: 'Current Electricity & Magnetism',
    topic: 'Ohm Law, Kirchhoff Laws, Wheatstone Bridge, Magnetic Induction',
    weightagePercentage: 6,
    status: 'not-started',
    keyPoints: [
      'Kirchhoff First Law (KCL) is based on conservation of charge.',
      'Kirchhoff Second Law (KVL) is based on conservation of energy.',
      'Force on moving charge in magnetic field F = q(v x B).'
    ]
  },
  {
    id: 'phy-5',
    subject: 'Physics',
    unit: 'Dawn of Modern Physics & Nuclear Physics',
    topic: 'Photoelectric Effect, De Broglie Wavelength, Half-Life, Mass Defect',
    weightagePercentage: 5,
    status: 'not-started',
    keyPoints: [
      'Photoelectric effect demonstrates quantisation of light energy in photons.',
      'De Broglie wavelength λ = h / p for particles with momentum p.',
      'Half-life T1/2 = 0.693 / λ for first-order radioactive decay.'
    ]
  }
];

export const HIGH_YIELD_FLASHCARDS: Flashcard[] = [
  {
    id: 'fc-1',
    subject: 'Biology',
    topic: 'Bioenergetics',
    front: 'What is the net ATP yield from 1 molecule of Glucose undergoing Aerobic Respiration in eukaryotes?',
    back: 'Net yield is 36 to 38 ATPs (Glycolysis: 2 ATP + 2 NADH; Pyruvate Oxidation: 2 NADH; Krebs Cycle: 2 GTP/ATP + 6 NADH + 2 FADH2).',
    keyFormulaOrConcept: '1 NADH = 3 ATPs (or 2.5); 1 FADH2 = 2 ATPs (or 1.5)',
    mnemonic: 'Glycolysis(2) + Krebs(2) + ETC(32-34) = ~36-38 ATP'
  },
  {
    id: 'fc-2',
    subject: 'Chemistry',
    topic: 'Electrochemistry',
    front: 'In an Electrochemical Cell vs Electrolytic Cell, what are the anode and cathode charges?',
    back: 'Electrochemical (Galvanic): Anode is (-), Cathode is (+). Electrolytic: Anode is (+), Cathode is (-). Oxidation ALWAYS occurs at Anode in both!',
    keyFormulaOrConcept: 'Oxidation = Anode, Reduction = Cathode',
    mnemonic: 'AN OX and RED CAT (Anode Oxidation, Reduction Cathode)'
  },
  {
    id: 'fc-3',
    subject: 'Physics',
    topic: 'Electromagnetism',
    front: 'What is the formula for magnetic force on a current-carrying straight wire placed in a uniform magnetic field?',
    back: 'F = I * L * B * sin(θ), where θ is the angle between the length vector (direction of current) and magnetic field B.',
    keyFormulaOrConcept: 'Max force at θ = 90° (sin 90° = 1); Zero force at θ = 0° or 180°.'
  },
  {
    id: 'fc-4',
    subject: 'English',
    topic: 'Grammar Rules',
    front: 'What is the rule for "Prefer"? Do you say "prefer coffee THAN tea" or "prefer coffee TO tea"?',
    back: 'Always use "prefer X to Y". Never use "than" with prefer. Example: "He prefers biology to physics."',
    mnemonic: 'Prefer = To'
  }
];

export const FORMULA_DATABASE: FormulaItem[] = [
  {
    id: 'f-phy-1',
    subject: 'Physics',
    chapter: 'Force & Motion',
    title: 'Time of Flight & Range of Projectile',
    formula: 'T = (2 * Vo * sinθ) / g  |  R = (Vo^2 * sin(2θ)) / g',
    variables: ['Vo = Initial launch velocity (m/s)', 'θ = Launch angle to horizontal', 'g = Acceleration due to gravity (9.8 m/s^2)'],
    derivationSummary: 'Derived by setting vertical displacement y = 0 in equation y = (Vo*sinθ)t - 0.5*g*t^2.',
    unitsAndDimensions: 'Time T: Seconds (s) [T]  |  Range R: Meters (m) [L]',
    applications: 'Used in artillery, satellite launch trajectory, and sports projectile physics.',
    commonMistakes: 'Confusing launch angle θ with angle to vertical (90-θ). Range is max at 45°, not 90°!',
    isHighYield: true
  },
  {
    id: 'f-phy-2',
    subject: 'Physics',
    chapter: 'Electrostatics',
    title: 'Coulomb Law & Energy in Capacitor',
    formula: 'F = (k * q1 * q2) / r^2  |  E_cap = 0.5 * C * V^2',
    variables: ['k = 1 / (4πεo) ≈ 9 × 10^9 N·m^2/C^2', 'q1, q2 = Point charges (C)', 'r = Distance between charges (m)', 'C = Capacitance (Farad)'],
    derivationSummary: 'Capacitor energy derived by integrating work done W = ∫ V dq = 0.5 * Q * V = 0.5 * C * V^2.',
    unitsAndDimensions: 'Force: Newton (N) [M L T^-2]  |  Capacitor Energy: Joule (J) [M L^2 T^-2]',
    applications: 'Calculating dielectric breakdown, defibrillators, and electro-optical sensors.',
    commonMistakes: 'Forgetting that dielectric constant εr decreases force F by a factor of εr (F_med = F_vac / εr).',
    isHighYield: true
  },
  {
    id: 'f-phy-3',
    subject: 'Physics',
    chapter: 'Dawn of Modern Physics',
    title: 'De Broglie Wavelength & Einstein Photoelectric Equation',
    formula: 'λ = h / p = h / √(2 * m * KE)  |  hf = Φ + KE_max',
    variables: ['h = Planck constant (6.63 × 10^-34 J·s)', 'p = Momentum (kg·m/s)', 'Φ = Work function (eV or J)', 'f = Light frequency (Hz)'],
    derivationSummary: 'De Broglie linked p = h/λ from Einstein E=mc^2 and Planck E=hf.',
    unitsAndDimensions: 'Wavelength λ: Meters (m) [L]  |  Work Function Φ: Joules (J) or Electron-Volts (eV)',
    applications: 'Electron microscopes, quantum tunneling, solar cells.',
    commonMistakes: 'Using frequency instead of threshold frequency (f - fo) when calculating photo-electron KE.',
    isHighYield: true
  },
  {
    id: 'f-chem-1',
    subject: 'Chemistry',
    chapter: 'Stoichiometry',
    title: 'Molar Volume & Molarity Calculation',
    formula: 'Moles = Mass / Molar Mass  |  Molarity (M) = Moles of Solute / Volume of Solution (dm^3)',
    variables: ['Mass in grams', 'Molar Mass in g/mol', 'Volume in dm^3 (or L)'],
    derivationSummary: 'Standard molar volume at STP = 22.414 dm^3/mol for ideal gas.',
    unitsAndDimensions: 'Molarity: mol/dm^3 or M',
    applications: 'Titrations, acid-base neutralizations, reaction stoichiometry.',
    commonMistakes: 'Using solution volume in cm^3 (mL) without dividing by 1000!',
    isHighYield: true
  },
  {
    id: 'f-chem-2',
    subject: 'Chemistry',
    chapter: 'Chemical Equilibrium',
    title: 'pH, pOH & Buffer Equation (Henderson-Hasselbalch)',
    formula: 'pH = -log[H+]  |  pH = pKa + log([Salt] / [Acid])',
    variables: ['[H+] = Hydrogen ion molarity', 'pKa = -log(Ka)', '[Salt], [Acid] = Equilibrium molar concentrations'],
    derivationSummary: 'Derived from acid ionization equilibrium expression Ka = ([H+][A-]) / [HA].',
    unitsAndDimensions: 'pH: Dimensionless logarithmic scale (0-14)',
    applications: 'Human blood buffering (bicarbonate system pH 7.35-7.45), pharmaceutical formulation.',
    commonMistakes: 'Inverting [Salt]/[Acid] or forgetting that pH + pOH = 14 at 25°C.',
    isHighYield: true
  }
];

export const REACTION_DATABASE: ReactionItem[] = [
  {
    id: 'r-chem-1',
    subject: 'Chemistry',
    category: 'Organic',
    chapter: 'Alcohols & Phenols',
    reactionName: 'Lucas Test Reaction',
    chemicalEquation: 'R-OH + conc. HCl  --(Anhydrous ZnCl2)-->  R-Cl (Turbid/Cloudy) + H2O',
    mechanism: 'Nucleophilic Substitution (SN1 for 3°/2° via carbocation; SN2 for 1°).',
    conditions: 'Room temperature (25°C), anhydrous conditions.',
    catalysts: 'Anhydrous ZnCl2 acts as a Lewis acid catalyst to enhance -OH leaving group capacity.',
    importantExceptions: 'Tertiary alcohols react immediately (turbid in seconds). Secondary react in 5-10 min. Primary require heating.',
    isHighYield: true
  },
  {
    id: 'r-chem-2',
    subject: 'Chemistry',
    category: 'Organic',
    chapter: 'Carbonyl Compounds',
    reactionName: 'Cannizzaro Reaction',
    chemicalEquation: '2 HCHO + NaOH (50% conc)  -->  HCOONa (Sodium Formate) + CH3OH (Methanol)',
    mechanism: 'Disproportionation (Self Redox): One aldehyde molecule is oxidized to carboxylic salt, another is reduced to alcohol.',
    conditions: 'Concentrated strong alkali (50% NaOH or KOH), absence of alpha-hydrogens.',
    catalysts: 'Concentrated NaOH base.',
    importantExceptions: 'Only aldehydes WITHOUT alpha-hydrogens (e.g., Formaldehyde HCHO, Benzaldehyde C6H5CHO) undergo Cannizzaro!',
    isHighYield: true
  },
  {
    id: 'r-chem-3',
    subject: 'Chemistry',
    category: 'Organic',
    chapter: 'Hydrocarbons',
    reactionName: 'Markovnikov Addition of HX to Alkenes',
    chemicalEquation: 'CH3-CH=CH2 + HBr  -->  CH3-CH(Br)-CH3 (2-Bromopropane - Major)',
    mechanism: 'Electrophilic Addition via most stable carbocation intermediate (2° carbocation > 1° carbocation).',
    conditions: 'Room temperature, absence of peroxides.',
    catalysts: 'None (Electrophilic H+ addition).',
    importantExceptions: 'In the presence of Organic Peroxides (ROOR), anti-Markovnikov free radical addition occurs!',
    isHighYield: true
  }
];

export const DEFINITION_DATABASE: DefinitionItem[] = [
  {
    id: 'def-1',
    subject: 'Biology',
    chapter: 'Enzymes',
    term: 'Allosteric Regulation',
    nmdcatShortDefinition: 'Regulation of enzyme activity by binding an effector molecule at a site other than the active site.',
    textbookDefinition: 'Allosteric regulation is the modification of the catalytic activity of an enzyme through the non-covalent binding of regulatory molecules (allosteric effectors/inhibitors) to an allosteric site, altering the 3D conformation of the active site.',
    relatedTerms: ['Feedback Inhibition', 'Non-competitive Inhibitor', 'Cooperativity'],
    examNotes: 'High-yield PMDC question: Allosteric effectors do not compete with the substrate for the catalytic active site.'
  },
  {
    id: 'def-2',
    subject: 'Chemistry',
    chapter: 'Equilibrium',
    term: 'Le Chatelier Principle',
    nmdcatShortDefinition: 'If a dynamic equilibrium is disturbed by changing conditions, the position of equilibrium shifts to counteract the change.',
    textbookDefinition: 'When a chemical system at equilibrium is subjected to a stress or change in concentration, temperature, or pressure, the system will adjust the positions of equilibrium in such a way as to partially counteract and minimize the effect of that change.',
    relatedTerms: ['Equilibrium Constant Kc', 'Haber Process', 'Exothermic Shifts'],
    examNotes: 'Adding an inert gas at constant volume does NOT shift equilibrium because partial pressures remain unchanged.'
  },
  {
    id: 'def-3',
    subject: 'Physics',
    chapter: 'Work & Energy',
    term: 'Conservative Force',
    nmdcatShortDefinition: 'A force for which total work done around any closed path is zero and independent of the trajectory.',
    textbookDefinition: 'A force is said to be conservative if the work done by or against the force in moving an object between two points depends only on the initial and final positions of the object, and not on the actual path followed.',
    relatedTerms: ['Gravitational Force', 'Electrostatic Force', 'Non-conservative Friction'],
    examNotes: 'Friction and viscous drag are NON-conservative forces (work done depends on path length).'
  }
];

export const CONCEPT_MINDMAPS: ConceptMindMap[] = [
  {
    id: 'mm-1',
    subject: 'Biology',
    topic: 'Cell Structure & Function',
    title: 'Cell Organelle Architecture & Secretory Pathway',
    centerConcept: 'Eukaryotic Cell Organelles',
    nodes: [
      {
        id: 'n1',
        label: 'Endomembrane System',
        description: 'Coordinated vesicular network',
        category: 'Membranous',
        subNodes: [
          { id: 'sn1', label: 'Rough ER', detail: 'Studded with ribosomes; synthesizes secretory proteins.' },
          { id: 'sn2', label: 'Golgi Complex', detail: 'Modifies, packages, and sorts proteins into vesicles.' },
          { id: 'sn3', label: 'Lysosomes', detail: 'Acid hydrolases (pH 5); autophagy and intracellular digestion.' }
        ]
      },
      {
        id: 'n2',
        label: 'Energy Transducers',
        description: 'Double membrane ATP generators',
        category: 'Bioenergetic',
        subNodes: [
          { id: 'sn4', label: 'Mitochondria', detail: 'Matrix (Krebs cycle), Inner membrane cristae (ETC).' },
          { id: 'sn5', label: 'Chloroplast', detail: 'Stroma (Calvin cycle), Thylakoids (Light reactions).' }
        ]
      },
      {
        id: 'n3',
        label: 'Non-Membranous Components',
        description: 'Cytoskeleton & Ribosomal factories',
        category: 'Structural',
        subNodes: [
          { id: 'sn6', label: 'Ribosomes', detail: '80S in eukaryotic cytoplasm (60S + 40S subunits).' },
          { id: 'sn7', label: 'Centrioles', detail: '9 triplets of microtubules; spindle formation in mitosis.' }
        ]
      }
    ]
  },
  {
    id: 'mm-2',
    subject: 'Chemistry',
    topic: 'Organic Reaction Pathways',
    title: 'Functional Group Interconversions',
    centerConcept: 'Alcohols & Derivatives',
    nodes: [
      {
        id: 'n4',
        label: 'Oxidation of Alcohols',
        description: 'K2Cr2O7 / H2SO4 Reagents',
        category: 'Oxidation',
        subNodes: [
          { id: 'sn8', label: 'Primary Alcohol', detail: '1° Alcohol -> Aldehyde -> Carboxylic Acid' },
          { id: 'sn9', label: 'Secondary Alcohol', detail: '2° Alcohol -> Ketone (Resistant to further oxidation)' },
          { id: 'sn10', label: 'Tertiary Alcohol', detail: '3° Alcohol -> No oxidation under normal conditions' }
        ]
      },
      {
        id: 'n5',
        label: 'Nucleophilic Substitution',
        description: 'Substitution of -OH group',
        category: 'Substitution',
        subNodes: [
          { id: 'sn11', label: 'SOCl2 Reaction', detail: 'R-OH + SOCl2 -> R-Cl + SO2(g) + HCl(g) (Best method!)' },
          { id: 'sn12', label: 'Lucas Test', detail: 'ZnCl2 + conc. HCl -> differentiates 1°, 2°, 3° alcohols' }
        ]
      }
    ]
  }
];

export const INITIAL_KNOWLEDGE_GRAPH: KnowledgeGraphNode[] = [
  { id: 'kg-1', subject: 'Biology', name: 'Cell Organelles', mastery: 85, status: 'Strong', connectedTopics: ['Enzymes', 'Bioenergetics'], retentionDecayPercent: 92, daysTillForgetting: 12 },
  { id: 'kg-2', subject: 'Biology', name: 'Enzyme Kinetics', mastery: 92, status: 'Mastered', connectedTopics: ['Biological Molecules', 'Cell Organelles'], retentionDecayPercent: 96, daysTillForgetting: 18 },
  { id: 'kg-3', subject: 'Biology', name: 'Bioenergetics & Krebs', mastery: 48, status: 'Weak', connectedTopics: ['Human Physiology', 'Cell Organelles'], retentionDecayPercent: 62, daysTillForgetting: 2 },
  { id: 'kg-4', subject: 'Chemistry', name: 'Stoichiometry & Moles', mastery: 90, status: 'Mastered', connectedTopics: ['Atomic Structure', 'Equilibrium'], retentionDecayPercent: 94, daysTillForgetting: 15 },
  { id: 'kg-5', subject: 'Chemistry', name: 'Organic Reactions', mastery: 55, status: 'Weak', connectedTopics: ['Alcohols & Carbonyls', 'Hydrocarbons'], retentionDecayPercent: 68, daysTillForgetting: 3 },
  { id: 'kg-6', subject: 'Physics', name: 'Projectile Motion', mastery: 78, status: 'Moderate', connectedTopics: ['Work & Energy', 'Newton Laws'], retentionDecayPercent: 82, daysTillForgetting: 7 },
  { id: 'kg-7', subject: 'Physics', name: 'Electrostatics & Circuits', mastery: 60, status: 'Moderate', connectedTopics: ['Magnetism', 'Work & Energy'], retentionDecayPercent: 74, daysTillForgetting: 4 },
  { id: 'kg-8', subject: 'English', name: 'Grammar Rules & Vocab', mastery: 88, status: 'Strong', connectedTopics: ['Subject-Verb Agreement'], retentionDecayPercent: 90, daysTillForgetting: 10 }
];

export const PAKISTAN_MEDICAL_COLLEGES: CollegeCutoff[] = [

  { name: 'King Edward Medical University (KEMU)', city: 'Lahore', province: 'Punjab', lastYearAggregate: 93.55, type: 'Public' },
  { name: 'Allama Iqbal Medical College (AIMC)', city: 'Lahore', province: 'Punjab', lastYearAggregate: 92.81, type: 'Public' },
  { name: 'Rawalpindi Medical University (RMU)', city: 'Rawalpindi', province: 'Punjab', lastYearAggregate: 92.15, type: 'Public' },
  { name: 'Nishtar Medical University (NMU)', city: 'Multan', province: 'Punjab', lastYearAggregate: 91.90, type: 'Public' },
  { name: 'Dow Medical College (DUHS)', city: 'Karachi', province: 'Sindh', lastYearAggregate: 90.80, type: 'Public' },
  { name: 'Jinnah Sindh Medical University (SMC)', city: 'Karachi', province: 'Sindh', lastYearAggregate: 89.95, type: 'Public' },
  { name: 'Khyber Medical College (KMC)', city: 'Peshawar', province: 'KPK', lastYearAggregate: 91.40, type: 'Public' },
  { name: 'Ayub Medical College (AMC)', city: 'Abbottabad', province: 'KPK', lastYearAggregate: 89.85, type: 'Public' },
  { name: 'Bolan Medical College (BMC)', city: 'Quetta', province: 'Balochistan', lastYearAggregate: 86.20, type: 'Public' },
  { name: 'Federal Medical & Dental College (FMDC)', city: 'Islamabad', province: 'Federal', lastYearAggregate: 92.40, type: 'Public' },
  { name: 'Aga Khan University Medical College (AKU)', city: 'Karachi', province: 'Private', lastYearAggregate: 94.10, type: 'Private' },
  { name: 'Shifa College of Medicine', city: 'Islamabad', province: 'Private', lastYearAggregate: 88.50, type: 'Private' }
];
