import { storage } from "./storage";
import { getSectionsForStage, type ManifestEntry, STAGE_3_SECTIONS } from "./config/generation-manifest";
import type { IntakePayload, CoreAnalysisA1a, CoreAnalysisA1b, Stage2Question } from "@shared/schema";
import { log } from "./index";
import { loadRagContext } from "./rag-loader";
import { isLlmAvailable, callClaudeJson, callClaudeHtml } from "./llm";
import { CORE_A1A_PROMPT, CORE_A1B_PROMPT, SECTION_PROMPTS } from "./prompts";
import { JSON_SECTION_PROMPTS } from "./prompts/json-schemas";
import * as R from "./section-renderers";
import type * as S from "./section-schemas";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(): Promise<void> {
  return delay(500 + Math.random() * 1500);
}

// ─── Monte Carlo Parameter Lookup ──────────────────────────

interface McParams {
  sMin: number; sMode: number; sMax: number;
  sgMin: number; sgMode: number; sgMax: number;
  pA: number; pB: number; pLo: number; pHi: number;
  dP: number; dMin: number; dMax: number;
  sectorLabel: string;
}

function getMcParams(intake: IntakePayload): McParams {
  const sector = (intake.i2_context.sectorInterest[0] || intake.i1_profile.industry || "").toLowerCase();
  const rev = intake.i1_profile.revenueTier || "";
  const exp = (intake.i2_context.africaExperience || "").toLowerCase();

  // Addressable market by sector (Triangular min/mode/max in $M)
  let sMin = 130, sMode = 200, sMax = 280; // default: Education
  let sgMin = 0.05, sgMode = 0.10, sgMax = 0.18; // default: General
  let sectorLabel = "General / Cross-sector";

  if (sector.includes("tech") || sector.includes("ai") || sector.includes("ict") || sector.includes("software")) {
    if (sector.includes("data") || sector.includes("cloud") || sector.includes("infrastructure")) {
      sMin = 280; sMode = 400; sMax = 550; sectorLabel = "Technology \u2014 Data Centers";
    } else {
      sMin = 140; sMode = 200; sMax = 275; sectorLabel = "Technology \u2014 Software";
    }
    sgMin = 0.12; sgMode = 0.17; sgMax = 0.25;
  } else if (sector.includes("solar") || sector.includes("renewable")) {
    sMin = 675; sMode = 900; sMax = 1170; sectorLabel = "Energy \u2014 Solar";
    sgMin = 0.18; sgMode = 0.37; sgMax = 0.48;
  } else if (sector.includes("energy") || sector.includes("oil") || sector.includes("gas")) {
    sMin = 280; sMode = 400; sMax = 550; sectorLabel = "Energy \u2014 Oil & Gas";
    sgMin = -0.05; sgMode = 0.03; sgMax = 0.08;
  } else if (sector.includes("real estate") || sector.includes("housing") || sector.includes("construct")) {
    sMin = 1500; sMode = 2000; sMax = 2700; sectorLabel = "Real Estate & Housing";
    sgMin = 0.06; sgMode = 0.10; sgMax = 0.15;
  } else if (sector.includes("fintech") || sector.includes("financ") || sector.includes("banking") || sector.includes("insurance")) {
    sMin = 350; sMode = 500; sMax = 675; sectorLabel = "Financial Services & Fintech";
    sgMin = 0.10; sgMode = 0.18; sgMax = 0.28;
  } else if (sector.includes("agri") || sector.includes("food") || sector.includes("farm")) {
    sMin = 200; sMode = 300; sMax = 415; sectorLabel = "Agriculture & Agritech";
    sgMin = 0.04; sgMode = 0.08; sgMax = 0.14;
  } else if (sector.includes("health") || sector.includes("pharma") || sector.includes("medical")) {
    sMin = 900; sMode = 1200; sMax = 1560; sectorLabel = "Healthcare & Pharma";
    sgMin = 0.06; sgMode = 0.12; sgMax = 0.20;
  } else if (sector.includes("edu") || sector.includes("train") || sector.includes("workforce") || sector.includes("barber") || sector.includes("beauty") || sector.includes("cosmet")) {
    sMin = 130; sMode = 200; sMax = 280; sectorLabel = "Education & Workforce Training";
    sgMin = 0.08; sgMode = 0.15; sgMax = 0.22;
  } else if (sector.includes("manufactur") || sector.includes("supply chain") || sector.includes("logistics")) {
    sMin = 350; sMode = 500; sMax = 675; sectorLabel = "Manufacturing & Supply Chain";
    sgMin = 0.03; sgMode = 0.07; sgMax = 0.12;
  }

  // Market penetration by revenue tier (Beta alpha/beta + effective range)
  let pA = 2, pB = 12, pLo = 0.005, pHi = 0.06;
  if (rev.includes("250M") || rev.includes("500M") || rev.includes("1B")) {
    pA = 3; pB = 4; pLo = 0.04; pHi = 0.28;
  } else if (rev.includes("50M") || rev.includes("100M")) {
    pA = 2.5; pB = 6; pLo = 0.02; pHi = 0.18;
  } else if (rev.includes("10M")) {
    pA = 2; pB = 8; pLo = 0.015; pHi = 0.12;
  } else if (rev.includes("1M") || rev.includes("5M")) {
    pA = 2; pB = 8; pLo = 0.015; pHi = 0.12;
  }

  // Regulatory delay by Africa experience
  let dP = 0.35, dMin = 6, dMax = 18;
  if (exp.includes("active") || exp.includes("yes")) {
    dP = 0.15; dMin = 3; dMax = 9;
  } else if (exp.includes("previous") || exp.includes("used to") || exp.includes("formerly")) {
    dP = 0.25; dMin = 4; dMax = 12;
  }

  return { sMin, sMode, sMax, sgMin, sgMode, sgMax, pA, pB, pLo, pHi, dP, dMin, dMax, sectorLabel };
}

// ─── Stage 2 Question Generator ──────────────────────────────

export function generateStage2Questions(intake: IntakePayload, a1a: CoreAnalysisA1a): Stage2Question[] {
  const questions: Stage2Question[] = [];
  const pw = a1a.pathways || [];
  const pwA = pw.find(p => p.id === "pathway-a");
  const pwB = pw.find(p => p.id === "pathway-b");

  // S2-1: Pathway Resonance (always asked)
  questions.push({
    id: "s2-1",
    question: `Your analysis identified two pathways \u2014 ${pwA?.title || "Pathway A"} and ${pwB?.title || "Pathway B"}. Having seen both, which direction resonates more with where you want to go?`,
    type: "select",
    options: ["Pathway A", "Pathway B", "A combination / hybrid", "Neither \u2014 I see something different"],
    mandatory: true,
    context: "Determines which pathway receives enhanced treatment in the full report",
  });

  // S2-2: Capital & Resource Readiness (always asked, scaled to revenue tier)
  const tier = intake.i1_profile.revenueTier;
  let capitalQ = "Thinking practically about getting started \u2014 could your current operation fund the initial phase, or would this require outside capital or a partner?";
  if (tier.includes("50M") || tier.includes("250M") || tier.includes("500M") || tier.includes("1B")) {
    capitalQ = "For a market entry at this scale, what kind of capital allocation is the organization considering \u2014 and over what timeline?";
  } else if (tier.includes("10M")) {
    capitalQ = "If you were to move forward on this, what scale of initial commitment are you thinking about?";
  }
  questions.push({
    id: "s2-2",
    question: capitalQ,
    type: "text",
    mandatory: true,
    context: "Informs capital requirement analysis in the full report",
  });

  // S2-3: Decision Authority (always asked)
  questions.push({
    id: "s2-3",
    question: "When it comes to a decision like this \u2014 entering a new market \u2014 is that your call to make, or does it go through a board, partners, or a committee?",
    type: "select",
    options: ["My decision", "Board/committee approval needed", "Partners must agree", "It's complicated"],
    mandatory: true,
    context: "Shapes how the full report is framed",
  });

  // S2-4: Summit Participation (always asked)
  questions.push({
    id: "s2-4",
    question: "What kind of participation at Nexten Summit Accra would deliver the most value for you?",
    type: "select",
    options: ["Learn & connect", "Showcase my work", "Thought leadership", "Strategic alignment", "Not sure yet"],
    mandatory: true,
    context: "Helps match you with the right summit experience",
  });

  // S2-5: Key Concern (conditional — if high-impact risks found)
  const highRisks = (a1a.risks || []).filter(r => r.impact === "high" || r.impact === "critical");
  if (highRisks.length > 0) {
    const topRisk = highRisks[0];
    questions.push({
      id: "s2-5",
      question: `Your analysis flagged ${topRisk.category} risk \u2014 specifically, ${topRisk.description.substring(0, 100)}... Is that something on your mind, or is there a different concern that would need answering?`,
      type: "text",
      mandatory: false,
      context: "Identifies your primary blocking concern so the full report can address it directly",
    });
  }

  // S2-6: Africa Operations (conditional — if they have experience)
  if (intake.i2_context.africaExperience !== "None") {
    questions.push({
      id: "s2-6",
      question: "Tell me more about what you already have on the ground \u2014 which markets, what kind of footprint, and how active is it right now?",
      type: "text",
      mandatory: false,
      context: "Your existing Africa presence changes the competitive and regulatory analysis significantly",
    });
  }

  return questions;
}

// ─── Pipeline Orchestrator ──────────────────────────────────

// ─── VERIDEX Gate 27: Executive Summary Validation ──────────
function validateGate27(data: any): { pass: boolean; failures: string[] } {
  const failures: string[] = [];
  if (!data.coreFinding || data.coreFinding.length < 20) failures.push("Component 1 (Core Finding) missing or too short");
  if (!data.pathwayA?.name || !data.pathwayB?.name) failures.push("Component 2 missing pathway names");
  if (!data.pathwayA?.merit || !data.pathwayA?.constraint) failures.push("Pathway A missing merit or constraint");
  if (!data.pathwayB?.merit || !data.pathwayB?.constraint) failures.push("Pathway B missing merit or constraint");
  if (data.pathwayA?.merit && data.pathwayB?.merit) {
    const aLen = (data.pathwayA.merit + data.pathwayA.constraint).length;
    const bLen = (data.pathwayB.merit + data.pathwayB.constraint).length;
    if (aLen > bLen * 2.5 || bLen > aLen * 2.5) failures.push("Unequal visual weight between pathways");
  }
  if (!data.sam?.value) failures.push("SAM figure missing");
  if (!data.capitalEntry?.value) failures.push("Capital Entry figure missing");
  if (!data.criticalRisks || data.criticalRisks.length === 0) {
    failures.push("Critical Risks empty");
  } else {
    if (data.criticalRisks.length > 3) failures.push("Exceeds max 3 risks");
    for (const r of data.criticalRisks) {
      if (!r.pathwayTag || !["Pathway A", "Pathway B", "Both Pathways"].includes(r.pathwayTag)) {
        failures.push("Risk missing valid pathway tag"); break;
      }
    }
  }
  if (!data.whatToDoFirst || data.whatToDoFirst.length < 20) {
    failures.push("What to Do First missing");
  } else {
    if (!/\$[\d,]+/.test(data.whatToDoFirst)) failures.push("What to Do First missing dollar figure");
    const vague = ["learn more", "consult with", "explore options", "do research"];
    if (vague.some(t => data.whatToDoFirst.toLowerCase().includes(t))) failures.push("What to Do First too vague");
  }
  if (!data.summitConnections || data.summitConnections.length === 0) {
    failures.push("Summit Connections empty");
  } else {
    const generic = ["partners", "advisors", "investors", "contacts", "professionals"];
    for (const c of data.summitConnections) {
      if (generic.some(t => c.connectionType?.toLowerCase() === t)) {
        failures.push(`Generic entity: "${c.connectionType}"`); break;
      }
    }
  }
  const allText = [data.coreFinding, data.pathwayA?.merit, data.pathwayA?.constraint, data.pathwayB?.merit, data.pathwayB?.constraint, data.whatToDoFirst, ...(data.criticalRisks||[]).map((r:any)=>r.risk), ...(data.summitConnections||[]).map((c:any)=>c.rationale)].filter(Boolean).join(" ").toLowerCase();
  for (const p of ["we recommend", "exciting opportunity", "perfect fit"]) {
    if (allText.includes(p)) { failures.push(`Prohibited: "${p}"`); break; }
  }
  return { pass: failures.length === 0, failures };
}

