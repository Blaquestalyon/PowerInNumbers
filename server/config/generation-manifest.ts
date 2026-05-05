// Generation Call Manifest
// Defines all sections, their prompt modules, RAG scopes, and dependencies.
// The pipeline worker iterates over this manifest to generate sections.

export interface ManifestEntry {
  code: string;
  outputId: number;
  title: string;
  promptModule: string;
  ragScope: string[];
  dependsOn: string[];
}

export const STAGE_1_SECTIONS: ManifestEntry[] = [
  {
    code: "G-0",
    outputId: 0,
    title: "Executive Summary",
    promptModule: "section_g0",
    ragScope: ["core", "high_level", "gaps", "competition", "regulatory", "monte_carlo"],
    dependsOn: ["A-1a", "A-1b"],
  },
  {
    code: "G-1",
    outputId: 1,
    title: "Personalized Opportunity Simulation",
    promptModule: "section_g1",
    ragScope: ["core", "competencies", "gaps", "signal_friction"],
    dependsOn: ["A-1a"],
  },
  {
    code: "G-1B",
    outputId: 2,
    title: "Monte Carlo Probabilistic Outlook",
    promptModule: "section_g7",
    ragScope: ["monte_carlo", "verification"],
    dependsOn: ["A-1a", "A-1b"],
  },
  {
    code: "G-2",
    outputId: 3,
    title: "Vertical & Adjacent Opportunity Analysis",
    promptModule: "section_g2",
    ragScope: ["gaps", "competition", "pathways"],
    dependsOn: ["A-1a"],
  },
  {
    code: "G-3",
    outputId: 4,
    title: "Optimal Market Entry Strategy",
    promptModule: "section_g3",
    ragScope: ["regulatory", "competition", "pathways"],
    dependsOn: ["A-1a"],
  },
  {
    code: "G-4",
    outputId: 5,
    title: "Quick Wins vs. Long-Term Plays",
    promptModule: "section_g4",
    ragScope: ["pathways", "timelines"],
    dependsOn: ["A-1a"],
  },
  {
    code: "G-5",
    outputId: 6,
    title: "Summit Connection Map",
    promptModule: "section_g5",
    ragScope: ["network"],
    dependsOn: ["A-1a"],
  },
];

export const STAGE_3_SECTIONS: ManifestEntry[] = [
  {
    code: "G-0",
    outputId: 0,
    title: "Executive Summary",
    promptModule: "section_g0",
    ragScope: ["core", "high_level", "gaps", "competition", "regulatory", "monte_carlo"],
    dependsOn: ["A-1a", "A-1b"],
  },
  {
    code: "G-1",
    outputId: 1,
    title: "Personalized Opportunity Simulation",
    promptModule: "section_g1",
    ragScope: ["core", "competencies", "gaps", "signal_friction"],
    dependsOn: ["A-1a"],
  },
  {
    code: "G-2",
    outputId: 2,
    title: "Vertical & Adjacent Opportunity Analysis",
    promptModule: "section_g2",
    ragScope: ["gaps", "competition", "pathways"],
    dependsOn: ["A-1a"],
  },
  {
    code: "G-3",
    outputId: 3,
    title: "Optimal Market Entry Strategy",
    promptModule: "section_g3",
    ragScope: ["regulatory", "competition", "pathways"],
    dependsOn: ["A-1a"],
  },
  {
    code: "G-4",
    outputId: 4,
    title: "Quick Wins vs. Long-Term Plays",
    promptModule: "section_g4",
    ragScope: ["pathways", "timelines"],
    dependsOn: ["A-1a"],
  },
  {
    code: "G-5",
    outputId: 5,
    title: "Summit Connection Map",
    promptModule: "section_g5",
    ragScope: ["network"],
    dependsOn: ["A-1a"],
  },
  {
    code: "G-6",
    outputId: 6,
    title: "Realistic Timeline Projections",
    promptModule: "section_g6",
    ragScope: ["timelines", "regulatory"],
    dependsOn: ["A-1a"],
  },
  {
    code: "G-7",
    outputId: 7,
    title: "Probabilistic Market Outlook — Monte Carlo",
    promptModule: "section_g7",
    ragScope: ["monte_carlo", "verification"],
    dependsOn: ["A-1a", "A-1b"],
  },
  {
    code: "G-8",
    outputId: 8,
    title: "Specific Resource Requirements",
    promptModule: "section_g8",
    ragScope: ["resources"],
    dependsOn: ["A-1a"],
  },
  {
    code: "G-9",
    outputId: 9,
    title: "Capital Requirement Estimate by Stage",
    promptModule: "section_g9",
    ragScope: ["capital", "timelines"],
    dependsOn: ["A-1a", "A-1b"],
  },
  {
    code: "G-10",
    outputId: 10,
    title: "SWOT Analysis",
    promptModule: "section_g10",
    ragScope: ["gaps", "competition", "regulatory"],
    dependsOn: ["A-1a"],
  },
  {
    code: "G-11",
    outputId: 11,
    title: "Risk Mitigation Pathways",
    promptModule: "section_g11",
    ragScope: ["risk"],
    dependsOn: ["A-1a", "A-1b"],
  },
  {
    code: "G-12",
    outputId: 12,
    title: "Regulatory & Legal Landscape Snapshot",
    promptModule: "section_g12",
    ragScope: ["regulatory"],
    dependsOn: ["A-1a"],
  },
  {
    code: "G-13",
    outputId: 13,
    title: "Ghana Investment Incentives & Tax Environment",
    promptModule: "section_g13",
    ragScope: ["tax", "incentives"],
    dependsOn: ["A-1a"],
  },
  {
    code: "G-14",
    outputId: 14,
    title: "Competitive Landscape Overview",
    promptModule: "section_g14",
    ragScope: ["competition"],
    dependsOn: ["A-1a"],
  },
  {
    code: "G-15",
    outputId: 15,
    title: "Monte Carlo Sensitivity & Scenario Narratives",
    promptModule: "section_g15",
    ragScope: ["monte_carlo", "verification"],
    dependsOn: ["A-1a", "A-1b"],
  },
];

export function getSectionsForStage(stage: number): ManifestEntry[] {
  if (stage === 1) return STAGE_1_SECTIONS;
  if (stage === 3) return STAGE_3_SECTIONS;
  return []; // Stage 2 has no generated sections
}
