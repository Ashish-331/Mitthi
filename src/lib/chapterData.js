export const PHYSICS_CHAPTERS = [
  "Physical World & Units", "Kinematics", "Laws of Motion", "Work, Energy & Power",
  "Rotational Motion", "Gravitation", "Mechanical Properties of Solids", "Mechanical Properties of Fluids",
  "Thermal Properties of Matter", "Thermodynamics", "Kinetic Theory of Gases", "Oscillations",
  "Waves", "Electrostatics", "Current Electricity", "Moving Charges & Magnetism",
  "Magnetism & Matter", "Electromagnetic Induction", "Alternating Current", "Electromagnetic Waves",
  "Ray Optics", "Wave Optics", "Dual Nature of Matter", "Atoms", "Nuclei",
  "Semiconductor Electronics"
];

export const CHEMISTRY_CHAPTERS = [
  "Some Basic Concepts of Chemistry", "Structure of Atom", "Classification of Elements & Periodicity",
  "Chemical Bonding & Molecular Structure", "States of Matter", "Thermodynamics", "Equilibrium",
  "Redox Reactions", "Hydrogen", "s-Block Elements", "p-Block Elements (Group 13-14)",
  "Organic Chemistry: Basic Principles", "Hydrocarbons", "Environmental Chemistry",
  "Solid State", "Solutions", "Electrochemistry", "Chemical Kinetics", "Surface Chemistry",
  "General Principles of Isolation of Elements", "p-Block Elements (Group 15-18)",
  "d & f Block Elements", "Coordination Compounds", "Haloalkanes & Haloarenes",
  "Alcohols, Phenols & Ethers", "Aldehydes, Ketones & Carboxylic Acids", "Amines",
  "Biomolecules", "Polymers", "Chemistry in Everyday Life"
];

export const BIOLOGY_CHAPTERS = [
  "The Living World", "Biological Classification", "Plant Kingdom", "Animal Kingdom",
  "Morphology of Flowering Plants", "Anatomy of Flowering Plants", "Structural Organisation in Animals",
  "Cell: The Unit of Life", "Biomolecules", "Cell Cycle and Cell Division",
  "Photosynthesis in Higher Plants", "Respiration in Plants", "Plant Growth and Development",
  "Breathing and Exchange of Gases", "Body Fluids and Circulation", "Excretory Products and their Elimination",
  "Locomotion and Movement", "Neural Control and Coordination", "Chemical Coordination and Integration",
  "Sexual Reproduction in Flowering Plants", "Human Reproduction", "Reproductive Health",
  "Principles of Inheritance and Variation", "Molecular Basis of Inheritance", "Evolution",
  "Human Health and Disease", "Strategies for Enhancement in Food Production", "Microbes in Human Welfare",
  "Biotechnology: Principles and Processes", "Biotechnology and its Applications",
  "Organisms and Populations", "Ecosystem", "Biodiversity and Conservation", "Environmental Issues"
];

export const RACE_STATES = ["Not Started", "In Progress", "Completed", "Revision Due"];

export const RACE_COLORS = {
  "Not Started": { bg: "#FFF4F8", text: "#99546F", dot: "#E7A8C0" },
  "In Progress": { bg: "#FFE3EE", text: "#A4275D", dot: "#E6558D" },
  "Completed": { bg: "#F8D8E6", text: "#741337", dot: "#BF2B67" },
  "Revision Due": { bg: "#F4B8D0", text: "#68102F", dot: "#8D1749" }
};

export function chapterId(subject, name) {
  return `${subject}::${name}`.toLowerCase().replace(/[^a-z0-9:]+/g, "-");
}

export function defaultChapterRow(subject, name) {
  return {
    id: chapterId(subject, name),
    subject,
    name,
    modules_text: "",
    modules_count: 0,
    race: "Not Started",
    race_count: 0,
    neet_pyq_count: 0,
    jee_pyq_count: 0,
    ncert_revised_count: 0,
    confidence: 3,
    last_revised: null,
    notes: ""
  };
}