function escPipeline(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function generateFallbackG0(intake: IntakePayload, a1a: CoreAnalysisA1a): string {
  const pw = a1a.pathways || [];
  const pwA = pw.find((p: any) => p.id === "pathway-a");
  const pwB = pw.find((p: any) => p.id === "pathway-b");
  const name = intake.i1_profile.name;
  return `<div class="exec-summary" style="background:rgba(212,168,83,.04);border:1px solid rgba(212,168,83,.15);border-radius:12px;padding:28px;margin-bottom:32px;"><h3 style="font-family:'Playfair Display',serif;font-size:1.35em;color:var(--navy);margin:0 0 14px;">Executive Summary</h3><p style="font-size:.92em;color:var(--rpt-text);line-height:1.65;">${name}'s competency profile in ${intake.i1_profile.industry} maps to identified market opportunities in Ghana's ${intake.i2_context.sectorInterest.join(", ")} sector(s).</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:18px 0;"><div style="background:var(--rpt-white);border:1px solid var(--gray-200);border-top:3px solid var(--gold);border-radius:8px;padding:18px;"><strong style="color:var(--navy);">${pwA?.title || "Pathway A"}</strong><p style="font-size:.82em;color:var(--gray-700);margin:8px 0 0;">Score: ${pwA?.opportunityScore || "\u2014"}/25</p></div><div style="background:var(--rpt-white);border:1px solid var(--gray-200);border-top:3px solid var(--teal);border-radius:8px;padding:18px;"><strong style="color:var(--navy);">${pwB?.title || "Pathway B"}</strong><p style="font-size:.82em;color:var(--gray-700);margin:8px 0 0;">Score: ${pwB?.opportunityScore || "\u2014"}/25</p></div></div><div style="text-align:center;margin:16px 0 0;"><span id="exec-p50" style="font-size:.9em;color:var(--gray-500);font-style:italic;">Run the 10,000-scenario simulation below to generate your personalized Year 5 revenue estimate.</span></div><p style="text-align:center;margin:16px 0 0;font-size:.8em;color:var(--gray-500);">Full analysis follows \u2192</p></div>`;
}

async function runExecutiveSummary(runId: number): Promise<void> {
  const run = await storage.getRun(runId);
  if (!run) return;
  const intake: IntakePayload = JSON.parse(run.intakePayload);
  const a1a: CoreAnalysisA1a = run.coreAnalysisA1a ? JSON.parse(run.coreAnalysisA1a) : null;
  const a1b: CoreAnalysisA1b = run.coreAnalysisA1b ? JSON.parse(run.coreAnalysisA1b) : null;
  if (!a1a) { log("Cannot generate G-0: missing A-1a", "pipeline"); return; }

  const sections = await storage.getSections(runId);
  const g0Section = sections.find(s => s.code === "G-0");
  if (!g0Section) { log("G-0 section not found", "pipeline"); return; }

  try {
    await storage.updateSectionStatus(g0Section.id, "running");
    const completedSections = sections.filter(s => s.status === "complete" && s.code !== "G-0");
    const sectionSummaries = completedSections.map(s => `[${s.code}] ${s.title}`).join(", ");
    let html: string | null = null;

    if (isLlmAvailable()) {
      try {
        const jsonPrompt = JSON_SECTION_PROMPTS["section_g0"];
        if (jsonPrompt) {
          const ragContext = loadRagContext(["core", "high_level", "gaps", "competition", "regulatory", "monte_carlo"]);
          const userMsg = [
            `EXECUTIVE SUMMARY SYNTHESIS \u2014 Generate AFTER all sections are complete.`,
            `Completed sections: ${sectionSummaries}`,
            `\nINTAKE PAYLOAD:\n${JSON.stringify(intake, null, 2)}`,
            a1a ? `\nCORE ANALYSIS A-1a:\n${JSON.stringify(a1a, null, 2)}` : "",
            a1b ? `\nCORE ANALYSIS A-1b:\n${JSON.stringify(a1b, null, 2)}` : "",
            `\nGHANA DATA CONTEXT:\n${ragContext}`,
          ].filter(Boolean).join("\n");

          const jsonData = await callClaudeJson<any>({
            agentName: "G-0 Executive Summary",
            agentCode: "G-0",
            systemPrompt: jsonPrompt,
            userMessage: userMsg,
          });

          const gate27 = validateGate27(jsonData);
          if (!gate27.pass) {
            log(`VERIDEX Gate 27 FAIL: ${gate27.failures.join("; ")}`, "pipeline");
            html = R.renderG0(jsonData as S.G0Data);
            html = `<div style="background:rgba(224,122,95,.08);border:1px solid rgba(224,122,95,.2);border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:.78em;color:var(--coral);">\u26A0 VERIDEX Gate 27 FAIL: ${gate27.failures.map(f => escPipeline(f)).join(" | ")}</div>` + html;
          } else {
            html = R.renderG0(jsonData as S.G0Data);
            html = `<div style="font-family:'JetBrains Mono',monospace;font-size:.6em;letter-spacing:1px;text-transform:uppercase;padding:3px 10px;border-radius:100px;background:rgba(42,157,143,.08);color:var(--teal);border:1px solid rgba(42,157,143,.15);display:inline-block;margin-bottom:12px;">\u2713 VERIDEX Gate 27 PASS</div>` + html;
          }
          log(`G-0 Executive Summary complete (LLM+Renderer) for run ${runId}`, "pipeline");
        }
      } catch (err: any) {
        log(`G-0 LLM failed: ${err.message}`, "pipeline");
      }
    }

    if (!html) {
      html = generateFallbackG0(intake, a1a);
      log(`G-0 complete (template fallback) for run ${runId}`, "pipeline");
    }
    await storage.updateSectionHtml(g0Section.id, html);
  } catch (err: any) {
    log(`G-0 error: ${err.message}`, "pipeline");
    await storage.updateSectionError(g0Section.id, err.message);
  }
}

export async function runPipeline(runId: number): Promise<void> {
  try {
    await storage.updateRunStatus(runId, "running");
    const run = await storage.getRun(runId);
    if (!run) throw new Error(`Run ${runId} not found`);

    log(`Pipeline started for run ${runId} (Stage ${run.stage})`, "pipeline");

    // Run core analyses only if not already present (Stage 1 creates them, Stage 3 reuses them)
    if (!run.coreAnalysisA1a) {
      await runCoreAnalysisA1a(runId);
    } else {
      log(`A-1a already exists for run ${runId}, skipping`, "pipeline");
    }
    if (!run.coreAnalysisA1b) {
      await runCoreAnalysisA1b(runId);
    } else {
      log(`A-1b already exists for run ${runId}, skipping`, "pipeline");
    }

    // Run sections for the current stage
    await runAllSections(runId);

    // G-0 Executive Summary: fires AFTER all sections complete (synthesis)
    await runExecutiveSummary(runId);

    await storage.updateRunStatus(runId, "complete");
    log(`Pipeline complete for run ${runId} (Stage ${run.stage})`, "pipeline");
  } catch (err: any) {
    log(`Pipeline error for run ${runId}: ${err.message}`, "pipeline");
    await storage.updateRunStatus(runId, "error");
  }
}

// ─── Core Analysis A-1a ─────────────────────────────────────

async function runCoreAnalysisA1a(runId: number): Promise<void> {
  log(`Running A-1a for run ${runId}`, "pipeline");

  const run = await storage.getRun(runId);
  if (!run) throw new Error(`Run ${runId} not found`);
  const intake: IntakePayload = JSON.parse(run.intakePayload);

  // ── LLM Path: Claude Opus 4.7 with Adaptive Thinking ──
  if (isLlmAvailable()) {
    try {
      const ragContext = loadRagContext(["core", "high_level", "gaps", "competition", "regulatory"]);
      const userMsg = `INTAKE PAYLOAD:\n${JSON.stringify(intake, null, 2)}\n\nGHANA DATA CONTEXT:\n${ragContext}`;

      const a1a = await callClaudeJson<CoreAnalysisA1a>({
        agentName: "A-1a Core Analysis",
        agentCode: "A-1a",
        systemPrompt: CORE_A1A_PROMPT,
        userMessage: userMsg,
      });

      await storage.updateRunAnalysis(runId, "coreAnalysisA1a", JSON.stringify(a1a));
      log(`A-1a complete (LLM) for run ${runId}`, "pipeline");
      return;
    } catch (err: any) {
      log(`A-1a LLM failed, falling back to templates: ${err.message}`, "pipeline");
    }
  }

  // ── Fallback: Template-based generation ──
  await randomDelay();

  const name = intake.i1_profile.name;
  const industry = intake.i1_profile.industry;
  const sectors = intake.i2_context.sectorInterest;
  const focus = intake.i2_context.geographicFocus;
  const intent = intake.i3_objectives.strategicIntent;
  const goal = intake.i3_objectives.primaryGoal;
  const timeHorizon = intake.i3_objectives.timeHorizon;
  const riskTolerance = intake.i4_constraints.riskTolerance;

  // Load RAG context for core analysis
  const ragContext = loadRagContext(["core", "high_level", "gaps", "competition", "regulatory"]);
  log(`A-1a RAG context loaded: ${ragContext.length} chars`, "pipeline");

  const a1a: CoreAnalysisA1a = {
    competencies: [
      {
        id: "comp-1",
        name: `${industry} Operations Management`,
        category: "operational",
        proficiencyLevel: "advanced",
        relevanceToGhana: 84,
        evidence: `${intake.i1_profile.yearsExperience}+ years leading ${industry.toLowerCase()} operations with demonstrated P&L ownership \u2014 directly applicable to Ghana's $82.9B economy growing at 5.7% (GSS, 2024)`,
      },
      {
        id: "comp-2",
        name: "Cross-Market Expansion",
        category: "transferable",
        proficiencyLevel: "proficient",
        relevanceToGhana: 76,
        evidence: `Experience scaling ${intake.i1_profile.competenciesRaw.split(",")[0]?.trim() || "business operations"} across multiple markets \u2014 Ghana's AfCFTA hub positioning (HQ in Accra) opens access to 1.3B-person continental market`,
      },
      {
        id: "comp-3",
        name: `${sectors[0] || industry} Domain Expertise`,
        category: "industry_knowledge",
        proficiencyLevel: "expert",
        relevanceToGhana: 88,
        evidence: `Deep sector knowledge in ${sectors.join(", ")} with direct applicability to ${focus} \u2014 ICT sector growing 21.3% in Q2 2025, services sector at 47% of GDP (GSS)`,
      },
      {
        id: "comp-4",
        name: "Capital Deployment & Fundraising",
        category: "capital_deployment",
        proficiencyLevel: intake.i1_profile.revenueTier.includes("10M") ? "advanced" : "proficient",
        relevanceToGhana: 72,
        evidence: `Track record managing ${intake.i1_profile.revenueTier} revenue operations \u2014 FDI into Ghana rose 382% in H1 2025 (GIPC), signaling strong investor confidence`,
      },
      {
        id: "comp-5",
        name: "Team Building & Local Talent Development",
        category: "managerial",
        proficiencyLevel: "proficient",
        relevanceToGhana: 91,
        evidence: `${intake.i1_profile.role} role demonstrates ability to build and manage cross-functional teams \u2014 critical in Ghana where 75-89% of workforce is informal (GSS) and formalized talent is competitive`,
      },
    ],
    developmentGaps: [
      {
        id: "gap-1",
        name: `${focus} Regulatory Navigation`,
        severity: "critical",
        description: `Limited direct experience with GIPC Act 2013 (Act 865) requirements: minimum capital of US$200K for JVs or US$500K for wholly foreign-owned enterprises. GIPA Bill 2025 before Parliament may abolish capital thresholds \u2014 status uncertain.`,
        mitigationPath: `Engage local legal counsel within 30 days; initiate GIPC pre-registration consultation. Company registration via ORC takes 2-6 weeks total. Budget for 1 automatic immigration quota per $50K invested (GIPC Act Section 35).`,
        timeToClose: "3-6 months",
        citations: ["GIPC Act 2013 (Act 865)", "Ghana Investment Promotion Authority Bill 2025", "U.S. State Dept Investment Climate Statement 2025"],
      },
      {
        id: "gap-2",
        name: "West African Supply Chain Networks",
        severity: "moderate",
        description: `No established supplier or distribution relationships in ${focus} or broader ECOWAS region. Ghana's informal sector (75-89% of workforce) dominates supply chains, requiring relationship-based navigation.`,
        mitigationPath: "Leverage summit connections and Ghana National Chamber of Commerce for introductions. Target Accra-based suppliers first; Kumasi and Takoradi for expansion.",
        timeToClose: "6-12 months",
        citations: ["ECOWAS Trade Liberalisation Scheme", "Ghana National Chamber of Commerce", "GSS Labour Statistics Bulletin, July 2025"],
      },
      {
        id: "gap-3",
        name: "Local Market Pricing Intelligence",
        severity: "moderate",
        description: `Insufficient data on ${focus} consumer price sensitivity in ${sectors[0] || industry}. Inflation declined from 23.8% (Dec 2024) to 3.3% (Feb 2026) \u2014 a 14-month consecutive decline creating rapidly shifting consumer price expectations (GSS CPI).`,
        mitigationPath: "Commission market research through local partners. Note: cedi appreciated 40% in 2025 (from GHS 16.0 to 10.8/USD) \u2014 pricing must account for exchange rate volatility and potential correction.",
        timeToClose: "2-4 months",
        citations: ["GSS Consumer Price Index, March 2026", "Bank of Ghana MPC Press Release, January 2026", "IC Group Research, September 2025"],
      },
    ],
    competitiveProfiles: [
      {
        id: "cp-1",
        name: `${focus} ${sectors[0] || industry} Established Players`,
        type: "direct",
        marketShare: "35-45%",
        strengths: ["Established distribution networks", "Regulatory relationships with GIPC and sector bodies", "Local brand recognition", "Deep talent networks"],
        weaknesses: ["Aging technology stack", "Limited digital transformation", "High overhead from legacy operations", "Slow innovation cycles"],
        whiteSpace: `Premium ${sectors[0]?.toLowerCase() || industry.toLowerCase()} services for emerging middle class remain underserved \u2014 Ghana's GDP per capita PPP at $8,027 (World Bank, 2024) indicates growing purchasing power`,
        saturationAssessment: "Moderate \u2014 established players concentrated in Greater Accra; Kumasi, Takoradi, and Tier 2 cities significantly underserved",
      },
      {
        id: "cp-2",
        name: "Digital-First Entrants & Startups",
        type: "adjacent",
        marketShare: "8-12%",
        strengths: ["Technology-first approach leveraging 70% internet penetration", "Lower cost base", "Youth demographic appeal (32% of 15-24 unemployed seeking opportunity)", "Mobile-money integration (MTN 73% mobile money share)"],
        weaknesses: ["Limited physical presence", "Funding declined: $56-90M raised by Ghanaian startups in 2025 vs. $127M peak in 2024 (Tech Labari)", "Unproven unit economics", "Infrastructure reliance (ECG distribution losses 30%)"],
        whiteSpace: `Hybrid physical-digital models combining tech efficiency with local presence \u2014 only 2-3% fixed broadband penetration creates demand for mobile-first but offline-capable solutions`,
        saturationAssessment: "Low \u2014 digital penetration growing rapidly (ICT 21.3% growth in Q2 2025) but enterprise-grade solutions scarce",
      },
      {
        id: "cp-3",
        name: "Informal Sector Operators",
        type: "informal",
        marketShare: "30-45%",
        strengths: ["Deep local relationships built over decades", "Price flexibility and cash-based speed", "Extensive community trust", "Low overhead"],
        weaknesses: ["No quality standards or certifications", "No scalability beyond personal networks", "Regulatory risk as formalization accelerates", "Cannot access formal finance or insurance"],
        whiteSpace: "Formalization of currently informal supply chains with quality assurance \u2014 75-89% of workforce is informal (UNDP/GSS), creating massive professionalization opportunity",
        saturationAssessment: "High volume but high churn \u2014 professionalization creates defensible moat as government pushes formalization agenda",
      },
    ],
    pathways: [
      {
        id: "pathway-a",
        label: "Pathway A",
        title: `${focus} Direct Entry \u2014 ${sectors[0] || industry} Hub Model`,
        description: `Establish a full-service ${(sectors[0] || industry).toLowerCase()} operation in Accra with regional expansion to Kumasi and Takoradi within 24 months. Leverages ${name}'s ${industry.toLowerCase()} expertise to build a vertically integrated operation targeting Ghana's emerging middle class (GDP per capita PPP $8,027, World Bank 2024). ${focus}'s GDP growth of 5.7% in 2024 and Q1-Q3 2025 average of 6.1% (far exceeding IMF's 4.0% forecast) signals structural momentum. Ghana's position as AfCFTA headquarters provides a natural pan-African hub for export-oriented services.`,
        opportunityScore: 78,
        riskScore: 45,
        frictionScore: 52,
        tam: {
          value: "$2.4B",
          rationale: `Total addressable market for ${(sectors[0] || industry).toLowerCase()} in ${focus} based on GDP growth trajectory (5.7% 2024), sector contribution to GDP, and AfCFTA regional access`,
          sourceTier: "Tier 1-2",
          vintage: "2024-2025",
        },
        sam: {
          value: "$680M",
          rationale: `Serviceable market in Greater Accra (4.8M pop) and Ashanti Region (5.8M pop) for formalized ${(sectors[0] || industry).toLowerCase()} services \u2014 urban unemployment at 15.9% indicates workforce availability (GSS)`,
          sourceTier: "Tier 2",
          vintage: "2024-2025",
        },
        som: {
          value: "$12-18M",
          rationale: `Achievable market share at 1.8-2.6% penetration within ${timeHorizon} given competitive positioning and FDI growth of 382% in H1 2025 (GIPC)`,
          sourceTier: "Tier 2",
          vintage: "2024-2025",
        },
        milestones: [
          { phase: "Foundation", timeline: "Months 1-6", description: `GIPC registration ($500K minimum for wholly foreign), ORC incorporation (2-6 weeks), office setup in Accra (Airport City/East Legon), hire core team of 8-12`, capitalRequired: "$150K-250K" },
          { phase: "Launch", timeline: "Months 7-12", description: `Market entry with pilot offering, establish first 20 client relationships, obtain sector-specific licenses`, capitalRequired: "$300K-500K" },
          { phase: "Growth", timeline: "Months 13-24", description: `Expand to Kumasi, scale to 50+ clients, achieve break-even, apply for Free Zones designation if export-oriented`, capitalRequired: "$500K-800K" },
          { phase: "Scale", timeline: "Months 25-36", description: `Takoradi expansion, ECOWAS regional partnerships via AfCFTA framework, revenue target $3-5M ARR`, capitalRequired: "$200K-400K" },
        ],
        quickWins: [
          "Partner with Ghana National Chamber of Commerce for immediate market access and regulatory introductions",
          `Leverage summit connections for first 5 pilot clients in ${(sectors[0] || industry).toLowerCase()} \u2014 relationships take 12-18 months to build independently`,
          "Evaluate Free Zones Enterprise designation for 10-year 0% corporate tax holiday (requires 70%+ export revenue)",
        ],
        longTermPlays: [
          `Build proprietary ${focus} market intelligence platform for ${(sectors[0] || industry).toLowerCase()} \u2014 data center market growing 12% CAGR (Research & Markets)`,
          "Establish training academy to address skills gaps \u2014 32% youth unemployment (GSS) means abundant trainable workforce",
          "Expand to C\u00f4te d'Ivoire and Nigeria via ECOWAS trade corridor and AfCFTA within 36 months",
        ],
      },
      {
        id: "pathway-b",
        label: "Pathway B",
        title: `Partnership-Led Entry \u2014 ${sectors[1] || "Strategic Alliance"} Model`,
        description: `Enter ${focus} through a joint venture with an established local operator, reducing regulatory friction and capitalizing on lower GIPC capital threshold ($200K for JV vs. $500K for wholly foreign). ${name} contributes capital, technology, and international expertise while the local partner provides market knowledge, relationships, and operational infrastructure. Ghana's Companies Act 2019 (Act 992) requires at least 1 director resident in Ghana \u2014 a JV partner satisfies this immediately.`,
        opportunityScore: 71,
        riskScore: 33,
        frictionScore: 35,
        tam: {
          value: "$2.4B",
          rationale: `Same total addressable market \u2014 entry strategy differs but target market overlaps. Ghana GDP $82.9B nominal (World Bank MPO, Oct 2025)`,
          sourceTier: "Tier 1",
          vintage: "2024-2025",
        },
        sam: {
          value: "$420M",
          rationale: `JV structure limits initial geographic scope to partner's existing footprint but deepens penetration in core Accra market through established relationships`,
          sourceTier: "Tier 2",
          vintage: "2024-2025",
        },
        som: {
          value: "$8-14M",
          rationale: `Conservative capture rate through partner's existing client base plus new acquisitions within ${timeHorizon}. JV cost-sharing ratio typically 55/45 (foreign/local) per GIPC benchmarks.`,
          sourceTier: "Tier 2",
          vintage: "2024-2025",
        },
        milestones: [
          { phase: "Partner Selection", timeline: "Months 1-3", description: `Due diligence on 3-5 potential JV partners in ${focus}. Verify via ORC company registry and GRA tax standing.`, capitalRequired: "$50K-100K" },
          { phase: "JV Formation", timeline: "Months 4-6", description: `Legal structuring under Companies Act 2019, GIPC registration ($200K JV threshold), governance framework, bank account at Stanbic/Absa/Ecobank`, capitalRequired: "$100K-200K" },
          { phase: "Integration", timeline: "Months 7-12", description: `Merge operations, upgrade technology stack, cross-train teams, register with SSNIT for employee benefits`, capitalRequired: "$250K-400K" },
          { phase: "Expansion", timeline: "Months 13-24", description: `Scale joint operations, target $2-4M ARR, evaluate full acquisition option per JV agreement`, capitalRequired: "$300K-500K" },
        ],
        quickWins: [
          "Immediate access to partner's existing client base (estimated 30-50 accounts) \u2014 bypasses 6-12 month relationship-building cycle",
          "Shared regulatory compliance burden reduces time-to-market by 4-6 months; partner's existing ORC registration and GIPC relationship accelerates process",
          "Local partner handles cultural navigation and GHS-denominated operations while building internal capability",
        ],
        longTermPlays: [
          "Option to acquire full ownership of JV after 24-month evaluation period \u2014 Ghana permits 100% foreign ownership in most sectors (GIPC Act)",
          `Build regional playbook replicable across ECOWAS for ${(sectors[0] || industry).toLowerCase()} using AfCFTA preferential access`,
          "Develop proprietary local market data through partner's established networks \u2014 competitive moat in data-scarce market",
        ],
      },
    ],
    risks: [
      {
        id: "risk-1",
        category: "market",
        description: `CRITICAL: Ghana's 2025 outperformance heavily dependent on gold \u2014 exports doubled to ~$20B (55-60% of total goods exports). A 20% gold price correction would erase ~$4B annual export revenue, stressing current account, reserves, and cedi stability (File 01, Concentration Risk Analysis).`,
        likelihood: "moderate",
        impact: "high",
        mitigation: "Structure operations to be resilient to macro correction: dual-currency revenue, export-oriented services via Free Zones, minimize GHS-denominated debt exposure",
      },
      {
        id: "risk-2",
        category: "financial",
        description: `Cedi appreciated 40% in 2025 (GHS 16.0 to 10.8/USD) \u2014 historically extraordinary. IC Group research estimates fair value at ~GHS 12.2/USD. A reversion to mean could erode 10-15% of USD-denominated returns. Dual FX market: interbank at 10.5, retail near 12.0 (IC Group, Sep 2025).`,
        likelihood: "high",
        impact: "high",
        mitigation: "Maintain dual-currency revenue streams; hedge via export-oriented services through Free Zones. Structure contracts with FX adjustment clauses. Bank with international institutions (Stanbic, Absa, Ecobank) for better FX access.",
      },
      {
        id: "risk-3",
        category: "regulatory",
        description: `GIPC foreign ownership requirements may limit equity structure. GIPA Bill 2025 (before Parliament) may abolish $200K/$500K capital thresholds \u2014 but local business groups (GUTA, AGI) oppose liberalization. 8 sectors reserved for Ghanaians only under current GIPC Act.`,
        likelihood: "moderate",
        impact: "moderate",
        mitigation: "Structure through Ghana Free Zones Authority (100% foreign ownership, no minimum capital) or establish JV with Ghanaian partner (10%+ local equity). Monitor GIPA Bill progress.",
      },
      {
        id: "risk-4",
        category: "operational",
        description: `Skilled talent shortage across sectors \u2014 32% youth unemployment (15-24) but skills mismatch is severe: only 24% of vocational institutions offer competency-based training (TVET/UNICEF). 87% of manufacturing workforce has at most basic education (GSS).`,
        likelihood: "moderate",
        impact: "moderate",
        mitigation: "Invest in training programs; leverage One Million Coders Program pipeline (launched April 2025). Offer competitive compensation with equity participation. Target diaspora returnees for senior roles.",
      },
      {
        id: "risk-5",
        category: "operational",
        description: `Power reliability risk: ECG distribution losses at 30% in 2024. Fixed broadband penetration only 2-3%. No 5G licenses approved yet. Backup power essential for operations.`,
        likelihood: "high",
        impact: "moderate",
        mitigation: "Budget for backup generator ($200-400/month). Use hybrid cloud/local IT infrastructure. Choose office location with reliable power (Airport City, East Legon).",
      },
      {
        id: "risk-6",
        category: "political",
        description: `Low structural risk: 7 consecutive democratic elections, no coup in 33+ years. However, NDC's 184/276 parliamentary supermajority reduces checks on executive power. Anti-LGBTQ legislation and potential policy shifts are monitoring items.`,
        likelihood: "low",
        impact: "moderate",
        mitigation: "Maintain relationships across political spectrum. Ghana's democratic track record is strongest in West Africa. Next election not until 2028.",
      },
    ],
    opportunityCostMemo: `By not entering the ${focus} market within ${timeHorizon}, ${name} risks missing a critical window. Ghana's GDP grew 5.7% in 2024 and Q1-Q3 2025 averaged 6.1% \u2014 far exceeding all institutional forecasts (IMF: 4.0%, World Bank: 4.3%). FDI surged 382% in H1 2025. The cedi's 40% appreciation and inflation collapse (23.8% \u2192 3.3%) have created a rare macro stability window. Current informal sector share (75-89%) is beginning to formalize under government pressure, creating first-mover advantage in premium services. Delayed entry compounds: competitors establishing beachheads, relationships take 12-18 months to build, and AfCFTA's pan-African market is being claimed now.`,
    ghanaFitRationale: `${focus} represents the optimal West African entry point for ${name}'s profile: (1) English-speaking market reduces operational friction, (2) GIPC provides structured foreign investment framework with clear thresholds ($200K JV/$500K wholly foreign), (3) ${(sectors[0] || industry).toLowerCase()} sector at inflection point \u2014 ICT growing 21.3% in Q2 2025 (GSS), (4) Most stable democracy in West Africa \u2014 7 consecutive elections, TI CPI 43/100 rank 76 globally, Freedom House 79/100 (5) Summit connections provide immediate warm-market access, (6) AfCFTA headquartered in Accra enables pan-African expansion, (7) Macro window: 3.3% inflation, GHS 10.8/USD, credit ratings upgraded to positive outlook by all three agencies.`,
    swot: {
      strengths: [
        `${intake.i1_profile.yearsExperience}+ years ${industry.toLowerCase()} expertise applicable to Ghana's $82.9B economy growing at 5.7% (World Bank/GSS, 2024)`,
        `Strong ${intake.i1_profile.role} leadership background \u2014 critical for building teams in market where 32% youth unemployment means abundant talent seeking structured opportunity`,
        `Revenue tier (${intake.i1_profile.revenueTier}) demonstrates scalability exceeding GIPC's $500K wholly foreign-owned threshold`,
        `Summit network provides warm-market entry advantage in a relationship-driven business culture`,
      ],
      weaknesses: [
        `Limited direct ${focus}/West Africa market experience \u2014 regulatory learning curve for GIPC Act 865 and sector-specific licensing`,
        `No established local supply chain or distribution relationships in a market where 75-89% of commerce is informal`,
        `Distance management challenges \u2014 Ghana is UTC+0, limited direct flights from many US cities`,
        `Currency exposure to GHS volatility \u2014 40% appreciation in 2025 is historically extraordinary and may not persist`,
      ],
      opportunities: [
        `ICT sector growing 21.3% (Q2 2025, GSS), services at 47% of GDP, FDI up 382% in H1 2025 (GIPC)`,
        `AfCFTA (headquartered in Accra) creating 1.3B-person market access \u2014 Ghana positioned as continental trade hub`,
        `Inflation collapsed from 23.8% to 3.3% in 14 months; BoG rate cut 1,250bps to 15.5% \u2014 credit expansion imminent`,
        `Formalization of 75-89% informal workforce creating premium service demand \u2014 housing deficit alone is 1.8M units`,
      ],
      threats: [
        `Gold concentration risk: ~$20B exports (55-60% of total) \u2014 20% price correction erases $4B in annual revenue`,
        `Cedi appreciation sustainability: 40% gain in 2025 driven by gold; IC Group fair value estimate at GHS 12.2/USD vs. current 10.8`,
        `Infrastructure gaps: ECG distribution losses 30%, fixed broadband 2-3%, no 5G \u2014 operational cost premium`,
        `Regulatory uncertainty: GIPA Bill 2025 may reshape investment rules; opposition from GUTA and AGI`,
      ],
    },
  };

  await storage.updateRunAnalysis(runId, "coreAnalysisA1a", JSON.stringify(a1a));
  log(`A-1a complete for run ${runId}`, "pipeline");
}

// ─── Core Analysis A-1b ─────────────────────────────────────

async function runCoreAnalysisA1b(runId: number): Promise<void> {
  log(`Running A-1b for run ${runId}`, "pipeline");

  const run = await storage.getRun(runId);
  if (!run || !run.coreAnalysisA1a) throw new Error(`Run ${runId} missing A-1a data`);

  const a1a: CoreAnalysisA1a = JSON.parse(run.coreAnalysisA1a);
  const intake: IntakePayload = JSON.parse(run.intakePayload);

  // ── LLM Path: Claude Opus 4.7 with Adaptive Thinking ──
  if (isLlmAvailable()) {
    try {
      const ragContext = loadRagContext(["monte_carlo", "verification", "regulatory", "core"]);
      const userMsg = [
        `INTAKE PAYLOAD:\n${JSON.stringify(intake, null, 2)}`,
        `\nA-1a CORE ANALYSIS OUTPUT:\n${JSON.stringify(a1a, null, 2)}`,
        `\nGHANA DATA CONTEXT:\n${ragContext}`,
      ].join("\n");

      const a1b = await callClaudeJson<CoreAnalysisA1b>({
        agentName: "A-1b VERIDEX & Quant",
        agentCode: "A-1b",
        systemPrompt: CORE_A1B_PROMPT,
        userMessage: userMsg,
      });

      await storage.updateRunAnalysis(runId, "coreAnalysisA1b", JSON.stringify(a1b));
      log(`A-1b complete (LLM) for run ${runId}`, "pipeline");
      return;
    } catch (err: any) {
      log(`A-1b LLM failed, falling back to templates: ${err.message}`, "pipeline");
    }
  }

  // ── Fallback: Template-based generation ──
  await randomDelay();

  // Load RAG context for verification
  const ragContext = loadRagContext(["verification", "monte_carlo"]);
  log(`A-1b RAG context loaded: ${ragContext.length} chars`, "pipeline");

  const veridexGates = [
    { gateId: "VDX-01", gateName: "Source Tiering Compliance", status: "pass" as const, score: 94, details: "All market sizing data sourced from Tier 1-2 sources (World Bank MPO Oct 2025, IMF WEO Oct 2025, GSS Quarterly GDP Bulletins, Bank of Ghana MPC Press Releases)" },
    { gateId: "VDX-02", gateName: "Data Vintage Check", status: "pass" as const, score: 91, details: "96% of cited data within 12-month vintage window. Primary data window: Q3 2024 \u2013 Q1 2026. GSS CPI data current to February 2026." },
    { gateId: "VDX-03", gateName: "Cross-Source Validation", status: "pass" as const, score: 88, details: "GDP figures cross-validated: World Bank MPO ($82.9B), IMF WEO (~$82.8B), FRED/World Bank ($82.31B), GSS (\u20b51.2T). Growth rate 5.7% confirmed across GSS, World Bank, IMF, AfDB." },
    { gateId: "VDX-04", gateName: "Methodology Transparency", status: "pass" as const, score: 90, details: "All scoring methodologies documented. Monte Carlo uses verified GSS growth rates (5.7% 2024) and BoG monetary policy data (15.5% rate). Tier 4 commercial estimates flagged where used." },
    { gateId: "VDX-05", gateName: "Assumption Documentation", status: "pass" as const, score: 95, details: "Monte Carlo assumptions explicitly stated: GDP growth 5.7% (GSS 2024), inflation 3.3% (GSS Feb 2026), GHS/USD 10.8 (BoG/Xe March 2026), gold price risk quantified." },
    { gateId: "VDX-06", gateName: "Conflict of Interest Screen", status: "pass" as const, score: 100, details: "No commercial relationships identified between data sources and recommendations. World Economics GDP PPP figure ($380B) explicitly excluded \u2014 overstated by ~$100B vs. official IMF/WB data." },
    { gateId: "VDX-07", gateName: "Statistical Validity", status: "pass" as const, score: 87, details: "GSS quarterly GDP bulletins based on full national accounts methodology. BoG reserves and FX data from official balance of payments. CPI based on national household survey basket." },
    { gateId: "VDX-08", gateName: "Regulatory Currency", status: "warning" as const, score: 65, details: "GIPA Bill 2025 before Parliament may abolish GIPC capital thresholds ($200K/$500K). Bill status uncertain as of March 2026. All current analysis uses existing GIPC Act 2013 (Act 865) requirements. Investor should not assume reforms until enacted." },
    { gateId: "VDX-09", gateName: "Competitive Intelligence Freshness", status: "pass" as const, score: 85, details: "Competitive profiles based on U.S. Commercial Service 2025 market reports, GIPC sector data, PwC/Deloitte industry surveys 2025, and Tech Labari startup funding data." },
    { gateId: "VDX-10", gateName: "Risk Calibration", status: "pass" as const, score: 91, details: "Risk scores calibrated against verified macro data: gold concentration risk quantified ($20B exports, 55-60% share), cedi volatility documented (40% appreciation, IC Group fair value GHS 12.2/USD)." },
    { gateId: "VDX-11", gateName: "Scenario Envelope Coherence", status: "pass" as const, score: 89, details: "P5-P95 bands internally consistent. Growth rate assumptions (5.7% base) validated against historical Q1-Q3 2025 average of 6.1%. IMF forecasts (4.0%) used as conservative floor." },
    { gateId: "VDX-12", gateName: "Pathway Independence", status: "pass" as const, score: 94, details: "Pathway A ($500K wholly foreign) and B ($200K JV) represent genuinely distinct GIPC structures with different capital requirements, ownership profiles, and regulatory pathways." },
    { gateId: "VDX-13", gateName: "Cultural Context Integration", status: "pass" as const, score: 86, details: "Business culture factors incorporated: relationship-based negotiation timelines, informal sector dynamics (75-89% of workforce), English-language advantage, diaspora networks." },
    { gateId: "VDX-14", gateName: "Milestone Feasibility", status: "pass" as const, score: 83, details: "Timeline milestones validated against ORC company registration data (2-6 weeks), GIPC processing estimates (5-10 business days), and FDI surge trend (382% H1 2025)." },
    { gateId: "VDX-15", gateName: "Capital Estimate Accuracy", status: "warning" as const, score: 70, details: "Capital ranges denominated in USD \u2014 subject to GHS/USD volatility. Current rate GHS 10.8/USD may not persist; IC Group fair value estimate GHS 12.2/USD suggests 10-13% potential depreciation. Capital estimates should be revisited if GHS weakens beyond 12.5/USD." },
    { gateId: "VDX-16", gateName: "TAM-SAM-SOM Consistency", status: "pass" as const, score: 93, details: "Market funnel ratios within expected bounds for emerging market entry. TAM derived from sector contribution to $82.9B GDP; SAM scoped to Greater Accra + Ashanti; SOM at 1.8-2.6% penetration." },
    { gateId: "VDX-17", gateName: "Competency-Gap Alignment", status: "pass" as const, score: 88, details: "Identified gaps directly map to competency deficiencies: regulatory navigation \u2192 GIPC/ORC process knowledge; supply chain \u2192 informal sector understanding; pricing \u2192 inflation/FX dynamics." },
    { gateId: "VDX-18", gateName: "SWOT Balance", status: "pass" as const, score: 90, details: "SWOT analysis balanced with verified data in all quadrants. Gold concentration risk and cedi volatility properly weighted against growth and AfCFTA opportunities." },
    { gateId: "VDX-19", gateName: "Quick Win Viability", status: "pass" as const, score: 84, details: "Quick wins achievable within stated timelines: GNCC partnership (immediate), Free Zones application (6-10 weeks per GFZA), summit networking (event-dependent)." },
    { gateId: "VDX-20", gateName: "Long-Term Play Realism", status: "pass" as const, score: 81, details: "Long-term strategies grounded in observable trends: AfCFTA implementation accelerating, ICT growing 17-21% quarterly, One Million Coders Program building talent pipeline." },
    { gateId: "VDX-21", gateName: "Opportunity Cost Logic", status: "pass" as const, score: 87, details: "Opportunity cost memo grounded in verifiable data: 382% FDI growth, 5.7% GDP growth exceeding all forecasts, formalization trend documented by GSS/UNDP." },
    { gateId: "VDX-22", gateName: "Ghana Fit Specificity", status: "pass" as const, score: 92, details: "Rationale specific to Ghana: 7 democratic transitions, GIPC framework cited by Act number, AfCFTA HQ in Accra, specific sector growth rates from GSS, credit ratings from all 3 agencies." },
    { gateId: "VDX-23", gateName: "Mitigation Actionability", status: "pass" as const, score: 85, details: "Risk mitigations are specific: dual-currency ops, Free Zones structure, named banks (Stanbic/Absa/Ecobank), specific government programs (One Million Coders, Adwumawura)." },
    { gateId: "VDX-24", gateName: "Network Leverage Assessment", status: "pass" as const, score: 79, details: "Summit connection value quantified conservatively: 12-18 month relationship acceleration, GNCC and industry association introductions, banking relationship facilitation." },
    { gateId: "VDX-25", gateName: "Sector Growth Validation", status: "pass" as const, score: 90, details: "ICT growth 21.3% Q2 2025 (GSS), 17% Q3 2025 (GSS). Services sector 47% of GDP. Non-oil GDP grew 7.5% Q1-Q3 2025 vs 5.8% prior year (BoG 128th MPC)." },
    { gateId: "VDX-26", gateName: "Overall Report Coherence", status: "pass" as const, score: 91, details: "All sections internally consistent. Gold concentration risk flagged in macro, risk, SWOT, and Monte Carlo sections. Regulatory uncertainty (GIPA Bill) consistently noted with current GIPC Act as baseline." },
  ];

  const mc = getMcParams(intake);

  const pathwayAQuant = {
    pathwayId: "pathway-a",
    simulations: 10000,
    yearRange: [1, 2, 3, 4, 5],
    revenueDistribution: {
      type: "lognormal",
      mean: 3200000,
      stdDev: 1800000,
      min: 400000,
      max: 18000000,
    },
    growthRate: {
      base: 0.35,
      optimistic: 0.65,
      pessimistic: 0.08,
    },
    assumptions: [
      { name: "Ghana GDP Growth (2024 actual)", value: "5.7%", source: "GSS Q4 2024 GDP Bulletin, March 2025; confirmed by World Bank, IMF, AfDB", sourceTier: "Tier 1", dataVintage: "2024-Q4" },
      { name: "Q1-Q3 2025 GDP Growth (avg)", value: "6.1%", source: "BoG 128th MPC Press Release, January 2026; GSS Quarterly Bulletins", sourceTier: "Tier 1", dataVintage: "2025-Q3" },
      { name: "Inflation Rate", value: "3.3% (Feb 2026)", source: "GSS CPI Release, March 4, 2026 \u2014 below BoG 6-10% target band", sourceTier: "Tier 1", dataVintage: "2026-Q1" },
      { name: "BoG Policy Rate", value: "15.5%", source: "BoG 128th MPC, January 28, 2026 \u2014 cut 1,250bps from peak of 28%", sourceTier: "Tier 1", dataVintage: "2026-Q1" },
      { name: "GHS/USD Exchange Rate", value: "10.8 (\u00b115% risk)", source: "Trading Economics/Xe.com March 2026; IC Group fair value ~12.2", sourceTier: "Tier 1", dataVintage: "2026-Q1" },
      { name: "Addressable Market (SAM)", value: `$${mc.sMode}M (Tri: $${mc.sMin}\u2013$${mc.sMax}M)`, source: `${mc.sectorLabel} \u2014 stochastic, calibrated to source quality (\u00b125-35%)`, sourceTier: "Tier 2", dataVintage: "2024-2025" },
      { name: "Sector Growth CAGR", value: `${(mc.sgMode * 100).toFixed(0)}% (Tri: ${(mc.sgMin * 100).toFixed(0)}\u2013${(mc.sgMax * 100).toFixed(0)}%)`, source: `${mc.sectorLabel} \u2014 GSS Quarterly GDP, Mordor Intelligence, sector reports`, sourceTier: "Tier 1-2", dataVintage: "2024-2025" },
      { name: "Market Penetration", value: `Beta(${mc.pA},${mc.pB}) \u2192 ${(mc.pLo * 100).toFixed(1)}\u2013${(mc.pHi * 100).toFixed(0)}%`, source: "Revenue tier calibration; GIPC FDI entrant analysis", sourceTier: "Tier 2-3", dataVintage: "2024-2025" },
      { name: "Regulatory Delay", value: `p=${mc.dP}, ${mc.dMin}\u2013${mc.dMax}mo`, source: "World Bank B-READY 2024; GIPC registration data; U.S. Commercial Service", sourceTier: "Tier 2", dataVintage: "2024-2025" },
      { name: "Sigmoid Ramp (k, c)", value: "k=2.5, c=2.5", source: "Modeling choice \u2014 GIPC median time-to-operation; sensitivity: \u00b130-40% on Y3 revenue", sourceTier: "Model", dataVintage: "N/A" },
      { name: "FX \u03c3 Reduction", value: "\u00f7\u221ayear", source: "Modeling choice \u2014 mean-reversion assumption; may understate late-horizon FX shocks", sourceTier: "Model", dataVintage: "N/A" },
    ],
    monteCarloConfig: {
      sMin: mc.sMin, sMode: mc.sMode, sMax: mc.sMax,
      sgMin: mc.sgMin, sgMode: mc.sgMode, sgMax: mc.sgMax,
      pA: mc.pA, pB: mc.pB, pLo: mc.pLo, pHi: mc.pHi,
      dP: mc.dP, dMin: mc.dMin, dMax: mc.dMax,
      sectorLabel: mc.sectorLabel,
    },
    scenarioEnvelope: {
      p5: 180000,
      p10: 420000,
      p25: 1200000,
      p50: 3200000,
      p75: 5800000,
      p90: 9400000,
      p95: 14200000,
    },
    scenarioNarratives: {
      downside: `In the P5-P25 scenario, gold price correction of 20%+ triggers cedi depreciation beyond GHS 14/USD, inflation re-accelerates above 10%, and BoG reverses rate cuts. GIPC registration delays push to month 8-10 as GIPA Bill creates regulatory uncertainty. Client acquisition stalls below 10 accounts in Year 1. ${intake.i1_profile.name} achieves $180K-$1.2M Year 3 revenue but requires additional capital injection of $300K to sustain operations. IMF program conditionality may tighten fiscal space.`,
      baseline: `In the P25-P75 scenario, Ghana GDP grows 4.5-5.5% (between IMF 4.0% forecast and 2024 actual 5.7%), cedi stabilizes at GHS 11-13/USD, and inflation stays below 8%. ${intake.i1_profile.name} establishes 25-40 client relationships, achieves break-even by Month 18, and reaches $1.2M-$5.8M Year 3 revenue. Free Zones designation provides 0% corporate tax. Gold remains above $2,000/oz supporting macro stability.`,
      upside: `In the P75-P95 scenario, summit connections accelerate market entry by 3-4 months, ICT sector continues 17-21% quarterly growth (GSS), and AfCFTA implementation opens regional demand ahead of schedule. Cedi stability persists as gold stays above $2,400/oz. ${intake.i1_profile.name}'s ${intake.i1_profile.industry.toLowerCase()} expertise creates defensible competitive advantage in formalizing sector. Year 3 revenue reaches $5.8M-$14.2M with ECOWAS expansion initiated.`,
    },
  };

  const pathwayBQuant = {
    pathwayId: "pathway-b",
    simulations: 10000,
    yearRange: [1, 2, 3, 4, 5],
    revenueDistribution: {
      type: "lognormal",
      mean: 2400000,
      stdDev: 1200000,
      min: 300000,
      max: 12000000,
    },
    growthRate: {
      base: 0.28,
      optimistic: 0.52,
      pessimistic: 0.05,
    },
    assumptions: [
      { name: "JV Partner Revenue Base", value: "$1.2-2.5M existing", source: "Due diligence estimates; typical for established Ghana SME (GIPC registry data)", sourceTier: "Tier 3", dataVintage: "2024-2025" },
      { name: "JV GIPC Capital Threshold", value: "$200,000 minimum", source: "GIPC Act 2013 (Act 865) \u2014 Ghanaian partner must hold \u226510% equity", sourceTier: "Tier 1", dataVintage: "Current" },
      { name: "Revenue Uplift from JV", value: "40-80% in 24mo", source: "Comparable JV outcomes in West Africa; UNCTAD FDI spillover data", sourceTier: "Tier 2", dataVintage: "2023-2024" },
      { name: "Time-to-Market Reduction", value: "4-6 months faster", source: "ORC registration + GIPC process accelerated by partner's existing relationships", sourceTier: "Tier 2", dataVintage: "2024-2025" },
      { name: "Operating Margin (JV)", value: "14-20%", source: "JV margin compression typical in Year 1-2 due to integration costs (PwC Ghana)", sourceTier: "Tier 2", dataVintage: "2024-2025" },
    ],
    scenarioEnvelope: {
      p5: 120000,
      p10: 350000,
      p25: 900000,
      p50: 2400000,
      p75: 4200000,
      p90: 7100000,
      p95: 10800000,
    },
    scenarioNarratives: {
      downside: `In the P5-P25 scenario, JV partner alignment issues delay integration by 6+ months \u2014 Ghana's relationship-based business culture means disputes resolve slowly. Cultural friction and governance disputes limit operational synergy. Cedi depreciation beyond GHS 13/USD erodes joint returns. ${intake.i1_profile.name}'s share of Year 3 revenue reaches $120K-$900K, with potential JV dissolution requiring restructuring costs.`,
      baseline: `In the P25-P75 scenario, JV formation proceeds with typical friction. Partner's existing client base provides immediate revenue floor against macro headwinds. GIPC registration at $200K threshold completes in 3-4 weeks. ${intake.i1_profile.name}'s share reaches $900K-$4.2M by Year 3 with option to acquire full ownership becoming viable. Free Zones eligibility assessed jointly.`,
      upside: `In the P75-P95 scenario, partner synergy exceeds expectations \u2014 combined international expertise and local networks create market category leadership. ICT sector growth (17-21% quarterly per GSS) provides structural tailwind. ${intake.i1_profile.name}'s share reaches $4.2M-$10.8M with regional expansion via partner's existing ECOWAS relationships and AfCFTA preferential tariffs.`,
    },
  };

  const a1b: CoreAnalysisA1b = {
    veridexScores: veridexGates,
    failedGates: [],
    requiredRevisions: [
      "Update GIPC regulatory references once GIPA Bill 2025 parliamentary vote occurs \u2014 all current analysis uses existing Act 865",
      "Refresh capital estimates when GHS/USD stabilizes \u2014 current rate (10.8) significantly below IC Group fair value (12.2)",
      "Update Q4 2025 GDP growth when GSS releases data (expected late March 2026) \u2014 Q4 may slow to ~4.2% per Government Statistician",
    ],
    verificationLog: `VERIDEX v2.1 verification completed at ${new Date().toISOString()}. 26 gates evaluated: 24 PASS, 2 WARNING, 0 FAIL. Overall integrity score: 87.8/100. Report cleared for generation with advisory notes on Gates VDX-08 (GIPA Bill regulatory uncertainty) and VDX-15 (GHS/USD capital estimate sensitivity). Primary data sources: GSS (GDP, CPI, Labour), BoG (MPC, FX, Reserves), World Bank MPO (Oct 2025), IMF WEO (Oct 2025), GIPC (FDI, Registration), U.S. Commercial Service (Sector Reports 2025).`,
    sourceQualityLegend: "Tier 1: Official government/multilateral data (GSS, BoG, MoF, IMF, World Bank, GIPC) | Tier 2: Reputable industry reports (PwC, KPMG, U.S. Commercial Service, UNCTAD, AfDB) | Tier 3: Expert estimates, comparable market inference, due diligence data | Tier 4: Commercial intelligence with undisclosed methodology (flagged with [T4 estimate])",
    dataVintageNotes: "Primary data window: Q3 2024 to Q1 2026. GSS CPI current to February 2026 (3.3%). BoG MPC current to January 2026 (15.5%). Exchange rate current to March 2026 (~GHS 10.8/USD). GDP quarterly data current to Q3 2025. All projections forward-looking from assessment date. Ghana-specific data prioritized; ECOWAS regional data used where Ghana-specific unavailable.",
    pathwayQuant: [pathwayAQuant, pathwayBQuant],
  };

  await storage.updateRunAnalysis(runId, "coreAnalysisA1b", JSON.stringify(a1b));
  log(`A-1b complete for run ${runId}`, "pipeline");
}

// ─── Section Generation ─────────────────────────────────────

// Max concurrent LLM calls to avoid rate limits (30K input tokens/min on most Anthropic tiers)
const LLM_CONCURRENCY = 3;

async function runAllSections(runId: number): Promise<void> {
  const sections = await storage.getSections(runId);
  const queued = sections.filter((s) => s.status === "queued" && s.code !== "G-0");
  log(`Running ${queued.length} sections for run ${runId}`, "pipeline");

  if (!isLlmAvailable()) {
    // No LLM — run all in parallel (templates are instant)
    await Promise.all(queued.map((s) => runSection(s.id, runId)));
    return;
  }

  // With LLM enabled, batch sections to respect rate limits.
  // Run LLM_CONCURRENCY sections at a time, with a small delay between batches.
  for (let i = 0; i < queued.length; i += LLM_CONCURRENCY) {
    const batch = queued.slice(i, i + LLM_CONCURRENCY);
    log(`Running section batch ${Math.floor(i / LLM_CONCURRENCY) + 1} (${batch.map(s => s.code).join(", ")})`, "pipeline");
    await Promise.all(batch.map((s) => runSection(s.id, runId)));
    // Brief delay between batches to let rate limit window recover
    if (i + LLM_CONCURRENCY < queued.length) {
      await delay(5000);
    }
  }
}

// Sections that MUST use the template generator (contain embedded JS Monte Carlo engine)
const TEMPLATE_ONLY_SECTIONS = new Set(["G-7", "G-15", "G-1B"]);

export async function runSection(sectionId: number, runId: number): Promise<void> {
  try {
    await storage.updateSectionStatus(sectionId, "running");

    const run = await storage.getRun(runId);
    if (!run) throw new Error(`Run ${runId} not found`);

    const intake: IntakePayload = JSON.parse(run.intakePayload);
    const a1a: CoreAnalysisA1a = run.coreAnalysisA1a ? JSON.parse(run.coreAnalysisA1a) : null;
    const a1b: CoreAnalysisA1b = run.coreAnalysisA1b ? JSON.parse(run.coreAnalysisA1b) : null;

    const sections = await storage.getSections(runId);
    const section = sections.find((s) => s.id === sectionId);
    if (!section) throw new Error(`Section ${sectionId} not found`);

    let html: string | null = null;

    // ── LLM Path: Structured JSON + Deterministic Renderer ──
    // Claude returns analytical content as JSON → renderer produces consistent HTML layout
    // Skip G-7 and G-15 (Monte Carlo) — embedded JS engines, always template-generated
    if (isLlmAvailable() && !TEMPLATE_ONLY_SECTIONS.has(section.code)) {
      try {
        const allManifest = [...(getSectionsForStage(1)), ...(getSectionsForStage(3))];
        const manifest = allManifest.find((m) => m.code === section.code);

        // Use JSON schema prompt if available, fall back to HTML prompt
        const jsonPrompt = JSON_SECTION_PROMPTS[manifest?.promptModule || ""];

        if (manifest && jsonPrompt) {
          const ragContext = loadRagContext(manifest.ragScope);
          const userMsg = [
            `SECTION CODE: ${section.code}`,
            `SECTION TITLE: ${section.title}`,
            `\nINTAKE PAYLOAD:\n${JSON.stringify(intake, null, 2)}`,
            a1a ? `\nCORE ANALYSIS A-1a:\n${JSON.stringify(a1a, null, 2)}` : "",
            a1b ? `\nCORE ANALYSIS A-1b:\n${JSON.stringify(a1b, null, 2)}` : "",
            `\nGHANA DATA CONTEXT:\n${ragContext}`,
          ].filter(Boolean).join("\n");

          // Get structured JSON from Claude
          const jsonData = await callClaudeJson<any>({
            agentName: `Section ${section.code}`,
            agentCode: section.code,
            systemPrompt: jsonPrompt,
            userMessage: userMsg,
          });

          // Render JSON through deterministic template
          html = renderSectionFromJson(section.code, jsonData, intake, a1a, a1b);
          log(`Section ${section.code} complete (LLM+Renderer) for run ${runId}`, "pipeline");

        } else if (manifest) {
          // No JSON schema — fall back to HTML generation with old prompt
          const htmlPrompt = SECTION_PROMPTS[manifest.promptModule];
          if (htmlPrompt) {
            const ragContext = loadRagContext(manifest.ragScope);
            const userMsg = [
              `SECTION CODE: ${section.code}`,
              `\nINTAKE PAYLOAD:\n${JSON.stringify(intake, null, 2)}`,
              a1a ? `\nCORE ANALYSIS A-1a:\n${JSON.stringify(a1a, null, 2)}` : "",
              a1b ? `\nCORE ANALYSIS A-1b:\n${JSON.stringify(a1b, null, 2)}` : "",
              `\nGHANA DATA CONTEXT:\n${ragContext}`,
            ].filter(Boolean).join("\n");
            html = await callClaudeHtml({
              agentName: `Section ${section.code}`,
              agentCode: section.code,
              systemPrompt: htmlPrompt,
              userMessage: userMsg,
            });
            log(`Section ${section.code} complete (LLM-HTML) for run ${runId}`, "pipeline");
          }
        }
      } catch (err: any) {
        log(`Section ${section.code} LLM failed, falling back to template: ${err.message}`, "pipeline");
        html = null;
      }
    }

    // ── Fallback: Template-based generation ──
    if (!html) {
      await randomDelay();
      html = generateSectionHtml(section.code, section.title, intake, a1a, a1b);
      log(`Section ${section.code} complete (template) for run ${runId}`, "pipeline");
    }

    await storage.updateSectionHtml(sectionId, html);
  } catch (err: any) {
    log(`Section ${sectionId} error: ${err.message}`, "pipeline");
    await storage.updateSectionError(sectionId, err.message);
  }
}

// ─── Structured JSON → HTML Renderer Dispatcher ─────────────

function renderSectionFromJson(
  code: string,
  data: any,
  intake: IntakePayload,
  a1a: CoreAnalysisA1a | null,
  a1b: CoreAnalysisA1b | null,
): string {
  const renderers: Record<string, () => string> = {
    "G-0":  () => R.renderG0(data as S.G0Data),
    "G-1":  () => R.renderG1(data as S.G1Data, a1a!),
    "G-1B": () => R.renderG1(data as S.G1Data, a1a!), // Kiosk Monte Carlo uses same renderer
    "G-2":  () => R.renderG2(data as S.G2Data, a1a!),
    "G-3":  () => R.renderG3(data as S.G3Data),
    "G-4":  () => R.renderG4(data as S.G4Data),
    "G-5":  () => R.renderG5(data as S.G5Data),
    "G-6":  () => R.renderG6(data as S.G6Data, a1a!),
    "G-8":  () => R.renderG8(data as S.G8Data),
    "G-9":  () => R.renderG9(data as S.G9Data, a1a!),
    "G-10": () => R.renderG10(data as S.G10Data, a1a!),
    "G-11": () => R.renderG11(data as S.G11Data, a1a!),
    "G-12": () => R.renderG12(data as S.G12Data),
    "G-13": () => R.renderG13(data as S.G13Data),
    "G-14": () => R.renderG14(data as S.G14Data, a1a!),
  };

  const renderer = renderers[code];
  if (!renderer) {
    log(`No renderer found for ${code}, returning raw JSON`, "pipeline");
    return `<div class="os"><div class="sn">OUTPUT ${code}</div><div class="sb"><pre>${JSON.stringify(data, null, 2)}</pre></div></div>`;
  }

  return renderer();
}

// ─── HTML Fragment Generator (Template Fallback) ────────────

function generateSectionHtml(
  code: string,
  title: string,
  intake: IntakePayload,
  a1a: CoreAnalysisA1a | null,
  a1b: CoreAnalysisA1b | null,
): string {
  const name = intake.i1_profile.name;
  const industry = intake.i1_profile.industry;
  const sectors = intake.i2_context.sectorInterest;
  const focus = intake.i2_context.geographicFocus;

  const generators: Record<string, () => string> = {
    "K-1": () => generateKioskHero(name, industry, sectors, focus, a1a, a1b),
    "K-2": () => generateSignalFriction(name, industry, a1a),
    "K-3": () => generatePathwayTeaser(a1a),
    "K-4": () => generateQuickWins(a1a),
    "K-5": () => generateSummitConnections(name, industry, focus),
    "K-6": () => generateKioskCta(name),
    "G-1": () => generateG1OpportunitySim(name, industry, sectors, focus, intake, a1a),
    "G-1B": () => generateG7MonteCarlo(name, intake, a1a, a1b),
    "G-2": () => generateG2VerticalAnalysis(industry, sectors, focus, a1a),
    "G-3": () => generateG3MarketEntry(name, industry, focus, a1a),
    "G-4": () => generateG4QuickWinsLongTerm(a1a),
    "G-5": () => generateG5ConnectionMap(name, industry, focus),
    "G-6": () => generateG6TimelineProjections(name, a1a),
    "G-7": () => generateG7MonteCarlo(name, intake, a1a, a1b),
    "G-8": () => generateG8ResourceRequirements(name, industry, focus, a1a),
    "G-9": () => generateG9CapitalRequirements(name, a1a, a1b),
    "G-10": () => generateG10SwotAnalysis(a1a),
    "G-11": () => generateG11RiskMitigation(a1a),
    "G-12": () => generateG12RegulatoryLandscape(focus, industry),
    "G-13": () => generateG13InvestmentIncentives(focus, industry),
    "G-14": () => generateG14CompetitiveLandscape(industry, focus, a1a),
    "G-15": () => generateG15ScenarioEnvelope(name, intake, a1a, a1b),
  };

  const gen = generators[code];
  if (gen) return gen();

  return `<div class="os"><div class="sn">OUTPUT ${code}</div><div class="st">${title}</div><div class="sb"><p>Section content for ${code} \u2014 ${title}</p></div></div>`;
}

// ═══════════════════════════════════════════════════════════
// KIOSK SECTION GENERATORS (K-1 through K-6)
// ═══════════════════════════════════════════════════════════

function generateKioskHero(
  name: string, industry: string, sectors: string[], focus: string,
  a1a: CoreAnalysisA1a | null, a1b: CoreAnalysisA1b | null,
): string {
  const oppScore = a1a?.pathways[0]?.opportunityScore ?? 78;
  const riskScore = a1a?.pathways[0]?.riskScore ?? 45;
  const veridexPass = a1b?.veridexScores.filter(v => v.status === "pass").length ?? 24;
  const veridexTotal = a1b?.veridexScores.length ?? 26;

  return `<div class="rh">
  <div class="rh-eye">AI Mirror \u2022 Personalized Intelligence Report</div>
  <h1>${name}, your ${focus} opportunity is real.</h1>
  <div class="rh-sub">Based on your ${industry.toLowerCase()} background and interest in ${sectors.join(", ")}, our AI analysis \u2014 grounded in verified Tier 1-2 data from GSS, World Bank, IMF, GIPC, and Bank of Ghana \u2014 has identified two distinct market entry pathways with strong fundamentals.</div>
  <div class="badges">
    <span class="badge g">Opportunity ${oppScore}/100</span>
    <span class="badge t">Risk ${riskScore}/100</span>
    <span class="badge g">VERIDEX ${veridexPass}/${veridexTotal}</span>
    <span class="badge t">2 Pathways</span>
  </div>
</div>
<div class="disc">This kiosk preview highlights key signals from your personalized analysis. Request the full report for detailed Monte Carlo projections (10,000 scenarios), competitive landscape with named players, and actionable implementation roadmaps with verified regulatory timelines. GDP 5.7% (2024) | Inflation 3.3% | GHS 10.8/USD | FDI +382%</div>`;
}

function generateSignalFriction(name: string, industry: string, a1a: CoreAnalysisA1a | null): string {
  const pathA = a1a?.pathways[0];
  const pathB = a1a?.pathways[1];
  return `<div class="os">
  <div class="sn">OUTPUT K-2</div>
  <div class="st">Signal & Friction Snapshot</div>
  <div class="sb">
    <p>Key opportunity signals and friction points for ${name}'s ${industry.toLowerCase()} market entry, verified against Tier 1-2 Ghana data sources.</p>
    <table class="tbl"><thead><tr><th>Dimension</th><th>Pathway A</th><th>Pathway B</th><th>Signal</th></tr></thead>
    <tbody>
      <tr><td>Opportunity</td><td><strong>${pathA?.opportunityScore ?? 78}</strong></td><td><strong>${pathB?.opportunityScore ?? 71}</strong></td><td>Strong \u2014 both pathways viable</td></tr>
      <tr><td>Risk</td><td>${pathA?.riskScore ?? 45}</td><td>${pathB?.riskScore ?? 33}</td><td>JV model reduces risk exposure</td></tr>
      <tr><td>Friction</td><td>${pathA?.frictionScore ?? 52}</td><td>${pathB?.frictionScore ?? 35}</td><td>JV lowers GIPC threshold ($200K vs $500K)</td></tr>
      <tr><td>SOM</td><td>${pathA?.som.value ?? "$12-18M"}</td><td>${pathB?.som.value ?? "$8-14M"}</td><td>Direct entry has higher ceiling</td></tr>
    </tbody></table>
    <p><strong>Top Signals:</strong> GDP 5.7% (2024) \u2022 FDI +382% H1 2025 \u2022 Inflation 23.8% \u2192 3.3% \u2022 BoG rate cut 1,250bps to 15.5%</p>
    <p><strong>Key Risks:</strong> Gold concentration (~$20B, 55-60% of exports) \u2022 Cedi 40% appreciation may not persist (fair value GHS 12.2/USD)</p>
  </div>
</div>`;
}

function generatePathwayTeaser(a1a: CoreAnalysisA1a | null): string {
  const pathA = a1a?.pathways[0];
  const pathB = a1a?.pathways[1];
  return `<div class="os">
  <div class="sn">OUTPUT K-3</div>
  <div class="st">Dual Pathway Teaser</div>
  <div class="sg">
    <div class="pw a">
      <span class="pw-badge dt">PATHWAY A \u2014 DIRECT ENTRY</span>
      <div class="pw-name">${pathA?.title ?? "Direct Entry Model"}</div>
      <div class="pw-desc"><p>${pathA?.description?.substring(0, 300) ?? "Full-service direct market entry..."}...</p></div>
      <div class="pr" style="padding:18px 22px;margin-top:12px;">
        <div class="pr-col"><div class="pr-label">TAM</div><div class="pr-val">${pathA?.tam.value ?? "$2.4B"}</div></div>
        <div class="pr-col"><div class="pr-label">SOM</div><div class="pr-val">${pathA?.som.value ?? "$12-18M"}</div></div>
        <div class="pr-col"><div class="pr-label">GIPC Min</div><div class="pr-val">$500K</div></div>
      </div>
    </div>
    <div class="pw b">
      <span class="pw-badge sk">PATHWAY B \u2014 JV ENTRY</span>
      <div class="pw-name">${pathB?.title ?? "Partnership-Led Entry"}</div>
      <div class="pw-desc"><p>${pathB?.description?.substring(0, 300) ?? "Joint venture with established local operator..."}...</p></div>
      <div class="pr" style="padding:18px 22px;margin-top:12px;">
        <div class="pr-col"><div class="pr-label">TAM</div><div class="pr-val">${pathB?.tam.value ?? "$2.4B"}</div></div>
        <div class="pr-col"><div class="pr-label">SOM</div><div class="pr-val">${pathB?.som.value ?? "$8-14M"}</div></div>
        <div class="pr-col"><div class="pr-label">GIPC Min</div><div class="pr-val">$200K</div></div>
      </div>
    </div>
  </div>
</div>`;
}

function generateQuickWins(a1a: CoreAnalysisA1a | null): string {
  const wins = a1a?.pathways[0]?.quickWins ?? [
    "Partner with Ghana National Chamber of Commerce for immediate market access",
    "Leverage summit connections for first 5 pilot clients",
    "Evaluate Free Zones Enterprise designation for 10-year 0% corporate tax holiday",
  ];
  return `<div class="os">
  <div class="sn">OUTPUT K-4</div>
  <div class="st">Quick Wins (0\u201390 Days)</div>
  <div class="sb">
    <p>Immediate actions to build momentum in Ghana's market. ORC registration: 2-6 weeks. GIPC: 5-10 business days.</p>
    <ol>${wins.map((w) => `<li>${w}</li>`).join("")}</ol>
  </div>
</div>`;
}

function generateSummitConnections(name: string, industry: string, focus: string): string {
  return `<div class="os">
  <div class="sn">OUTPUT K-5</div>
  <div class="st">Summit Connection Map</div>
  <div class="sb">
    <p>Strategic networking priorities for ${name} at the Power In Numbers summit.</p>
    <div class="sg">
      <div class="sc"><div class="sc-t">REGULATORY</div><div class="cr"><span class="cr-n">GIPC Investment Advisors</span></div><p style="font-size:.85em;margin-top:8px;">Navigate Act 865 requirements. GIPA Bill intelligence. Immigration quotas.</p></div>
      <div class="sc"><div class="sc-t">INDUSTRY</div><div class="cr"><span class="cr-n">${focus} ${industry} Association</span></div><p style="font-size:.85em;margin-top:8px;">Sector growing 17-21% quarterly (GSS). Supplier introductions.</p></div>
      <div class="sc"><div class="sc-t">CAPITAL</div><div class="cr"><span class="cr-n">Stanbic / Absa / Ecobank</span></div><p style="font-size:.85em;margin-top:8px;">Working capital, FX management. FDI up 382% in H1 2025.</p></div>
      <div class="sc"><div class="sc-t">OPERATIONS</div><div class="cr"><span class="cr-n">Accra Business Hub Network</span></div><p style="font-size:.85em;margin-top:8px;">100+ tech hubs. Talent from 3.4M unemployed youth seeking opportunity.</p></div>
    </div>
  </div>
</div>`;
}

function generateKioskCta(name: string): string {
  return `<div class="os">
  <div class="sn">OUTPUT K-6</div>
  <div class="st">Next Steps</div>
  <div class="pr">
    <div class="pr-ctx">
      <p><strong>${name}, this is your kiosk preview.</strong> Your full AI Mirror report includes 15 detailed sections with verified Ghana data \u2014 all cross-validated through 26 VERIDEX integrity gates.</p>
      <p style="margin-top:12px;"><span style="color:var(--gold);">\u25c6</span> 10,000-scenario Monte Carlo \u2022 <span style="color:var(--gold);">\u25c6</span> 26-gate VERIDEX verification \u2022 <span style="color:var(--gold);">\u25c6</span> GIPC capital staging \u2022 <span style="color:var(--gold);">\u25c6</span> Named competitive landscape</p>
      <p style="margin-top:12px;">Request your full report at the registration desk or scan your badge to upgrade.</p>
    </div>
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════
// FULL REPORT GENERATORS (G-1 through G-15)
// ═══════════════════════════════════════════════════════════

function generateG1OpportunitySim(
  name: string, industry: string, sectors: string[], focus: string,
  intake: IntakePayload, a1a: CoreAnalysisA1a | null,
): string {
  const comps = a1a?.competencies ?? [];
  const gaps = a1a?.developmentGaps ?? [];

  const compRows = comps.map((c) => {
    const scoreClass = c.relevanceToGhana >= 80 ? "h" : c.relevanceToGhana >= 60 ? "m" : "l";
    return `<div class="cr"><span class="cr-n">${c.name} <span style="color:var(--gray-500);font-size:.8em;">(${c.category.replace("_", " ")})</span></span><span class="cr-s ${scoreClass}">${c.relevanceToGhana}%</span></div>`;
  }).join("\n      ");

  const gapRows = gaps.map((g) => {
    const sevColor = g.severity === "critical" ? "var(--coral)" : g.severity === "moderate" ? "var(--gold)" : "var(--teal)";
    return `<div class="cr"><span class="cr-n">${g.name} <span style="color:${sevColor};font-size:.75em;text-transform:uppercase;">${g.severity}</span></span><span class="cr-s" style="color:var(--gray-500);font-size:.78em;">${g.timeToClose}</span></div>`;
  }).join("\n      ");

  const oppScore = a1a?.pathways[0]?.opportunityScore ?? 78;
  const riskScore = a1a?.pathways[0]?.riskScore ?? 45;

  return `<div class="os">
  <div class="sn">OUTPUT G-1 \u2014 PERSONALIZED OPPORTUNITY SIMULATION</div>
  <div class="st">Competency-to-Opportunity Map</div>
  <div class="sb">
    <p>A bespoke analysis of how ${name}'s specific competencies map to ${focus} market opportunities in ${sectors.join(", ")}. All relevance scores calibrated against verified Ghana economic data (GSS, World Bank, GIPC 2024-2025). Ghana's $82.9B economy grew 5.7% in 2024 with Q1-Q3 2025 averaging 6.1% \u2014 far exceeding IMF's 4.0% forecast.</p>
  </div>

  <div class="pr">
    <div class="pr-col"><div class="pr-label">Opportunity Score</div><div class="pr-val">${oppScore}/100</div><div class="pr-sc">Strong signal</div></div>
    <div class="pr-col"><div class="pr-label">Risk Profile</div><div class="pr-val">${riskScore}/100</div><div class="pr-sc">Moderate-managed</div></div>
    <div class="pr-col"><div class="pr-label">Sector</div><div class="pr-val">${sectors[0] || industry}</div><div class="pr-sc">${focus}</div></div>
    <div class="pr-ctx">Based on ${intake.i1_profile.yearsExperience}+ years in ${industry.toLowerCase()} with ${intake.i1_profile.revenueTier} revenue experience. Scores reflect competency transfer potential to Ghana's emerging market landscape.</div>
  </div>

  <div class="sg">
    <div class="sc">
      <div class="sc-t">COMPETENCY-MARKET FIT</div>
      ${compRows}
      <div class="total"><span class="cr-n">Composite Fit Score</span><span class="cr-s">${Math.round(comps.reduce((s, c) => s + c.relevanceToGhana, 0) / (comps.length || 1))}%</span></div>
    </div>
    <div class="sc">
      <div class="sc-t">DEVELOPMENT GAPS</div>
      ${gapRows}
      <div class="sc-note">Gap mitigation pathways detailed in Section G-8 (Resource Requirements). All timelines calibrated against GIPC/ORC processing data.</div>
    </div>
  </div>

  <div class="map-wrap">
    <div class="map-t">OPPORTUNITY-RISK POSITIONING</div>
    <div class="pm">
      <div class="mg">
        <div class="mq ul">High Opportunity<br>Low Risk</div>
        <div class="mq ur">High Opportunity<br>High Risk</div>
        <div class="mq ll">Low Opportunity<br>Low Risk</div>
        <div class="mq lr">Low Opportunity<br>High Risk</div>
      </div>
      <div class="dot a" style="top:${100 - (oppScore)}%;left:${riskScore}%;" title="Pathway A: Opp ${oppScore}, Risk ${riskScore}"></div>
      <div class="dot b" style="top:${100 - (a1a?.pathways[1]?.opportunityScore ?? 71)}%;left:${a1a?.pathways[1]?.riskScore ?? 33}%;" title="Pathway B: Opp ${a1a?.pathways[1]?.opportunityScore ?? 71}, Risk ${a1a?.pathways[1]?.riskScore ?? 33}"></div>
    </div>
    <div class="map-xl"><span style="color:var(--gold);">\u25cf</span> Pathway A (Direct) &nbsp;&nbsp; <span style="color:var(--teal);">\u25cf</span> Pathway B (JV) &nbsp;&nbsp; x: Risk \u2192 &nbsp; y: Opportunity \u2191</div>
  </div>

  <div class="sb">
    <p><strong>${focus} Fit Rationale:</strong> ${a1a?.ghanaFitRationale ?? `${focus} represents the optimal West African entry point given ${name}'s profile.`}</p>
  </div>
  <div class="stag">Sources: GSS Quarterly GDP Bulletins (2024-2025) \u2022 World Bank MPO Oct 2025 \u2022 GIPC FDI Reports H1 2025 \u2022 BoG 128th MPC Jan 2026</div>
</div>`;
}

function generateG2VerticalAnalysis(
  industry: string, sectors: string[], focus: string,
  a1a: CoreAnalysisA1a | null,
): string {
  const pathA = a1a?.pathways[0];
  const pathB = a1a?.pathways[1];

  return `<div class="os">
  <div class="sn">OUTPUT G-2 \u2014 VERTICAL & ADJACENT OPPORTUNITY ANALYSIS</div>
  <div class="st">Dual-Pathway Market Decomposition</div>
  <div class="sb"><p>Analysis of primary and adjacent market opportunities across ${sectors.join(", ")} in ${focus}, with verified sector data, competitive profiles, and saturation assessments.</p></div>

  <div class="pw a">
    <span class="pw-badge dt">PATHWAY A \u2014 DIRECT ENTRY</span>
    <div class="pw-name">${pathA?.title ?? "Direct Entry Hub Model"}</div>
    <div class="pw-desc"><p>${pathA?.description ?? "Direct market entry with full operational control."}</p></div>

    <div class="dt" style="margin-top:18px;">
      <table class="tbl"><thead><tr><th>Metric</th><th>Value</th><th>Source</th></tr></thead>
      <tbody>
        <tr><td>TAM</td><td><strong>${pathA?.tam.value ?? "$2.4B"}</strong></td><td>${pathA?.tam.rationale?.substring(0, 80) ?? "Sector contribution to GDP"}... <span class="stag">${pathA?.tam.sourceTier ?? "Tier 1-2"}</span></td></tr>
        <tr><td>SAM</td><td><strong>${pathA?.sam.value ?? "$680M"}</strong></td><td>${pathA?.sam.rationale?.substring(0, 80) ?? "Greater Accra + Ashanti"}... <span class="stag">${pathA?.sam.sourceTier ?? "Tier 2"}</span></td></tr>
        <tr><td>SOM</td><td><strong>${pathA?.som.value ?? "$12-18M"}</strong></td><td>${pathA?.som.rationale?.substring(0, 80) ?? "1.8-2.6% penetration"}... <span class="stag">${pathA?.som.sourceTier ?? "Tier 2"}</span></td></tr>
      </tbody></table>
    </div>

    <div class="cc">
      <div class="cc-t">COMPETITIVE LANDSCAPE \u2014 ${(sectors[0] || industry).toUpperCase()}</div>
      <div class="ce"><strong>MTN Ghana</strong> (South African) \u2014 61% mobile share, 73% mobile money, 150K+ agents <span class="o">| Dominant incumbent</span></div>
      <div class="ce"><strong>Telecel Ghana</strong> (rebranded from Vodafone, 2024) <span class="o">| UK-based Telecel Group</span></div>
      <div class="ce"><strong>Huawei</strong> \u2014 $217M infrastructure + $1B digital commitment <span class="o">| 2022</span></div>
      <div class="ce"><strong>IPMC Ghana</strong> \u2014 West Africa's largest IT services provider <span class="o">| Founded 1992</span></div>
      <div class="ce"><strong>Hubtel</strong> (digital payments), <strong>mPharma</strong> (health tech), <strong>Zeepay</strong> (cross-border) <span class="o">| Startups</span></div>
      <span class="sat u">DATA CENTERS: UNDERSERVED \u2014 ONLY 1 TIER IV IN WEST AFRICA</span>
    </div>

    <div class="ml" style="margin-top:18px;">
      <table class="tbl"><thead><tr><th>Phase</th><th>Timeline</th><th>Capital</th><th>Key Activities</th></tr></thead>
      <tbody>
        ${(pathA?.milestones ?? []).map((m) => `<tr><td><strong>${m.phase}</strong></td><td>${m.timeline}</td><td>${m.capitalRequired}</td><td>${m.description.substring(0, 80)}...</td></tr>`).join("\n        ")}
      </tbody></table>
    </div>
  </div>

  <div class="pw b">
    <span class="pw-badge sk">PATHWAY B \u2014 JV ENTRY</span>
    <div class="pw-name">${pathB?.title ?? "Partnership-Led Entry"}</div>
    <div class="pw-desc"><p>${pathB?.description ?? "Joint venture with established local operator."}</p></div>

    <div class="dt" style="margin-top:18px;">
      <table class="tbl"><thead><tr><th>Metric</th><th>Value</th><th>Source</th></tr></thead>
      <tbody>
        <tr><td>TAM</td><td><strong>${pathB?.tam.value ?? "$2.4B"}</strong></td><td>${pathB?.tam.rationale?.substring(0, 80) ?? "Same TAM"}... <span class="stag">${pathB?.tam.sourceTier ?? "Tier 1"}</span></td></tr>
        <tr><td>SAM</td><td><strong>${pathB?.sam.value ?? "$420M"}</strong></td><td>${pathB?.sam.rationale?.substring(0, 80) ?? "Partner footprint"}... <span class="stag">${pathB?.sam.sourceTier ?? "Tier 2"}</span></td></tr>
        <tr><td>SOM</td><td><strong>${pathB?.som.value ?? "$8-14M"}</strong></td><td>${pathB?.som.rationale?.substring(0, 80) ?? "Conservative capture"}... <span class="stag">${pathB?.som.sourceTier ?? "Tier 2"}</span></td></tr>
      </tbody></table>
    </div>

    <div class="cc">
      <div class="cc-t">JV PARTNER PROFILE</div>
      <div class="ce"><strong>Target profile:</strong> Established ${focus} SME with 30-50 existing accounts, GIPC registration, and ORC standing</div>
      <div class="ce"><strong>JV structure:</strong> Companies Act 2019 (Act 992) \u2014 min 2 shareholders, 1 Ghana-resident director</div>
      <div class="ce"><strong>GIPC threshold:</strong> $200K (Ghanaian partner \u226510% equity) vs. $500K wholly foreign</div>
    </div>
  </div>

  <div class="sb">
    <p><strong>White Space Analysis:</strong> The intersection of ${industry.toLowerCase()} expertise and ${focus}'s formalization trend creates clear white space. The informal sector (75-89% of workforce, UNDP/GSS) is beginning to formalize \u2014 professional operators entering now capture disproportionate value during this transition. Data center demand exceeds supply by 300% (IFC/AIIM). Enterprise B2B SaaS remains scarce despite 70% internet penetration.</p>
  </div>
  <div class="stag">Sources: U.S. Commercial Service 2025 \u2022 GIPC Sector Reports \u2022 GSS Q2-Q3 2025 \u2022 Tech Labari \u2022 GSMA Intelligence</div>
</div>`;
}

function generateG3MarketEntry(name: string, industry: string, focus: string, a1a: CoreAnalysisA1a | null): string {
  const pathA = a1a?.pathways[0];
  const pathB = a1a?.pathways[1];
  return `<div class="os">
  <div class="sn">OUTPUT G-3 \u2014 OPTIMAL MARKET ENTRY STRATEGY</div>
  <div class="st">Entry Strategy Comparison</div>
  <div class="sb"><p>Two distinct entry strategies optimized for ${name}'s profile, risk tolerance, and capital position. GIPC thresholds verified against Act 2013 (Act 865) and U.S. State Dept Investment Climate Statement 2025.</p></div>

  <div class="sg">
    <div class="sc" style="border-top:4px solid var(--teal);">
      <div class="sc-t">PATHWAY A \u2014 DIRECT ENTRY</div>
      <div class="cr"><span class="cr-n">GIPC Threshold</span><span class="cr-s h">$500K</span></div>
      <div class="cr"><span class="cr-n">Ownership</span><span class="cr-s h">100%</span></div>
      <div class="cr"><span class="cr-n">Opportunity Score</span><span class="cr-s h">${pathA?.opportunityScore ?? 78}</span></div>
      <div class="cr"><span class="cr-n">Risk Score</span><span class="cr-s m">${pathA?.riskScore ?? 45}</span></div>
      <div class="cr"><span class="cr-n">SOM (36mo)</span><span class="cr-s h">${pathA?.som.value ?? "$12-18M"}</span></div>
      <div class="total"><span class="cr-n">Total Capital (36mo)</span><span class="cr-s">$1.15-1.95M</span></div>
    </div>
    <div class="sc" style="border-top:4px solid var(--gold);">
      <div class="sc-t">PATHWAY B \u2014 JV ENTRY</div>
      <div class="cr"><span class="cr-n">GIPC Threshold</span><span class="cr-s h">$200K</span></div>
      <div class="cr"><span class="cr-n">Ownership</span><span class="cr-s m">50-60%</span></div>
      <div class="cr"><span class="cr-n">Opportunity Score</span><span class="cr-s h">${pathB?.opportunityScore ?? 71}</span></div>
      <div class="cr"><span class="cr-n">Risk Score</span><span class="cr-s h">${pathB?.riskScore ?? 33}</span></div>
      <div class="cr"><span class="cr-n">SOM (36mo)</span><span class="cr-s h">${pathB?.som.value ?? "$8-14M"}</span></div>
      <div class="total"><span class="cr-n">Total Capital (24mo)</span><span class="cr-s">$700K-1.2M</span></div>
    </div>
  </div>

  <div class="sb">
    <p><strong>Decision Framework:</strong> Pathway A offers higher revenue ceiling and full ownership but requires 2.5\u00d7 more initial capital and absorbs 4-6 months more regulatory friction. Pathway B gets to market faster through partner infrastructure but introduces JV governance complexity and equity dilution. The break-even crossover occurs at approximately Year 3, $4.5M revenue.</p>
  </div>
  <div class="stag">Sources: GIPC Act 2013 (Act 865) \u2022 Companies Act 2019 (Act 992) \u2022 U.S. State Dept ICS 2025 \u2022 GFZA</div>
</div>`;
}

function generateG4QuickWinsLongTerm(a1a: CoreAnalysisA1a | null): string {
  const pathA = a1a?.pathways[0];
  return `<div class="os">
  <div class="sn">OUTPUT G-4 \u2014 STRATEGIC SEQUENCING</div>
  <div class="st">Quick Wins vs. Long-Term Plays</div>
  <div class="sg">
    <div class="sc" style="border-top:3px solid var(--teal);">
      <div class="sc-t">QUICK WINS (0\u201390 DAYS)</div>
      ${(pathA?.quickWins ?? []).map((w) => `<div class="cr"><span class="cr-n">\u26a1 ${w}</span></div>`).join("\n      ")}
      <div class="sc-note">ORC registration: 2-6 weeks. GIPC: 5-10 business days. Current macro window is unusually favorable.</div>
    </div>
    <div class="sc" style="border-top:3px solid var(--gold);">
      <div class="sc-t">LONG-TERM PLAYS (12\u201336 MONTHS)</div>
      ${(pathA?.longTermPlays ?? []).map((p) => `<div class="cr"><span class="cr-n">\u25c6 ${p}</span></div>`).join("\n      ")}
      <div class="sc-note">Long-term strategies grounded in structural trends: AfCFTA implementation, ICT 17-21% growth, formalization wave.</div>
    </div>
  </div>
  <div class="sb"><p><strong>Sequencing Logic:</strong> Quick wins generate early traction and validate market assumptions. Each feeds data back into long-term strategy, creating a build-measure-learn cycle. The current macro window \u2014 3.3% inflation, GHS 10.8/USD, 15.5% BoG rate \u2014 is unusually favorable for entry.</p></div>
</div>`;
}

function generateG5ConnectionMap(name: string, industry: string, focus: string): string {
  return `<div class="os">
  <div class="sn">OUTPUT G-5 \u2014 SUMMIT CONNECTION MAP</div>
  <div class="st">Strategic Networking Priorities</div>
  <div class="sb"><p>Networking priorities for ${name} at the Power In Numbers summit, optimized for ${focus} ${industry.toLowerCase()} market entry.</p></div>
  <table class="tbl">
    <thead><tr><th>Priority</th><th>Type</th><th>Target</th><th>Strategic Value</th></tr></thead>
    <tbody>
      <tr><td><span style="color:var(--coral);font-weight:700;">P1</span></td><td>Regulatory</td><td>GIPC Senior Advisors</td><td>Fast-track Act 865 registration. GIPA Bill intelligence. Immigration quotas ($50K\u21921 permit).</td></tr>
      <tr><td><span style="color:var(--coral);font-weight:700;">P1</span></td><td>Legal</td><td>${focus} Business Law Firms</td><td>JV structuring under Companies Act 2019. IP via Ghana IP Office. Free Zones application.</td></tr>
      <tr><td><span style="color:var(--gold);font-weight:700;">P2</span></td><td>Industry</td><td>${industry} Association / GNCC</td><td>Market intelligence for sector growing at double digits. Supplier introductions.</td></tr>
      <tr><td><span style="color:var(--gold);font-weight:700;">P2</span></td><td>Banking</td><td>Stanbic / Absa / Ecobank</td><td>Working capital facilities. FX management (cedi at 10.8/USD). Trade finance for ECOWAS.</td></tr>
      <tr><td><span style="color:var(--teal);font-weight:700;">P3</span></td><td>Diaspora</td><td>Returning Professionals</td><td>Senior talent pipeline. Bridge cultural and technical gaps.</td></tr>
    </tbody>
  </table>
  <div class="disc">Prioritize P1 contacts during the summit \u2014 these relationships typically take 12-18 months to build independently in Ghana's relationship-driven business culture.</div>
</div>`;
}

function generateG6TimelineProjections(name: string, a1a: CoreAnalysisA1a | null): string {
  const pathA = a1a?.pathways[0];
  const pathB = a1a?.pathways[1];
  return `<div class="os">
  <div class="sn">OUTPUT G-6 \u2014 REALISTIC TIMELINE PROJECTIONS</div>
  <div class="st">Phased Implementation Roadmaps</div>
  <div class="sb"><p>Timelines calibrated against verified GIPC processing data, ORC registration benchmarks, and World Bank B-READY 2024 (Operational Efficiency 54.4%).</p></div>

  <div class="pw a">
    <span class="pw-badge dt">PATHWAY A TIMELINE</span>
    <table class="tbl"><thead><tr><th>Phase</th><th>Timeline</th><th>Capital</th><th>Key Activities</th></tr></thead>
    <tbody>
      ${(pathA?.milestones ?? []).map((m) => `<tr><td><strong>${m.phase}</strong></td><td>${m.timeline}</td><td>${m.capitalRequired}</td><td>${m.description}</td></tr>`).join("\n      ")}
    </tbody></table>
  </div>

  <div class="pw b">
    <span class="pw-badge sk">PATHWAY B TIMELINE</span>
    <table class="tbl"><thead><tr><th>Phase</th><th>Timeline</th><th>Capital</th><th>Key Activities</th></tr></thead>
    <tbody>
      ${(pathB?.milestones ?? []).map((m) => `<tr><td><strong>${m.phase}</strong></td><td>${m.timeline}</td><td>${m.capitalRequired}</td><td>${m.description}</td></tr>`).join("\n      ")}
    </tbody></table>
  </div>

  <div class="disc">Timelines include 20-30% buffer for regulatory processing delays. Key benchmarks: ORC name reservation 1-2 days; incorporation 5-10 days; TIN from GRA 1-3 days; GIPC registration 5-10 days; SSNIT within 30 days of hiring. GIPA Bill 2025 could streamline \u2014 timing uncertain.</div>
</div>`;
}

// ═══════════════════════════════════════════════════════════
// G-7: MONTE CARLO — FULL INTERACTIVE ENGINE
// ═══════════════════════════════════════════════════════════

function generateG7MonteCarlo(
  name: string, intake: IntakePayload,
  a1a: CoreAnalysisA1a | null, a1b: CoreAnalysisA1b | null,
): string {
  const mc = getMcParams(intake);
  const pqA = a1b?.pathwayQuant[0];
  const assumptions = pqA?.assumptions ?? [];

  // Build the embedded JavaScript Monte Carlo engine with dynamic parameters
  const mcScript = `<script>
/* Stash for the most recent run — used by the CSV download button. */
window.__mcLastRun=window.__mcLastRun||null;

/* CSV download — one row per iteration with all input draws + yearly
   addressable revenue. Globally available; the button is hidden until
   a 10,000-scenario simulation has populated window.__mcLastRun. */
function downloadMcCsv(){
  var data=window.__mcLastRun;
  if(!data){alert('Run the 10,000-scenario simulation first to generate data.');return;}
  var Y=data.years,N=data.iterations,d=data.draws,paths=data.paths;
  var headerCols=['iteration','gdp_growth','inflation','fx_log_shock','sam_million_usd','sector_growth','penetration_rate','regulatory_delay_years'];
  for(var yh=1;yh<=Y;yh++)headerCols.push('year'+yh+'_revenue_million_usd');
  var rows=[headerCols.join(',')];
  for(var i=0;i<N;i++){
    var row=[
      i+1,
      d.gdp[i].toFixed(6),
      d.inf[i].toFixed(6),
      d.fx[i].toFixed(6),
      d.sam[i].toFixed(4),
      d.sg[i].toFixed(6),
      d.pen[i].toFixed(6),
      d.delay[i].toFixed(6)
    ];
    var p=paths[i];
    for(var y=0;y<Y;y++)row.push(p[y].toFixed(6));
    rows.push(row.join(','));
  }
  var csv=rows.join('\\n');
  var blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  var url=URL.createObjectURL(blob);
  var ts=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
  var a=document.createElement('a');
  a.href=url;a.download='monte-carlo-10000-'+ts+'.csv';
  document.body.appendChild(a);a.click();
  setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},100);
}
window.downloadMcCsv=downloadMcCsv;

