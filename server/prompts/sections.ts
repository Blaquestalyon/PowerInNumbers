// Section prompt modules for all 21 report sections (K-1..K-6, G-1..G-15).
// Each prompt instructs the LLM to produce a single HTML <section> fragment.

// ─── Shared preamble injected into every section prompt ──────────────
const SECTION_PREAMBLE = `
ABSOLUTE RULES — APPLY TO EVERY SECTION:
1. Return ONLY a JSON object: {"html": "<section>...</section>"}
2. The root element MUST be <section id="output-{CODE}" class="report-section"> where {CODE} is your section code.
3. NEVER include <script>, <html>, <head>, <body>, or <style> tags.
4. NEVER change scores, classifications, numeric values, or any data from the core analysis. Render them exactly as provided.
5. Use ONLY these CSS classes (they exist in the report stylesheet):
   - Layout: section-header, section-title, section-subtitle, section-body
   - Metrics: metric-pill, metric-value, metric-label
   - Tables: data-table, data-table th, data-table td
   - Risk: risk-badge, risk-badge--high, risk-badge--moderate, risk-badge--low
   - Pathways: pathway-card, pathway-card--a, pathway-card--b
   - VERIDEX: veridex-badge, veridex-score
   - Timeline: timeline-phase, timeline-milestone
   - Charts: chart-container
   - Disclosure: disclosure-block, limitation-note
   - Citations: source-citation, data-vintage
6. All monetary values must show currency denomination.
7. Include <span class="data-vintage"> for any data point with a known vintage.
8. Add <div class="disclosure-block"> at section end for any limitations or caveats.
`.trim();

