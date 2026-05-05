/**
 * Section HTML Renderers
 * 
 * Deterministic HTML templates that consume structured JSON from Claude.
 * Every report renders with identical layout, spacing, and visual hierarchy.
 * Claude controls the CONTENT. These templates control the PRESENTATION.
 */

import type { CoreAnalysisA1a, CoreAnalysisA1b, IntakePayload } from "@shared/schema";
import type * as S from "./section-schemas";

// ─── Helpers ──────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function severityBadge(level: string): string {
  const l = level.toLowerCase();
  return `<span class="risk-badge risk-badge--${l}">${esc(level)}</span>`;
}

function sectionWrap(code: string, title: string, subtitle: string, body: string): string {
  return `<div class="os"><div class="sn">OUTPUT ${code}</div>
<div class="st">${esc(title)}</div>
<div class="sb">
<h3>${esc(subtitle)}</h3>
${body}
</div></div>`;
}

function tableOpen(headers: string[]): string {
  return `<table class="data-table"><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>`;
}
function tableClose(): string { return `</tbody></table>`; }
function tr(cells: string[]): string {
  return `<tr>${cells.map(c => `<td>${c}</td>`).join("")}</tr>`;
}

function disclosure(text: string): string {
  return `<div class="disc">${esc(text)}</div>`;
}

// ═══════════════════════════════════════════════════════════════
// SECTION RENDERERS
// ═══════════════════════════════════════════════════════════════

export function renderG1(data: S.G1Data, a1a: CoreAnalysisA1a): string {
  const comps = [...(a1a.competencies || [])].sort((a, b) => b.relevanceToGhana - a.relevanceToGhana);
  const gaps = a1a.developmentGaps || [];
  const pw = a1a.pathways || [];

  let html = `<p>${esc(data.executiveSummary)}</p>`;

  // Competency table
  html += `<h3>Competency Profile</h3>`;
  html += tableOpen(["Competency", "Category", "Proficiency", "Ghana Relevance", "Evidence"]);
  for (const c of comps) {
    html += tr([
      esc(c.name),
      esc(c.category),
      esc(c.proficiencyLevel),
      `<strong>${c.relevanceToGhana}</strong>/100`,
      esc(c.evidence),
    ]);
  }
  html += tableClose();

  // Category distribution
  html += `<h3>Category Distribution</h3><p>${esc(data.categoryDistribution)}</p>`;

  // Gap table
  html += `<h3>Development Gaps</h3>`;
  html += tableOpen(["Gap", "Severity", "Description", "Mitigation Path", "Time to Close"]);
  for (const g of gaps) {
    html += tr([
      esc(g.name),
      severityBadge(g.severity),
      esc(g.description),
      esc(g.mitigationPath),
      esc(g.timeToClose),
    ]);
  }
  html += tableClose();

  // Composite scores
  html += `<h3>Composite Opportunity Scores</h3>`;
  for (const p of pw) {
    const cls = p.id === "pathway-a" ? "pathway-card--a" : "pathway-card--b";
    html += `<div class="pathway-card ${cls}"><h4>${esc(p.label)}: ${esc(p.title)}</h4>
<div class="hero-stats">
<div class="metric-pill"><span class="metric-value">${p.opportunityScore}</span><span class="metric-label">Opportunity</span></div>
<div class="metric-pill"><span class="metric-value">${p.riskScore}</span><span class="metric-label">Risk</span></div>
<div class="metric-pill"><span class="metric-value">${p.frictionScore}</span><span class="metric-label">Friction</span></div>
</div></div>`;
  }
  html += `<p>${esc(data.compositeScoreNarrative)}</p>`;
  html += disclosure("Competency proficiency levels are inferred from intake self-assessment and role history. Independent verification is recommended for critical business decisions.");

  return sectionWrap("G-1", "Personalized Opportunity Simulation", "Competency-Market Alignment & Gap Analysis", html);
}

