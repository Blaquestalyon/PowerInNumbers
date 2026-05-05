/**
 * Section JSON Schemas
 * 
 * Each LLM-powered section returns structured JSON instead of freeform HTML.
 * The renderer (section-renderers.ts) uses these types to produce
 * consistent, deterministic HTML layouts.
 */

// ─── G-1: Personalized Opportunity Simulation ────────────────
export interface G1Data {
  executiveSummary: string; // 2-3 sentence context
  categoryDistribution: string; // Narrative on competency distribution
  compositeScoreNarrative: string; // Narrative interpreting the scores
}

// ─── G-2: Vertical & Adjacent Opportunity Analysis ───────────
export interface G2Data {
  primarySectorAnalysis: string; // 3-4 sentences on primary sector landscape
  adjacentOpportunities: string; // 2-3 adjacencies with rationale
  valueChainPositioning: string; // Where pathways sit in value chain
}

// ─── G-3: Optimal Market Entry Strategy ──────────────────────
export interface G3Data {
  strategicOverview: string; // 2-3 sentences framing approach
  entryModels: Array<{
    model: string;
    fitPathwayA: string;
    fitPathwayB: string;
    keyConsiderations: string;
  }>;
  phases: Array<{
    name: string;
    timeline: string;
    steps: string[];
  }>;
  criticalSuccessFactors: string[];
}

// ─── G-4: Quick Wins vs. Long-Term Plays ─────────────────────
export interface G4Data {
  quickWins: Array<{
    action: string;
    pathway: string;
    effort: "Low" | "Medium" | "High";
    impact: "Low" | "Medium" | "High";
    leverages: string;
  }>;
  longTermPlays: Array<{
    initiative: string;
    pathway: string;
    timeline: string;
    capital: string;
    strategicValue: string;
  }>;
  sequencingRecommendation: string;
}

// ─── G-5: Summit Connection Map ──────────────────────────────
export interface G5Data {
  connectionTypes: Array<{
    type: string;
    whyCritical: string;
    addressesGap: string;
    enablesPathway: string;
    priority: "Critical" | "High" | "Medium";
  }>;
  partnershipStructures: string;
  engagementStrategy: string[];
  qualifyingQuestions: string[];
}

// ─── G-6: Realistic Timeline Projections ─────────────────────
export interface G6Data {
  timelineRiskFactors: string[];
}

// ─── G-8: Specific Resource Requirements ─────────────────────
export interface G8Data {
  humanCapital: Array<{
    role: string;
    priority: "Critical" | "High" | "Medium";
    phaseNeeded: string;
    marketRate: string;
    pathway: string;
  }>;
  infrastructure: Array<{
    requirement: string;
    type: string;
    estimatedCost: string;
    phase: string;
    notes: string;
  }>;
  technology: Array<{
    system: string;
    purpose: string;
    estimatedCost: string;
    buildVsBuy: string;
  }>;
  operationalConsiderations: string;
}

// ─── G-9: Capital Requirement Estimate ───────────────────────
export interface G9Data {
  pathwayACapital: Array<{
    phase: string;
    timeline: string;
    capitalRequired: string;
    cumulative: string;
    keyExpenditures: string;
  }>;
  pathwayATotal: string;
  pathwayBCapital: Array<{
    phase: string;
    timeline: string;
    capitalRequired: string;
    cumulative: string;
    keyExpenditures: string;
  }>;
  pathwayBTotal: string;
  fundingSources: string[];
  budgetAlignment: string;
}

// ─── G-10: SWOT Analysis ─────────────────────────────────────
export interface G10Data {
  strategicInterpretation: string;
  keyLinkages: Array<{
    linkage: string;
    dynamic: string;
    implication: string;
  }>;
}

// ─── G-11: Risk Mitigation Pathways ──────────────────────────
export interface G11Data {
  riskCategorySummary: Array<{
    category: string;
    count: number;
    highestImpact: string;
    mitigationTheme: string;
  }>;
  criticalRiskDeepDives: Array<{
    riskDescription: string;
    impact: string;
    context: string;
    mitigation: string;
    contingency: string;
    earlyWarning: string;
  }>;
  pathwayARiskNotes: string;
  pathwayBRiskNotes: string;
}

// ─── G-12: Regulatory & Legal Landscape ──────────────────────
export interface G12Data {
  entityFormation: Array<{
    step: string;
    authority: string;
    requirement: string;
    timeline: string;
    costEstimate: string;
  }>;
  foreignInvestment: Array<{
    requirement: string;
    threshold: string;
    appliesToA: string;
    appliesToB: string;
  }>;
  sectorLicensing: Array<{
    license: string;
    authority: string;
    requirement: string;
    renewal: string;
  }>;
  ongoingCompliance: string[];
  keyLegalConsiderations: string[];
}

// ─── G-13: Investment Incentives & Tax ───────────────────────
export interface G13Data {
  corporateTax: Array<{
    taxType: string;
    standardRate: string;
    incentiveRate: string;
    eligibility: string;
  }>;
  gipcIncentives: Array<{
    incentive: string;
    benefit: string;
    duration: string;
    pathwayAEligible: string;
    pathwayBEligible: string;
  }>;
  freeZonesNarrative: string;
  freeZoneBenefits: Array<{
    benefit: string;
    details: string;
    conditions: string;
  }>;
  sectorSpecificIncentives: string;
  doubleTaxation: string;
  investmentProtection: string[];
}

// ─── G-14: Competitive Landscape Overview ────────────────────
export interface G14Data {
  competitiveAdvantages: string;
  pathwayAPositioning: string;
  pathwayBPositioning: string;
  informalSectorDynamics: string;
}

// ─── G-0: Executive Summary ─────────────────────────────────
export interface G0Data {
  // Component 1: Core Finding
  coreFinding: string; // 2-3 sentences: attendee's transferable capability → specific Ghana gap → signal classification

  // Component 2: Pathways at a Glance
  pathwayA: {
    name: string;
    classificationBadge: string; // e.g. "Structured Opportunity 20/25"
    pivotType: string; // Direct Translation | Skills Transfer | Formalization | Industry
    merit: string; // 1-2 sentences: strongest structural advantage
    constraint: string; // 1-2 sentences: most consequential barrier
  };
  pathwayB: {
    name: string;
    classificationBadge: string;
    pivotType: string;
    merit: string;
    constraint: string;
  };

  // Component 3: Quantitative Snapshot
  sam: { value: string; context: string }; // "$85M — narrowed from $450M sector..."
  monteCarloPre: string; // Placeholder text for pre-simulation state
  capitalEntry: { value: string; context: string }; // "$200K (JV) or $500K (wholly foreign)..."

  // Component 4: Critical Risks (max 3, each tagged to pathway)
  criticalRisks: Array<{
    pathwayTag: "Pathway A" | "Pathway B" | "Both Pathways";
    risk: string; // 1-3 sentences
  }>;

  // Component 5: What to Do First
  whatToDoFirst: string; // 2-3 sentences: specific action, dollar figure, commitment level, info output

  // Component 6: Critical Summit Connections (max 3)
  summitConnections: Array<{
    connectionType: string; // bold text — specific entity/institution type
    rationale: string; // 1 sentence: why this matters for THIS attendee
  }>;
}

// ─── G-0: Executive Summary ─────────────────────────────────