function sectionPrompt(code: string, body: string): string {
  return `${SECTION_PREAMBLE}\n\nSECTION CODE: ${code}\n\n${body}`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STAGE 1 — KIOSK SECTIONS (K-1 through K-6)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const K1_PROMPT = sectionPrompt("K-1", `
ROLE: Kiosk Summary Hero — the first thing the attendee sees. This is the executive overview card.

INPUTS CONSUMED:
- i1_profile.name, i1_profile.industry, i1_profile.role, i1_profile.yearsExperience
- pathways[0].label, pathways[0].title, pathways[0].opportunityScore
- pathways[1].label, pathways[1].title, pathways[1].opportunityScore
- VERIDEX overall score (average of veridexScores[].score)
- Top competency by relevanceToGhana

REQUIRED HTML STRUCTURE:
<section id="output-K-1" class="report-section">
  <div class="section-header">
    <h2 class="section-title">[Attendee Name] — Ghana Market Intelligence Brief</h2>
    <p class="section-subtitle">Power In Numbers Summit | Personalized Analysis</p>
  </div>
  <div class="section-body">
    <!-- Hero stats row: 3-4 metric pills -->
    <div class="hero-stats">
      <div class="metric-pill">
        <span class="metric-value">[yearsExperience]</span>
        <span class="metric-label">Years Experience</span>
      </div>
      <div class="metric-pill">
        <span class="metric-value">[industry]</span>
        <span class="metric-label">Primary Sector</span>
      </div>
      <div class="metric-pill">
        <span class="metric-value">[top competency relevance]</span>
        <span class="metric-label">Ghana Relevance Score</span>
      </div>
    </div>
    <!-- Pathway headline cards -->
    <div class="pathway-card pathway-card--a">
      <h3>[Pathway A title]</h3>
      <span class="metric-pill"><span class="metric-value">[score]</span><span class="metric-label">Opportunity</span></span>
    </div>
    <div class="pathway-card pathway-card--b">
      <h3>[Pathway B title]</h3>
      <span class="metric-pill"><span class="metric-value">[score]</span><span class="metric-label">Opportunity</span></span>
    </div>
    <!-- VERIDEX confidence badge -->
    <div class="veridex-badge">
      <span class="veridex-score">[avg veridex score]</span>
      Data Confidence Index
    </div>
  </div>
</section>

TONE: Bold, high-impact, first-impression. Like opening a strategy deck. No fluff.
`);

const K2_PROMPT = sectionPrompt("K-2", `
ROLE: Signal & Friction Snapshot — shows the Opportunity Signal Matrix summary with top signals and frictions.

INPUTS CONSUMED:
- pathways[].opportunityScore, pathways[].riskScore, pathways[].frictionScore
- competencies[] (top 3 by relevanceToGhana as signals)
- developmentGaps[] (top 3 by severity as frictions)
- risks[] (top risks as friction contributors)

REQUIRED HTML STRUCTURE:
<section id="output-K-2" class="report-section">
  <div class="section-header">
    <h2 class="section-title">Signal & Friction Snapshot</h2>
    <p class="section-subtitle">Opportunity Signal Matrix — Key Indicators</p>
  </div>
  <div class="section-body">
    <!-- Signal/Friction score overview -->
    <div class="signal-friction-overview">
      <!-- For each pathway: opportunity, risk, friction scores as metric pills -->
    </div>

    <!-- Top 3 Opportunity Signals -->
    <h3 class="section-subtitle">Top Opportunity Signals</h3>
    <table class="data-table">
      <thead><tr><th>Signal</th><th>Category</th><th>Ghana Relevance</th><th>Evidence</th></tr></thead>
      <tbody>
        <!-- 3 rows: competency name, category, relevanceToGhana score, evidence snippet -->
      </tbody>
    </table>

    <!-- Top 3 Frictions -->
    <h3 class="section-subtitle">Top Friction Points</h3>
    <table class="data-table">
      <thead><tr><th>Friction</th><th>Severity</th><th>Mitigation Path</th><th>Time to Close</th></tr></thead>
      <tbody>
        <!-- 3 rows from developmentGaps: name, severity badge, mitigationPath, timeToClose -->
      </tbody>
    </table>
  </div>
</section>

Use <span class="risk-badge risk-badge--{severity}"> for severity indicators.
TONE: Concise, data-dense. Like a trading dashboard snapshot.
`);

const K3_PROMPT = sectionPrompt("K-3", `
ROLE: Dual Pathway Teaser — brief comparison cards for Pathway A vs Pathway B.

INPUTS CONSUMED:
- pathways[0] (Pathway A): label, title, description, opportunityScore, riskScore, frictionScore, tam.value, quickWins (first 2)
- pathways[1] (Pathway B): same fields

REQUIRED HTML STRUCTURE:
<section id="output-K-3" class="report-section">
  <div class="section-header">
    <h2 class="section-title">Your Two Pathways</h2>
    <p class="section-subtitle">Dual opportunity analysis tailored to your profile</p>
  </div>
  <div class="section-body">
    <!-- Side-by-side pathway cards -->
    <div class="pathway-card pathway-card--a">
      <h3>[Pathway A label]: [title]</h3>
      <p>[description — first 2-3 sentences]</p>
      <div class="metric-pill"><span class="metric-value">[opportunityScore]</span><span class="metric-label">Opportunity</span></div>
      <div class="metric-pill"><span class="metric-value">[riskScore]</span><span class="metric-label">Risk</span></div>
      <div class="metric-pill"><span class="metric-value">[frictionScore]</span><span class="metric-label">Friction</span></div>
      <p><strong>TAM:</strong> [tam.value]</p>
      <p><strong>Quick Wins:</strong> [first 2 quickWins]</p>
    </div>
    <div class="pathway-card pathway-card--b">
      <!-- Same structure for Pathway B -->
    </div>
  </div>
</section>

TONE: Inviting comparison. Make it obvious these are distinct, not just variations. Each card should feel like a clear strategic fork.
`);

const K4_PROMPT = sectionPrompt("K-4", `
ROLE: Quick Wins — 3-5 immediate actionable items the attendee can start on now.

INPUTS CONSUMED:
- pathways[0].quickWins, pathways[1].quickWins (merge and deduplicate, select top 3-5)
- competencies[] (to contextualize which wins leverage existing skills)
- i3_objectives.timeHorizon, i4_constraints.budget

REQUIRED HTML STRUCTURE:
<section id="output-K-4" class="report-section">
  <div class="section-header">
    <h2 class="section-title">Quick Wins</h2>
    <p class="section-subtitle">Actions you can take in the next 30-90 days</p>
  </div>
  <div class="section-body">
    <!-- Numbered action items, each with: -->
    <ol>
      <li>
        <strong>[Action Title]</strong>
        <p>[1-2 sentence description of what to do and why]</p>
        <div class="metric-pill"><span class="metric-value">[timeline]</span><span class="metric-label">Timeline</span></div>
        <div class="metric-pill"><span class="metric-value">[pathway]</span><span class="metric-label">Pathway</span></div>
      </li>
      <!-- 3-5 items -->
    </ol>
  </div>
</section>

TONE: Action-oriented, imperative verbs. "Register with GIPC" not "Consider registering". Specific to Ghana, not generic advice.
`);

const K5_PROMPT = sectionPrompt("K-5", `
ROLE: Summit Connections — relevant networking suggestions based on the attendee's profile and pathways.

INPUTS CONSUMED:
- pathways[].title, pathways[].description
- competencies[] (to identify complementary skills needed)
- developmentGaps[] (to suggest connections that fill gaps)
- i1_profile.industry, i2_context.sectorInterest

REQUIRED HTML STRUCTURE:
<section id="output-K-5" class="report-section">
  <div class="section-header">
    <h2 class="section-title">Summit Connections</h2>
    <p class="section-subtitle">Recommended networking priorities at Power In Numbers</p>
  </div>
  <div class="section-body">
    <!-- 3-5 connection type recommendations -->
    <div class="connection-card">
      <h3>[Connection Type — e.g., "Local Logistics Partner"]</h3>
      <p>[Why this connection matters for your Ghana entry]</p>
      <p><strong>Look for:</strong> [Specific profile characteristics to seek at the summit]</p>
      <p><strong>Opens pathway to:</strong> [Which pathway/gap this addresses]</p>
    </div>
    <!-- Repeat for each connection type -->
  </div>
</section>

Do NOT name specific individuals. Describe connection archetypes relevant to the subject's pathway.
TONE: Strategic networking guidance, not generic "meet people" advice.
`);

const K6_PROMPT = sectionPrompt("K-6", `
ROLE: Next Step CTA — call to action for the full Stage 3 report.

INPUTS CONSUMED:
- i1_profile.name
- pathways[0].title, pathways[1].title
- Overall VERIDEX score
- Count of sections available in Stage 3 (15)

REQUIRED HTML STRUCTURE:
<section id="output-K-6" class="report-section">
  <div class="section-header">
    <h2 class="section-title">Unlock Your Full Analysis</h2>
    <p class="section-subtitle">Your Kiosk Brief covers the highlights — the full report goes deep</p>
  </div>
  <div class="section-body">
    <p>[1-2 sentences personalizing why the full report matters for this specific attendee]</p>

    <!-- What the full report includes -->
    <h3 class="section-subtitle">Your Full Report Includes</h3>
    <ul>
      <li>Monte Carlo probabilistic market simulation (10,000 scenarios)</li>
      <li>Detailed competitive landscape analysis</li>
      <li>Capital requirement estimates by phase</li>
      <li>Regulatory & legal landscape for Ghana entry</li>
      <li>Ghana investment incentives & tax environment</li>
      <li>Risk mitigation pathways</li>
      <li>Realistic timeline projections</li>
      <li>...and [N] more specialized sections</li>
    </ul>

    <!-- CTA -->
    <div class="cta-block">
      <p><strong>Request your full personalized report →</strong></p>
    </div>

    <div class="disclosure-block">
      <p class="limitation-note">This Kiosk Brief is generated from AI analysis with VERIDEX data integrity scoring. Full report provides deeper validation and quantitative modeling.</p>
    </div>
  </div>
</section>

TONE: Compelling but not salesy. Emphasize analytical depth, not marketing language.
`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STAGE 3 — FULL REPORT SECTIONS (G-1 through G-15)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const G1_PROMPT = sectionPrompt("G-1", `
ROLE: Personalized Opportunity Simulation — the flagship analytical section. Full competency analysis, development gap mapping, and composite opportunity scoring.

INPUTS CONSUMED:
- competencies[] (all — render full table)
- developmentGaps[] (all — render full table)
- pathways[].opportunityScore, pathways[].riskScore, pathways[].frictionScore
- i1_profile (all fields for context)

REQUIRED HTML STRUCTURE:
<section id="output-G-1" class="report-section">
  <div class="section-header">
    <h2 class="section-title">Personalized Opportunity Simulation</h2>
    <p class="section-subtitle">Competency-Market Alignment & Gap Analysis</p>
  </div>
  <div class="section-body">
    <!-- Introductory paragraph contextualizing the analysis -->
    <p>[2-3 sentence executive context about this individual's Ghana opportunity profile]</p>

    <!-- Competency Analysis Table -->
    <h3 class="section-subtitle">Competency Profile</h3>
    <table class="data-table">
      <thead>
        <tr><th>Competency</th><th>Category</th><th>Proficiency</th><th>Ghana Relevance</th><th>Evidence</th></tr>
      </thead>
      <tbody>
        <!-- One row per competency, ordered by relevanceToGhana descending -->
        <!-- relevanceToGhana rendered as metric-pill inside td -->
      </tbody>
    </table>

    <!-- Competency Category Summary -->
    <h3 class="section-subtitle">Category Distribution</h3>
    <p>[Summary of how competencies distribute across categories, which areas are strong/weak]</p>

    <!-- Development Gap Analysis -->
    <h3 class="section-subtitle">Development Gaps</h3>
    <table class="data-table">
      <thead>
        <tr><th>Gap</th><th>Severity</th><th>Description</th><th>Mitigation Path</th><th>Time to Close</th></tr>
      </thead>
      <tbody>
        <!-- One row per gap, severity rendered as risk-badge -->
        <!-- <span class="risk-badge risk-badge--{severity}">{severity}</span> -->
      </tbody>
    </table>

    <!-- Composite Opportunity Scores -->
    <h3 class="section-subtitle">Composite Opportunity Scores</h3>
    <div class="pathway-card pathway-card--a">
      <h4>Pathway A</h4>
      <div class="metric-pill"><span class="metric-value">[opportunityScore]</span><span class="metric-label">Opportunity</span></div>
      <div class="metric-pill"><span class="metric-value">[riskScore]</span><span class="metric-label">Risk</span></div>
      <div class="metric-pill"><span class="metric-value">[frictionScore]</span><span class="metric-label">Friction</span></div>
    </div>
    <div class="pathway-card pathway-card--b">
      <!-- Same for Pathway B -->
    </div>

    <div class="disclosure-block">
      <p class="limitation-note">Competency proficiency levels are inferred from intake self-assessment and role history. Independent verification is recommended for critical business decisions.</p>
    </div>
  </div>
</section>

TONE: Analytical, thorough. This is the deepest competency section — treat it like a management consulting skills assessment. Be specific, not generic.
`);

const G2_PROMPT = sectionPrompt("G-2", `
ROLE: Vertical & Adjacent Opportunity Analysis — deep dive into sector opportunities, adjacent markets, and value chain positions.

INPUTS CONSUMED:
- pathways[] (both — full objects including description, TAM/SAM/SOM)
- competitiveProfiles[] (all)
- competencies[] (industry_knowledge and operational categories)
- i2_context.sectorInterest, i2_context.currentBusiness

REQUIRED HTML STRUCTURE:
<section id="output-G-2" class="report-section">
  <div class="section-header">
    <h2 class="section-title">Vertical & Adjacent Opportunity Analysis</h2>
    <p class="section-subtitle">Sector Deep Dive & Value Chain Mapping</p>
  </div>
  <div class="section-body">
    <!-- Primary sector analysis -->
    <h3 class="section-subtitle">Primary Sector Opportunity</h3>
    <p>[Analysis of the primary sector's Ghana landscape — 3-4 sentences grounded in market data]</p>

    <!-- Pathway TAM/SAM/SOM comparison table -->
    <h3 class="section-subtitle">Market Sizing Comparison</h3>
    <table class="data-table">
      <thead><tr><th>Metric</th><th>Pathway A</th><th>Pathway B</th><th>Source Tier</th><th>Vintage</th></tr></thead>
      <tbody>
        <tr><td>TAM</td><td>[A tam.value]</td><td>[B tam.value]</td><td><span class="source-citation">[tier]</span></td><td><span class="data-vintage">[vintage]</span></td></tr>
        <tr><td>SAM</td><td colspan="4"><!-- same pattern --></td></tr>
        <tr><td>SOM</td><td colspan="4"><!-- same pattern --></td></tr>
      </tbody>
    </table>

    <!-- Adjacent opportunities narrative -->
    <h3 class="section-subtitle">Adjacent Market Opportunities</h3>
    <p>[Analysis of adjacent sectors where competencies transfer — identify 2-3 adjacencies with rationale]</p>

    <!-- Value chain position -->
    <h3 class="section-subtitle">Value Chain Positioning</h3>
    <p>[Where in the value chain each pathway sits, upstream/downstream opportunities]</p>

    <!-- Competitive white space -->
    <h3 class="section-subtitle">Identified White Space</h3>
    <table class="data-table">
      <thead><tr><th>Competitor Archetype</th><th>Type</th><th>White Space</th><th>Saturation</th></tr></thead>
      <tbody>
        <!-- From competitiveProfiles: name, type, whiteSpace, saturationAssessment -->
      </tbody>
    </table>

    <div class="disclosure-block">
      <p class="limitation-note">Market sizing estimates use the source tiers and vintages shown. Tier 3 figures are model estimates and should be validated with primary research.</p>
    </div>
  </div>
</section>

TONE: Market analyst depth. Specific Ghana sectors, not generic emerging-market language.
`);

const G3_PROMPT = sectionPrompt("G-3", `
ROLE: Optimal Market Entry Strategy — entry strategy with phased approach, regulatory steps, and partnership models.

INPUTS CONSUMED:
- pathways[] (both — milestones, description, quickWins)
- risks[] (regulatory category especially)
- competencies[] (operational and managerial categories)
- developmentGaps[]
- i3_objectives.strategicIntent, i3_objectives.timeHorizon
- i4_constraints (all)

REQUIRED HTML STRUCTURE:
<section id="output-G-3" class="report-section">
  <div class="section-header">
    <h2 class="section-title">Optimal Market Entry Strategy</h2>
    <p class="section-subtitle">Phased Entry Framework for Ghana</p>
  </div>
  <div class="section-body">
    <!-- Strategic overview -->
    <p>[2-3 sentences framing the recommended entry approach based on the subject's constraints and objectives]</p>

    <!-- Entry model comparison -->
    <h3 class="section-subtitle">Entry Model Analysis</h3>
    <table class="data-table">
      <thead><tr><th>Entry Model</th><th>Fit for Pathway A</th><th>Fit for Pathway B</th><th>Key Considerations</th></tr></thead>
      <tbody>
        <!-- Rows: JV/Partnership, Wholly Owned Subsidiary, Licensing, Distribution, Franchise — assess each -->
      </tbody>
    </table>

    <!-- Phase 1: Foundation (0-6 months) -->
    <h3 class="section-subtitle">Phase 1: Foundation <span class="timeline-phase">0-6 months</span></h3>
    <ul>
      <!-- Concrete steps: entity registration, GIPC compliance, banking setup, initial hiring, etc. -->
    </ul>

    <!-- Phase 2: Launch (6-18 months) -->
    <h3 class="section-subtitle">Phase 2: Launch <span class="timeline-phase">6-18 months</span></h3>
    <ul>
      <!-- Market entry execution steps -->
    </ul>

    <!-- Phase 3: Scale (18-36 months) -->
    <h3 class="section-subtitle">Phase 3: Scale <span class="timeline-phase">18-36 months</span></h3>
    <ul>
      <!-- Growth and expansion steps -->
    </ul>

    <!-- Critical success factors -->
    <h3 class="section-subtitle">Critical Success Factors</h3>
    <p>[3-5 bullet points on what must go right for each phase]</p>

    <div class="disclosure-block">
      <p class="limitation-note">Entry timelines assume standard regulatory processing times. Actual timelines may vary based on sector-specific licensing requirements and government processing capacity.</p>
    </div>
  </div>
</section>

All phases must reference Ghana-specific steps (GIPC registration, Ghana Investment Promotion Centre, RGD, GRA, etc.).
TONE: Strategic advisory. Concrete, phased, actionable.
`);

const G4_PROMPT = sectionPrompt("G-4", `
ROLE: Quick Wins vs. Long-Term Plays — categorized action items with timelines and effort levels.

INPUTS CONSUMED:
- pathways[0].quickWins, pathways[0].longTermPlays
- pathways[1].quickWins, pathways[1].longTermPlays
- competencies[] (to tag which competency each action leverages)
- i4_constraints.budget, i4_constraints.timeline

REQUIRED HTML STRUCTURE:
<section id="output-G-4" class="report-section">
  <div class="section-header">
    <h2 class="section-title">Quick Wins vs. Long-Term Plays</h2>
    <p class="section-subtitle">Prioritized Action Matrix</p>
  </div>
  <div class="section-body">
    <!-- Quick Wins Table -->
    <h3 class="section-subtitle">Quick Wins <span class="timeline-phase">30-90 days</span></h3>
    <table class="data-table">
      <thead><tr><th>#</th><th>Action</th><th>Pathway</th><th>Effort</th><th>Impact</th><th>Leverages</th></tr></thead>
      <tbody>
        <!-- Merged & deduplicated quickWins from both pathways -->
        <!-- Effort: Low/Med/High with risk-badge styling -->
        <!-- Impact: Low/Med/High with risk-badge styling -->
        <!-- Leverages: which competency this builds on -->
      </tbody>
    </table>

    <!-- Long-Term Plays Table -->
    <h3 class="section-subtitle">Long-Term Plays <span class="timeline-phase">6-36 months</span></h3>
    <table class="data-table">
      <thead><tr><th>#</th><th>Initiative</th><th>Pathway</th><th>Timeline</th><th>Capital</th><th>Strategic Value</th></tr></thead>
      <tbody>
        <!-- Merged longTermPlays with estimated timelines and capital -->
      </tbody>
    </table>

    <!-- Priority matrix narrative -->
    <h3 class="section-subtitle">Sequencing Recommendation</h3>
    <p>[2-3 sentences on optimal ordering — what to do first and why, given constraints]</p>

    <div class="disclosure-block">
      <p class="limitation-note">Effort and impact ratings are relative assessments based on the subject's stated constraints and competency profile.</p>
    </div>
  </div>
</section>

TONE: Execution-focused. Priority rankings should be justified, not arbitrary.
`);

const G5_PROMPT = sectionPrompt("G-5", `
ROLE: Summit Connection Map — detailed networking and partnership opportunities.

INPUTS CONSUMED:
- pathways[] (titles, descriptions — to identify needed partnerships)
- competencies[] (to identify complementary skills)
- developmentGaps[] (to identify knowledge/skill needs)
- competitiveProfiles[] (to identify potential partnership vs. competition dynamics)
- i1_profile.industry, i2_context.sectorInterest

REQUIRED HTML STRUCTURE:
<section id="output-G-5" class="report-section">
  <div class="section-header">
    <h2 class="section-title">Summit Connection Map</h2>
    <p class="section-subtitle">Strategic Networking & Partnership Framework</p>
  </div>
  <div class="section-body">
    <!-- Connection categories -->
    <h3 class="section-subtitle">Priority Connection Types</h3>
    <table class="data-table">
      <thead><tr><th>Connection Type</th><th>Why Critical</th><th>Addresses Gap</th><th>Enables Pathway</th><th>Priority</th></tr></thead>
      <tbody>
        <!-- 6-8 connection archetypes ranked by priority -->
        <!-- E.g., "Ghana-based regulatory consultant", "Local supply chain operator", etc. -->
      </tbody>
    </table>

    <!-- Partnership models -->
    <h3 class="section-subtitle">Potential Partnership Structures</h3>
    <p>[Analysis of which partnership models suit each pathway — JV, advisory, distribution, etc.]</p>

    <!-- Networking strategy -->
    <h3 class="section-subtitle">Summit Engagement Strategy</h3>
    <ol>
      <!-- 4-6 specific, actionable networking tactics for the summit -->
      <!-- E.g., "Seek introductions to Accra-based logistics operators who serve the [sector] value chain" -->
    </ol>

    <!-- Key questions to ask -->
    <h3 class="section-subtitle">Qualifying Questions</h3>
    <p>[5-7 specific questions the attendee should ask potential partners to assess fit]</p>

    <div class="disclosure-block">
      <p class="limitation-note">Connection recommendations are based on analytical profile matching. Individual due diligence is essential before entering any partnership.</p>
    </div>
  </div>
</section>

Do NOT name specific individuals or companies. Describe archetypes with enough specificity to be useful.
TONE: Strategic relationship intelligence. Specific to Ghana business culture and norms.
`);

const G6_PROMPT = sectionPrompt("G-6", `
ROLE: Realistic Timeline Projections — Gantt-style milestone timeline for both pathways.

INPUTS CONSUMED:
- pathways[0].milestones, pathways[1].milestones
- pathways[0].label, pathways[0].title, pathways[1].label, pathways[1].title
- risks[] (to flag timeline risks)
- i3_objectives.timeHorizon
- i4_constraints.timeline

REQUIRED HTML STRUCTURE:
<section id="output-G-6" class="report-section">
  <div class="section-header">
    <h2 class="section-title">Realistic Timeline Projections</h2>
    <p class="section-subtitle">Phased Milestone Roadmap</p>
  </div>
  <div class="section-body">
    <!-- Pathway A Timeline -->
    <h3 class="section-subtitle">Pathway A: [title]</h3>
    <table class="data-table">
      <thead><tr><th>Phase</th><th>Timeline</th><th>Milestone</th><th>Capital Required</th><th>Key Risk</th></tr></thead>
      <tbody>
        <!-- One row per milestone from pathway A -->
        <!-- Timeline rendered in timeline-milestone span -->
        <!-- Capital with currency denomination -->
      </tbody>
    </table>

    <!-- Pathway B Timeline -->
    <h3 class="section-subtitle">Pathway B: [title]</h3>
    <table class="data-table">
      <!-- Same structure for Pathway B milestones -->
    </table>

    <!-- Timeline comparison -->
    <h3 class="section-subtitle">Comparative Timeline View</h3>
    <!-- Visual timeline representation using div-based Gantt bars -->
    <div class="timeline-gantt">
      <!-- For each pathway, show phases as horizontal bars with timeline-phase class -->
      <!-- Each bar: <div class="timeline-phase" style="width: [proportional]%">[phase name] ([timeline])</div> -->
    </div>

    <!-- Risk-adjusted timeline notes -->
    <h3 class="section-subtitle">Timeline Risk Factors</h3>
    <ul>
      <!-- 3-5 factors that could delay timelines, sourced from risks[] -->
    </ul>

    <div class="disclosure-block">
      <p class="limitation-note">Timelines assume standard processing and do not account for extraordinary delays. Add 20-30% buffer for Ghana regulatory processes.</p>
    </div>
  </div>
</section>

TONE: Realistic, not optimistic. Flag known delay risks (Ghana regulatory timelines, seasonal factors, etc.).
`);

const G7_PROMPT = sectionPrompt("G-7", `
ROLE: Probabilistic Market Outlook (Monte Carlo) — MC visualization hooks, assumptions table, scenario narratives.

INPUTS CONSUMED:
- pathwayQuant[] from A-1b (both pathways — revenueDistribution, growthRate, assumptions, scenarioEnvelope, scenarioNarratives)
- veridexScores[] (for confidence context)
- pathways[].title, pathways[].label

REQUIRED HTML STRUCTURE:
<section id="output-G-7" class="report-section">
  <div class="section-header">
    <h2 class="section-title">Probabilistic Market Outlook</h2>
    <p class="section-subtitle">Monte Carlo Simulation — 10,000 Scenarios</p>
  </div>
  <div class="section-body">
    <!-- Overview -->
    <p>[2-3 sentences explaining what the Monte Carlo simulation models and why it matters]</p>

    <!-- Pathway A Monte Carlo -->
    <h3 class="section-subtitle">Pathway A: [title]</h3>

    <!-- Canvas for MC chart — JS engine reads data-* attributes -->
    <div class="chart-container">
      <canvas
        id="mc-chart-pathway-a"
        data-pathway-id="pathway-a"
        data-simulations="10000"
        data-distribution-type="[revenueDistribution.type]"
        data-distribution-mean="[revenueDistribution.mean]"
        data-distribution-stddev="[revenueDistribution.stdDev]"
        data-distribution-min="[revenueDistribution.min]"
        data-distribution-max="[revenueDistribution.max]"
        data-growth-base="[growthRate.base]"
        data-growth-optimistic="[growthRate.optimistic]"
        data-growth-pessimistic="[growthRate.pessimistic]"
        data-p5="[scenarioEnvelope.p5]"
        data-p10="[scenarioEnvelope.p10]"
        data-p25="[scenarioEnvelope.p25]"
        data-p50="[scenarioEnvelope.p50]"
        data-p75="[scenarioEnvelope.p75]"
        data-p90="[scenarioEnvelope.p90]"
        data-p95="[scenarioEnvelope.p95]"
        data-year-start="[yearRange[0]]"
        data-year-end="[yearRange[1]]"
        width="800" height="400">
      </canvas>
    </div>

    <!-- Scenario Envelope Table -->
    <table class="data-table">
      <thead><tr><th>Percentile</th><th>P5</th><th>P10</th><th>P25</th><th>P50</th><th>P75</th><th>P90</th><th>P95</th></tr></thead>
      <tbody>
        <tr><td>Annual Revenue</td><td>[p5]</td><td>[p10]</td><td>[p25]</td><td>[p50]</td><td>[p75]</td><td>[p90]</td><td>[p95]</td></tr>
      </tbody>
    </table>

    <!-- Pathway B Monte Carlo (same structure) -->
    <h3 class="section-subtitle">Pathway B: [title]</h3>
    <div class="chart-container">
      <canvas id="mc-chart-pathway-b" data-pathway-id="pathway-b" ...>
      </canvas>
    </div>
    <!-- Pathway B scenario table -->

    <!-- Assumptions Table -->
    <h3 class="section-subtitle">Key Assumptions</h3>
    <table class="data-table">
      <thead><tr><th>Assumption</th><th>Value</th><th>Source</th><th>Tier</th><th>Vintage</th></tr></thead>
      <tbody>
        <!-- One row per assumption from pathwayQuant[].assumptions -->
        <!-- Source tier as source-citation, vintage as data-vintage -->
      </tbody>
    </table>

    <!-- Scenario Narratives -->
    <h3 class="section-subtitle">Scenario Narratives</h3>
    <div class="scenario-narrative">
      <h4><span class="risk-badge risk-badge--high">Downside (P10)</span></h4>
      <p>[scenarioNarratives.downside]</p>
    </div>
    <div class="scenario-narrative">
      <h4><span class="risk-badge risk-badge--moderate">Baseline (P50)</span></h4>
      <p>[scenarioNarratives.baseline]</p>
    </div>
    <div class="scenario-narrative">
      <h4><span class="risk-badge risk-badge--low">Upside (P90)</span></h4>
      <p>[scenarioNarratives.upside]</p>
    </div>

    <div class="disclosure-block">
      <p class="limitation-note">Monte Carlo simulations are projections based on assumed distributions and growth rates. They illustrate the range of possible outcomes, not predictions. Source tiers and data vintages are shown — Tier 3 values are model estimates.</p>
    </div>
  </div>
</section>

CRITICAL: The <canvas> elements MUST include all data-* attributes with EXACT numeric values from pathwayQuant. The frontend JS engine reads these to render the charts. Do not round or modify values.
TONE: Quantitative, transparent about uncertainty. Like a financial model appendix.
`);

const G8_PROMPT = sectionPrompt("G-8", `
ROLE: Specific Resource Requirements — human capital, infrastructure, technology, and operational needs.

INPUTS CONSUMED:
- pathways[] (both — milestones, description)
- competencies[] (to identify what the subject brings vs. needs to hire)
- developmentGaps[] (skills that must be externally sourced)
- i4_constraints.budget

REQUIRED HTML STRUCTURE:
<section id="output-G-8" class="report-section">
  <div class="section-header">
    <h2 class="section-title">Specific Resource Requirements</h2>
    <p class="section-subtitle">Human Capital, Infrastructure & Technology Needs</p>
  </div>
  <div class="section-body">
    <!-- Human Capital Requirements -->
    <h3 class="section-subtitle">Human Capital</h3>
    <table class="data-table">
      <thead><tr><th>Role</th><th>Priority</th><th>Phase Needed</th><th>Ghana Market Rate</th><th>Pathway</th></tr></thead>
      <tbody>
        <!-- 5-8 key roles needed, with estimated Ghana compensation ranges -->
        <!-- Priority as risk-badge -->
      </tbody>
    </table>

    <!-- Infrastructure Requirements -->
    <h3 class="section-subtitle">Infrastructure</h3>
    <table class="data-table">
      <thead><tr><th>Requirement</th><th>Type</th><th>Estimated Cost</th><th>Phase</th><th>Notes</th></tr></thead>
      <tbody>
        <!-- Office/warehouse/factory space, utilities, connectivity, etc. -->
      </tbody>
    </table>

    <!-- Technology Requirements -->
    <h3 class="section-subtitle">Technology Stack</h3>
    <table class="data-table">
      <thead><tr><th>System</th><th>Purpose</th><th>Estimated Cost</th><th>Build vs. Buy</th></tr></thead>
      <tbody>
        <!-- ERP, CRM, payment processing, mobile money integration, etc. -->
      </tbody>
    </table>

    <!-- Operational requirements narrative -->
    <h3 class="section-subtitle">Operational Considerations</h3>
    <p>[Ghana-specific operational factors: power reliability (consider backup generator), logistics infrastructure, banking relationship needs, mobile money ecosystem, etc.]</p>

    <div class="disclosure-block">
      <p class="limitation-note">Cost estimates are based on Ghana market rates as of available data. Actual costs vary by location (Accra vs. secondary cities), negotiation, and market conditions.</p>
    </div>
  </div>
</section>

All costs in USD with GHS equivalent where relevant. Reference Ghana-specific infrastructure realities.
TONE: Practical operations planning. Specific to Ghana business environment.
`);

const G9_PROMPT = sectionPrompt("G-9", `
ROLE: Capital Requirement Estimate by Stage — phased capital deployment table for both pathways.

INPUTS CONSUMED:
- pathways[0].milestones, pathways[1].milestones (capitalRequired per phase)
- pathwayQuant[] from A-1b (scenarioEnvelope for revenue context)
- i3_objectives.investmentRange
- i4_constraints.budget

REQUIRED HTML STRUCTURE:
<section id="output-G-9" class="report-section">
  <div class="section-header">
    <h2 class="section-title">Capital Requirement Estimate by Stage</h2>
    <p class="section-subtitle">Phased Investment Framework</p>
  </div>
  <div class="section-body">
    <!-- Pathway A Capital Table -->
    <h3 class="section-subtitle">Pathway A: [title]</h3>
    <table class="data-table">
      <thead><tr><th>Phase</th><th>Timeline</th><th>Capital Required</th><th>Cumulative</th><th>Key Expenditures</th></tr></thead>
      <tbody>
        <!-- One row per milestone, with running cumulative total -->
        <!-- capitalRequired rendered with currency -->
      </tbody>
      <tfoot>
        <tr><td colspan="2"><strong>Total</strong></td><td colspan="3"><strong>[total capital Pathway A]</strong></td></tr>
      </tfoot>
    </table>

    <!-- Pathway B Capital Table (same structure) -->
    <h3 class="section-subtitle">Pathway B: [title]</h3>
    <table class="data-table">
      <!-- Same structure -->
    </table>

    <!-- Comparison summary -->
    <h3 class="section-subtitle">Capital Comparison</h3>
    <div class="pathway-card pathway-card--a">
      <div class="metric-pill"><span class="metric-value">[Pathway A total]</span><span class="metric-label">Total Investment</span></div>
      <div class="metric-pill"><span class="metric-value">[P50 revenue]</span><span class="metric-label">P50 Revenue</span></div>
    </div>
    <div class="pathway-card pathway-card--b">
      <!-- Same for Pathway B -->
    </div>

    <!-- Funding sources -->
    <h3 class="section-subtitle">Potential Funding Sources (Ghana)</h3>
    <ul>
      <!-- Ghana-specific: GIPC facilitated, Ghana Venture Capital Trust Fund, bank lending landscape, DFI facilities, etc. -->
    </ul>

    <!-- Alignment with stated budget -->
    <h3 class="section-subtitle">Budget Alignment Assessment</h3>
    <p>[Analysis of how capital requirements compare to subject's stated investmentRange and budget constraints]</p>

    <div class="disclosure-block">
      <p class="limitation-note">Capital estimates are order-of-magnitude projections. Detailed financial modeling with local accounting input is recommended before commitment.</p>
    </div>
  </div>
</section>

TONE: CFO-level capital planning. Precise about phases and cumulative commitments.
`);

const G10_PROMPT = sectionPrompt("G-10", `
ROLE: SWOT Analysis — full SWOT rendered with Ghana-specific context.

INPUTS CONSUMED:
- swot.strengths, swot.weaknesses, swot.opportunities, swot.threats (from A-1a)
- competencies[] (for strength context)
- developmentGaps[] (for weakness context)
- risks[] (for threat context)

REQUIRED HTML STRUCTURE:
<section id="output-G-10" class="report-section">
  <div class="section-header">
    <h2 class="section-title">SWOT Analysis</h2>
    <p class="section-subtitle">Strategic Position Assessment — Ghana Market Context</p>
  </div>
  <div class="section-body">
    <!-- SWOT Grid — 2x2 layout -->
    <div class="swot-grid">
      <div class="swot-quadrant swot-strengths">
        <h3 class="section-subtitle">Strengths</h3>
        <ul>
          <!-- One <li> per strength from swot.strengths -->
        </ul>
      </div>
      <div class="swot-quadrant swot-weaknesses">
        <h3 class="section-subtitle">Weaknesses</h3>
        <ul>
          <!-- One <li> per weakness -->
        </ul>
      </div>
      <div class="swot-quadrant swot-opportunities">
        <h3 class="section-subtitle">Opportunities</h3>
        <ul>
          <!-- One <li> per opportunity -->
        </ul>
      </div>
      <div class="swot-quadrant swot-threats">
        <h3 class="section-subtitle">Threats</h3>
        <ul>
          <!-- One <li> per threat -->
        </ul>
      </div>
    </div>

    <!-- SWOT Narrative -->
    <h3 class="section-subtitle">Strategic Interpretation</h3>
    <p>[3-4 sentence analysis connecting SWOT quadrants: how strengths offset threats, how opportunities compensate for weaknesses, key strategic tension points]</p>

    <!-- Cross-quadrant linkages -->
    <h3 class="section-subtitle">Key Strategic Linkages</h3>
    <table class="data-table">
      <thead><tr><th>Linkage</th><th>Dynamic</th><th>Implication</th></tr></thead>
      <tbody>
        <!-- 3-4 rows showing S-O, W-T, S-T, W-O connections -->
      </tbody>
    </table>

    <div class="disclosure-block">
      <p class="limitation-note">SWOT elements are derived from profile analysis and Ghana market assessment. External factors reflect conditions as of the analysis date.</p>
    </div>
  </div>
</section>

TONE: Strategic. Each SWOT item should be a complete thought, not a fragment. Ghana-specific, not generic.
`);

const G11_PROMPT = sectionPrompt("G-11", `
ROLE: Risk Mitigation Pathways — risk matrix with detailed mitigation strategies.

INPUTS CONSUMED:
- risks[] (all — from A-1a)
- veridexScores[] (risk-related gates for confidence context)
- pathways[] (to contextualize pathway-specific risks)

REQUIRED HTML STRUCTURE:
<section id="output-G-11" class="report-section">
  <div class="section-header">
    <h2 class="section-title">Risk Mitigation Pathways</h2>
    <p class="section-subtitle">Comprehensive Risk Assessment & Response Framework</p>
  </div>
  <div class="section-body">
    <!-- Risk Matrix Table -->
    <h3 class="section-subtitle">Risk Register</h3>
    <table class="data-table">
      <thead><tr><th>Risk</th><th>Category</th><th>Likelihood</th><th>Impact</th><th>Composite</th><th>Mitigation Strategy</th></tr></thead>
      <tbody>
        <!-- One row per risk, ordered by composite (likelihood x impact) descending -->
        <!-- Likelihood: <span class="risk-badge risk-badge--{level}">{level}</span> -->
        <!-- Impact: same badge pattern -->
        <!-- Composite: calculated label (Critical/High/Moderate/Low) -->
      </tbody>
    </table>

    <!-- Risk by Category Summary -->
    <h3 class="section-subtitle">Risk Distribution by Category</h3>
    <table class="data-table">
      <thead><tr><th>Category</th><th>Count</th><th>Highest Impact</th><th>Key Mitigation Theme</th></tr></thead>
      <tbody>
        <!-- One row per risk category: market, regulatory, operational, financial, political, cultural -->
      </tbody>
    </table>

    <!-- Top 3 Risks Deep Dive -->
    <h3 class="section-subtitle">Critical Risk Deep Dive</h3>
    <!-- For top 3 risks by composite score: -->
    <div class="risk-deep-dive">
      <h4>[Risk description] <span class="risk-badge risk-badge--{impact}">[impact]</span></h4>
      <p><strong>Context:</strong> [Ghana-specific context for this risk]</p>
      <p><strong>Mitigation:</strong> [Detailed mitigation strategy]</p>
      <p><strong>Contingency:</strong> [What to do if mitigation fails]</p>
      <p><strong>Early Warning:</strong> [Indicators to watch]</p>
    </div>

    <!-- Pathway-specific risk notes -->
    <h3 class="section-subtitle">Pathway-Specific Risk Notes</h3>
    <div class="pathway-card pathway-card--a">
      <p>[Which risks are most acute for Pathway A and why]</p>
    </div>
    <div class="pathway-card pathway-card--b">
      <p>[Which risks are most acute for Pathway B and why]</p>
    </div>

    <div class="disclosure-block">
      <p class="limitation-note">Risk assessments reflect current Ghana conditions. Political, regulatory, and macroeconomic risks are subject to rapid change. Regular reassessment is recommended.</p>
    </div>
  </div>
</section>

TONE: Risk management professional. Specific, not alarmist. Every risk has a mitigation.
`);

const G12_PROMPT = sectionPrompt("G-12", `
ROLE: Regulatory & Legal Landscape — Ghana business registration, licensing, permits, and compliance requirements.

INPUTS CONSUMED:
- pathways[] (to contextualize which regulatory requirements apply per pathway)
- risks[] (regulatory category)
- i2_context.sectorInterest
- i1_profile.industry

REQUIRED HTML STRUCTURE:
<section id="output-G-12" class="report-section">
  <div class="section-header">
    <h2 class="section-title">Regulatory & Legal Landscape</h2>
    <p class="section-subtitle">Ghana Business Formation & Compliance Guide</p>
  </div>
  <div class="section-body">
    <!-- Entity Formation -->
    <h3 class="section-subtitle">Business Entity Formation</h3>
    <table class="data-table">
      <thead><tr><th>Step</th><th>Authority</th><th>Requirement</th><th>Timeline</th><th>Cost Estimate</th></tr></thead>
      <tbody>
        <!-- RGD registration, TIN, SSNIT, GIPC registration, etc. -->
      </tbody>
    </table>

    <!-- Foreign Investment Requirements -->
    <h3 class="section-subtitle">Foreign Investment Requirements (GIPC Act)</h3>
    <table class="data-table">
      <thead><tr><th>Requirement</th><th>Threshold</th><th>Applies to Pathway A</th><th>Applies to Pathway B</th></tr></thead>
      <tbody>
        <!-- Minimum capital requirements, GIPC registration thresholds, JV requirements, etc. -->
      </tbody>
    </table>

    <!-- Sector-Specific Licensing -->
    <h3 class="section-subtitle">Sector-Specific Licensing</h3>
    <p>[Based on i2_context.sectorInterest — which sector regulators, licenses, and permits are needed]</p>
    <table class="data-table">
      <thead><tr><th>License/Permit</th><th>Issuing Authority</th><th>Requirement</th><th>Renewal</th></tr></thead>
      <tbody>
        <!-- Sector-specific licenses relevant to the pathways -->
      </tbody>
    </table>

    <!-- Ongoing Compliance -->
    <h3 class="section-subtitle">Ongoing Compliance Requirements</h3>
    <ul>
      <!-- Annual returns (RGD), tax filings (GRA), SSNIT contributions, audit requirements, etc. -->
    </ul>

    <!-- Key Legal Considerations -->
    <h3 class="section-subtitle">Key Legal Considerations</h3>
    <ul>
      <!-- Land tenure, IP protection, employment law (Labour Act 2003), dispute resolution, etc. -->
    </ul>

    <div class="disclosure-block">
      <p class="limitation-note">Regulatory information reflects published requirements as of the analysis date. Ghana's regulatory environment evolves — engage a local legal advisor for current requirements and processing times.</p>
    </div>
  </div>
</section>

Reference actual Ghana authorities: RGD, GIPC, GRA, SSNIT, EPA, FDA, NCA, etc. as relevant.
TONE: Legal reference quality. Precise, structured, authoritative.
`);

const G13_PROMPT = sectionPrompt("G-13", `
ROLE: Ghana Investment Incentives & Tax Environment — GIPC incentives, free zones, tax holidays, and fiscal advantages.

INPUTS CONSUMED:
- pathways[] (to assess which incentives apply per pathway)
- i1_profile.industry, i2_context.sectorInterest
- i3_objectives.investmentRange

REQUIRED HTML STRUCTURE:
<section id="output-G-13" class="report-section">
  <div class="section-header">
    <h2 class="section-title">Ghana Investment Incentives & Tax Environment</h2>
    <p class="section-subtitle">Fiscal Advantages & Incentive Programs</p>
  </div>
  <div class="section-body">
    <!-- Corporate Tax Overview -->
    <h3 class="section-subtitle">Corporate Tax Framework</h3>
    <table class="data-table">
      <thead><tr><th>Tax Type</th><th>Standard Rate</th><th>Incentive Rate</th><th>Eligibility</th></tr></thead>
      <tbody>
        <!-- Corporate income tax, VAT, withholding tax, capital gains, etc. -->
      </tbody>
    </table>

    <!-- GIPC Incentives -->
    <h3 class="section-subtitle">GIPC Investment Incentives</h3>
    <table class="data-table">
      <thead><tr><th>Incentive</th><th>Benefit</th><th>Duration</th><th>Pathway A Eligible</th><th>Pathway B Eligible</th></tr></thead>
      <tbody>
        <!-- Tax holidays, customs duty exemptions, immigration quota, etc. -->
      </tbody>
    </table>

    <!-- Free Zones Program -->
    <h3 class="section-subtitle">Ghana Free Zones Program</h3>
    <p>[GFZB overview: 10-year tax holiday, duty-free imports, 100% foreign ownership allowed]</p>
    <table class="data-table">
      <thead><tr><th>Benefit</th><th>Details</th><th>Conditions</th></tr></thead>
      <tbody>
        <!-- Free zone specific benefits and conditions -->
      </tbody>
    </table>

    <!-- Sector-Specific Incentives -->
    <h3 class="section-subtitle">Sector-Specific Incentives</h3>
    <p>[Based on pathways and sector interest — agriculture, agro-processing, ICT, manufacturing, etc. each have specific incentive regimes]</p>

    <!-- Double Taxation Agreements -->
    <h3 class="section-subtitle">Double Taxation Agreements</h3>
    <p>[Ghana's DTA network — relevant treaties for avoiding double taxation]</p>

    <!-- Investment Protection -->
    <h3 class="section-subtitle">Investment Protection</h3>
    <ul>
      <!-- GIPC guarantees, MIGA coverage, bilateral investment treaties, repatriation rights -->
    </ul>

    <div class="disclosure-block">
      <p class="limitation-note">Tax rates and incentive programs are subject to change by Ghana's parliament. Consult a Ghana-registered tax advisor for current rates and eligibility determination specific to your business structure.</p>
    </div>
  </div>
</section>

Reference actual Ghana legislation: GIPC Act 2013, Income Tax Act 2015, Free Zones Act 1995, Revenue Administration Act, etc.
TONE: Tax advisory quality. Specific rates, clear eligibility criteria.
`);

const G14_PROMPT = sectionPrompt("G-14", `
ROLE: Competitive Landscape Overview — full competitive analysis with market maps and positioning.

INPUTS CONSUMED:
- competitiveProfiles[] (all — from A-1a)
- pathways[] (for competitive context per pathway)
- competencies[] (to assess competitive advantages)

REQUIRED HTML STRUCTURE:
<section id="output-G-14" class="report-section">
  <div class="section-header">
    <h2 class="section-title">Competitive Landscape Overview</h2>
    <p class="section-subtitle">Market Positioning & Competitive Intelligence</p>
  </div>
  <div class="section-body">
    <!-- Competitive Profiles Table -->
    <h3 class="section-subtitle">Competitor Profiles</h3>
    <table class="data-table">
      <thead><tr><th>Competitor Archetype</th><th>Type</th><th>Est. Market Share</th><th>Strengths</th><th>Weaknesses</th></tr></thead>
      <tbody>
        <!-- One row per competitiveProfile — name, type, marketShare, strengths (comma-separated), weaknesses (comma-separated) -->
        <!-- Type rendered as badge -->
      </tbody>
    </table>

    <!-- White Space Analysis -->
    <h3 class="section-subtitle">White Space Opportunities</h3>
    <table class="data-table">
      <thead><tr><th>Competitor Archetype</th><th>White Space</th><th>Saturation Assessment</th></tr></thead>
      <tbody>
        <!-- One row per profile: whiteSpace, saturationAssessment -->
      </tbody>
    </table>

    <!-- Competitive Advantage Assessment -->
    <h3 class="section-subtitle">Your Competitive Advantages</h3>
    <p>[Analysis of subject's competencies that create defensible advantages against each competitor type]</p>

    <!-- Market Positioning Narrative -->
    <h3 class="section-subtitle">Recommended Positioning</h3>
    <div class="pathway-card pathway-card--a">
      <h4>Pathway A Positioning</h4>
      <p>[How to position against direct and adjacent competitors in Pathway A's market]</p>
    </div>
    <div class="pathway-card pathway-card--b">
      <h4>Pathway B Positioning</h4>
      <p>[How to position in Pathway B's market]</p>
    </div>

    <!-- Informal sector consideration -->
    <h3 class="section-subtitle">Informal Sector Dynamics</h3>
    <p>[Analysis of informal competitors — a critical Ghana-specific factor. How to coexist, formalize, or differentiate]</p>

    <div class="disclosure-block">
      <p class="limitation-note">Competitor archetypes are representative profiles, not specific company analyses. Conduct primary competitive research for detailed intelligence on specific market participants.</p>
    </div>
  </div>
</section>

TONE: Competitive intelligence analyst. Specific to Ghana market structures, including informal economy dynamics.
`);

const G15_PROMPT = sectionPrompt("G-15", `
ROLE: Monte Carlo Sensitivity & Scenario Narratives — sensitivity analysis, tornado chart hooks, and scenario deep-dives.

INPUTS CONSUMED:
- pathwayQuant[] from A-1b (both pathways — all fields)
- veridexScores[] (for data quality context)
- dataVintageNotes, sourceQualityLegend from A-1b

REQUIRED HTML STRUCTURE:
<section id="output-G-15" class="report-section">
  <div class="section-header">
    <h2 class="section-title">Monte Carlo Sensitivity & Scenario Narratives</h2>
    <p class="section-subtitle">Sensitivity Analysis & Outcome Deep Dive</p>
  </div>
  <div class="section-body">
    <!-- Sensitivity Analysis Introduction -->
    <p>[2-3 sentences explaining sensitivity analysis: which input variables most affect the outcome distribution]</p>

    <!-- Tornado Chart — Pathway A -->
    <h3 class="section-subtitle">Sensitivity: Pathway A</h3>
    <div class="chart-container">
      <canvas
        id="tornado-chart-pathway-a"
        data-chart-type="tornado"
        data-pathway-id="pathway-a"
        data-assumptions='[JSON array of {name, value, source} from pathwayQuant[0].assumptions]'
        data-p50="[scenarioEnvelope.p50]"
        width="800" height="400">
      </canvas>
    </div>

    <!-- Assumption Impact Table — Pathway A -->
    <table class="data-table">
      <thead><tr><th>Assumption</th><th>Base Value</th><th>Low Scenario Impact</th><th>High Scenario Impact</th><th>Source</th><th>Tier</th><th>Vintage</th></tr></thead>
      <tbody>
        <!-- One row per assumption, showing how varying it affects the P50 outcome -->
        <!-- Source tier as <span class="source-citation">, vintage as <span class="data-vintage"> -->
      </tbody>
    </table>

    <!-- Tornado Chart — Pathway B (same structure) -->
    <h3 class="section-subtitle">Sensitivity: Pathway B</h3>
    <div class="chart-container">
      <canvas
        id="tornado-chart-pathway-b"
        data-chart-type="tornado"
        data-pathway-id="pathway-b"
        data-assumptions='[JSON array]'
        data-p50="[scenarioEnvelope.p50]"
        width="800" height="400">
      </canvas>
    </div>
    <!-- Pathway B assumption impact table -->

    <!-- Scenario Deep Dives -->
    <h3 class="section-subtitle">Scenario Deep Dives</h3>

    <!-- Pathway A Scenarios -->
    <h4>Pathway A Scenarios</h4>
    <div class="scenario-deep-dive">
      <h5><span class="risk-badge risk-badge--high">Downside (P10)</span> — [scenarioEnvelope.p10 value]</h5>
      <p>[scenarioNarratives.downside — full narrative]</p>
    </div>
    <div class="scenario-deep-dive">
      <h5><span class="risk-badge risk-badge--moderate">Baseline (P50)</span> — [scenarioEnvelope.p50 value]</h5>
      <p>[scenarioNarratives.baseline — full narrative]</p>
    </div>
    <div class="scenario-deep-dive">
      <h5><span class="risk-badge risk-badge--low">Upside (P90)</span> — [scenarioEnvelope.p90 value]</h5>
      <p>[scenarioNarratives.upside — full narrative]</p>
    </div>

    <!-- Pathway B Scenarios (same structure) -->
    <h4>Pathway B Scenarios</h4>
    <!-- Same 3 scenario blocks -->

    <!-- Source Quality Legend -->
    <h3 class="section-subtitle">Source Quality Legend</h3>
    <p>[sourceQualityLegend from A-1b — rendered as formatted text]</p>

    <!-- Data Vintage Notes -->
    <h3 class="section-subtitle">Data Vintage Notes</h3>
    <p>[dataVintageNotes from A-1b]</p>

    <!-- Verification Summary -->
    <h3 class="section-subtitle">VERIDEX Verification Summary</h3>
    <table class="data-table">
      <thead><tr><th>Gate</th><th>Status</th><th>Score</th><th>Details</th></tr></thead>
      <tbody>
        <!-- Key VERIDEX gates relevant to Monte Carlo data quality -->
        <!-- Status as <span class="veridex-badge">[status]</span> -->
        <!-- Score as <span class="veridex-score">[score]</span> -->
      </tbody>
    </table>

    <div class="disclosure-block">
      <p class="limitation-note">Sensitivity analysis shows directional impact of individual variable changes. Real-world outcomes involve correlated variable movements not fully captured in single-variable sensitivity. Monte Carlo envelope should be interpreted as illustrative, not predictive.</p>
    </div>
  </div>
</section>

CRITICAL: <canvas> elements MUST include data-* attributes with exact values from pathwayQuant for the frontend JS engine. The data-assumptions attribute must be a valid JSON string.
TONE: Quantitative analyst. Transparent about model limitations and data quality.
`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORT REGISTRY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const SECTION_PROMPTS: Record<string, string> = {
  // Stage 1 — Kiosk
  "section_k1": K1_PROMPT,
  "section_k2": K2_PROMPT,
  "section_k3": K3_PROMPT,
  "section_k4": K4_PROMPT,
  "section_k5": K5_PROMPT,
  "section_k6": K6_PROMPT,
  // Stage 3 — Full Report
  "section_g1": G1_PROMPT,
  "section_g2": G2_PROMPT,
  "section_g3": G3_PROMPT,
  "section_g4": G4_PROMPT,
  "section_g5": G5_PROMPT,
  "section_g6": G6_PROMPT,
  "section_g7": G7_PROMPT,
  "section_g8": G8_PROMPT,
  "section_g9": G9_PROMPT,
  "section_g10": G10_PROMPT,
  "section_g11": G11_PROMPT,
  "section_g12": G12_PROMPT,
  "section_g13": G13_PROMPT,
  "section_g14": G14_PROMPT,
  "section_g15": G15_PROMPT,
};