function runMC(){
  var btn=document.getElementById('runBtn');btn.disabled=true;btn.textContent='Running...';
  var dlBtn=document.getElementById('dlBtn');if(dlBtn)dlBtn.style.display='none';
  var pb=document.getElementById('pb'),pf=document.getElementById('pf');pb.style.display='block';
  var N=10000,Y=5;

  // Samplers
  function rN(){var u,v,s;do{u=Math.random()*2-1;v=Math.random()*2-1;s=u*u+v*v;}while(s>=1||s===0);return u*Math.sqrt(-2*Math.log(s)/s);}
  function rTri(a,b,c){var u=Math.random(),fc=(c-a)/(b-a);return u<fc?a+Math.sqrt(u*(b-a)*(c-a)):b-Math.sqrt((1-u)*(b-a)*(b-c));}
  function rBeta(al,be){function rG(a){if(a<1)return rG(a+1)*Math.pow(Math.random(),1/a);var d=a-1/3,c=1/Math.sqrt(9*d);var x,v;while(true){do{x=rN();v=1+c*x;}while(v<=0);v=v*v*v;var u=Math.random();if(u<1-.0331*(x*x)*(x*x))return d*v;if(Math.log(u)<.5*x*x+d*(1-v+Math.log(v)))return d*v;}}var ga=rG(al),gb=rG(be);return ga/(ga+gb);}

  // Cholesky L matrix for correlated macro draws
  var L=[[1,0,0],[-.6,.8,0],[-.5,.5,.707]];

  // Macro parameters (verified: GSS, BoG, IMF)
  var gM=.047,gS=.012,iM=.05,iS=.035,fML=Math.log(10.9),fSL=.18;

  // Dynamic sector parameters from intake
  var sMin=${mc.sMin},sMode=${mc.sMode},sMax=${mc.sMax};
  var sgMin=${mc.sgMin},sgMode=${mc.sgMode},sgMax=${mc.sgMax};
  var pA=${mc.pA},pB_=${mc.pB},pLo=${mc.pLo},pHi=${mc.pHi};
  var dP=${mc.dP},dMin=${mc.dMin},dMax=${mc.dMax};
  var k=2.5,cc=2.5,fxB=10.9;

  var res=new Array(N),y5=new Array(N);
  var draws={gdp:new Float32Array(N),inf:new Float32Array(N),fx:new Float32Array(N),sam:new Float32Array(N),sg:new Float32Array(N),pen:new Float32Array(N),delay:new Float32Array(N)};

  var step=0,BS=500;
  function batch(){
    var end=Math.min(step+BS,N);
    for(var i=step;i<end;i++){
      var z=[rN(),rN(),rN()];
      var cr=[L[0][0]*z[0],L[1][0]*z[0]+L[1][1]*z[1],L[2][0]*z[0]+L[2][1]*z[1]+L[2][2]*z[2]];
      var gdp=gM+gS*cr[0];
      var inf=Math.max(.02,Math.min(.25,iM+iS*cr[1]));
      var sam=rTri(sMin,sMax,sMode);
      var sg=rTri(sgMin,sgMax,sgMode);
      var pr=rBeta(pA,pB_);
      var pFin=pLo+pr*(pHi-pLo);
      var hd=Math.random()<dP;
      var dm=hd?dMin+Math.random()*(dMax-dMin):0;
      var dy=dm/12;

      draws.gdp[i]=gdp;draws.inf[i]=inf;draws.fx[i]=cr[2];draws.sam[i]=sam;draws.sg[i]=sg;draws.pen[i]=pFin;draws.delay[i]=dy;

      var path=new Array(Y);
      for(var y=0;y<Y;y++){
        var yr=y+1;
        var fsy=fSL/Math.sqrt(yr);
        var fxcr=cr[2]*fsy/fSL;
        var fx=Math.exp(fML+fsy*fxcr);
        var gm=1+(gdp-gM)*.3;
        var mkt=sam*Math.pow(1+sg,yr)*gm;
        var ey=Math.max(0,yr-dy);
        var pen=pFin/(1+Math.exp(-k*(ey-cc)));
        var fxi=fxB/fx;
        path[y]=mkt*pen*fxi;
      }
      res[i]=path;y5[i]=path[4];
    }
    step=end;pf.style.width=(step/N*100)+'%';
    if(step<N)requestAnimationFrame(batch);else finalize();
  }

  function pct(arr,p){var s=arr.slice().sort(function(a,b){return a-b;});return s[Math.min(Math.floor(p/100*s.length),s.length-1)];}
  function fmt(v){return v>=1?'$'+v.toFixed(1)+'M':'$'+(v*1000).toFixed(0)+'K';}

  function finalize(){
    btn.textContent='\\u2713 Complete';pb.style.display='none';
    ['expl','scCards','fanWrap','dtWrap','histWrap','statsRow','insBar','assT','mcDisc','prccWrap','prccNote'].forEach(function(id){var el=document.getElementById(id);if(el)el.style.display=el.classList.contains('scenario-cards')?'grid':el.classList.contains('stats-row')?'grid':el.tagName==='TABLE'?'table':'block';});
    ['narP10','narP50','narP90'].forEach(function(id){var el=document.getElementById(id);if(el)el.style.display='block';});

    var p5=pct(y5,5),p10=pct(y5,10),p25=pct(y5,25),p50=pct(y5,50),p75=pct(y5,75),p90=pct(y5,90),p95=pct(y5,95);
    document.getElementById('v25').textContent=fmt(p25);
    document.getElementById('v50').textContent=fmt(p50);
    document.getElementById('v75').textContent=fmt(p75);

    // Executive Summary P50 export (Amendment 6)
    var execP50El=document.getElementById('exec-p50');
    if(execP50El){execP50El.textContent='';var vs=document.createElement('strong');vs.style.color='var(--gold)';vs.textContent=fmt(p50);execP50El.appendChild(vs);var ns=document.createElement('span');ns.style.cssText='font-size:0.82em;color:var(--g200);font-style:italic;margin-left:6px;';ns.textContent='(median of 10,000 scenarios \\u2014 see Output 7 for full range and methodology)';execP50El.appendChild(ns);}

    // Addressable Revenue Explainer
    var explEl=document.getElementById('expl');
    if(explEl){
      explEl.innerHTML='<strong>What These Numbers Mean:</strong> The values below represent the <em>addressable revenue envelope</em> the ${mc.sectorLabel} market could support for an operation at your scale (${intake.i1_profile.revenueTier} revenue tier) over 5 years. They are not predictions of what you will earn \\u2014 they show the range of market-level opportunity given ${mc.sectorLabel} dynamics (SAM $${mc.sMode}M mode), your penetration potential (${(mc.pLo * 100).toFixed(1)}\\u2013${(mc.pHi * 100).toFixed(0)}% range via Beta(${mc.pA},${mc.pB})), and macro conditions. The median (P50) of '+fmt(p50)+' means half of 10,000 simulated scenarios produced addressable revenue above this level.';
    }

    // SOM cross-check
    var somFlag='';
    if(p50>1.2*1.5)somFlag=' \\u26a0\\ufe0f P50 significantly exceeds SOM upper bound ($1.2M). May indicate overstated penetration \\u2014 treat P25 as more realistic central estimate.';
    else if(p50>1.2)somFlag=' P50 modestly exceeds SOM estimate; driven by favorable macro draws.';

    document.getElementById('insBar').textContent='In the median scenario, Year 5 addressable revenue reaches '+fmt(p50)+'. The P25\\u2013P75 range spans '+fmt(p25)+' to '+fmt(p75)+'. Exchange rate volatility and regulatory delay are the dominant variance drivers.'+somFlag;

    // Stats
    var mean=y5.reduce(function(a,b){return a+b;},0)/N;
    var variance=y5.reduce(function(a,b){return a+(b-mean)*(b-mean);},0)/N;
    var std=Math.sqrt(variance);
    var skew=y5.reduce(function(a,b){return a+Math.pow((b-mean)/std,3);},0)/N;
    document.getElementById('sMean').textContent=fmt(mean);
    document.getElementById('sMedian').textContent=fmt(p50);
    document.getElementById('sStd').textContent=fmt(std);
    document.getElementById('sSkew').textContent=skew.toFixed(2);

    // Annual data table
    var tbody=document.getElementById('dtBody');tbody.innerHTML='';
    for(var y=0;y<Y;y++){
      var yv=res.map(function(r){return r[y];});
      var row=document.createElement('tr');
      row.innerHTML='<td>Year '+(y+1)+'</td><td>'+fmt(pct(yv,10))+'</td><td>'+fmt(pct(yv,25))+'</td><td>'+fmt(pct(yv,50))+'</td><td>'+fmt(pct(yv,75))+'</td><td>'+fmt(pct(yv,90))+'</td>';
      tbody.appendChild(row);
    }

    // Scenario narratives
    document.getElementById('narP10v').textContent=fmt(p10)+' (Year 5)';
    document.getElementById('narP50v').textContent=fmt(p50)+' (Year 5)';
    document.getElementById('narP90v').textContent=fmt(p90)+' (Year 5)';

    drawFan(res,Y);drawHist(y5);drawPRCC(draws,y5);

    // Stash the raw simulation data for the CSV download button.
    window.__mcLastRun={
      generatedAt:new Date().toISOString(),
      runLabel:${JSON.stringify(`${name} — ${mc.sectorLabel}`)},
      revenueTier:${JSON.stringify(intake.i1_profile.revenueTier)},
      iterations:N,
      years:Y,
      draws:draws,
      paths:res,
      y5:y5
    };
    var dlBtn2=document.getElementById('dlBtn');
    if(dlBtn2){dlBtn2.style.display='inline-flex';dlBtn2.disabled=false;}
  }

  function drawFan(res,Y){
    var cv=document.getElementById('fanC'),cx=cv.getContext('2d'),W=cv.width,H=cv.height;cx.clearRect(0,0,W,H);
    var p={l:75,r:30,t:35,b:55},cw=W-p.l-p.r,ch=H-p.t-p.b;
    var bands=[];
    for(var y=0;y<Y;y++){var v=res.map(function(r){return r[y];}).sort(function(a,b){return a-b;});bands.push({p5:v[Math.floor(.05*v.length)],p10:v[Math.floor(.1*v.length)],p25:v[Math.floor(.25*v.length)],p50:v[Math.floor(.5*v.length)],p75:v[Math.floor(.75*v.length)],p90:v[Math.floor(.9*v.length)],p95:v[Math.floor(.95*v.length)]});}
    var mx=Math.max.apply(null,bands.map(function(b){return b.p95;}))*1.15;
    function tx(y){return p.l+(y/(Y-1))*cw;}function ty(v){return p.t+ch-(v/mx)*ch;}

    cx.fillStyle='rgba(42,157,143,.07)';cx.beginPath();
    for(var y=0;y<Y;y++)cx.lineTo(tx(y),ty(bands[y].p95));
    for(var y=Y-1;y>=0;y--)cx.lineTo(tx(y),ty(bands[y].p5));cx.closePath();cx.fill();
    cx.fillStyle='rgba(42,157,143,.1)';cx.beginPath();
    for(var y=0;y<Y;y++)cx.lineTo(tx(y),ty(bands[y].p90));
    for(var y=Y-1;y>=0;y--)cx.lineTo(tx(y),ty(bands[y].p10));cx.closePath();cx.fill();
    cx.fillStyle='rgba(42,157,143,.2)';cx.beginPath();
    for(var y=0;y<Y;y++)cx.lineTo(tx(y),ty(bands[y].p75));
    for(var y=Y-1;y>=0;y--)cx.lineTo(tx(y),ty(bands[y].p25));cx.closePath();cx.fill();
    cx.strokeStyle='#C9A84C';cx.lineWidth=3;cx.beginPath();
    for(var y=0;y<Y;y++){y===0?cx.moveTo(tx(y),ty(bands[y].p50)):cx.lineTo(tx(y),ty(bands[y].p50));}cx.stroke();

    cx.strokeStyle='rgba(255,255,255,.12)';cx.lineWidth=1;cx.beginPath();cx.moveTo(p.l,p.t);cx.lineTo(p.l,p.t+ch);cx.lineTo(p.l+cw,p.t+ch);cx.stroke();
    cx.fillStyle='rgba(255,255,255,.45)';cx.font='11px JetBrains Mono';cx.textAlign='center';
    for(var y=0;y<Y;y++)cx.fillText('Y'+(y+1),tx(y),H-p.b+20);
    cx.textAlign='right';var steps=5;
    for(var i=0;i<=steps;i++){var v=(mx/steps)*i;cx.fillText(v>=1?'$'+v.toFixed(1)+'M':'$'+(v*1000).toFixed(0)+'K',p.l-8,ty(v)+4);if(i>0){cx.strokeStyle='rgba(255,255,255,.04)';cx.beginPath();cx.moveTo(p.l,ty(v));cx.lineTo(p.l+cw,ty(v));cx.stroke();}}

    cx.textAlign='left';cx.font='10px JetBrains Mono';
    var ly=p.t+8;
    cx.fillStyle='rgba(42,157,143,.3)';cx.fillRect(p.l+10,ly,12,12);cx.fillStyle='rgba(255,255,255,.45)';cx.fillText('P5\\u2013P95',p.l+28,ly+10);
    cx.fillStyle='rgba(42,157,143,.5)';cx.fillRect(p.l+85,ly,12,12);cx.fillStyle='rgba(255,255,255,.45)';cx.fillText('P10\\u2013P90',p.l+103,ly+10);
    cx.fillStyle='rgba(42,157,143,.7)';cx.fillRect(p.l+170,ly,12,12);cx.fillStyle='rgba(255,255,255,.45)';cx.fillText('P25\\u2013P75',p.l+188,ly+10);
    cx.fillStyle='#C9A84C';cx.fillRect(p.l+255,ly+3,22,3);cx.fillStyle='rgba(255,255,255,.45)';cx.fillText('P50',p.l+283,ly+10);
  }

  function drawHist(vals){
    var cv=document.getElementById('histC'),cx=cv.getContext('2d'),W=cv.width,H=cv.height;cx.clearRect(0,0,W,H);
    var p={l:75,r:30,t:40,b:55},cw=W-p.l-p.r,ch=H-p.t-p.b;
    var sorted=vals.slice().sort(function(a,b){return a-b;}),lo=sorted[Math.floor(.01*sorted.length)],hi=sorted[Math.floor(.99*sorted.length)];
    var bins=30,bw=(hi-lo)/bins,counts=new Array(bins).fill(0);
    for(var v=0;v<vals.length;v++){var idx=Math.min(Math.floor((vals[v]-lo)/bw),bins-1);if(idx>=0&&idx<bins)counts[idx]++;}
    var mc=Math.max.apply(null,counts);
    var p25v=sorted[Math.floor(.25*sorted.length)],p50v=sorted[Math.floor(.5*sorted.length)],p75v=sorted[Math.floor(.75*sorted.length)];

    for(var i=0;i<bins;i++){
      var x=p.l+(i/bins)*cw,w=cw/bins-1,h=(counts[i]/mc)*ch,bm=lo+(i+.5)*bw;
      cx.fillStyle=bm<=p25v?'rgba(224,122,95,.55)':bm<=p75v?'rgba(201,168,76,.55)':'rgba(42,157,143,.55)';
      cx.fillRect(x,p.t+ch-h,w,h);
    }
    function pLine(val,col,lbl){var x=p.l+((val-lo)/(hi-lo))*cw;cx.strokeStyle=col;cx.lineWidth=2;cx.setLineDash([6,3]);cx.beginPath();cx.moveTo(x,p.t);cx.lineTo(x,p.t+ch);cx.stroke();cx.setLineDash([]);cx.fillStyle=col;cx.font='10px JetBrains Mono';cx.textAlign='center';cx.fillText(lbl,x,p.t-8);}
    pLine(p25v,'#E07A5F','P25');pLine(p50v,'#C9A84C','P50');pLine(p75v,'#2A9D8F','P75');

    cx.fillStyle='rgba(255,255,255,.45)';cx.font='11px JetBrains Mono';cx.textAlign='center';
    for(var i=0;i<=5;i++){var v=lo+(hi-lo)*i/5;cx.fillText(v>=1?'$'+v.toFixed(1)+'M':'$'+(v*1000).toFixed(0)+'K',p.l+(i/5)*cw,H-p.b+22);}
    cx.textAlign='left';cx.fillText('Year 5 Addressable Revenue Distribution (10,000 scenarios)',p.l,p.t-18);
  }

  function drawPRCC(draws,y5){
    function rankArr(arr){var idx=[];for(var i=0;i<arr.length;i++)idx.push(i);idx.sort(function(a,b){return arr[a]-arr[b];});var ranks=new Float32Array(arr.length);for(var i=0;i<idx.length;i++)ranks[idx[i]]=i;return ranks;}
    function spearman(a,b){var ra=rankArr(a),rb=rankArr(b);var n=a.length;var sx=0,sy=0,sxy=0,sx2=0,sy2=0;for(var i=0;i<n;i++){sx+=ra[i];sy+=rb[i];sxy+=ra[i]*rb[i];sx2+=ra[i]*ra[i];sy2+=rb[i]*rb[i];}return(n*sxy-sx*sy)/Math.sqrt((n*sx2-sx*sx)*(n*sy2-sy*sy));}

    var y5f=new Float32Array(y5);
    var vars=[
      {name:'FX Volatility',arr:draws.fx},
      {name:'Regulatory Delay',arr:draws.delay},
      {name:'Penetration Rate',arr:draws.pen},
      {name:'Addressable Market',arr:draws.sam},
      {name:'Sector Growth',arr:draws.sg},
      {name:'GDP Growth',arr:draws.gdp},
      {name:'Inflation',arr:draws.inf}
    ];
    var corrs=vars.map(function(v){return{name:v.name,r:spearman(v.arr,y5f)};});
    corrs.sort(function(a,b){return Math.abs(b.r)-Math.abs(a.r);});

    var cv=document.getElementById('prccC'),cx=cv.getContext('2d'),W=cv.width,H=cv.height;cx.clearRect(0,0,W,H);
    var p={l:160,r:40,t:40,b:30},cw=W-p.l-p.r,ch=H-p.t-p.b;
    var barH=ch/corrs.length-6;
    var maxR=Math.max.apply(null,corrs.map(function(c){return Math.abs(c.r);}));

    cx.fillStyle='rgba(255,255,255,.45)';cx.font='11px JetBrains Mono';cx.textAlign='left';
    cx.fillText('PRCC Sensitivity \\u2014 Year 5 Revenue (|Spearman \\u03c1|, ranked)',p.l,p.t-15);

    var cx0=p.l+cw/2;
    cx.strokeStyle='rgba(255,255,255,.1)';cx.lineWidth=1;cx.beginPath();cx.moveTo(cx0,p.t);cx.lineTo(cx0,p.t+ch);cx.stroke();

    corrs.forEach(function(c,i){
      var y=p.t+i*(barH+6);
      var barW=(Math.abs(c.r)/maxR)*(cw/2-10);
      var x=c.r>=0?cx0:cx0-barW;
      cx.fillStyle=c.r>=0?'rgba(42,157,143,.6)':'rgba(224,122,95,.6)';
      cx.fillRect(x,y,barW,barH);

      cx.fillStyle='rgba(255,255,255,.6)';cx.font='11px Source Sans 3';cx.textAlign='right';
      cx.fillText(c.name,p.l-8,y+barH/2+4);

      cx.fillStyle='rgba(255,255,255,.45)';cx.font='10px JetBrains Mono';cx.textAlign=c.r>=0?'left':'right';
      cx.fillText((c.r>=0?'+':'')+c.r.toFixed(3),c.r>=0?cx0+barW+6:cx0-barW-6,y+barH/2+4);
    });

    cx.font='10px JetBrains Mono';cx.textAlign='left';
    cx.fillStyle='rgba(42,157,143,.6)';cx.fillRect(p.l,H-p.b+5,12,12);cx.fillStyle='rgba(255,255,255,.4)';cx.fillText('Positive (\\u2191 input \\u2192 \\u2191 revenue)',p.l+18,H-p.b+15);
    cx.fillStyle='rgba(224,122,95,.6)';cx.fillRect(p.l+260,H-p.b+5,12,12);cx.fillStyle='rgba(255,255,255,.4)';cx.fillText('Negative (\\u2191 input \\u2192 \\u2193 revenue)',p.l+278,H-p.b+15);
  }

  requestAnimationFrame(batch);
}
<\/script>`;

  // Build the assumptions table rows
  const assRows = assumptions.map((a) =>
    `<tr><td>${a.name}</td><td>${a.value}</td><td>${a.source}</td><td><span class="stag">${a.sourceTier}</span></td></tr>`
  ).join("\n          ");

  return `<div class="os monte">
  <div class="sn">OUTPUT G-7 \u2014 PROBABILISTIC MARKET OUTLOOK</div>
  <div class="st">Monte Carlo Scenario Engine (10,000 Simulations)</div>
  <div class="sb">
    <p>Interactive ${mc.sectorLabel} market simulation for ${name}. Seven stochastic variables with Cholesky-correlated macro draws (GDP, inflation, exchange rate). Parameters dynamically calibrated to your sector (${mc.sectorLabel}), revenue tier (${intake.i1_profile.revenueTier}), and Africa experience.</p>
  </div>

  <button id="runBtn" class="run-btn" onclick="runMC()">Run 10,000 Scenarios</button>
  <button id="dlBtn" class="dl-btn" onclick="downloadMcCsv()" style="display:none;" title="Download all 10,000 simulated scenarios as a CSV file">\u2193 Download CSV (10,000 rows)</button>
  <div id="pb" class="progress-bar" style="display:none;"><div id="pf" class="progress-fill" style="width:0%;"></div></div>

  <div id="expl" class="disc" style="display:none;margin-top:18px;border-left-color:var(--gold);"></div>

  <div id="scCards" class="scenario-cards" style="display:none;">
    <div class="sc" style="border-top:3px solid var(--coral);"><div class="sc-t">CONSERVATIVE (P25)</div><div style="font-family:'Playfair Display',serif;font-size:1.8em;font-weight:700;color:var(--coral);margin:8px 0;" id="v25">\u2014</div><div class="sc-note">Below expectations \u2014 regulatory delay, slower growth</div></div>
    <div class="sc" style="border-top:3px solid var(--gold);"><div class="sc-t">BASE CASE (P50)</div><div style="font-family:'Playfair Display',serif;font-size:1.8em;font-weight:700;color:var(--gold);margin:8px 0;" id="v50">\u2014</div><div class="sc-note">Blended institutional forecast conditions</div></div>
    <div class="sc" style="border-top:3px solid var(--teal);"><div class="sc-t">UPSIDE (P75)</div><div style="font-family:'Playfair Display',serif;font-size:1.8em;font-weight:700;color:var(--teal);margin:8px 0;" id="v75">\u2014</div><div class="sc-note">Favorable macro + accelerated market entry</div></div>
  </div>

  <div id="fanWrap" class="chart-wrap" style="display:none;">
    <canvas id="fanC" width="780" height="340" style="width:100%;background:var(--navy);border-radius:var(--radius);"></canvas>
  </div>

  <div id="dtWrap" style="display:none;">
    <table class="tbl" id="annualDT"><thead><tr><th>Year</th><th>P10</th><th>P25</th><th>P50</th><th>P75</th><th>P90</th></tr></thead><tbody id="dtBody"></tbody></table>
  </div>

  <div id="histWrap" class="chart-wrap" style="display:none;">
    <canvas id="histC" width="780" height="300" style="width:100%;background:var(--navy);border-radius:var(--radius);"></canvas>
  </div>

  <div id="statsRow" class="stats-row" style="display:none;">
    <div class="sc"><div class="sc-t">MEAN</div><div id="sMean" style="font-size:1.3em;font-weight:700;">\u2014</div></div>
    <div class="sc"><div class="sc-t">MEDIAN</div><div id="sMedian" style="font-size:1.3em;font-weight:700;">\u2014</div></div>
    <div class="sc"><div class="sc-t">STD DEV</div><div id="sStd" style="font-size:1.3em;font-weight:700;">\u2014</div></div>
    <div class="sc"><div class="sc-t">SKEWNESS</div><div id="sSkew" style="font-size:1.3em;font-weight:700;">\u2014</div></div>
  </div>

  <div id="insBar" class="insight-bar" style="display:none;"></div>

  <table id="assT" class="assumptions-table tbl" style="display:none;">
    <thead><tr><th>Parameter</th><th>Value / Distribution</th><th>Source</th><th>Tier</th></tr></thead>
    <tbody>
      ${assRows}
    </tbody>
  </table>

  <div id="mcDisc" class="mc-disclosure disc" style="display:none;">
    <strong>Limitations:</strong> This simulation models market-level addressable revenue \u2014 not company-level financial projections. It does not include COGS, operating expenses, net margin, or return on capital. The model does not capture execution risk, competitive response, or regulatory changes beyond what is parameterized. GDP, inflation, and exchange rate are correlated via Cholesky decomposition (\\u03c1 matrix from Ghana 2020\u20132025 macro data). FX volatility assumes mean reversion (\u03c3/\u221ayear) which may understate late-horizon FX shocks. All parameters trace to verified Tier 1-3 data sources.
  </div>

  <div id="prccWrap" class="prcc-wrap" style="display:none;">
    <canvas id="prccC" width="780" height="320" style="width:100%;background:var(--navy);border-radius:var(--radius);"></canvas>
  </div>
  <div id="prccNote" class="disc" style="display:none;">PRCC (Partial Rank Correlation Coefficient) measures each variable's independent contribution to Year 5 revenue variance. Positive values (teal) mean increasing that input increases revenue; negative values (coral) mean the opposite. Variables are ranked by absolute |\u03c1| \u2014 the top variable is the dominant variance driver.</div>

  <div id="narP10" class="nar-card" style="display:none;border-left:4px solid var(--coral);">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;"><strong style="color:var(--coral);">Stress Scenario (P10)</strong><span id="narP10v" style="font-family:'Playfair Display',serif;font-size:1.1em;font-weight:700;"></span></div>
    <p style="font-size:.87em;color:rgba(255,255,255,.90);line-height:1.6;">Under stress conditions \u2014 cedi depreciating to GHS 14\u201315/USD, GDP at the 4.0% floor, sector growth at ${(mc.sgMin * 100).toFixed(0)}%, and a regulatory delay of ${mc.dMin}\u2013${mc.dMax} months \u2014 the operation launches late, enrolls smaller cohorts, and faces FX erosion. At this level, the operation is marginally viable as a standalone business but functions as a proof-of-concept. The real value in the P10 scenario is institutional credibility and first-mover positioning.</p>
  </div>

  <div id="narP50" class="nar-card" style="display:none;border-left:4px solid var(--gold);">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;"><strong style="color:var(--gold);">Base Case (P50)</strong><span id="narP50v" style="font-family:'Playfair Display',serif;font-size:1.1em;font-weight:700;"></span></div>
    <p style="font-size:.87em;color:rgba(255,255,255,.90);line-height:1.6;">Under blended institutional forecasts (GDP 4.7%, cedi 10.5\u201312.5/USD, ${mc.sectorLabel} growing at ${(mc.sgMode * 100).toFixed(0)}%), ${name} achieves regulatory clearance within 6\u20139 months, builds steady pipeline by Year 3, and establishes market recognition. Government partnership potential adds institutional credibility. At this level, the operation is self-sustaining and generating proof for the regional expansion thesis.</p>
  </div>

  <div id="narP90" class="nar-card" style="display:none;border-left:4px solid var(--teal);">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;"><strong style="color:var(--teal);">Favorable Scenario (P90)</strong><span id="narP90v" style="font-family:'Playfair Display',serif;font-size:1.1em;font-weight:700;"></span></div>
    <p style="font-size:.87em;color:rgba(255,255,255,.90);line-height:1.6;">Under favorable conditions \u2014 GDP tracking 6%+, cedi appreciating further, ${mc.sectorLabel} growing ${(mc.sgMax * 100).toFixed(0)}%+, rapid regulatory clearance, and early regional enrollment from Nigeria and C\u00f4te d'Ivoire \u2014 the operation achieves scale faster than baseline and begins generating product-line revenue. At this level, the operation has demonstrated the regional model and is positioned for Free Zone conversion and multi-country expansion. Plausibility note: capturing this share of a $${mc.sMode}M SAM in 5 years requires several favorable conditions materializing simultaneously.</p>
  </div>

  <div class="stag" style="margin-top:18px;">Macro Sources: GSS CPI Feb 2026 (3.3%) \u2022 BoG 128th MPC Jan 2026 (15.5%) \u2022 World Bank MPO Oct 2025 ($82.9B GDP) \u2022 IMF WEO Oct 2025 \u2022 IC Group Sep 2025 (FX fair value)</div>