export function renderG2(data: S.G2Data, a1a: CoreAnalysisA1a): string {
  const pw = a1a.pathways || [];
  const cp = a1a.competitiveProfiles || [];

  let html = `<h3>Primary Sector Opportunity</h3><p>${esc(data.primarySectorAnalysis)}</p>`;

  // TAM/SAM/SOM table
  html += `<h3>Market Sizing Comparison</h3>`;
  html += tableOpen(["Metric", "Pathway A", "Pathway B", "Source Tier", "Vintage"]);
  for (const metric of ["tam", "sam", "som"] as const) {
    const a = pw.find(p => p.id === "pathway-a");
    const b = pw.find(p => p.id === "pathway-b");
    const av = a?.[metric]; const bv = b?.[metric];
    html += tr([
      metric.toUpperCase(),
      esc(av?.value || "—"),
      esc(bv?.value || "—"),
      esc(av?.sourceTier || "—"),
      esc(av?.vintage || "—"),
    ]);
  }
  html += tableClose();

  html += `<h3>Adjacent Market Opportunities</h3><p>${esc(data.adjacentOpportunities)}</p>`;
  html += `<h3>Value Chain Positioning</h3><p>${esc(data.valueChainPositioning)}</p>`;

  // White space table
  html += `<h3>Identified White Space</h3>`;
  html += tableOpen(["Competitor Archetype", "Type", "White Space", "Saturation"]);
  for (const c of cp) {
    html += tr([esc(c.name), severityBadge(c.type), esc(c.whiteSpace), esc(c.saturationAssessment)]);
  }
  html += tableClose();
  html += disclosure("Market sizing estimates use the source tiers and vintages shown. Tier 3 figures are model estimates and should be validated with primary research.");

  return sectionWrap("G-2", "Vertical & Adjacent Opportunity Analysis", "Sector Deep Dive & Value Chain Mapping", html);
}

export function renderG3(data: S.G3Data): string {
  let html = `<p>${esc(data.strategicOverview)}</p>`;

  html += `<h3>Entry Model Analysis</h3>`;
  html += tableOpen(["Entry Model", "Fit for Pathway A", "Fit for Pathway B", "Key Considerations"]);
  for (const m of data.entryModels) {
    html += tr([esc(m.model), esc(m.fitPathwayA), esc(m.fitPathwayB), esc(m.keyConsiderations)]);
  }
  html += tableClose();

  for (const phase of data.phases) {
    html += `<h3>${esc(phase.name)} <span class="data-vintage">${esc(phase.timeline)}</span></h3>`;
    html += `<ul>${phase.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ul>`;
  }

  html += `<h3>Critical Success Factors</h3>`;
  html += `<ul>${data.criticalSuccessFactors.map(f => `<li>${esc(f)}</li>`).join("")}</ul>`;
  html += disclosure("Entry timelines assume standard regulatory processing times. Actual timelines may vary based on sector-specific licensing requirements.");

  return sectionWrap("G-3", "Optimal Market Entry Strategy", "Phased Entry Framework for Ghana", html);
}

export function renderG4(data: S.G4Data): string {
  let html = `<h3>Quick Wins <span class="data-vintage">30–90 days</span></h3>`;
  html += tableOpen(["#", "Action", "Pathway", "Effort", "Impact", "Leverages"]);
  data.quickWins.forEach((q, i) => {
    html += tr([`${i + 1}`, esc(q.action), esc(q.pathway), severityBadge(q.effort), severityBadge(q.impact), esc(q.leverages)]);
  });
  html += tableClose();

  html += `<h3>Long-Term Plays <span class="data-vintage">6–36 months</span></h3>`;
  html += tableOpen(["#", "Initiative", "Pathway", "Timeline", "Capital", "Strategic Value"]);
  data.longTermPlays.forEach((l, i) => {
    html += tr([`${i + 1}`, esc(l.initiative), esc(l.pathway), esc(l.timeline), esc(l.capital), esc(l.strategicValue)]);
  });
  html += tableClose();

  html += `<h3>Sequencing Recommendation</h3><p>${esc(data.sequencingRecommendation)}</p>`;
  html += disclosure("Effort and impact ratings are relative assessments based on the subject's stated constraints and competency profile.");

  return sectionWrap("G-4", "Quick Wins vs. Long-Term Plays", "Prioritized Action Matrix", html);
}

export function renderG5(data: S.G5Data): string {
  let html = `<h3>Priority Connection Types</h3>`;
  html += tableOpen(["Connection Type", "Why Critical", "Addresses Gap", "Enables Pathway", "Priority"]);
  for (const c of data.connectionTypes) {
    html += tr([esc(c.type), esc(c.whyCritical), esc(c.addressesGap), esc(c.enablesPathway), severityBadge(c.priority)]);
  }
  html += tableClose();

  html += `<h3>Potential Partnership Structures</h3><p>${esc(data.partnershipStructures)}</p>`;
  html += `<h3>Summit Engagement Strategy</h3><ol>${data.engagementStrategy.map(s => `<li>${esc(s)}</li>`).join("")}</ol>`;
  html += `<h3>Qualifying Questions</h3><ul>${data.qualifyingQuestions.map(q => `<li>${esc(q)}</li>`).join("")}</ul>`;
  html += disclosure("Connection recommendations are based on analytical profile matching. Individual due diligence is essential before entering any partnership.");

  return sectionWrap("G-5", "Summit Connection Map", "Strategic Networking & Partnership Framework", html);
}

