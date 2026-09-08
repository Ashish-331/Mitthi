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
    confidence: 3,
    last_revised: null,
    notes: ""
  };
}