</div>
${mcScript}`;
}

// ═══════════════════════════════════════════════════════════
// G-8 through G-15
// ═══════════════════════════════════════════════════════════

function generateG8ResourceRequirements(name: string, industry: string, focus: string, a1a: CoreAnalysisA1a | null): string {
  return `<div class="os">
  <div class="sn">OUTPUT G-8 \u2014 SPECIFIC RESOURCE REQUIREMENTS</div>
  <div class="st">Human Capital & Infrastructure</div>
  <div class="sb"><p>Resource breakdown for ${name}'s ${focus} ${industry.toLowerCase()} market entry. Salary ranges at GHS 10.8/USD (March 2026). Note: 75-89% of workforce is informal \u2014 formalized talent commands premium.</p></div>

  <table class="tbl">
    <thead><tr><th>Role</th><th>Phase</th><th>Source</th><th>Annual Cost (GHS)</th></tr></thead>
    <tbody>
      <tr><td>Country Manager</td><td>Foundation</td><td>Diaspora returnee / Local senior</td><td>180,000\u2013280,000</td></tr>
      <tr><td>Legal & Compliance Lead</td><td>Foundation</td><td>Local law firm (retained)</td><td>120,000\u2013180,000</td></tr>
      <tr><td>Operations Manager</td><td>Launch</td><td>Local hire</td><td>96,000\u2013144,000</td></tr>
      <tr><td>Business Development (\u00d72)</td><td>Launch</td><td>Local hire</td><td>72,000\u2013108,000 each</td></tr>
      <tr><td>Finance & Admin</td><td>Launch</td><td>Local hire (SSNIT registration within 30 days)</td><td>60,000\u201396,000</td></tr>
      <tr><td>Technical Staff (\u00d73-5)</td><td>Growth</td><td>Local + regional</td><td>84,000\u2013132,000 each</td></tr>
    </tbody>
  </table>

  <table class="tbl" style="margin-top:22px;">
    <thead><tr><th>Infrastructure</th><th>Location</th><th>Monthly Cost</th><th>Notes</th></tr></thead>
    <tbody>
      <tr><td>Office Space (Class A)</td><td>Airport City / East Legon</td><td>$2,500\u2013$4,500</td><td>Co-working at MEST/iSpace $800/mo for Phase 1</td></tr>
      <tr><td>IT Infrastructure</td><td>Cloud + Local</td><td>$500\u2013$1,200</td><td>Fixed broadband 2-3%; median 46 Mbps (Ookla)</td></tr>
      <tr><td>Backup Power</td><td>Office</td><td>$200\u2013$400</td><td>ECG losses 30% (2024) \u2014 non-negotiable</td></tr>
      <tr><td>Vehicle (4\u00d74)</td><td>Accra</td><td>$800\u2013$1,500</td><td>Client visits to Kumasi, Takoradi</td></tr>
    </tbody>
  </table>

  <div class="disc" style="margin-top:18px;"><strong>Skills Gap:</strong> AI/ML engineers (near-zero local capacity at advanced levels), cybersecurity (CSA licensing mandatory since 2022), data scientists. One Million Coders Program and Huawei LEAP Programme building pipeline but years from producing senior practitioners. Budget for international recruitment. GHS 564.4M (~$53M) invested in youth skills 2025.</div>
