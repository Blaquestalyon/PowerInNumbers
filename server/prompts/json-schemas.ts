/**
 * JSON Output Schemas for Structured Template Rendering
 * 
 * Each section prompt is paired with a JSON schema that tells Claude
 * exactly what structured data to return. The renderer handles all HTML.
 */

const JSON_PREAMBLE = `ABSOLUTE RULES:
1. Return ONLY a valid JSON object matching the schema below. No markdown, no code fences, no commentary.
2. NEVER change scores, classifications, numeric values, or any data from the core analysis. Render them exactly.
3. All narrative text must be Ghana-specific and grounded in the provided data context. No generic emerging-market language.
4. Monetary values must include currency denomination.
5. Do NOT include HTML tags in your JSON values — return plain text only.
`.trim();

function jsonPrompt(role: string, schema: string, instructions: string): string {
  return `${JSON_PREAMBLE}\n\nROLE: ${role}\n\nOUTPUT JSON SCHEMA:\n${schema}\n\n${instructions}`;
}

export const JSON_SECTION_PROMPTS: Record<string, string> = {

  "section_g1": jsonPrompt(
    "Personalized Opportunity Simulation — flagship analytical section",
    `{
  "executiveSummary": "2-3 sentence executive context about this individual's Ghana opportunity profile",
  "categoryDistribution": "Summary of how competencies distribute across categories — which areas are strong, which are weak, what that means for Ghana entry",
  "compositeScoreNarrative": "2-3 sentences interpreting the composite opportunity/risk/friction scores across both pathways — what the scores mean practically"
}`,
    `INPUTS: competencies[], developmentGaps[], pathways[] scores, i1_profile.
The template will render the competency table, gap table, and pathway score cards from core analysis data.
YOUR JOB is to provide the analytical narratives that contextualize the data. Be specific to this person and Ghana.
TONE: Management consulting skills assessment. Specific, not generic.`
  ),

  "section_g2": jsonPrompt(
    "Vertical & Adjacent Opportunity Analysis — sector deep dive",
    `{
  "primarySectorAnalysis": "3-4 sentences analyzing the primary sector's Ghana landscape, grounded in market data from the RAG context",
  "adjacentOpportunities": "Analysis of 2-3 adjacent sectors where competencies transfer, with specific rationale for each",
  "valueChainPositioning": "Where in the value chain each pathway sits, upstream/downstream opportunities specific to Ghana"
}`,
    `INPUTS: pathways[] TAM/SAM/SOM, competitiveProfiles[], competencies[], i2_context.
Template renders the market sizing table and white space table from core data.
YOUR JOB is the analytical narrative. Reference specific Ghana sectors and data points.
TONE: Market analyst depth.`
  ),

  "section_g3": jsonPrompt(
    "Optimal Market Entry Strategy — phased approach with regulatory steps",
    `{
  "strategicOverview": "2-3 sentences framing the recommended entry approach based on constraints and objectives",
  "entryModels": [
    {"model": "JV/Partnership", "fitPathwayA": "assessment", "fitPathwayB": "assessment", "keyConsiderations": "text"},
    {"model": "Wholly Owned Subsidiary", "fitPathwayA": "...", "fitPathwayB": "...", "keyConsiderations": "..."},
    {"model": "Licensing/Franchise", "fitPathwayA": "...", "fitPathwayB": "...", "keyConsiderations": "..."}
  ],
  "phases": [
    {"name": "Phase 1: Foundation", "timeline": "0-6 months", "steps": ["step 1", "step 2", "..."]},
    {"name": "Phase 2: Launch", "timeline": "6-18 months", "steps": ["..."]},
    {"name": "Phase 3: Scale", "timeline": "18-36 months", "steps": ["..."]}
  ],
  "criticalSuccessFactors": ["factor 1", "factor 2", "..."]
}`,
    `Provide 3-5 entry models, 3 phases with 4-6 concrete steps each, and 3-5 critical success factors.
All phases must reference Ghana-specific steps (GIPC, ORC, GRA, SSNIT, etc.).
TONE: Strategic advisory. Concrete, phased, actionable.`
  ),

  "section_g4": jsonPrompt(
    "Quick Wins vs. Long-Term Plays — prioritized action matrix",
    `{
  "quickWins": [
    {"action": "specific action", "pathway": "A|B|Both", "effort": "Low|Medium|High", "impact": "Low|Medium|High", "leverages": "which competency this builds on"}
  ],
  "longTermPlays": [
    {"initiative": "initiative name", "pathway": "A|B|Both", "timeline": "6-12 months", "capital": "$X-Y", "strategicValue": "why this matters long-term"}
  ],
  "sequencingRecommendation": "2-3 sentences on optimal ordering — what to do first and why"
}`,
    `Provide 5-8 quick wins and 4-6 long-term plays. Merge and deduplicate from both pathways.
Effort/impact ratings must be justified by the person's competency profile and constraints.
TONE: Execution-focused.`
  ),

  "section_g5": jsonPrompt(
    "Summit Connection Map — networking and partnership framework",
    `{
  "connectionTypes": [
    {"type": "archetype description", "whyCritical": "reason", "addressesGap": "which gap", "enablesPathway": "A|B|Both", "priority": "Critical|High|Medium"}
  ],
  "partnershipStructures": "Analysis of which partnership models suit each pathway — JV, advisory, distribution, etc.",
  "engagementStrategy": ["tactic 1", "tactic 2", "..."],
  "qualifyingQuestions": ["question 1", "question 2", "..."]
}`,
    `Provide 6-8 connection types, 4-6 engagement tactics, 5-7 qualifying questions.
Do NOT name specific individuals or companies. Describe archetypes specific to Ghana business culture.
TONE: Strategic relationship intelligence.`
  ),

  "section_g6": jsonPrompt(
    "Realistic Timeline Projections — milestone roadmap",
    `{
  "timelineRiskFactors": ["risk factor 1", "risk factor 2", "..."]
}`,
    `The template renders milestone tables directly from pathway data.
YOUR JOB: provide 3-5 Ghana-specific factors that could delay timelines (regulatory, seasonal, infrastructure, etc.).
TONE: Realistic, not optimistic.`
  ),

  "section_g8": jsonPrompt(
    "Specific Resource Requirements — human capital, infrastructure, technology",
    `{
  "humanCapital": [
    {"role": "job title", "priority": "Critical|High|Medium", "phaseNeeded": "Phase 1|Phase 2|Phase 3", "marketRate": "GHS X-Y/month (USD $X-Y)", "pathway": "A|B|Both"}
  ],
  "infrastructure": [
    {"requirement": "description", "type": "Office|Warehouse|Utilities|etc.", "estimatedCost": "$X/month", "phase": "Phase 1", "notes": "Ghana-specific note"}
  ],
  "technology": [
    {"system": "system name", "purpose": "what it does", "estimatedCost": "$X", "buildVsBuy": "Build|Buy|Hybrid"}
  ],
  "operationalConsiderations": "Ghana-specific operational factors: power reliability, logistics, banking, mobile money, etc."
}`,
    `Provide 5-8 roles, 4-6 infrastructure items, 4-6 technology systems.
All costs in USD with GHS equivalent. Reference Ghana-specific infrastructure realities.
TONE: Practical operations planning.`
  ),

  "section_g9": jsonPrompt(
    "Capital Requirement Estimate by Stage — phased investment framework",
    `{
  "pathwayACapital": [
    {"phase": "Foundation", "timeline": "Months 1-6", "capitalRequired": "$150K-250K", "cumulative": "$150K-250K", "keyExpenditures": "description"}
  ],
  "pathwayATotal": "$X-Y total",
  "pathwayBCapital": [
    {"phase": "...", "timeline": "...", "capitalRequired": "...", "cumulative": "...", "keyExpenditures": "..."}
  ],
  "pathwayBTotal": "$X-Y total",
  "fundingSources": ["source 1 with Ghana context", "source 2", "..."],
  "budgetAlignment": "Analysis of how capital requirements compare to stated investmentRange and budget constraints"
}`,
    `One row per milestone phase from each pathway. Include running cumulative totals.
Provide 4-6 Ghana-specific funding sources (GIPC, GVCTF, bank lending, DFIs, etc.).
TONE: CFO-level capital planning.`
  ),

  "section_g10": jsonPrompt(
    "SWOT Analysis — strategic position assessment",
    `{
  "strategicInterpretation": "3-4 sentences connecting SWOT quadrants: how strengths offset threats, how opportunities compensate for weaknesses, key strategic tension points",
  "keyLinkages": [
    {"linkage": "S-O|W-T|S-T|W-O", "dynamic": "what connects them", "implication": "what this means strategically"}
  ]
}`,
    `The template renders the SWOT grid directly from core analysis data.
YOUR JOB: provide the strategic interpretation narrative and 3-4 cross-quadrant linkages.
Each SWOT item is already a complete thought. Your narrative should synthesize across quadrants.
TONE: Strategic. Ghana-specific.`
  ),

  "section_g11": jsonPrompt(
    "Risk Mitigation Pathways — comprehensive risk framework",
    `{
  "riskCategorySummary": [
    {"category": "market|regulatory|operational|financial|political|cultural", "count": 2, "highestImpact": "high", "mitigationTheme": "key theme"}
  ],
  "criticalRiskDeepDives": [
    {"riskDescription": "short title", "impact": "high|critical", "context": "Ghana-specific context", "mitigation": "detailed strategy", "contingency": "what if mitigation fails", "earlyWarning": "indicators to watch"}
  ],
  "pathwayARiskNotes": "Which risks are most acute for Pathway A and why",
  "pathwayBRiskNotes": "Which risks are most acute for Pathway B and why"
}`,
    `The template renders the full risk register table from core analysis data.
YOUR JOB: provide category summaries, deep dives on the top 3 risks, and pathway-specific notes.
Each deep dive needs context, mitigation, contingency, AND early warning indicators.
TONE: Risk management professional. Specific, not alarmist.`
  ),

  "section_g12": jsonPrompt(
    "Regulatory & Legal Landscape — Ghana compliance guide",
    `{
  "entityFormation": [
    {"step": "step name", "authority": "RGD|GIPC|GRA|etc.", "requirement": "details", "timeline": "X days/weeks", "costEstimate": "$X"}
  ],
  "foreignInvestment": [
    {"requirement": "requirement name", "threshold": "$X", "appliesToA": "Yes/No/Conditional", "appliesToB": "Yes/No/Conditional"}
  ],
  "sectorLicensing": [
    {"license": "license name", "authority": "issuing body", "requirement": "what's needed", "renewal": "Annual|Biennial|etc."}
  ],
  "ongoingCompliance": ["requirement 1", "requirement 2", "..."],
  "keyLegalConsiderations": ["consideration 1", "consideration 2", "..."]
}`,
    `Provide 5-8 entity formation steps, 4-6 foreign investment requirements, 3-5 sector licenses, 4-6 compliance items, 4-6 legal considerations.
Reference actual Ghana authorities: RGD, GIPC, GRA, SSNIT, EPA, FDA, NCA, etc.
TONE: Legal reference quality. Precise, structured, authoritative.`
  ),

  "section_g13": jsonPrompt(
    "Ghana Investment Incentives & Tax Environment",
    `{
  "corporateTax": [
    {"taxType": "Corporate Income Tax", "standardRate": "25%", "incentiveRate": "rate or N/A", "eligibility": "conditions"}
  ],
  "gipcIncentives": [
    {"incentive": "name", "benefit": "description", "duration": "X years", "pathwayAEligible": "Yes/No/Conditional", "pathwayBEligible": "Yes/No/Conditional"}
  ],
  "freeZonesNarrative": "Overview of GFZB: 10-year tax holiday, duty-free imports, 100% foreign ownership",
  "freeZoneBenefits": [
    {"benefit": "name", "details": "specifics", "conditions": "requirements"}
  ],
  "sectorSpecificIncentives": "Based on pathways and sector interest — specific incentive regimes",
  "doubleTaxation": "Ghana's DTA network and relevant treaties",
  "investmentProtection": ["protection 1", "protection 2", "..."]
}`,
    `Provide 4-6 tax types, 4-6 GIPC incentives, 3-5 free zone benefits, 3-5 investment protections.
Reference actual legislation: GIPC Act 2013, Income Tax Act 2015, Free Zones Act 1995, etc.
TONE: Tax advisory quality. Specific rates, clear eligibility.`
  ),

  "section_g0": jsonPrompt(
    "Executive Summary — standalone intelligence brief synthesizing all analytical findings",
    `{
  "coreFinding": "2-3 sentences: Name the attendee's core transferable capability (not job title), name the specific Ghana gap it maps to (with one quantified data point from knowledge files), state the signal classification and friction classification of the highest-scoring pathway. Direct, specific, grounded. No promotional language.",

  "pathwayA": {
    "name": "pathway name from A-1a",
    "classificationBadge": "e.g. Structured Opportunity 20/25",
    "pivotType": "Direct Translation | Skills Transfer | Formalization | Industry",
    "merit": "1-2 sentences: single strongest structural advantage — from highest-scoring Opportunity Signal criterion OR competitive landscape white space",
    "constraint": "1-2 sentences: single most consequential barrier — from lowest-scoring criterion, regulatory block, OR strongest counterargument. If structurally blocked, state plainly."
  },
  "pathwayB": {
    "name": "...",
    "classificationBadge": "...",
    "pivotType": "...",
    "merit": "...",
    "constraint": "..."
  },

  "sam": {
    "value": "$XM",
    "context": "narrowed from $YM TAM through documented decomposition specific to [sub-segment]"
  },
  "monteCarloPre": "Run the 10,000-scenario simulation below to generate your personalized Year 5 revenue estimate.",
  "capitalEntry": {
    "value": "$200K (JV) or $500K (wholly foreign) GIPC minimum",
    "context": "A pre-commitment market test is available at $X-Y before any capital is locked."
  },

  "criticalRisks": [
    {"pathwayTag": "Pathway A|Pathway B|Both Pathways", "risk": "1-3 sentences: name risk, quantify/contextualize, explain decision relevance"}
  ],

  "whatToDoFirst": "2-3 sentences: the single lowest-risk, highest-information action. Must include specific dollar figure, specific activity, specific information output. NOT 'learn more' or 'consult advisors.'",

  "summitConnections": [
    {"connectionType": "specific entity/institution type (e.g. 'Ghanaian JV partner with CTVET accreditation')", "rationale": "why this connection matters for THIS attendee's pathway"}
  ]
}`,
    `CRITICAL RULES:
1. This is a SYNTHESIS of completed analysis — extract, do not re-analyze.
2. Component 1 must name the attendee's transferable CAPABILITY (not job title) and a SPECIFIC Ghana gap with a quantified data point.
3. Component 2 must give EQUAL weight to both pathways. Neither may receive more favorable framing. If a pathway is structurally blocked, state the block plainly.
4. Component 3 SAM must match the Step 3A decomposition. Capital entry must reference GIPC thresholds from knowledge files.
5. Component 4: Maximum 3 risks. Each MUST have a pathway tag. Prefer structural/strategic risks over operational ones with known mitigations. No generic risk language.
6. Component 5: Must be a CONCRETE action with a dollar figure. Not vague. Source from Output 4 Quick Wins.
7. Component 6: Maximum 3 connections. Must name SPECIFIC entity types from Output 5 — not generic categories like "partners" or "advisors."
8. PROHIBITED: "We recommend," "exciting opportunity," "perfect fit," any promotional language.
TONE: Intelligence brief. Professional, dense with signal, no wasted space. Warmth comes from specificity.`
  ),

  "section_g14": jsonPrompt(
    "Competitive Landscape Overview — market positioning",
    `{
  "competitiveAdvantages": "Analysis of subject's competencies that create defensible advantages against each competitor type",
  "pathwayAPositioning": "How to position against competitors in Pathway A's market",
  "pathwayBPositioning": "How to position in Pathway B's market",
  "informalSectorDynamics": "Analysis of informal competitors — how to coexist, formalize, or differentiate. This is critical for Ghana."
}`,
    `The template renders competitor profile tables and white space tables from core analysis data.
YOUR JOB: provide the strategic narratives — competitive advantages, positioning per pathway, and informal sector analysis.
TONE: Competitive intelligence analyst. Specific to Ghana market structures.`
  ),

};
