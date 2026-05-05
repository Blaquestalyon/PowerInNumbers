import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Generation Runs ───────────────────────────────────────
export const generationRuns = sqliteTable("generation_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stage: integer("stage").notNull(), // 1 or 3
  status: text("status").notNull().default("queued"), // queued | running | complete | error
  intakePayload: text("intake_payload").notNull(), // JSON string
  coreAnalysisA1a: text("core_analysis_a1a"), // JSON string
  coreAnalysisA1b: text("core_analysis_a1b"), // JSON string
  stage2Payload: text("stage2_payload"), // JSON string — Stage 2 enrichment answers
  errorLog: text("error_log"), // JSON string
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertRunSchema = createInsertSchema(generationRuns).omit({
  id: true,
});

export type InsertRun = z.infer<typeof insertRunSchema>;
export type GenerationRun = typeof generationRuns.$inferSelect;

// ─── Generation Sections ───────────────────────────────────
export const generationSections = sqliteTable("generation_sections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  runId: integer("run_id").notNull(),
  code: text("code").notNull(), // "K-1", "G-7", etc.
  title: text("title").notNull(),
  status: text("status").notNull().default("queued"), // queued | ready | running | complete | error
  llmModel: text("llm_model"),
  promptVersion: text("prompt_version"),
  ragContextIds: text("rag_context_ids"), // JSON string
  htmlFragment: text("html_fragment"),
  qaScore: real("qa_score"),
  error: text("error"),
});

export const insertSectionSchema = createInsertSchema(generationSections).omit({
  id: true,
});

export type InsertSection = z.infer<typeof insertSectionSchema>;
export type GenerationSection = typeof generationSections.$inferSelect;

// ─── Intake Validation Schema ──────────────────────────────
export const intakeSchema = z.object({
  stage: z.number().min(1).max(3),
  i1_profile: z.object({
    name: z.string().min(1),
    industry: z.string().min(1),
    role: z.string().min(1),
    yearsExperience: z.number().min(0),
    competenciesRaw: z.string().min(1),
    revenueTier: z.string(),
  }),
  i2_context: z.object({
    currentBusiness: z.string(),
    africaExperience: z.string(),
    sectorInterest: z.array(z.string()),
    geographicFocus: z.string().default("Ghana"),
  }),
  i3_objectives: z.object({
    strategicIntent: z.string(),
    primaryGoal: z.string(),
    timeHorizon: z.string(),
    investmentRange: z.string(),
  }),
  i4_constraints: z.object({
    budget: z.string(),
    timeline: z.string(),
    riskTolerance: z.string(),
    regulatoryConsiderations: z.string(),
  }),
  i5_meta: z.object({
    summitAttendee: z.boolean().default(true),
    reportType: z.string().default("full"),
    additionalNotes: z.string().optional(),
  }),
});

export type IntakePayload = z.infer<typeof intakeSchema>;

// ─── Core Analysis JSON Schemas ────────────────────────────
export const competencySchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(["operational", "transferable", "industry_knowledge", "capital_deployment", "managerial"]),
  proficiencyLevel: z.enum(["foundational", "developing", "proficient", "advanced", "expert"]),
  relevanceToGhana: z.number().min(0).max(100),
  evidence: z.string(),
});

export const developmentGapSchema = z.object({
  id: z.string(),
  name: z.string(),
  severity: z.enum(["critical", "moderate", "minor"]),
  description: z.string(),
  mitigationPath: z.string(),
  timeToClose: z.string(),
  citations: z.array(z.string()),
});

export const competitiveProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["direct", "adjacent", "informal"]),
  marketShare: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  whiteSpace: z.string(),
  saturationAssessment: z.string(),
});

export const pathwaySchema = z.object({
  id: z.string(),
  label: z.string(), // "Pathway A" or "Pathway B"
  title: z.string(),
  description: z.string(),
  opportunityScore: z.number().min(0).max(100),
  riskScore: z.number().min(0).max(100),
  frictionScore: z.number().min(0).max(100),
  tam: z.object({ value: z.string(), rationale: z.string(), sourceTier: z.string(), vintage: z.string() }),
  sam: z.object({ value: z.string(), rationale: z.string(), sourceTier: z.string(), vintage: z.string() }),
  som: z.object({ value: z.string(), rationale: z.string(), sourceTier: z.string(), vintage: z.string() }),
  milestones: z.array(z.object({
    phase: z.string(),
    timeline: z.string(),
    description: z.string(),
    capitalRequired: z.string(),
  })),
  quickWins: z.array(z.string()),
  longTermPlays: z.array(z.string()),
});