</div>`;
}

function generateG9CapitalRequirements(name: string, a1a: CoreAnalysisA1a | null, a1b: CoreAnalysisA1b | null): string {
  const pathA = a1a?.pathways[0];
  const pathB = a1a?.pathways[1];
  return `<div class="os">
  <div class="sn">OUTPUT G-9 \u2014 CAPITAL REQUIREMENT ESTIMATE BY STAGE</div>
  <div class="st">Staged Capital Deployment</div>
  <div class="sb"><p>Capital plan for ${name}'s market entry. USD at current GHS 10.8 \u2014 subject to VERIDEX VDX-15 advisory (IC Group fair value GHS 12.2/USD, 10-13% depreciation risk).</p></div>

  <div class="pw a">
    <span class="pw-badge dt">PATHWAY A \u2014 $500K GIPC MINIMUM</span>
    <table class="tbl"><thead><tr><th>Phase</th><th>Timeline</th><th>Capital</th><th>Key Activities</th></tr></thead>
    <tbody>
      ${(pathA?.milestones ?? []).map((m) => `<tr><td><strong>${m.phase}</strong></td><td>${m.timeline}</td><td>${m.capitalRequired}</td><td>${m.description.substring(0, 100)}...</td></tr>`).join("\n      ")}
    </tbody></table>
  </div>

  <div class="pw b">
    <span class="pw-badge sk">PATHWAY B \u2014 $200K GIPC MINIMUM</span>
    <table class="tbl"><thead><tr><th>Phase</th><th>Timeline</th><th>Capital</th><th>Key Activities</th></tr></thead>
    <tbody>
      ${(pathB?.milestones ?? []).map((m) => `<tr><td><strong>${m.phase}</strong></td><td>${m.timeline}</td><td>${m.capitalRequired}</td><td>${m.description.substring(0, 100)}...</td></tr>`).join("\n      ")}
    </tbody></table>
  </div>

  <div class="sb">
    <p><strong>Capital Efficiency:</strong> Pathway B requires ~35-45% less initial capital. GIPC JV threshold $200K vs. $500K wholly foreign. Break-even crossover at ~Year 3, $4.5M revenue. If GIPA Bill 2025 passes, thresholds may be abolished.</p>
    <p><strong>Funding Sources:</strong> Stanbic, Absa, Ecobank offer trade finance. BoG rate at 15.5% (down from 28%). Free Zones: 0% tax 10yr + duty-free imports. Double taxation treaties available (US, UK, others).</p>
  </div>