export function renderG6(data: S.G6Data, a1a: CoreAnalysisA1a): string {
  const pw = a1a.pathways || [];
  let html = "";

  for (const p of pw) {
    html += `<h3>${esc(p.label)}: ${esc(p.title)}</h3>`;
    html += tableOpen(["Phase", "Timeline", "Milestone", "Capital Required"]);
    for (const m of p.milestones) {
      html += tr([esc(m.phase), esc(m.timeline), esc(m.description), esc(m.capitalRequired)]);
    }
    html += tableClose();
  }

  html += `<h3>Timeline Risk Factors</h3>`;
  html += `<ul>${data.timelineRiskFactors.map(r => `<li>${esc(r)}</li>`).join("")}</ul>`;
  html += disclosure("Timelines assume standard processing and do not account for extraordinary delays. Add 20-30% buffer for Ghana regulatory processes.");

  return sectionWrap("G-6", "Realistic Timeline Projections", "Phased Milestone Roadmap", html);
}

export function renderG8(data: S.G8Data): string {
  let html = `<h3>Human Capital</h3>`;
  html += tableOpen(["Role", "Priority", "Phase Needed", "Ghana Market Rate", "Pathway"]);
  for (const r of data.humanCapital) {
    html += tr([esc(r.role), severityBadge(r.priority), esc(r.phaseNeeded), esc(r.marketRate), esc(r.pathway)]);
  }
  html += tableClose();

  html += `<h3>Infrastructure</h3>`;
  html += tableOpen(["Requirement", "Type", "Estimated Cost", "Phase", "Notes"]);
  for (const i of data.infrastructure) {
    html += tr([esc(i.requirement), esc(i.type), esc(i.estimatedCost), esc(i.phase), esc(i.notes)]);
  }
  html += tableClose();

  html += `<h3>Technology Stack</h3>`;
  html += tableOpen(["System", "Purpose", "Estimated Cost", "Build vs. Buy"]);
  for (const t of data.technology) {
    html += tr([esc(t.system), esc(t.purpose), esc(t.estimatedCost), esc(t.buildVsBuy)]);
  }
  html += tableClose();

  html += `<h3>Operational Considerations</h3><p>${esc(data.operationalConsiderations)}</p>`;
  html += disclosure("Cost estimates are based on Ghana market rates as of available data. Actual costs vary by location, negotiation, and market conditions.");

  return sectionWrap("G-8", "Specific Resource Requirements", "Human Capital, Infrastructure & Technology Needs", html);
}

export function renderG9(data: S.G9Data, a1a: CoreAnalysisA1a): string {
  const pw = a1a.pathways || [];
  let html = "";

  // Pathway A
  const pwA = pw.find(p => p.id === "pathway-a");
  html += `<h3>${pwA ? esc(pwA.label) + ": " + esc(pwA.title) : "Pathway A"}</h3>`;
  html += tableOpen(["Phase", "Timeline", "Capital Required", "Cumulative", "Key Expenditures"]);
  for (const r of data.pathwayACapital) {
    html += tr([esc(r.phase), esc(r.timeline), `<strong>${esc(r.capitalRequired)}</strong>`, esc(r.cumulative), esc(r.keyExpenditures)]);
  }
  html += `</tbody><tfoot><tr><td colspan="2"><strong>Total</strong></td><td colspan="3"><strong>${esc(data.pathwayATotal)}</strong></td></tr></tfoot></table>`;

  // Pathway B
  const pwB = pw.find(p => p.id === "pathway-b");
  html += `<h3>${pwB ? esc(pwB.label) + ": " + esc(pwB.title) : "Pathway B"}</h3>`;
  html += tableOpen(["Phase", "Timeline", "Capital Required", "Cumulative", "Key Expenditures"]);
  for (const r of data.pathwayBCapital) {
    html += tr([esc(r.phase), esc(r.timeline), `<strong>${esc(r.capitalRequired)}</strong>`, esc(r.cumulative), esc(r.keyExpenditures)]);
  }
  html += `</tbody><tfoot><tr><td colspan="2"><strong>Total</strong></td><td colspan="3"><strong>${esc(data.pathwayBTotal)}</strong></td></tr></tfoot></table>`;

  html += `<h3>Potential Funding Sources (Ghana)</h3><ul>${data.fundingSources.map(f => `<li>${esc(f)}</li>`).join("")}</ul>`;
  html += `<h3>Budget Alignment Assessment</h3><p>${esc(data.budgetAlignment)}</p>`;
  html += disclosure("Capital estimates are order-of-magnitude projections. Detailed financial modeling with local accounting input is recommended before commitment.");

  return sectionWrap("G-9", "Capital Requirement Estimate by Stage", "Phased Investment Framework", html);
}

