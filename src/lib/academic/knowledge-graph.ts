export interface CurriculumNodeItem {
  id: string;
  examType: "JEE_MAIN" | "JEE_ADVANCED" | "NEET" | "MHT_CET";
  classLevel: "11" | "12";
  subject: "PHYSICS" | "CHEMISTRY" | "MATHEMATICS" | "BIOLOGY";
  unit: string;
  chapter: string;
  topic: string;
  subtopic: string;
  concept: string;
  skill: string;
  code: string;
  name: string;
  weightage: number;
}

export const SEED_CURRICULUM_NODES: CurriculumNodeItem[] = [
  // PHYSICS - CLASS 11
  {
    id: "PHY-11-KIN-01",
    examType: "JEE_MAIN",
    classLevel: "11",
    subject: "PHYSICS",
    unit: "Mechanics",
    chapter: "Kinematics",
    topic: "Motion in 1D",
    subtopic: "Uniformly Accelerated Motion",
    concept: "Equations of Motion & Relative Velocity",
    skill: "Graph Analysis & Kinematic Equations",
    code: "PHY11_KIN_001",
    name: "Kinematic Equations in 1D",
    weightage: 1.2,
  },
  {
    id: "PHY-11-NLM-01",
    examType: "JEE_MAIN",
    classLevel: "11",
    subject: "PHYSICS",
    unit: "Mechanics",
    chapter: "Laws of Motion",
    topic: "Friction",
    subtopic: "Static and Kinetic Friction",
    concept: "Limiting Friction & Angle of Repose",
    skill: "Free-Body Diagram Application",
    code: "PHY11_NLM_002",
    name: "Limiting Friction & Contact Force",
    weightage: 1.5,
  },
  {
    id: "PHY-11-WPE-01",
    examType: "JEE_MAIN",
    classLevel: "11",
    subject: "PHYSICS",
    unit: "Mechanics",
    chapter: "Work, Energy & Power",
    topic: "Work-Energy Theorem",
    subtopic: "Conservative Forces & Potential Energy",
    concept: "Conservation of Mechanical Energy",
    skill: "Energy Conservation in Vertical Circles",
    code: "PHY11_WPE_003",
    name: "Mechanical Energy Conservation",
    weightage: 1.4,
  },
  {
    id: "PHY-11-ROT-01",
    examType: "JEE_MAIN",
    classLevel: "11",
    subject: "PHYSICS",
    unit: "Mechanics",
    chapter: "Rotational Motion",
    topic: "Moment of Inertia & Torque",
    subtopic: "Parallel and Perpendicular Axes Theorems",
    concept: "Rolling Without Slipping & Angular Momentum",
    skill: "Rigid Body Dynamics Equilibrium",
    code: "PHY11_ROT_004",
    name: "Rolling Motion & Angular Momentum",
    weightage: 1.8,
  },
  // CHEMISTRY - CLASS 11
  {
    id: "CHEM-11-ATOM-01",
    examType: "JEE_MAIN",
    classLevel: "11",
    subject: "CHEMISTRY",
    unit: "Physical Chemistry",
    chapter: "Structure of Atom",
    topic: "Quantum Mechanical Model",
    subtopic: "Photoelectric Effect & Bohr Model",
    concept: "de Broglie Wavelength & Heisenberg Principle",
    skill: "Quantum Numbers & Electronic Configuration",
    code: "CHEM11_ATOM_001",
    name: "Quantum Mechanics & Orbitals",
    weightage: 1.2,
  },
  {
    id: "CHEM-11-BOND-01",
    examType: "JEE_MAIN",
    classLevel: "11",
    subject: "CHEMISTRY",
    unit: "Inorganic Chemistry",
    chapter: "Chemical Bonding & Molecular Structure",
    topic: "VSEPR & Hybridization",
    subtopic: "Molecular Orbital Theory",
    concept: "Bond Order, Magnetic Behavior & Dipole Moments",
    skill: "Geometry Prediction & MOT Energy Diagrams",
    code: "CHEM11_BOND_002",
    name: "VSEPR, Hybridization & MO Theory",
    weightage: 1.6,
  },
  {
    id: "CHEM-11-THERMO-01",
    examType: "JEE_MAIN",
    classLevel: "11",
    subject: "CHEMISTRY",
    unit: "Physical Chemistry",
    chapter: "Thermodynamics",
    topic: "First and Second Law of Thermodynamics",
    subtopic: "Enthalpy, Entropy & Gibbs Free Energy",
    concept: "Spontaneity Criteria (ΔG = ΔH - TΔS)",
    skill: "Hess's Law & Calorimetry Calculations",
    code: "CHEM11_THERM_003",
    name: "Gibbs Free Energy & Spontaneity",
    weightage: 1.5,
  },
  // MATHEMATICS - CLASS 11
  {
    id: "MATH-11-QUAD-01",
    examType: "JEE_MAIN",
    classLevel: "11",
    subject: "MATHEMATICS",
    unit: "Algebra",
    chapter: "Quadratic Equations",
    topic: "Roots of Quadratic Equations",
    subtopic: "Location of Roots",
    concept: "Sign of Quadratic Expression & Range",
    skill: "Transformation of Equations & Parameter Conditions",
    code: "MATH11_QUAD_001",
    name: "Location of Roots & Quadratic Form",
    weightage: 1.3,
  },
  {
    id: "MATH-11-CALC-01",
    examType: "JEE_MAIN",
    classLevel: "12",
    subject: "MATHEMATICS",
    unit: "Calculus",
    chapter: "Limits, Continuity & Differentiability",
    topic: "Limits & L'Hopital's Rule",
    subtopic: "Standard Limits & Series Expansions",
    concept: "Indeterminate Forms & Continuity at a Point",
    skill: "Algebraic and Trigonometric Limit Evaluation",
    code: "MATH12_LIM_002",
    name: "Limits & Indeterminate Forms",
    weightage: 1.7,
  },
  {
    id: "MATH-12-INT-01",
    examType: "JEE_MAIN",
    classLevel: "12",
    subject: "MATHEMATICS",
    unit: "Calculus",
    chapter: "Definite Integrals",
    topic: "Properties of Definite Integrals",
    subtopic: "King's Property & Periodic Functions",
    concept: "Definite Integral as Limit of a Sum",
    skill: "Symmetry Properties & Area Under Curves",
    code: "MATH12_INT_003",
    name: "Properties of Definite Integrals",
    weightage: 1.9,
  },
  // NEET BIOLOGY - CLASS 11/12
  {
    id: "BIO-11-CELL-01",
    examType: "NEET",
    classLevel: "11",
    subject: "BIOLOGY",
    unit: "Cell Biology",
    chapter: "Cell: The Unit of Life",
    topic: "Prokaryotic & Eukaryotic Cells",
    subtopic: "Endomembrane System & Mitochondria",
    concept: "Cell Organelles & Fluid Mosaic Model",
    skill: "Diagram Identification & Structural Functions",
    code: "BIO11_CELL_001",
    name: "Cell Membrane & Organelles",
    weightage: 2.0,
  },
  {
    id: "BIO-12-GEN-01",
    examType: "NEET",
    classLevel: "12",
    subject: "BIOLOGY",
    unit: "Genetics & Evolution",
    chapter: "Principles of Inheritance and Variation",
    topic: "Mendelian Genetics",
    subtopic: "Monohybrid and Dihybrid Crosses",
    concept: "Incomplete Dominance, Codominance & Linkage",
    skill: "Pedigree Analysis & Punnett Square Ratios",
    code: "BIO12_GEN_002",
    name: "Mendelian Inheritance & Linkage",
    weightage: 2.2,
  },
  // MHT-CET SPECIFIC
  {
    id: "CET-12-PHY-01",
    examType: "MHT_CET",
    classLevel: "12",
    subject: "PHYSICS",
    unit: "Electrodynamics",
    chapter: "Electromagnetic Induction",
    topic: "Faraday's Laws & Lenz's Law",
    subtopic: "Eddy Currents & Self/Mutual Inductance",
    concept: "Induced EMF in Rotating Coil",
    skill: "Formula Application & Numerical Calculation",
    code: "CET12_EMI_001",
    name: "Faraday's Law & Mutual Inductance",
    weightage: 1.5,
  }
];

export function getCurriculumByExam(examType: string) {
  if (examType === "ALL") return SEED_CURRICULUM_NODES;
  return SEED_CURRICULUM_NODES.filter((n) => n.examType === examType || examType === "JEE_MAIN");
}

export function getSubjectsForExam(examType: string): string[] {
  switch (examType) {
    case "NEET":
      return ["PHYSICS", "CHEMISTRY", "BIOLOGY"];
    case "MHT_CET":
      return ["PHYSICS", "CHEMISTRY", "MATHEMATICS", "BIOLOGY"];
    case "JEE_MAIN":
    case "JEE_ADVANCED":
    default:
      return ["PHYSICS", "CHEMISTRY", "MATHEMATICS"];
  }
}