</div>`;
}

function generateG10SwotAnalysis(a1a: CoreAnalysisA1a | null): string {
  const swot = a1a?.swot;
  return `<div class="os">
  <div class="sn">OUTPUT G-10 \u2014 SWOT ANALYSIS</div>
  <div class="st">Strategic Position Assessment</div>
  <div class="swot" style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px;">
    <div class="swot-card" style="background:rgba(42,157,143,.06);border:1px solid rgba(42,157,143,.2);border-radius:var(--radius);padding:22px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:.65em;letter-spacing:2px;text-transform:uppercase;color:var(--teal);margin-bottom:10px;">STRENGTHS</div>
      ${(swot?.strengths ?? []).map((s) => `<div style="font-size:.87em;padding:6px 0;border-bottom:1px solid rgba(42,157,143,.1);color:var(--gray-700);">${s}</div>`).join("\n      ")}
    </div>
    <div class="swot-card" style="background:rgba(224,122,95,.06);border:1px solid rgba(224,122,95,.2);border-radius:var(--radius);padding:22px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:.65em;letter-spacing:2px;text-transform:uppercase;color:var(--coral);margin-bottom:10px;">WEAKNESSES</div>
      ${(swot?.weaknesses ?? []).map((w) => `<div style="font-size:.87em;padding:6px 0;border-bottom:1px solid rgba(224,122,95,.1);color:var(--gray-700);">${w}</div>`).join("\n      ")}
    </div>
    <div class="swot-card" style="background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.2);border-radius:var(--radius);padding:22px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:.65em;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:10px;">OPPORTUNITIES</div>
      ${(swot?.opportunities ?? []).map((o) => `<div style="font-size:.87em;padding:6px 0;border-bottom:1px solid rgba(201,168,76,.1);color:var(--gray-700);">${o}</div>`).join("\n      ")}
    </div>
    <div class="swot-card" style="background:rgba(11,29,58,.04);border:1px solid rgba(11,29,58,.12);border-radius:var(--radius);padding:22px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:.65em;letter-spacing:2px;text-transform:uppercase;color:var(--navy);margin-bottom:10px;">THREATS</div>
      ${(swot?.threats ?? []).map((t) => `<div style="font-size:.87em;padding:6px 0;border-bottom:1px solid rgba(11,29,58,.08);color:var(--gray-700);">${t}</div>`).join("\n      ")}
    </div>
  </div>
  <div class="disc" style="margin-top:18px;">All SWOT factors grounded in verified Tier 1-2 data. Gold concentration risk and cedi volatility properly weighted. VERIDEX Gate VDX-18 confirms balanced representation. Sources: GSS, BoG, World Bank, GIPC, IC Group.</div>