export function renderG10(data: S.G10Data, a1a: CoreAnalysisA1a): string {
  const swot = a1a.swot || { strengths: [], weaknesses: [], opportunities: [], threats: [] };

  let html = `<div class="swot-grid">`;
  const quads = [
    { title: "Strengths", items: swot.strengths },
    { title: "Weaknesses", items: swot.weaknesses },
    { title: "Opportunities", items: swot.opportunities },
    { title: "Threats", items: swot.threats },
  ];
  for (const q of quads) {
    html += `<div><h4>${q.title}</h4><ul>${q.items.map(i => `<li>${esc(i)}</li>`).join("")}</ul></div>`;
  }
  html += `</div>`;

  html += `<h3>Strategic Interpretation</h3><p>${esc(data.strategicInterpretation)}</p>`;

  html += `<h3>Key Strategic Linkages</h3>`;
  html += tableOpen(["Linkage", "Dynamic", "Implication"]);
  for (const l of data.keyLinkages) {
    html += tr([esc(l.linkage), esc(l.dynamic), esc(l.implication)]);
  }
  html += tableClose();
  html += disclosure("SWOT elements are derived from profile analysis and Ghana market assessment. External factors reflect conditions as of the analysis date.");

  return sectionWrap("G-10", "SWOT Analysis", "Strategic Position Assessment — Ghana Market Context", html);
}

export function renderG11(data: S.G11Data, a1a: CoreAnalysisA1a): string {
  const risks = [...(a1a.risks || [])];

  // Risk register table
  let html = `<h3>Risk Register</h3>`;
  html += tableOpen(["Risk", "Category", "Likelihood", "Impact", "Mitigation Strategy"]);
  for (const r of risks) {
    html += tr([esc(r.description), esc(r.category), severityBadge(r.likelihood), severityBadge(r.impact), esc(r.mitigation)]);
  }
  html += tableClose();

  // Category summary
  html += `<h3>Risk Distribution by Category</h3>`;
  html += tableOpen(["Category", "Count", "Highest Impact", "Key Mitigation Theme"]);
  for (const c of data.riskCategorySummary) {
    html += tr([esc(c.category), `${c.count}`, esc(c.highestImpact), esc(c.mitigationTheme)]);
  }
  html += tableClose();

  // Deep dives
  html += `<h3>Critical Risk Deep Dive</h3>`;
  for (const d of data.criticalRiskDeepDives) {
    html += `<div class="risk-deep-dive">
<h4>${esc(d.riskDescription)} ${severityBadge(d.impact)}</h4>
<p><strong>Context:</strong> ${esc(d.context)}</p>
<p><strong>Mitigation:</strong> ${esc(d.mitigation)}</p>
<p><strong>Contingency:</strong> ${esc(d.contingency)}</p>
<p><strong>Early Warning:</strong> ${esc(d.earlyWarning)}</p>
</div>`;
  }

  // Pathway notes
  html += `<h3>Pathway-Specific Risk Notes</h3>`;
  html += `<div class="pathway-card pathway-card--a"><h4>Pathway A</h4><p>${esc(data.pathwayARiskNotes)}</p></div>`;
  html += `<div class="pathway-card pathway-card--b"><h4>Pathway B</h4><p>${esc(data.pathwayBRiskNotes)}</p></div>`;
  html += disclosure("Risk assessments reflect current Ghana conditions. Political, regulatory, and macroeconomic risks are subject to rapid change. Regular reassessment is recommended.");

  return sectionWrap("G-11", "Risk Mitigation Pathways", "Comprehensive Risk Assessment & Response Framework", html);
}

