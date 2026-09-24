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
  // ==========================================
  // BIOLOGY
  // ==========================================
  { id: 'bio-1', subject: 'Biology', unit: 'Cell Structure and Function', topic: 'Cell Structure & Organelles (Ribosomes, Mitochondria, Plastids, Endomembrane)', weightagePercentage: 6, status: 'not-started', keyPoints: ['Ribosomes are non-membrane bound organelles made of rRNA and proteins.', 'Lysosomes contain acid hydrolases (pH ~4.5-5.0).', 'Fluid mosaic model proposed by Singer and Nicolson in 1972.'] },
  { id: 'bio-2', subject: 'Biology', unit: 'Cell Structure and Function', topic: 'Plasma Membrane & Fluid Mosaic Model', weightagePercentage: 6, status: 'not-started', keyPoints: ['Lipid bilayer is amphipathic.', 'Membrane fluidity is buffered by cholesterol.'] },
  { id: 'bio-3', subject: 'Biology', unit: 'Biological Molecules', topic: 'Carbohydrates, Proteins, Lipids & Nucleic Acids', weightagePercentage: 6, status: 'not-started', keyPoints: ['Peptide bonds formed by dehydration synthesis between -COOH and -NH2.', 'Phosphodiester bond connects 3\' carbon of one sugar to 5\' carbon of next.', 'Saturated fatty acids contain no C=C double bonds.'] },
  { id: 'bio-4', subject: 'Biology', unit: 'Biological Molecules', topic: 'Water & Carbon Chemistry in Living Systems', weightagePercentage: 4, status: 'not-started', keyPoints: ['High specific heat capacity of water stabilizes temperature.'] },
  { id: 'bio-5', subject: 'Biology', unit: 'Enzymes', topic: 'Enzyme Mechanisms, Active Site & Factors Affecting Rate', weightagePercentage: 5, status: 'not-started', keyPoints: ['Competitive inhibitors increase Km without affecting Vmax.', 'Non-competitive inhibitors lower Vmax while Km remains unchanged.'] },
  { id: 'bio-6', subject: 'Biology', unit: 'Enzymes', topic: 'Enzyme Inhibitors & Co-factors', weightagePercentage: 5, status: 'not-started', keyPoints: ['Prosthetic group is a tightly bound organic cofactor.'] },
  { id: 'bio-7', subject: 'Biology', unit: 'Bioenergetics', topic: 'Photosynthesis (Z-Scheme, Photolysis & Calvin Cycle)', weightagePercentage: 7, status: 'not-started', keyPoints: ['Rubisco is the key carboxylating enzyme in C3 plants.'] },
  { id: 'bio-8', subject: 'Biology', unit: 'Bioenergetics', topic: 'Cellular Respiration (Glycolysis, Krebs Cycle, Oxidative Phosphorylation)', weightagePercentage: 7, status: 'not-started', keyPoints: ['Glycolysis occurs in cytosol; net yield = 2 ATP, 2 NADH, 2 Pyruvate.'] },
  { id: 'bio-9', subject: 'Biology', unit: 'Acellular Life', topic: 'Viruses, Bacteriophages, Retroviruses & Viral Diseases', weightagePercentage: 5, status: 'not-started', keyPoints: ['Reverse transcriptase converts RNA to DNA in HIV.'] },
  { id: 'bio-10', subject: 'Biology', unit: 'Prokaryotes', topic: 'Bacterial Structure, Cell Wall, Gram Staining & Nutrition', weightagePercentage: 5, status: 'not-started', keyPoints: ['Gram-positive bacteria have thick peptidoglycan and teichoic acid.'] },
  { id: 'bio-11', subject: 'Biology', unit: 'Protista and Fungi', topic: 'Protozoa, Algae & Fungal Reproduction', weightagePercentage: 4, status: 'not-started', keyPoints: ['Fungal cell walls are made of chitin.'] },
  { id: 'bio-12', subject: 'Biology', unit: 'Diversity Among Plants', topic: 'Bryophytes, Tracheophytes & Angiosperm Life Cycles', weightagePercentage: 5, status: 'not-started', keyPoints: ['Double fertilization produces 3n endosperm in angiosperms.'] },
  { id: 'bio-13', subject: 'Biology', unit: 'Diversity Among Animals', topic: 'Invertebrate Phyla, Coelom & Body Symmetry', weightagePercentage: 5, status: 'not-started', keyPoints: ['Arthropoda is the largest animal phylum with jointed appendages.'] },
  { id: 'bio-14', subject: 'Biology', unit: 'Form and Functions in Plants', topic: 'Plant Tissues, Transport (Xylem, Phloem) & Growth Regulators', weightagePercentage: 5, status: 'not-started', keyPoints: ['Transpiration pull drives xylem ascent of sap.'] },
  { id: 'bio-15', subject: 'Biology', unit: 'Digestion', topic: 'Digestive Organs, Enzymes & Absorption Mechanics', weightagePercentage: 6, status: 'not-started', keyPoints: ['Pepsin digests proteins in stomach at acidic pH ~1.5-2.0.'] },
  { id: 'bio-16', subject: 'Biology', unit: 'Respiration', topic: 'Respiratory Anatomy, Gas Exchange, Hemoglobin & Bohr Effect', weightagePercentage: 6, status: 'not-started', keyPoints: ['Bohr effect: High CO2 / low pH shifts Hb-O2 curve to the right.'] },
  { id: 'bio-17', subject: 'Biology', unit: 'Immunity', topic: 'Innate vs Adaptive Immunity, Antibodies, Vaccines & Allergies', weightagePercentage: 6, status: 'not-started', keyPoints: ['IgG is the most abundant immunoglobulin and crosses the placenta.'] },
  { id: 'bio-18', subject: 'Biology', unit: 'Homeostasis', topic: 'Thermoregulation, Osmoregulation & Human Kidney Nephron Function', weightagePercentage: 6, status: 'not-started', keyPoints: ['ADH acts on collecting ducts to increase water reabsorption.'] },
  { id: 'bio-19', subject: 'Biology', unit: 'Support and Movement', topic: 'Human Skeleton, Joints & Muscle Contraction (Sliding Filament)', weightagePercentage: 6, status: 'not-started', keyPoints: ['Troponin binds Ca2+ to expose myosin-binding sites on actin.'] },
  { id: 'bio-20', subject: 'Biology', unit: 'Nervous Coordination', topic: 'Neurons, Action Potential, Synapses & Human Brain/Spinal Cord', weightagePercentage: 8, status: 'not-started', keyPoints: ['Resting membrane potential is -70mV maintained by Na+/K+ ATPase.'] },
  { id: 'bio-21', subject: 'Biology', unit: 'Chemical Coordination', topic: 'Endocrine Glands, Hormones & Feedback Mechanisms', weightagePercentage: 7, status: 'not-started', keyPoints: ['Insulin lowers blood glucose; glucagon raises it.'] },
  { id: 'bio-22', subject: 'Biology', unit: 'Reproduction', topic: 'Male & Female Reproductive Systems, Gametogenesis & Menstrual Cycle', weightagePercentage: 6, status: 'not-started', keyPoints: ['LH surge triggers ovulation around day 14.'] },
  { id: 'bio-23', subject: 'Biology', unit: 'Chromosomes and DNA', topic: 'DNA Structure, Replication, Transcription & Translation', weightagePercentage: 6, status: 'not-started', keyPoints: ['DNA polymerase III synthesizes new DNA in 5\' to 3\' direction.'] },
  { id: 'bio-24', subject: 'Biology', unit: 'Inheritance', topic: 'Mendelian Genetics, Epistasis, Polygenic Traits & Sex-Linkage', weightagePercentage: 6, status: 'not-started', keyPoints: ['Dihybrid cross phenotypic ratio is 9:3:3:1.'] },
  { id: 'bio-25', subject: 'Biology', unit: 'Biotechnology', topic: 'Recombinant DNA, PCR, Gel Electrophoresis & Gene Therapy', weightagePercentage: 5, status: 'not-started', keyPoints: ['Taq polymerase is thermostable enzyme used in PCR.'] },
  { id: 'bio-26', subject: 'Biology', unit: 'Evolution', topic: 'Darwinism, Natural Selection & Hardy-Weinberg Equilibrium', weightagePercentage: 5, status: 'not-started', keyPoints: ['Hardy-Weinberg equation: p^2 + 2pq + q^2 = 1.'] },

  // ==========================================
  // CHEMISTRY
  // ==========================================
  { id: 'chem-1', subject: 'Chemistry', unit: 'Stoichiometry', topic: 'Mole Concept, Avogadro Number, Limiting Reactant & Yield', weightagePercentage: 5, status: 'not-started', keyPoints: ['1 mole of any gas at STP occupies 22.414 dm3.', 'Limiting reactant controls the total amount of product formed.'] },
  { id: 'chem-2', subject: 'Chemistry', unit: 'Atomic Structure', topic: 'Bohr Model, Quantum Numbers & Electronic Configurations', weightagePercentage: 5, status: 'not-started', keyPoints: ['Aufbau principle: Electrons fill lower energy orbitals first.', 'Azimuthal quantum number: s=0, p=1, d=2, f=3.'] },
  { id: 'chem-3', subject: 'Chemistry', unit: 'Theories of Covalent Bonding and Shapes of Molecules', topic: 'VSEPR Theory, Hybridization & Molecular Orbital Theory', weightagePercentage: 6, status: 'not-started', keyPoints: ['sp3 has tetrahedral geometry (109.5°), sp2 trigonal planar (120°), sp linear (180°).'] },
  { id: 'chem-4', subject: 'Chemistry', unit: 'States of Matter I: Gases', topic: 'Gas Laws, Kinetic Molecular Theory & Real vs Ideal Gases', weightagePercentage: 5, status: 'not-started', keyPoints: ['PV = nRT ideal gas equation.', 'Gases deviate from ideality at high pressure and low temperature.'] },
  { id: 'chem-5', subject: 'Chemistry', unit: 'States of Matter II: Liquids', topic: 'Intermolecular Forces, Vapor Pressure, Boiling Point & Viscosity', weightagePercentage: 5, status: 'not-started', keyPoints: ['Hydrogen bonding gives water unusually high boiling point.'] },
  { id: 'chem-6', subject: 'Chemistry', unit: 'States of Matter III: Solids', topic: 'Crystalline vs Amorphous, Unit Cells & Crystal Lattices', weightagePercentage: 4, status: 'not-started', keyPoints: ['NaCl has face-centered cubic (FCC) lattice with coordination number 6:6.'] },
  { id: 'chem-7', subject: 'Chemistry', unit: 'Chemical Equilibrium', topic: 'Law of Mass Action, Kc, Kp, Le Chatelier Principle', weightagePercentage: 5, status: 'not-started', keyPoints: ['Kp = Kc(RT)^Δn.', 'Catalyst speeds up forward and reverse rates equally, Kc unchanged.'] },
  { id: 'chem-8', subject: 'Chemistry', unit: 'Acids, Bases and Salts', topic: 'pH, Buffer Solutions, Hydrolysis & Solubility Product (Ksp)', weightagePercentage: 6, status: 'not-started', keyPoints: ['Acidic buffer = Weak acid + its conjugate salt (e.g. CH3COOH + CH3COONa).'] },
  { id: 'chem-9', subject: 'Chemistry', unit: 'Chemical Kinetics', topic: 'Rate of Reaction, Order of Reaction & Activation Energy', weightagePercentage: 5, status: 'not-started', keyPoints: ['Rate law = k[A]^m[B]^n.', 'Arrhenius equation: k = A * e^(-Ea/RT).'] },
  { id: 'chem-10', subject: 'Chemistry', unit: 'Thermochemistry', topic: 'Hess Law, Enthalpy Changes & Born-Haber Cycle', weightagePercentage: 5, status: 'not-started', keyPoints: ['Enthalpy is a state function; ΔH is path-independent.'] },
  { id: 'chem-11', subject: 'Chemistry', unit: 'Thermodynamics', topic: 'First and Second Laws of Thermodynamics, Entropy & Free Energy', weightagePercentage: 5, status: 'not-started', keyPoints: ['Spontaneous process requires ΔG < 0 (ΔG = ΔH - TΔS).'] },
  { id: 'chem-12', subject: 'Chemistry', unit: 'Electrochemistry', topic: 'Electrochemical Cells, Electrode Potential & Nernst Equation', weightagePercentage: 6, status: 'not-started', keyPoints: ['Oxidation occurs at anode; reduction occurs at cathode.'] },
  { id: 'chem-13', subject: 'Chemistry', unit: 's and p-Block Elements', topic: 'Periodic Trends, Alkali & Alkaline Earth Metals, Halogens', weightagePercentage: 5, status: 'not-started', keyPoints: ['Ionization energy increases across period and decreases down group.'] },
  { id: 'chem-14', subject: 'Chemistry', unit: 'd and f-Block Elements (Transition Elements)', topic: 'Transition Metals, Coordination Complexes & Color Theory', weightagePercentage: 5, status: 'not-started', keyPoints: ['Color of transition metal complexes is due to d-d electronic transitions.'] },
  { id: 'chem-15', subject: 'Chemistry', unit: 'Fundamental Principles of Organic Chemistry', topic: 'IUPAC Nomenclature, Isomerism (Structural & Stereoisomerism)', weightagePercentage: 6, status: 'not-started', keyPoints: ['Chiral carbon with 4 distinct groups exhibits optical isomerism.'] },
  { id: 'chem-16', subject: 'Chemistry', unit: 'Hydrocarbons', topic: 'Alkanes, Alkenes, Alkynes & Benzene Reactions', weightagePercentage: 7, status: 'not-started', keyPoints: ['Markovnikov rule governs electrophilic addition to asymmetric alkenes.'] },
  { id: 'chem-17', subject: 'Chemistry', unit: 'Alkyl Halides', topic: 'Nucleophilic Substitution (SN1, SN2) & Elimination (E1, E2)', weightagePercentage: 6, status: 'not-started', keyPoints: ['SN2 proceeds with 100% Walden inversion; SN1 gives racemization.'] },
  { id: 'chem-18', subject: 'Chemistry', unit: 'Alcohols, Phenols and Ethers', topic: 'Lucas Test, Acidity of Phenol & Williamson Synthesis', weightagePercentage: 6, status: 'not-started', keyPoints: ['Phenol is more acidic than aliphatic alcohols due to phenoxide resonance.'] },
  { id: 'chem-19', subject: 'Chemistry', unit: 'Aldehydes and Ketones', topic: 'Nucleophilic Addition, Grignard Reagent, Aldol & Cannizzaro', weightagePercentage: 6, status: 'not-started', keyPoints: ['Formaldehyde gives Cannizzaro reaction because it lacks alpha-hydrogens.'] },
  { id: 'chem-20', subject: 'Chemistry', unit: 'Carboxylic Acids and Functional Derivatives', topic: 'Acidity, Esters, Amides, Acid Halides & Anhydrides', weightagePercentage: 5, status: 'not-started', keyPoints: ['Esterification: RCOOH + R\'OH -> RCOOR\' + H2O with acid catalyst.'] },
  { id: 'chem-21', subject: 'Chemistry', unit: 'Environmental Chemistry', topic: 'Atmospheric Pollution, Acid Rain & Greenhouse Effect', weightagePercentage: 4, status: 'not-started', keyPoints: ['CFCs catalytically destroy stratospheric ozone layer.'] },
  { id: 'chem-22', subject: 'Chemistry', unit: 'Analytical Chemistry', topic: 'Spectroscopy (UV-Vis, IR, NMR) & Chromatography', weightagePercentage: 4, status: 'not-started', keyPoints: ['IR spectroscopy detects functional groups via bond vibrational frequencies.'] },

  // ==========================================
  // PHYSICS
  // ==========================================
  { id: 'phy-1', subject: 'Physics', unit: 'Measurement and Physical Quantities', topic: 'SI Units, Dimensional Analysis, Errors & Uncertainties', weightagePercentage: 5, status: 'not-started', keyPoints: ['Dimensions of Force: [M L T^-2], Work: [M L^2 T^-2].'] },
  { id: 'phy-2', subject: 'Physics', unit: 'Motion and Force', topic: 'Kinematics, Newton Laws, Momentum, Impulse & Projectile Motion', weightagePercentage: 7, status: 'not-started', keyPoints: ['Maximum range of projectile occurs at launching angle θ = 45°.'] },
  { id: 'phy-3', subject: 'Physics', unit: 'Work and Energy', topic: 'Work, Kinetic & Potential Energy, Power, Escape Velocity', weightagePercentage: 6, status: 'not-started', keyPoints: ['Escape velocity from Earth surface is approximately 11.2 km/s.'] },
  { id: 'phy-4', subject: 'Physics', unit: 'Circular Motion', topic: 'Centripetal Force, Angular Velocity, Moment of Inertia', weightagePercentage: 5, status: 'not-started', keyPoints: ['Centripetal acceleration a = v^2 / r = ω^2 * r.'] },
  { id: 'phy-5', subject: 'Physics', unit: 'Fluid Dynamics', topic: 'Viscosity, Terminal Velocity, Continuity & Bernoulli Principle', weightagePercentage: 5, status: 'not-started', keyPoints: ['Bernoulli equation: P + 0.5*ρ*v^2 + ρ*g*h = Constant.'] },
  { id: 'phy-6', subject: 'Physics', unit: 'Oscillations', topic: 'Simple Harmonic Motion, Pendulum, Mass-Spring & Resonance', weightagePercentage: 6, status: 'not-started', keyPoints: ['Time period of simple pendulum T = 2π * sqrt(L / g).'] },
  { id: 'phy-7', subject: 'Physics', unit: 'Waves', topic: 'Sound Waves, Doppler Effect, Standing Waves & Resonance', weightagePercentage: 6, status: 'not-started', keyPoints: ['Doppler effect: Apparent frequency increases when source approaches observer.'] },
  { id: 'phy-8', subject: 'Physics', unit: 'Physical Optics', topic: 'Interference (Young Double Slit), Diffraction & Polarization', weightagePercentage: 6, status: 'not-started', keyPoints: ['Fringe width in Young double slit: Δy = (λ * L) / d.'] },
  { id: 'phy-9', subject: 'Physics', unit: 'Thermodynamics', topic: 'First Law of Thermodynamics, Heat Engines, Carnot Cycle & Entropy', weightagePercentage: 6, status: 'not-started', keyPoints: ['Carnot engine efficiency η = 1 - (Tc / Th).'] },
  { id: 'phy-10', subject: 'Physics', unit: 'Electrostatics', topic: 'Coulomb Law, Electric Field, Gauss Law, Potential & Capacitors', weightagePercentage: 7, status: 'not-started', keyPoints: ['Coulomb force F = (k * q1 * q2) / r^2.', 'Capacitor energy E = 0.5 * C * V^2.'] },
  { id: 'phy-11', subject: 'Physics', unit: 'Current Electricity', topic: 'Ohm Law, Resistance, Kirchhoff Rules, Wheatstone & Potentiometer', weightagePercentage: 7, status: 'not-started', keyPoints: ['Kirchhoff Current Law (KCL) is conservation of charge; KVL is conservation of energy.'] },
  { id: 'phy-12', subject: 'Physics', unit: 'Electromagnetism', topic: 'Magnetic Field, Ampere Law, Lorentz Force & Galvanometer', weightagePercentage: 6, status: 'not-started', keyPoints: ['Force on moving charge: F = q(v x B).'] },
  { id: 'phy-13', subject: 'Physics', unit: 'Electromagnetic Induction', topic: 'Faraday Law, Lenz Law, Mutual Inductance & Transformers', weightagePercentage: 6, status: 'not-started', keyPoints: ['Induced emf ε = -N * (dΦ/dt).'] },
  { id: 'phy-14', subject: 'Physics', unit: 'Alternating Current', topic: 'AC Circuits (RLC Series), Power Factor & Resonance', weightagePercentage: 5, status: 'not-started', keyPoints: ['Resonance frequency in RLC: f0 = 1 / (2π * sqrt(L * C)).'] },
  { id: 'phy-15', subject: 'Physics', unit: 'Physics of Solids', topic: 'Stress, Strain, Elastic Modulus & Energy Band Theory', weightagePercentage: 5, status: 'not-started', keyPoints: ['Young modulus Y = (Stress / Strain) = (F * L) / (A * ΔL).'] },
  { id: 'phy-16', subject: 'Physics', unit: 'Electronics', topic: 'p-n Junction Diodes, Rectification & Logic Gates', weightagePercentage: 5, status: 'not-started', keyPoints: ['Full-wave bridge rectifier uses 4 diodes.'] },
  { id: 'phy-17', subject: 'Physics', unit: 'Dawn of Modern Physics', topic: 'Photoelectric Effect, Compton Effect & De Broglie Waves', weightagePercentage: 6, status: 'not-started', keyPoints: ['Photoelectric equation: E_max = h*f - Φ.'] },
  { id: 'phy-18', subject: 'Physics', unit: 'Atomic Spectra', topic: 'Bohr Hydrogen Model, Energy Levels, X-Rays & Lasers', weightagePercentage: 5, status: 'not-started', keyPoints: ['Rydberg formula gives wavelength of spectral lines in hydrogen.'] },
  { id: 'phy-19', subject: 'Physics', unit: 'Nuclear Physics', topic: 'Radioactivity, Half-Life, Nuclear Fission/Fusion & Binding Energy', weightagePercentage: 6, status: 'not-started', keyPoints: ['Half-life T1/2 = 0.693 / λ.'] },

  // ==========================================
  // ENGLISH
  // ==========================================
  { id: 'eng-1', subject: 'English', unit: 'Vocabulary in Context', topic: 'High-Yield Synonyms, Antonyms & Contextual Word Choice', weightagePercentage: 5, status: 'not-started', keyPoints: ['Identify root words, prefixes, and suffixes to deduce definitions.'] },
  { id: 'eng-2', subject: 'English', unit: 'Tenses and Verb Forms', topic: 'Correct Tense Usage, Conditionals & Subjunctive Mood', weightagePercentage: 5, status: 'not-started', keyPoints: ['Type 3 conditional: If + had + V3, would have + V3.'] },
  { id: 'eng-3', subject: 'English', unit: 'Sentence Correction', topic: 'Subject-Verb Agreement, Pronoun Reference & Parallelism', weightagePercentage: 5, status: 'not-started', keyPoints: ['Singular subjects take singular verbs regardless of intervening phrases.'] },
  { id: 'eng-4', subject: 'English', unit: 'Grammar and Syntax', topic: 'Modifiers, Dangling Participles, Clauses & Sentence Structure', weightagePercentage: 5, status: 'not-started', keyPoints: ['A modifier must be placed directly adjacent to the noun it describes.'] },
  { id: 'eng-5', subject: 'English', unit: 'Prepositions and Phrasal Verbs', topic: 'Standard Prepositional Idioms & Phrasal Verb Usage', weightagePercentage: 5, status: 'not-started', keyPoints: ['Master fixed prepositions: abide by, abstain from, adhere to, refrain from.'] },
  { id: 'eng-6', subject: 'English', unit: 'Punctuation and Capitalization', topic: 'Apostrophes, Semicolons, Colons, Hyphens & Quotation Marks', weightagePercentage: 5, status: 'not-started', keyPoints: ['A semicolon links two independent clauses without a conjunction.'] },

  // ==========================================
  // LOGICAL REASONING
  // ==========================================
  { id: 'lr-1', subject: 'Logical Reasoning', unit: 'Critical Thinking', topic: 'Evaluating Arguments, Assumptions & Inferences', weightagePercentage: 5, status: 'not-started', keyPoints: ['Distinguish between explicit premises and unstated underlying assumptions.'] },
  { id: 'lr-2', subject: 'Logical Reasoning', unit: 'Letter and Symbol Series', topic: 'Pattern Recognition, Alpha-numeric Sequences & Series Completion', weightagePercentage: 5, status: 'not-started', keyPoints: ['Map letters to numerical positions (A=1, Z=26) to find step increments.'] },
  { id: 'lr-3', subject: 'Logical Reasoning', unit: 'Logical Deduction', topic: 'Syllogisms, Quantifiers (All, Some, None) & Deductive Logic', weightagePercentage: 5, status: 'not-started', keyPoints: ['Draw Venn diagrams to verify valid categorical syllogism conclusions.'] },
  { id: 'lr-4', subject: 'Logical Reasoning', unit: 'Cause and Effect', topic: 'Immediate vs Root Causes & Correlation vs Causation', weightagePercentage: 5, status: 'not-started', keyPoints: ['A cause must precede its effect in time and demonstrate a direct mechanism.'] },
  { id: 'lr-5', subject: 'Logical Reasoning', unit: 'Course of Action', topic: 'Decision Making, Feasibility Analysis & Problem Solving', weightagePercentage: 5, status: 'not-started', keyPoints: ['Correct course of action directly addresses the problem without creating worse side-effects.'] },
  { id: 'lr-6', subject: 'Logical Reasoning', unit: 'Analogy and Logical Problems', topic: 'Word Analogies, Relationship Mapping & Blood Relations', weightagePercentage: 5, status: 'not-started', keyPoints: ['Identify the exact type of relationship (part-to-whole, degree, function, tool-to-user).'] }
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