export const riskProfileSchema = z.object({
  id: z.string(),
  category: z.enum(["market", "regulatory", "operational", "financial", "political", "cultural"]),
  description: z.string(),
  likelihood: z.enum(["low", "moderate", "high"]),
  impact: z.enum(["low", "moderate", "high", "critical"]),
  mitigation: z.string(),
});

export const veridexGateSchema = z.object({
  gateId: z.string(),
  gateName: z.string(),
  status: z.enum(["pass", "fail", "warning", "not_applicable"]),
  score: z.number().min(0).max(100),
  details: z.string(),
});

export const coreAnalysisA1aSchema = z.object({
  competencies: z.array(competencySchema),
  developmentGaps: z.array(developmentGapSchema),
  competitiveProfiles: z.array(competitiveProfileSchema),
  pathways: z.array(pathwaySchema),
  risks: z.array(riskProfileSchema),
  opportunityCostMemo: z.string(),
  ghanaFitRationale: z.string(),
  swot: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    opportunities: z.array(z.string()),
    threats: z.array(z.string()),
  }),
});

export type CoreAnalysisA1a = z.infer<typeof coreAnalysisA1aSchema>;

export const monteCarloConfigSchema = z.object({
  pathwayId: z.string(),
  simulations: z.number().default(10000),
  yearRange: z.array(z.number()),
  revenueDistribution: z.object({
    type: z.string(),
    mean: z.number(),
    stdDev: z.number(),
    min: z.number(),
    max: z.number(),
  }),
  growthRate: z.object({
    base: z.number(),
    optimistic: z.number(),
    pessimistic: z.number(),
  }),
  assumptions: z.array(z.object({
    name: z.string(),
    value: z.string(),
    source: z.string(),
    sourceTier: z.string(),
    dataVintage: z.string(),
  })),
  scenarioEnvelope: z.object({
    p5: z.number(),
    p10: z.number(),
    p25: z.number(),
    p50: z.number(),
    p75: z.number(),
    p90: z.number(),
    p95: z.number(),
  }),
  scenarioNarratives: z.object({
    downside: z.string(),
    baseline: z.string(),
    upside: z.string(),
  }),
});

export const coreAnalysisA1bSchema = z.object({
  veridexScores: z.array(veridexGateSchema),
  failedGates: z.array(z.string()),
  requiredRevisions: z.array(z.string()),
  verificationLog: z.string(),
  sourceQualityLegend: z.string(),
  dataVintageNotes: z.string(),
  pathwayQuant: z.array(monteCarloConfigSchema),
});

export type CoreAnalysisA1b = z.infer<typeof coreAnalysisA1bSchema>;

// ─── Section Manifest Types ────────────────────────────────
export const sectionManifestEntry = z.object({
  code: z.string(),
  outputId: z.number(),
  title: z.string(),
  promptModule: z.string(),
  ragScope: z.array(z.string()),
  dependsOn: z.array(z.string()),
});

export type SectionManifestEntry = z.infer<typeof sectionManifestEntry>;

// ─── Stage 2 Enrichment Schema ───────────────────────────
export const stage2Schema = z.object({
  pathwayResonance: z.string(), // "Pathway A" | "Pathway B" | "hybrid" | "neither"
  capitalReadiness: z.string(), // freeform answer about capital/resources
  decisionAuthority: z.string(), // "My decision" | "Board/committee" | "Partners" | "Complicated"
  summitParticipation: z.string(), // "Learn & connect" | "Showcase" | "Thought leadership" | "Strategic alignment" | "Not sure"
  keyConcern: z.string().optional(), // Their stated blocking concern
  additionalAnswers: z.array(z.object({
    questionId: z.string(),
    question: z.string(),
    answer: z.string(),
  })).optional(),
});
export type Stage2Payload = z.infer<typeof stage2Schema>;

export interface Stage2Question {
  id: string;
  question: string;
  type: "select" | "text";
  options?: string[];
  mandatory: boolean;
  context?: string; // Why this question is being asked
}