export function renderG12(data: S.G12Data): string {
  let html = `<h3>Business Entity Formation</h3>`;
  html += tableOpen(["Step", "Authority", "Requirement", "Timeline", "Cost Estimate"]);
  for (const s of data.entityFormation) {
    html += tr([esc(s.step), esc(s.authority), esc(s.requirement), esc(s.timeline), esc(s.costEstimate)]);
  }
  html += tableClose();

  html += `<h3>Foreign Investment Requirements (GIPC Act)</h3>`;
  html += tableOpen(["Requirement", "Threshold", "Applies to Pathway A", "Applies to Pathway B"]);
  for (const f of data.foreignInvestment) {
    html += tr([esc(f.requirement), esc(f.threshold), esc(f.appliesToA), esc(f.appliesToB)]);
  }
  html += tableClose();

  html += `<h3>Sector-Specific Licensing</h3>`;
  html += tableOpen(["License/Permit", "Issuing Authority", "Requirement", "Renewal"]);
  for (const l of data.sectorLicensing) {
    html += tr([esc(l.license), esc(l.authority), esc(l.requirement), esc(l.renewal)]);
  }
  html += tableClose();

  html += `<h3>Ongoing Compliance Requirements</h3><ul>${data.ongoingCompliance.map(c => `<li>${esc(c)}</li>`).join("")}</ul>`;
  html += `<h3>Key Legal Considerations</h3><ul>${data.keyLegalConsiderations.map(c => `<li>${esc(c)}</li>`).join("")}</ul>`;
  html += disclosure("Regulatory information reflects published requirements as of the analysis date. Engage a local legal advisor for current requirements and processing times.");

  return sectionWrap("G-12", "Regulatory & Legal Landscape", "Ghana Business Formation & Compliance Guide", html);
}

export function renderG13(data: S.G13Data): string {
  let html = `<h3>Corporate Tax Framework</h3>`;
  html += tableOpen(["Tax Type", "Standard Rate", "Incentive Rate", "Eligibility"]);
  for (const t of data.corporateTax) {
    html += tr([esc(t.taxType), esc(t.standardRate), esc(t.incentiveRate), esc(t.eligibility)]);
  }
  html += tableClose();

  html += `<h3>GIPC Investment Incentives</h3>`;
  html += tableOpen(["Incentive", "Benefit", "Duration", "Pathway A Eligible", "Pathway B Eligible"]);
  for (const g of data.gipcIncentives) {
    html += tr([esc(g.incentive), esc(g.benefit), esc(g.duration), esc(g.pathwayAEligible), esc(g.pathwayBEligible)]);
  }
  html += tableClose();

  html += `<h3>Ghana Free Zones Program</h3><p>${esc(data.freeZonesNarrative)}</p>`;
  html += tableOpen(["Benefit", "Details", "Conditions"]);
  for (const b of data.freeZoneBenefits) {
    html += tr([esc(b.benefit), esc(b.details), esc(b.conditions)]);
  }
  html += tableClose();

  html += `<h3>Sector-Specific Incentives</h3><p>${esc(data.sectorSpecificIncentives)}</p>`;
  html += `<h3>Double Taxation Agreements</h3><p>${esc(data.doubleTaxation)}</p>`;
  html += `<h3>Investment Protection</h3><ul>${data.investmentProtection.map(p => `<li>${esc(p)}</li>`).join("")}</ul>`;
  html += disclosure("Tax rates and incentive programs are subject to change. Consult a Ghana-registered tax advisor for current rates and eligibility specific to your business structure.");

  return sectionWrap("G-13", "Ghana Investment Incentives & Tax Environment", "Fiscal Advantages & Incentive Programs", html);
}