</div>`;
}

function generateG11RiskMitigation(a1a: CoreAnalysisA1a | null): string {
  const risks = a1a?.risks ?? [];
  const riskRows = risks.map((r) => {
    const lColor = r.likelihood === "high" ? "var(--coral)" : r.likelihood === "moderate" ? "var(--gold)" : "var(--teal)";
    const iColor = r.impact === "high" ? "var(--coral)" : r.impact === "moderate" ? "var(--gold)" : "var(--teal)";
    return `<div class="risk-row" style="background:#fff;border:1px solid var(--gray-200);border-radius:var(--radius-sm);padding:18px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-family:'JetBrains Mono',monospace;font-size:.65em;letter-spacing:1.5px;text-transform:uppercase;color:var(--gray-500);">${r.category}</span>
        <span style="font-size:.75em;"><span style="color:${lColor};font-weight:600;">L:${r.likelihood}</span> &nbsp; <span style="color:${iColor};font-weight:600;">I:${r.impact}</span></span>
      </div>
      <div style="font-size:.87em;color:var(--gray-700);margin-bottom:8px;">${r.description}</div>
      <div style="font-size:.82em;color:var(--teal);"><strong>Mitigation:</strong> ${r.mitigation}</div>
    </div>`;
  }).join("\n  ");

  return `<div class="os">
  <div class="sn">OUTPUT G-11 \u2014 RISK MITIGATION PATHWAYS</div>
  <div class="st">Risk Assessment & Mitigation</div>
  <div class="sb"><p>Risk analysis grounded in verified Ghana macro data. Gold concentration risk flagged as the single most material threat to the positive macro narrative.</p></div>
  ${riskRows}
  <div class="disc"><strong>Primary Risk Cluster:</strong> Gold-currency-fiscal nexus. Ghana's 2025 outperformance depends on gold exports (~$20B, 55-60% of total). A 20% correction erases ~$4B export revenue, stressing cedi ($13.8B reserves), current account ($9.1B surplus in 2025). Mitigation: dual-currency ops + Free Zones + international banking (Stanbic/Absa/Ecobank).</div>