export function renderG14(data: S.G14Data, a1a: CoreAnalysisA1a): string {
  const cp = a1a.competitiveProfiles || [];

  let html = `<h3>Competitor Profiles</h3>`;
  html += tableOpen(["Competitor Archetype", "Type", "Est. Market Share", "Strengths", "Weaknesses"]);
  for (const c of cp) {
    html += tr([esc(c.name), severityBadge(c.type), esc(c.marketShare), esc(c.strengths.join("; ")), esc(c.weaknesses.join("; "))]);
  }
  html += tableClose();

  html += `<h3>White Space Opportunities</h3>`;
  html += tableOpen(["Competitor Archetype", "White Space", "Saturation Assessment"]);
  for (const c of cp) {
    html += tr([esc(c.name), esc(c.whiteSpace), esc(c.saturationAssessment)]);
  }
  html += tableClose();

  html += `<h3>Your Competitive Advantages</h3><p>${esc(data.competitiveAdvantages)}</p>`;

  html += `<h3>Recommended Positioning</h3>`;
  html += `<div class="pathway-card pathway-card--a"><h4>Pathway A Positioning</h4><p>${esc(data.pathwayAPositioning)}</p></div>`;
  html += `<div class="pathway-card pathway-card--b"><h4>Pathway B Positioning</h4><p>${esc(data.pathwayBPositioning)}</p></div>`;

  html += `<h3>Informal Sector Dynamics</h3><p>${esc(data.informalSectorDynamics)}</p>`;
  html += disclosure("Competitor archetypes are representative profiles, not specific company analyses. Conduct primary competitive research for detailed intelligence.");

  return sectionWrap("G-14", "Competitive Landscape Overview", "Market Positioning & Competitive Intelligence", html);
}