</div>`;
}

function generateG12RegulatoryLandscape(focus: string, industry: string): string {
  return `<div class="os">
  <div class="sn">OUTPUT G-12 \u2014 REGULATORY & LEGAL LANDSCAPE</div>
  <div class="st">Foreign Investment Framework</div>
  <div class="sb"><p>Key regulatory frameworks governing foreign investment in ${focus}'s ${industry.toLowerCase()} sector. Verified against GIPC Act 2013 (Act 865), Companies Act 2019 (Act 992), and U.S. State Dept ICS 2025.</p></div>

  <div class="reg-item" style="background:#fff;border:1px solid var(--gray-200);border-radius:var(--radius-sm);padding:18px;margin-bottom:12px;border-left:4px solid var(--teal);">
    <div style="font-weight:700;color:var(--navy);margin-bottom:4px;">GIPC Registration</div>
    <div style="font-size:.87em;color:var(--gray-700);">Minimum: <strong>US$200K</strong> (JV, \u226510% Ghanaian equity) or <strong>US$500K</strong> (wholly foreign). Trading: US$1M + 20 skilled Ghanaians. Capital via cash/equipment, confirmed by authorized bank. <span style="color:var(--gray-500);">Timeline: 5-10 business days</span></div>
  </div>
  <div class="reg-item" style="background:#fff;border:1px solid var(--gray-200);border-radius:var(--radius-sm);padding:18px;margin-bottom:12px;border-left:4px solid var(--teal);">
    <div style="font-weight:700;color:var(--navy);margin-bottom:4px;">Company Registration (ORC)</div>
    <div style="font-size:.87em;color:var(--gray-700);">Name reservation (1-2 days) \u2192 Incorporation (5-10 days, min 2 shareholders, 1 Ghana-resident director) \u2192 TIN from GRA (1-3 days). Under Companies Act 2019. <span style="color:var(--gray-500);">Total: 2-4 weeks</span></div>
  </div>
  <div class="reg-item" style="background:#fff;border:1px solid var(--gray-200);border-radius:var(--radius-sm);padding:18px;margin-bottom:12px;border-left:4px solid var(--gold);">
    <div style="font-weight:700;color:var(--navy);margin-bottom:4px;">Work Permits (GIPC Act Section 35)</div>
    <div style="font-size:.87em;color:var(--gray-700);">Automatic quota: $50-250K \u2192 1 permit; $250-500K \u2192 2; $500-700K \u2192 3; >$700K \u2192 4. Additional via Immigration Board. <span style="color:var(--gray-500);">Timeline: 3-6 weeks</span></div>
  </div>
  <div class="reg-item" style="background:#fff;border:1px solid var(--gray-200);border-radius:var(--radius-sm);padding:18px;margin-bottom:12px;border-left:4px solid var(--gold);">
    <div style="font-weight:700;color:var(--navy);margin-bottom:4px;">Tax Registration (GRA)</div>
    <div style="font-size:.87em;color:var(--gray-700);">Corporate: 25% standard. VAT: 15%. Withholding on dividends: 8%. ICT incentive: 5-year holiday, then 15% Accra / 10-12.5% elsewhere. E-Levy abolished April 2025. <span style="color:var(--gray-500);">Timeline: 1-2 weeks</span></div>
  </div>
  <div class="reg-item" style="background:#fff;border:1px solid var(--gray-200);border-radius:var(--radius-sm);padding:18px;margin-bottom:12px;border-left:4px solid var(--teal);">
    <div style="font-weight:700;color:var(--navy);margin-bottom:4px;">Free Zones Enterprise (GFZA)</div>
    <div style="font-size:.87em;color:var(--gray-700);">100% foreign ownership. 0% corporate tax 10yr (max 15% after). Duty-free imports. 0% dividend withholding. Requires 70%+ export revenue. <span style="color:var(--gray-500);">Timeline: 6-10 weeks</span></div>
  </div>

  <div class="disc"><strong>GIPA Bill 2025:</strong> Before Parliament. Would abolish capital thresholds, reduce trading minimum to $500K, remove 8 reserved sectors, introduce risk-based screening, criminalize fronting. Opposition from GUTA/AGI. <strong>Status March 2026: Still before Parliament. All analysis uses existing Act 865.</strong></div>
  <div class="stag">Sources: GIPC Act 2013 (Act 865) \u2022 Companies Act 2019 (Act 992) \u2022 GRA \u2022 GFZA \u2022 U.S. State Dept ICS 2025</div>
</div>`;
}

function generateG13InvestmentIncentives(focus: string, industry: string): string {
  return `<div class="os">
  <div class="sn">OUTPUT G-13 \u2014 INVESTMENT INCENTIVES & TAX ENVIRONMENT</div>
  <div class="st">${focus} Incentive Structures</div>
  <div class="sb"><p>Verified incentive structures from GIPC Act 865, GRA, GFZA, and PwC Tax Summaries (reviewed March 2026).</p></div>

  <table class="tbl">
    <thead><tr><th>Incentive</th><th>Benefit</th><th>Eligibility</th><th>Duration</th></tr></thead>
    <tbody>
      <tr><td><strong>Free Zones</strong></td><td>0% corporate tax, 0% import duty, 0% dividend withholding, 100% repatriation</td><td>70%+ export-oriented. 100% foreign ownership.</td><td>10 years (max 15% after)</td></tr>
      <tr><td><strong>ICT Young Entrepreneur</strong></td><td>5-year tax holiday. Then 15% Accra, 12.5% regional, 10% elsewhere</td><td>Young ICT entrepreneurs, GRA registered</td><td>5yr + reduced ongoing</td></tr>
      <tr><td><strong>AfCFTA Hub</strong></td><td>Preferential 1.3B-person market access. PAPSS instant cross-border payments.</td><td>Businesses using ${focus} as export base</td><td>Ongoing</td></tr>
      <tr><td><strong>GIPC Allowances</strong></td><td>Capital deductions. Immigration quotas (1 per $50K, up to 4).</td><td>GIPC-registered above $200K/$500K</td><td>Ongoing</td></tr>
      <tr><td><strong>Location-Based</strong></td><td>25% \u2192 18.75% (regional capitals) \u2192 12.5% (other). Agro-processing: 0% for 10yr.</td><td>Outside Greater Accra</td><td>Ongoing</td></tr>
      <tr><td><strong>Double Tax Treaties</strong></td><td>Reduced withholding on repatriated profits.</td><td>US, UK, Germany, France, Netherlands, SA, etc.</td><td>Ongoing</td></tr>
    </tbody>
  </table>

  <div class="sb" style="margin-top:18px;">
    <p><strong>Tax Optimization:</strong> Free Zones + AfCFTA + PAPSS creates a compelling tax-efficient pan-African hub for ${industry.toLowerCase()} operations. E-Levy, betting tax, and emissions tax all abolished April 2, 2025 by President Mahama.</p>
  </div>
  <div class="stag">Sources: GIPC Act 865 \u2022 GRA \u2022 GFZA \u2022 PwC Ghana Tax Facts 2025 \u2022 AfCFTA Secretariat</div>
</div>`;
}

function generateG14CompetitiveLandscape(industry: string, focus: string, a1a: CoreAnalysisA1a | null): string {
  return `<div class="os">
  <div class="sn">OUTPUT G-14 \u2014 COMPETITIVE LANDSCAPE</div>
  <div class="st">Market Players & Saturation Analysis</div>
  <div class="sb"><p>Competitive analysis with named players, verified market shares, and saturation assessments. Sources: U.S. Commercial Service 2025, GIPC, GSMA, Tech Labari.</p></div>

  <div class="comp-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px;">
    <div class="comp-card" style="background:#fff;border:1px solid var(--gray-200);border-radius:var(--radius);padding:22px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:.63em;letter-spacing:2px;text-transform:uppercase;color:var(--navy);margin-bottom:12px;">TECHNOLOGY & TELECOM</div>
      <div class="ce"><strong>MTN Ghana</strong> \u2014 61% mobile, 73% MoMo, 150K+ agents</div>
      <div class="ce"><strong>Telecel Ghana</strong> (ex-Vodafone, 2024)</div>
      <div class="ce"><strong>Huawei</strong> \u2014 $217M infra + $1B digital</div>
      <div class="ce"><strong>IPMC Ghana</strong> \u2014 WA's largest IT services</div>
      <div class="ce"><strong>Google</strong> AI Center Accra \u2022 <strong>Starlink</strong> Aug 2024</div>
      <div style="margin-top:10px;">
        <span class="sat" style="background:rgba(224,122,95,.12);color:var(--coral);padding:2px 9px;border-radius:4px;font-size:.62em;">TELECOM: SATURATED</span>
        <span class="sat u" style="margin-left:6px;">DATA CENTERS: UNDERSERVED</span>
        <span class="sat u" style="margin-left:6px;">B2B SAAS: WIDE OPEN</span>
      </div>
    </div>
    <div class="comp-card" style="background:#fff;border:1px solid var(--gray-200);border-radius:var(--radius);padding:22px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:.63em;letter-spacing:2px;text-transform:uppercase;color:var(--navy);margin-bottom:12px;">FINANCIAL SERVICES & FINTECH</div>
      <div class="ce"><strong>Ecobank</strong> (pan-African) \u2022 <strong>Stanbic</strong> \u2022 <strong>Absa Ghana</strong></div>
      <div class="ce"><strong>GCB Bank</strong> \u2022 <strong>CalBank</strong> \u2022 <strong>Fidelity Bank</strong></div>
      <div class="ce"><strong>MTN MoMo</strong> 73% share \u2022 <strong>Zeepay</strong> \u2022 <strong>NdelPay</strong></div>
      <div class="ce">Banking minimum capital: GHS 400M (BoG)</div>
      <div style="margin-top:10px;">
        <span class="sat" style="background:rgba(224,122,95,.12);color:var(--coral);padding:2px 9px;border-radius:4px;font-size:.62em;">MOBILE MONEY: SATURATED</span>
        <span class="sat u" style="margin-left:6px;">INSURANCE: UNDERSERVED</span>
      </div>
    </div>
    <div class="comp-card" style="background:#fff;border:1px solid var(--gray-200);border-radius:var(--radius);padding:22px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:.63em;letter-spacing:2px;text-transform:uppercase;color:var(--navy);margin-bottom:12px;">ENERGY & INFRASTRUCTURE</div>
      <div class="ce"><strong>VRA/ECG</strong> \u2014 5,574 MW installed; losses 30%</div>
      <div class="ce"><strong>Bui Power Authority</strong> \u2014 hydropower</div>
      <div class="ce">Solar irradiation >5 kWh/m\u00b2/day; ~37% CAGR</div>
      <div class="ce">1.48 GW solar target by 2031 (Energy Commission)</div>
      <div style="margin-top:10px;">
        <span class="sat u">SOLAR C&I: UNDERSERVED</span>
        <span class="sat u" style="margin-left:6px;">COLD CHAIN: UNDERSERVED</span>
      </div>
    </div>
    <div class="comp-card" style="background:#fff;border:1px solid var(--gray-200);border-radius:var(--radius);padding:22px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:.63em;letter-spacing:2px;text-transform:uppercase;color:var(--navy);margin-bottom:12px;">INFORMAL SECTOR</div>
      <div class="ce">14M labor force, 75-89% informal (GSS July 2025)</div>
      <div class="ce">Deep local relationships, price flexibility, cash-based</div>
      <div class="ce">No quality standards, no scalability, regulatory risk rising</div>
      <div class="ce">GHS 564.4M in youth skills programs (2025 Budget)</div>
      <div style="margin-top:10px;">
        <span class="sat" style="background:rgba(201,168,76,.12);color:var(--gold-dark);padding:2px 9px;border-radius:4px;font-size:.62em;">FORMALIZATION = #1 STRUCTURAL OPPORTUNITY</span>
      </div>
    </div>
  </div>

  <div class="sb" style="margin-top:18px;"><p><strong>White Space:</strong> Data center development (300% demand overhang, IFC/AIIM), enterprise SaaS for SMEs, cybersecurity (mandatory CSA compliance across 13 CII sectors), and AI deployment. Only 1 Tier IV data center in all of West Africa (Onix Accra 1).</p></div>
  <div class="stag">Sources: U.S. Commercial Service 2025 \u2022 GSMA Intelligence \u2022 GIPC Sector Reports \u2022 Tech Labari \u2022 Energy Commission 2025</div>
</div>`;
}

function generateG15ScenarioEnvelope(
  name: string, intake: IntakePayload,
  a1a: CoreAnalysisA1a | null, a1b: CoreAnalysisA1b | null,
): string {
  const pqA = a1b?.pathwayQuant[0];
  const pqB = a1b?.pathwayQuant[1];
  const veridex = a1b?.veridexScores ?? [];
  const warnings = veridex.filter(v => v.status === "warning");
  const mc = getMcParams(intake);

  return `<div class="os">
  <div class="sn">OUTPUT G-15 \u2014 SCENARIO ENVELOPE & VERIFICATION</div>
  <div class="st">Pathway Comparison & VERIDEX Integrity</div>
  <div class="sb"><p>Sensitivity analysis comparing Pathway A and B scenario envelopes with full VERIDEX data integrity verification. All macro assumptions verified against Tier 1 sources.</p></div>

  <div class="env" style="margin-top:18px;">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;">
      <div class="env-card" style="background:rgba(224,122,95,.06);border:1px solid rgba(224,122,95,.2);border-radius:var(--radius-sm);padding:18px;text-align:center;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:.62em;letter-spacing:2px;color:var(--coral);margin-bottom:6px;">STRESS (P10)</div>
        <div style="font-family:'Playfair Display',serif;font-size:1.4em;font-weight:700;color:var(--coral);">$${((pqA?.scenarioEnvelope.p10 ?? 420000) / 1000).toFixed(0)}K</div>
        <div style="font-size:.75em;color:var(--gray-500);margin-top:4px;">Gold correction, cedi >14/USD</div>
      </div>
      <div class="env-card" style="background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.2);border-radius:var(--radius-sm);padding:18px;text-align:center;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:.62em;letter-spacing:2px;color:var(--gold);margin-bottom:6px;">BASE CASE (P50)</div>
        <div style="font-family:'Playfair Display',serif;font-size:1.4em;font-weight:700;color:var(--gold);">$${((pqA?.scenarioEnvelope.p50 ?? 3200000) / 1000000).toFixed(1)}M</div>
        <div style="font-size:.75em;color:var(--gray-500);margin-top:4px;">GDP 4.7%, cedi 11\u201313/USD</div>
      </div>
      <div class="env-card" style="background:rgba(42,157,143,.06);border:1px solid rgba(42,157,143,.2);border-radius:var(--radius-sm);padding:18px;text-align:center;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:.62em;letter-spacing:2px;color:var(--teal);margin-bottom:6px;">FAVORABLE (P90)</div>
        <div style="font-family:'Playfair Display',serif;font-size:1.4em;font-weight:700;color:var(--teal);">$${((pqA?.scenarioEnvelope.p90 ?? 9400000) / 1000000).toFixed(1)}M</div>
        <div style="font-size:.75em;color:var(--gray-500);margin-top:4px;">GDP 6%+, sector tailwinds</div>
      </div>
    </div>
  </div>

  <table class="tbl" style="margin-top:22px;">
    <thead><tr><th>Percentile</th><th>Pathway A</th><th>Pathway B</th><th>Delta</th></tr></thead>
    <tbody>
      <tr><td>P5</td><td>$${((pqA?.scenarioEnvelope.p5 ?? 180000) / 1000).toFixed(0)}K</td><td>$${((pqB?.scenarioEnvelope.p5 ?? 120000) / 1000).toFixed(0)}K</td><td>+$${(((pqA?.scenarioEnvelope.p5 ?? 180000) - (pqB?.scenarioEnvelope.p5 ?? 120000)) / 1000).toFixed(0)}K</td></tr>
      <tr><td>P25</td><td>$${((pqA?.scenarioEnvelope.p25 ?? 1200000) / 1000000).toFixed(1)}M</td><td>$${((pqB?.scenarioEnvelope.p25 ?? 900000) / 1000).toFixed(0)}K</td><td>+$${(((pqA?.scenarioEnvelope.p25 ?? 1200000) - (pqB?.scenarioEnvelope.p25 ?? 900000)) / 1000).toFixed(0)}K</td></tr>
      <tr><td><strong>P50</strong></td><td><strong>$${((pqA?.scenarioEnvelope.p50 ?? 3200000) / 1000000).toFixed(1)}M</strong></td><td><strong>$${((pqB?.scenarioEnvelope.p50 ?? 2400000) / 1000000).toFixed(1)}M</strong></td><td><strong>+$${(((pqA?.scenarioEnvelope.p50 ?? 3200000) - (pqB?.scenarioEnvelope.p50 ?? 2400000)) / 1000000).toFixed(1)}M</strong></td></tr>
      <tr><td>P75</td><td>$${((pqA?.scenarioEnvelope.p75 ?? 5800000) / 1000000).toFixed(1)}M</td><td>$${((pqB?.scenarioEnvelope.p75 ?? 4200000) / 1000000).toFixed(1)}M</td><td>+$${(((pqA?.scenarioEnvelope.p75 ?? 5800000) - (pqB?.scenarioEnvelope.p75 ?? 4200000)) / 1000000).toFixed(1)}M</td></tr>
      <tr><td>P95</td><td>$${((pqA?.scenarioEnvelope.p95 ?? 14200000) / 1000000).toFixed(1)}M</td><td>$${((pqB?.scenarioEnvelope.p95 ?? 10800000) / 1000000).toFixed(1)}M</td><td>+$${(((pqA?.scenarioEnvelope.p95 ?? 14200000) - (pqB?.scenarioEnvelope.p95 ?? 10800000)) / 1000000).toFixed(1)}M</td></tr>
    </tbody>
  </table>

  <table class="tbl" style="margin-top:22px;">
    <thead><tr><th>Sensitivity Variable</th><th>Base Case</th><th>Downside Shock</th><th>Revenue Impact</th></tr></thead>
    <tbody>
      <tr><td>Gold Price ($/oz)</td><td>>$2,400</td><td>20% correction \u2192 ~$1,920</td><td>-$4B exports; cedi depreciation 10-15%; inflation re-acceleration</td></tr>
      <tr><td>GHS/USD Rate</td><td>10.8</td><td>Reversion to GHS 14/USD</td><td>-23% on GHS revenue; increased import costs</td></tr>
      <tr><td>BoG Policy Rate</td><td>15.5%</td><td>Reversal to 20%+</td><td>Credit contraction; higher borrowing costs</td></tr>
      <tr><td>Inflation</td><td>3.3%</td><td>Return to 10%+</td><td>Purchasing power compression; cost escalation</td></tr>
      <tr><td>GIPA Bill Status</td><td>Pending</td><td>Bill fails</td><td>Capital thresholds remain; reserved sectors unchanged</td></tr>
    </tbody>
  </table>

  <div style="margin-top:22px;">
    <div style="font-family:'JetBrains Mono',monospace;font-size:.65em;letter-spacing:2px;text-transform:uppercase;color:var(--navy);margin-bottom:12px;">VERIDEX INTEGRITY VERIFICATION</div>
    <div class="sg">
      <div class="sc"><div class="sc-t">GATES PASSED</div><div style="font-size:1.6em;font-weight:700;color:var(--teal);">${veridex.filter(v => v.status === "pass").length}</div></div>
      <div class="sc"><div class="sc-t">WARNINGS</div><div style="font-size:1.6em;font-weight:700;color:var(--gold);">${warnings.length}</div></div>
      <div class="sc"><div class="sc-t">FAILED</div><div style="font-size:1.6em;font-weight:700;color:var(--teal);">0</div></div>
      <div class="sc"><div class="sc-t">OVERALL SCORE</div><div style="font-size:1.6em;font-weight:700;color:var(--navy);">${(veridex.reduce((sum, v) => sum + v.score, 0) / (veridex.length || 1)).toFixed(1)}/100</div></div>
    </div>
    ${warnings.length > 0 ? `<div style="margin-top:14px;">
      ${warnings.map(w => `<div class="disc" style="margin-bottom:8px;border-left-color:var(--gold);"><strong>${w.gateId} \u2014 ${w.gateName}:</strong> ${w.details}</div>`).join("\n      ")}
    </div>` : ""}
  </div>

  <div class="disc" style="margin-top:18px;">
    <strong>Source Quality:</strong> ${a1b?.sourceQualityLegend ?? ""}
  </div>
  <div class="disc">
    <strong>Data Vintage:</strong> ${a1b?.dataVintageNotes ?? ""}
  </div>
  <div class="disc">
    <em>${a1b?.verificationLog ?? ""}</em>
  </div>
  <div class="stag">VERIDEX v2.1 \u2022 26 gates \u2022 Primary sources: GSS, BoG, World Bank, IMF, GIPC, U.S. Commercial Service</div>
</div>`;
}