export function renderG0(data: S.G0Data): string {
  let html = `<div class="exec-summary" style="background:rgba(212,168,83,.04);border:1px solid rgba(212,168,83,.15);border-radius:12px;padding:28px;margin-bottom:32px;">`;

  // Component 1: Core Finding
  html += `<h3 style="font-family:'Playfair Display',serif;font-size:1.35em;color:var(--navy);margin:0 0 14px;">Executive Summary</h3>`;
  html += `<p style="font-size:.92em;color:var(--rpt-text);line-height:1.65;margin-bottom:20px;">${esc(data.coreFinding)}</p>`;

  // Component 2: Two Pathways at a Glance
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">`;
  for (const pw of [data.pathwayA, data.pathwayB]) {
    const borderColor = pw === data.pathwayA ? 'var(--gold)' : 'var(--teal)';
    html += `<div style="background:var(--rpt-white);border:1px solid var(--gray-200);border-top:3px solid ${borderColor};border-radius:8px;padding:18px;">`;
    html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">`;
    html += `<strong style="font-size:.92em;color:var(--navy);">${esc(pw.name)}</strong>`;
    html += `</div>`;
    html += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">`;
    html += `<span style="font-family:'JetBrains Mono',monospace;font-size:.6em;letter-spacing:1px;text-transform:uppercase;padding:2px 8px;border-radius:100px;background:rgba(11,29,58,.06);color:var(--navy);border:1px solid rgba(11,29,58,.12);">${esc(pw.classificationBadge)}</span>`;
    html += `<span style="font-family:'JetBrains Mono',monospace;font-size:.6em;letter-spacing:1px;text-transform:uppercase;padding:2px 8px;border-radius:100px;background:rgba(42,157,143,.08);color:var(--teal);border:1px solid rgba(42,157,143,.15);">${esc(pw.pivotType)}</span>`;
    html += `</div>`;
    html += `<p style="font-size:.82em;color:var(--gray-700);line-height:1.5;margin-bottom:6px;"><strong style="color:var(--teal);">Merit:</strong> ${esc(pw.merit)}</p>`;
    html += `<p style="font-size:.82em;color:var(--gray-700);line-height:1.5;margin:0;"><strong style="color:var(--coral);">Constraint:</strong> ${esc(pw.constraint)}</p>`;
    html += `</div>`;
  }
  html += `</div>`;

  // Component 3: Quantitative Snapshot
  html += `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px;">`;
  // SAM
  html += `<div style="background:var(--rpt-white);border:1px solid var(--gray-200);border-radius:8px;padding:14px;text-align:center;">`;
  html += `<span style="display:block;font-family:'Playfair Display',serif;font-size:1.3em;font-weight:700;color:var(--navy);">${esc(data.sam.value)}</span>`;
  html += `<span style="display:block;font-family:'JetBrains Mono',monospace;font-size:.55em;letter-spacing:1.5px;text-transform:uppercase;color:var(--gray-500);margin-top:2px;">Addressable Market (SAM)</span>`;
  html += `<p style="font-size:.72em;color:var(--gray-500);margin:6px 0 0;line-height:1.4;">${esc(data.sam.context)}</p>`;
  html += `</div>`;
  // Monte Carlo P50
  html += `<div style="background:var(--rpt-white);border:1px solid var(--gray-200);border-radius:8px;padding:14px;text-align:center;">`;
  html += `<span id="exec-p50" style="display:block;font-family:'Playfair Display',serif;font-size:1.05em;font-weight:700;color:var(--navy);min-height:1.5em;">${esc(data.monteCarloPre)}</span>`;
  html += `<span style="display:block;font-family:'JetBrains Mono',monospace;font-size:.55em;letter-spacing:1.5px;text-transform:uppercase;color:var(--gray-500);margin-top:2px;">Monte Carlo Median (P50), Year 5</span>`;
  html += `<p style="font-size:.72em;color:var(--gray-500);margin:6px 0 0;line-height:1.4;font-style:italic;">This is a headline figure from a probabilistic model with wide confidence bands. Do not use in isolation for planning.</p>`;
  html += `</div>`;
  // Capital Entry
  html += `<div style="background:var(--rpt-white);border:1px solid var(--gray-200);border-radius:8px;padding:14px;text-align:center;">`;
  html += `<span style="display:block;font-family:'Playfair Display',serif;font-size:1.05em;font-weight:700;color:var(--navy);">${esc(data.capitalEntry.value)}</span>`;
  html += `<span style="display:block;font-family:'JetBrains Mono',monospace;font-size:.55em;letter-spacing:1.5px;text-transform:uppercase;color:var(--gray-500);margin-top:2px;">Capital Entry Threshold</span>`;
  html += `<p style="font-size:.72em;color:var(--gray-500);margin:6px 0 0;line-height:1.4;">${esc(data.capitalEntry.context)}</p>`;
  html += `</div>`;
  html += `</div>`;

  // Component 4: Critical Risks
  html += `<div style="margin-bottom:18px;">`;
  html += `<h4 style="font-family:'JetBrains Mono',monospace;font-size:.68em;letter-spacing:2px;text-transform:uppercase;color:var(--coral);margin:0 0 10px;">Critical Risks</h4>`;
  for (const r of data.criticalRisks.slice(0, 3)) {
    const tagColor = r.pathwayTag === 'Pathway A' ? 'rgba(201,168,76,.15)' : r.pathwayTag === 'Pathway B' ? 'rgba(42,157,143,.12)' : 'rgba(107,114,128,.1)';
    const tagText = r.pathwayTag === 'Pathway A' ? 'var(--gold)' : r.pathwayTag === 'Pathway B' ? 'var(--teal)' : 'var(--gray-500)';
    html += `<div style="margin-bottom:8px;font-size:.84em;line-height:1.55;color:var(--gray-700);">`;
    html += `<span style="font-family:'JetBrains Mono',monospace;font-size:.72em;letter-spacing:.5px;padding:2px 8px;border-radius:100px;background:${tagColor};color:${tagText};margin-right:6px;">${esc(r.pathwayTag)}</span>`;
    html += `${esc(r.risk)}</div>`;
  }
  html += `</div>`;

  // Component 5: What to Do First
  html += `<div style="background:rgba(42,157,143,.04);border:1px solid rgba(42,157,143,.12);border-radius:8px;padding:16px;margin-bottom:18px;">`;
  html += `<h4 style="font-family:'JetBrains Mono',monospace;font-size:.68em;letter-spacing:2px;text-transform:uppercase;color:var(--teal);margin:0 0 8px;">What to Do First</h4>`;
  html += `<p style="font-size:.86em;color:var(--rpt-text);line-height:1.6;margin:0;">${esc(data.whatToDoFirst)}</p>`;
  html += `</div>`;

  // Component 6: Summit Connections
  html += `<div style="margin-bottom:8px;">`;
  html += `<h4 style="font-family:'JetBrains Mono',monospace;font-size:.68em;letter-spacing:2px;text-transform:uppercase;color:var(--navy);margin:0 0 10px;">Critical Summit Connections</h4>`;
  for (const c of data.summitConnections.slice(0, 3)) {
    html += `<p style="font-size:.84em;color:var(--gray-700);line-height:1.55;margin-bottom:6px;">`;
    html += `<strong style="color:var(--navy);">${esc(c.connectionType)}</strong> \u2014 ${esc(c.rationale)}</p>`;
  }
  html += `</div>`;

  // Anchor to full analysis
  html += `<p style="text-align:center;margin:16px 0 0;font-size:.8em;color:var(--gray-500);">Full analysis follows \u2192</p>`;

  html += `</div>`; // close exec-summary
  return html;
}

