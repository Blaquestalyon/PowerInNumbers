// AUTO-EXTRACTED from client/src/pages/report.tsx ReportStyles() template literal.
// If you change report CSS in report.tsx, re-run scripts/extract-report-css.js to refresh this file.
export const REPORT_CSS = String.raw`
/* ══════════════════════════════════════════════════════ */
/* AI MIRROR — UNIFIED REPORT STYLESHEET                 */
/* Full reference CSS for all 15 sections + Monte Carlo  */
/* ══════════════════════════════════════════════════════ */

/* ── CSS Variables ── */
.report-section {
  --navy: #0B1D3A;
  --navy-light: #132C54;
  --navy-mid: #1A3A6E;
  --gold: #C9A84C;
  --gold-light: #E8D48B;
  --gold-dark: #9A7B30;
  --teal: #2A9D8F;
  --teal-light: #40BFB0;
  --teal-dark: #1A7A6E;
  --coral: #E07A5F;
  --coral-light: #F0A08B;
  --rpt-white: #FAFAF8;
  --gray-50: #F7F7F5;
  --gray-100: #F3F3F0;
  --gray-200: #E5E5E0;
  --gray-300: #E0E0E0;
  --gray-500: #6B7280;
  --gray-700: #3D4451;
  --rpt-text: #1A1A1A;
  --radius: 14px;
  --radius-sm: 8px;
  --shadow: 0 4px 24px rgba(11,29,58,0.07);
  --shadow-lg: 0 8px 40px rgba(11,29,58,0.11);

  font-family: 'Source Sans 3', sans-serif;
  color: var(--rpt-text);
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
  padding: 0;
  margin-bottom: 1.5rem;
}

/* ── REPORT CONTAINER ── */
.report-section .rc {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
}

/* ── HEADER ── */
.report-section .rh {
  background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 55%, var(--navy-mid) 100%);
  color: #fff;
  padding: 52px 48px;
  border-radius: var(--radius);
  margin-bottom: 36px;
  position: relative;
  overflow: hidden;
}
.report-section .rh::after {
  content: '';
  position: absolute;
  top: -40%;
  right: -15%;
  width: 550px;
  height: 550px;
  background: radial-gradient(circle, rgba(201,168,76,.07) 0%, transparent 70%);
  pointer-events: none;
}
.report-section .rh-eye {
  font-family: 'JetBrains Mono', monospace;
  font-size: .7em;
  letter-spacing: 3.5px;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: 14px;
  opacity: .9;
}
.report-section .rh h1 {
  font-family: 'Playfair Display', serif;
  font-size: 2.5em;
  font-weight: 800;
  line-height: 1.12;
  margin-bottom: 10px;
}
.report-section .rh-sub {
  font-size: 1.05em;
  font-weight: 300;
  opacity: .82;
  max-width: 680px;
  margin-bottom: 28px;
}
.report-section .badges {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.report-section .badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: .65em;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  padding: 5px 14px;
  border-radius: 100px;
  border: 1px solid rgba(255,255,255,.18);
  background: rgba(255,255,255,.05);
}
.report-section .badge.g {
  border-color: var(--gold);
  color: var(--gold);
}
.report-section .badge.t {
  border-color: var(--teal-light);
  color: var(--teal-light);
}

/* ══════════════════════════════════════════════════════════════
   LLM-GENERATED SECTION CLASSES
   These classes are used by Claude Opus 4.7 when generating
   section HTML. They style white-background report sections.
   ══════════════════════════════════════════════════════════════ */

/* Section structure */
.report-section .section-header {
  margin-bottom: 24px;
}
.report-section .section-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.8em;
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 6px;
  line-height: 1.2;
}
.report-section .section-subtitle {
  font-size: .9em;
  color: var(--gray-500);
  margin-bottom: 0;
}
.report-section .section-body {
  font-size: .94em;
  color: var(--gray-700);
  line-height: 1.65;
}
.report-section .section-body p {
  margin-bottom: 14px;
}
.report-section .section-body strong {
  color: var(--rpt-text);
}
.report-section .section-body h3 {
  font-family: 'Playfair Display', serif;
  font-size: 1.25em;
  font-weight: 700;
  color: var(--navy);
  margin: 28px 0 12px;
}
.report-section .section-body h4 {
  font-size: 1em;
  font-weight: 600;
  color: var(--rpt-text);
  margin: 20px 0 8px;
}

/* Hero stats / metric pills */
.report-section .hero-stats {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}
.report-section .metric-pill {
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-sm);
  padding: 14px 20px;
  text-align: center;
  min-width: 120px;
  flex: 1;
}
.report-section .metric-value {
  display: block;
  font-family: 'Playfair Display', serif;
  font-size: 1.4em;
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 2px;
}
.report-section .metric-label {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: .6em;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--gray-500);
}

/* Pathway cards */
.report-section .pathway-card {
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 24px;
  margin-bottom: 18px;
  box-shadow: var(--shadow);
}
.report-section .pathway-card--a {
  border-top: 4px solid var(--teal);
}
.report-section .pathway-card--b {
  border-top: 4px solid var(--gold);
}
.report-section .pathway-card h4 {
  font-family: 'Playfair Display', serif;
  font-size: 1.15em;
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 8px;
}
.report-section .pathway-card p {
  color: var(--gray-700);
  font-size: .9em;
  line-height: 1.6;
}

/* Risk badges */
.report-section .risk-badge {
  display: inline-block;
  font-family: 'JetBrains Mono', monospace;
  font-size: .65em;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: 100px;
  font-weight: 600;
}
.report-section .risk-badge--high,
.report-section .risk-badge--critical {
  background: rgba(224,122,95,.12);
  color: var(--coral);
  border: 1px solid rgba(224,122,95,.3);
}
.report-section .risk-badge--moderate {
  background: rgba(201,168,76,.12);
  color: var(--gold);
  border: 1px solid rgba(201,168,76,.3);
}
.report-section .risk-badge--low {
  background: rgba(42,157,143,.12);
  color: var(--teal);
  border: 1px solid rgba(42,157,143,.3);
}

/* Disclosure & limitations */
.report-section .disclosure-block {
  background: var(--gray-50);
  border-left: 3px solid var(--gray-300);
  padding: 16px 22px;
  font-size: .8em;
  color: var(--gray-500);
  line-height: 1.55;
  margin-top: 24px;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}
.report-section .limitation-note {
  font-size: .8em;
  color: var(--gray-500);
  font-style: italic;
  margin-top: 12px;
}

/* Source citations & vintage */
.report-section .source-citation {
  font-size: .75em;
  color: var(--gray-500);
  font-style: italic;
}
.report-section .data-vintage {
  font-family: 'JetBrains Mono', monospace;
  font-size: .7em;
  color: var(--teal);
  opacity: .8;
}

/* SWOT grid */
.report-section .swot-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-bottom: 24px;
}
@media(max-width: 720px) {
  .report-section .swot-grid { grid-template-columns: 1fr; }
}
.report-section .swot-grid > div {
  padding: 20px;
  border-radius: var(--radius-sm);
  font-size: .88em;
  line-height: 1.55;
}
.report-section .swot-grid > div:nth-child(1) { background: rgba(42,157,143,.06); border: 1px solid rgba(42,157,143,.15); }
.report-section .swot-grid > div:nth-child(2) { background: rgba(224,122,95,.06); border: 1px solid rgba(224,122,95,.15); }
.report-section .swot-grid > div:nth-child(3) { background: rgba(201,168,76,.06); border: 1px solid rgba(201,168,76,.15); }
.report-section .swot-grid > div:nth-child(4) { background: rgba(11,29,58,.04); border: 1px solid rgba(11,29,58,.1); }
.report-section .swot-grid h4 {
  font-family: 'JetBrains Mono', monospace;
  font-size: .68em;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 10px;
}
.report-section .swot-grid > div:nth-child(1) h4 { color: var(--teal); }
.report-section .swot-grid > div:nth-child(2) h4 { color: var(--coral); }
.report-section .swot-grid > div:nth-child(3) h4 { color: var(--gold); }
.report-section .swot-grid > div:nth-child(4) h4 { color: var(--navy); }
.report-section .swot-grid li {
  color: var(--gray-700);
  margin-bottom: 6px;
}

/* Scenario / risk deep dives */
.report-section .scenario-deep-dive,
.report-section .risk-deep-dive,
.report-section .scenario-narrative {
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-sm);
  padding: 20px;
  margin-bottom: 16px;
}
.report-section .scenario-deep-dive h4,
.report-section .risk-deep-dive h4,
.report-section .scenario-narrative h4 {
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 8px;
}
.report-section .scenario-deep-dive p,
.report-section .risk-deep-dive p,
.report-section .scenario-narrative p {
  color: var(--gray-700);
  font-size: .9em;
  line-height: 1.6;
}

/* Signal/friction & connection cards */
.report-section .signal-friction-overview {
  margin-bottom: 24px;
}
.report-section .connection-card {
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-sm);
  padding: 18px;
  margin-bottom: 12px;
}
.report-section .connection-card h4 {
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 4px;
}
.report-section .connection-card p {
  color: var(--gray-700);
  font-size: .88em;
}

/* CTA block */
.report-section .cta-block {
  background: var(--navy);
  color: #fff;
  border-radius: var(--radius);
  padding: 30px;
  text-align: center;
  margin-top: 24px;
}
.report-section .cta-block h3 {
  font-family: 'Playfair Display', serif;
  color: #fff;
  margin-bottom: 10px;
}
.report-section .cta-block p {
  color: rgba(255,255,255,.85);
  font-size: .9em;
}

/* Catch-all: unstyled tables inside LLM sections get light-theme styling */
.report-section table:not(.data-table):not(.tbl):not(.dt):not(.assumptions-table) {
  width: 100%;
  border-collapse: collapse;
  font-size: .84em;
  margin-bottom: 18px;
}
.report-section table:not(.data-table):not(.tbl):not(.dt):not(.assumptions-table) th {
  background: var(--gray-100);
  color: var(--navy);
  font-family: 'JetBrains Mono', monospace;
  font-size: .78em;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 10px 12px;
  text-align: left;
  border-bottom: 2px solid var(--gray-200);
}
.report-section table:not(.data-table):not(.tbl):not(.dt):not(.assumptions-table) td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--gray-100);
  color: var(--gray-700);
}
.report-section table:not(.data-table):not(.tbl):not(.dt):not(.assumptions-table) td:first-child {
  font-weight: 600;
  color: var(--rpt-text);
}
.report-section table:not(.data-table):not(.tbl):not(.dt):not(.assumptions-table) tr:hover td {
  background: var(--gray-50);
}

/* ── DISCLOSURE ── */
.report-section .disc {
  background: var(--gray-50);
  border-left: 3px solid var(--gold);
  padding: 16px 22px;
  font-size: .82em;
  color: var(--gray-500);
  margin-bottom: 36px;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  line-height: 1.55;
}

/* ── SECTIONS ── */
.report-section .os {
  margin-bottom: 44px;
}
.report-section .sn {
  font-family: 'JetBrains Mono', monospace;
  font-size: .65em;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: var(--teal);
  margin-bottom: 6px;
}
.report-section .st {
  font-family: 'Playfair Display', serif;
  font-size: 1.6em;
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 18px;
  line-height: 1.22;
}
.report-section .sb {
  font-size: .94em;
  color: var(--gray-700);
}
.report-section .sb p {
  margin-bottom: 14px;
}
.report-section .sb strong {
  color: var(--rpt-text);
}

/* ── POSITION READOUT ── */
.report-section .pr {
  background: var(--navy);
  color: #fff;
  padding: 30px 34px;
  border-radius: var(--radius);
  margin-bottom: 26px;
  display: flex;
  gap: 36px;
  flex-wrap: wrap;
  align-items: center;
}
.report-section .pr-col {
  min-width: 200px;
}
.report-section .pr-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: .62em;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: 4px;
}
.report-section .pr-val {
  font-family: 'Playfair Display', serif;
  font-size: 1.3em;
  font-weight: 600;
}
.report-section .pr-sc {
  font-family: 'JetBrains Mono', monospace;
  font-size: .82em;
  color: var(--gold-light);
}
.report-section .pr-ctx {
  flex: 1;
  min-width: 300px;
  font-size: .87em;
  opacity: .83;
  line-height: 1.55;
}

/* ── SCORING GRID ── */
.report-section .sg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px;
  margin-bottom: 26px;
}
@media(max-width: 720px) {
  .report-section .sg { grid-template-columns: 1fr; }
}
.report-section .sc {
  background: #fff;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow);
}
.report-section .sc-t {
  font-family: 'JetBrains Mono', monospace;
  font-size: .63em;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--teal);
  margin-bottom: 12px;
}
.report-section .cr {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--gray-100);
  font-size: .87em;
}
.report-section .cr:last-of-type {
  border-bottom: none;
}
.report-section .cr-n {
  color: var(--gray-700);
}
.report-section .cr-s {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  min-width: 36px;
  text-align: right;
}
.report-section .cr-s.h { color: var(--teal); }
.report-section .cr-s.m { color: var(--gold); }
.report-section .cr-s.l { color: var(--coral); }
.report-section .total {
  display: flex;
  justify-content: space-between;
  padding: 12px 0 0;
  margin-top: 8px;
  border-top: 2px solid var(--navy);
  font-weight: 700;
  font-size: .95em;
}
.report-section .total .cr-s {
  font-size: 1.05em;
  color: var(--navy);
}
.report-section .cb {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 100px;
  font-family: 'JetBrains Mono', monospace;
  font-size: .68em;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-top: 8px;
}
.report-section .cb-s {
  background: rgba(42,157,143,.1);
  color: var(--teal);
  border: 1px solid var(--teal);
}
.report-section .cb-p {
  background: rgba(201,168,76,.1);
  color: var(--gold-dark);
  border: 1px solid var(--gold);
}
.report-section .sc-note {
  font-size: .77em;
  color: var(--gray-500);
  margin-top: 10px;
  line-height: 1.5;
}

/* ── 2x2 MAP ── */
.report-section .map-wrap {
  background: #fff;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 28px;
  box-shadow: var(--shadow);
  margin-bottom: 26px;
}
.report-section .map-t {
  font-family: 'JetBrains Mono', monospace;
  font-size: .63em;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--navy);
  margin-bottom: 16px;
  text-align: center;
}
.report-section .pm {
  position: relative;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  aspect-ratio: 1;
}
.report-section .mg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  width: 100%;
  height: 100%;
  border: 2px solid var(--navy);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.report-section .mq {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: .72em;
  font-weight: 500;
  line-height: 1.35;
  color: var(--gray-700);
}
.report-section .mq.ul { background: rgba(42,157,143,.07); }
.report-section .mq.ur { background: rgba(201,168,76,.07); }
.report-section .mq.ll { background: rgba(204,204,204,.1); }
.report-section .mq.lr { background: rgba(224,122,95,.07); }
.report-section .dot {
  position: absolute;
  width: 18px;
  height: 18px;
  border: 3px solid var(--navy);
  border-radius: 50%;
  z-index: 10;
}
.report-section .dot.a {
  background: var(--gold);
  box-shadow: 0 0 0 4px rgba(201,168,76,.25);
}
.report-section .dot.b {
  background: var(--teal);
  box-shadow: 0 0 0 4px rgba(42,157,143,.25);
}
.report-section .map-xl {
  text-align: center;
  margin-top: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: .58em;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--gray-500);
}

/* ── PATHWAY CARDS ── */
.report-section .pw {
  background: #fff;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 30px;
  margin-bottom: 22px;
  box-shadow: var(--shadow);
}
.report-section .pw.a { border-top: 4px solid var(--teal); }
.report-section .pw.b { border-top: 4px solid var(--gold); }
.report-section .pw-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 100px;
  font-family: 'JetBrains Mono', monospace;
  font-size: .6em;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 10px;
}
.report-section .pw-badge.dt {
  background: rgba(42,157,143,.1);
  color: var(--teal);
}
.report-section .pw-badge.sk {
  background: rgba(201,168,76,.1);
  color: var(--gold-dark);
}
.report-section .pw-name {
  font-family: 'Playfair Display', serif;
  font-size: 1.22em;
  font-weight: 600;
  color: var(--navy);
  margin-bottom: 12px;
}
.report-section .pw-desc {
  font-size: .87em;
  color: var(--gray-700);
  margin-bottom: 16px;
  line-height: 1.62;
}
.report-section .pw-desc p {
  margin-bottom: 12px;
}

/* ── COMPETITOR CARD ── */
.report-section .cc {
  background: var(--gray-50);
  border-radius: var(--radius-sm);
  padding: 22px;
  margin-top: 18px;
}
.report-section .cc-t {
  font-family: 'JetBrains Mono', monospace;
  font-size: .63em;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--navy);
  margin-bottom: 12px;
}
.report-section .ce {
  font-size: .83em;
  padding: 7px 0;
  border-bottom: 1px solid var(--gray-200);
  color: var(--gray-700);
}
.report-section .ce:last-child { border-bottom: none; }
.report-section .ce strong {
  color: var(--rpt-text);
  font-weight: 600;
}
.report-section .ce .o {
  color: var(--gray-500);
  font-size: .88em;
}
.report-section .sat {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: .62em;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-top: 10px;
}
.report-section .sat.u {
  background: rgba(42,157,143,.12);
  color: var(--teal);
}
.report-section .sat.w {
  background: rgba(42,157,143,.18);
  color: var(--teal-dark);
}
.report-section .ws {
  background: rgba(42,157,143,.05);
  border-left: 3px solid var(--teal);
  padding: 14px 18px;
  margin-top: 14px;
  font-size: .83em;
  color: var(--gray-700);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  line-height: 1.55;
}
.report-section .ws strong {
  color: var(--teal-dark);
}

/* ── MILESTONES ── */
.report-section .ml {
  margin-top: 18px;
}
.report-section .ml-h {
  font-size: .84em;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--navy);
}
.report-section .mi {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  font-size: .83em;
  border-bottom: 1px solid var(--gray-100);
}
.report-section .mi:last-child { border-bottom: none; }
.report-section .mi-n {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  color: var(--teal);
  min-width: 20px;
}

/* ── STRATEGIC PAUSE ── */
.report-section .sp {
  background: rgba(224,122,95,.03);
  border: 1px solid rgba(224,122,95,.18);
  border-radius: var(--radius);
  padding: 30px;
  margin-bottom: 36px;
}
.report-section .sp-t {
  font-family: 'Playfair Display', serif;
  font-size: 1.18em;
  font-weight: 600;
  color: var(--coral);
  margin-bottom: 18px;
}
.report-section .sp-i {
  margin-bottom: 16px;
  font-size: .87em;
  color: var(--gray-700);
  line-height: 1.62;
}
.report-section .sp-i strong {
  color: var(--rpt-text);
}

/* ── ENTRY STRATEGY ── */
.report-section .es {
  background: #fff;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 28px;
  margin-bottom: 20px;
  box-shadow: var(--shadow);
}
.report-section .es-h {
  font-family: 'Playfair Display', serif;
  font-size: 1.05em;
  font-weight: 600;
  color: var(--navy);
  margin-bottom: 10px;
}
.report-section .es-body {
  font-size: .87em;
  color: var(--gray-700);
  line-height: 1.6;
}
.report-section .es-body p {
  margin-bottom: 10px;
}

/* ── TIMELINE ── */
.report-section .tg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 26px;
}
@media(max-width: 720px) {
  .report-section .tg { grid-template-columns: 1fr; }
}
.report-section .tc {
  background: #fff;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow);
}
.report-section .tc.q { border-left: 4px solid var(--teal); }
.report-section .tc.l { border-left: 4px solid var(--gold); }
.report-section .tc-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: .6em;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 10px;
}
.report-section .tc-label.q { color: var(--teal); }
.report-section .tc-label.l { color: var(--gold); }
.report-section .ti {
  font-size: .83em;
  padding: 8px 0;
  color: var(--gray-700);
  border-bottom: 1px solid var(--gray-100);
}
.report-section .ti:last-child { border-bottom: none; }
.report-section .ti strong {
  color: var(--rpt-text);
}

/* ── DECOMP TABLE ── */
.report-section .dt {
  width: 100%;
  border-collapse: collapse;
  font-size: .8em;
  margin-bottom: 18px;
}
.report-section .dt th {
  background: var(--gray-100);
  font-family: 'JetBrains Mono', monospace;
  font-size: .78em;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 10px 12px;
  text-align: left;
  color: var(--navy);
  border-bottom: 2px solid var(--gray-200);
}
.report-section .dt td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--gray-100);
  color: var(--gray-700);
}
.report-section .dt tr.sam {
  background: rgba(42,157,143,.06);
  font-weight: 600;
}
.report-section .dt tr.som {
  background: rgba(201,168,76,.05);
  font-style: italic;
}

/* ── SOURCE TAGS ── */
.report-section .stag {
  font-size: .78em;
  font-style: italic;
  opacity: .72;
  margin-left: 4px;
}
.report-section .stag.t4 { color: var(--coral); }
.report-section .stag.t3 { color: var(--gray-500); }

/* ── SCENARIO ENVELOPE ── */
.report-section .env {
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 26px;
  margin-bottom: 20px;
}
.report-section .env-t {
  font-family: 'JetBrains Mono', monospace;
  font-size: .63em;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--navy);
  margin-bottom: 14px;
}
.report-section .env-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
@media(max-width: 720px) {
  .report-section .env-grid { grid-template-columns: 1fr; }
}
.report-section .env-card {
  padding: 20px;
  border-radius: var(--radius-sm);
  font-size: .84em;
  line-height: 1.55;
}
.report-section .env-card.d {
  background: rgba(224,122,95,.08);
  border: 1px solid rgba(224,122,95,.15);
}
.report-section .env-card.b {
  background: rgba(201,168,76,.08);
  border: 1px solid rgba(201,168,76,.15);
}
.report-section .env-card.u {
  background: rgba(42,157,143,.08);
  border: 1px solid rgba(42,157,143,.15);
}
.report-section .env-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: .72em;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.report-section .env-card.d .env-label { color: var(--coral); }
.report-section .env-card.b .env-label { color: var(--gold-dark); }
.report-section .env-card.u .env-label { color: var(--teal); }
.report-section .env-band {
  font-family: 'Playfair Display', serif;
  font-size: 1.4em;
  font-weight: 700;
  margin-bottom: 6px;
  color: var(--navy);
}
.report-section .env-nar {
  color: var(--gray-700);
  font-size: .9em;
}

/* ── PHASE HEADER ── */
.report-section .phase-header {
  background: var(--navy);
  color: #fff;
  padding: 20px 28px;
  border-radius: var(--radius);
  margin-bottom: 32px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.report-section .phase-header .ph-eye {
  font-family: 'JetBrains Mono', monospace;
  font-size: .68em;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: var(--gold);
}
.report-section .phase-header h2 {
  font-family: 'Playfair Display', serif;
  font-size: 1.5em;
  font-weight: 700;
}
.report-section .ph {
  background: var(--navy);
  color: #fff;
  padding: 20px 28px;
  border-radius: var(--radius);
  margin-bottom: 32px;
}
.report-section .ph-eye {
  font-family: 'JetBrains Mono', monospace;
  font-size: .68em;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: var(--gold);
}
.report-section .ph h2 {
  font-family: 'Playfair Display', serif;
  font-size: 1.5em;
  font-weight: 700;
  margin-top: 4px;
}

/* ══════════════════════════════════════════════════════ */
/* MONTE CARLO SECTION                                    */
/* ══════════════════════════════════════════════════════ */
.report-section .monte {
  background: var(--navy);
  color: #fff;
  border-radius: var(--radius);
  padding: 40px;
  margin-bottom: 36px;
}
.report-section .monte .sn {
  color: var(--gold);
}
.report-section .monte .st {
  color: #fff;
}
.report-section .monte .sb,
.report-section .monte .sb p {
  color: rgba(255,255,255,.92);
}
.report-section .monte .sb strong {
  color: #fff;
}

/* ── DARK-ON-DARK OVERRIDES: generic light-theme classes inside .monte ── */

/* .disc explainer box */
.report-section .monte .disc {
  background: rgba(201,168,76,.15);
  border-left-color: var(--gold);
  color: rgba(255,255,255,.95);
}
.report-section .monte .disc strong {
  color: #fff;
}

/* .sc scenario cards — translucent dark cards instead of white */
.report-section .monte .sc {
  background: rgba(255,255,255,.06);
  border-color: rgba(255,255,255,.15);
  color: rgba(255,255,255,.92);
  box-shadow: none;
}
.report-section .monte .sc-t {
  color: var(--teal-light);
}
.report-section .monte .sc-note {
  color: rgba(255,255,255,.80);
}

/* .tbl data tables */
.report-section .monte .tbl th {
  background: rgba(255,255,255,.10);
  color: var(--gold);
  border-bottom: 1px solid rgba(255,255,255,.18);
}
.report-section .monte .tbl td {
  color: rgba(255,255,255,.92);
  border-bottom: 1px solid rgba(255,255,255,.10);
}
.report-section .monte .tbl td:first-child {
  color: var(--gold-light);
  font-weight: 600;
}
.report-section .monte .tbl tr:hover td {
  background: rgba(255,255,255,.07);
}

/* .stag tier labels */
.report-section .monte .stag {
  color: rgba(255,255,255,.65);
  opacity: 1;
}

/* Stats row cards */
.report-section .monte .stats-row .sc {
  background: rgba(255,255,255,.06);
  border-color: rgba(255,255,255,.12);
}
.report-section .run-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: var(--gold);
  color: var(--navy);
  font-family: 'JetBrains Mono', monospace;
  font-size: .82em;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 14px 34px;
  border: none;
  border-radius: 100px;
  cursor: pointer;
  transition: all .3s;
  margin-bottom: 24px;
}
.report-section .run-btn:hover {
  background: var(--gold-light);
  transform: translateY(-1px);
}
.report-section .run-btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}
.report-section .dl-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  color: var(--gold);
  font-family: 'JetBrains Mono', monospace;
  font-size: .78em;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 12px 26px;
  border: 1px solid var(--gold);
  border-radius: 100px;
  cursor: pointer;
  transition: all .3s;
  margin-left: 12px;
  margin-bottom: 24px;
}
.report-section .dl-btn:hover {
  background: var(--gold);
  color: var(--navy);
  transform: translateY(-1px);
}
.report-section .dl-btn:disabled {
  opacity: .4;
  cursor: not-allowed;
}
.report-section .progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(255,255,255,.15);
  border-radius: 2px;
  margin-bottom: 24px;
  display: none;
}
.report-section .progress-fill {
  height: 100%;
  background: var(--gold);
  border-radius: 2px;
  width: 0%;
  transition: width .1s;
}

.report-section .explainer {
  background: rgba(201,168,76,.15);
  border: 1px solid rgba(201,168,76,.4);
  border-radius: var(--radius-sm);
  padding: 20px 24px;
  margin-bottom: 26px;
  font-size: .85em;
  line-height: 1.6;
  color: rgba(255,255,255,1);
  display: none;
}
.report-section .explainer strong {
  color: var(--gold-light);
}

.report-section .scenario-cards {
  display: none;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 28px;
}
@media(max-width: 720px) {
  .report-section .scenario-cards { grid-template-columns: 1fr; }
}
.report-section .sc-card {
  padding: 24px;
  border-radius: var(--radius-sm);
  text-align: center;
}
.report-section .sc-card.p25 { background: rgba(224,122,95,.15); }
.report-section .sc-card.p50 { background: rgba(201,168,76,.15); }
.report-section .sc-card.p75 { background: rgba(42,157,143,.15); }
.report-section .sc-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: .62em;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.report-section .sc-card.p25 .sc-label { color: var(--coral-light); }
.report-section .sc-card.p50 .sc-label { color: var(--gold-light); }
.report-section .sc-card.p75 .sc-label { color: var(--teal-light); }
.report-section .sc-value {
  font-family: 'Playfair Display', serif;
  font-size: 1.9em;
  font-weight: 700;
  margin-bottom: 6px;
}
.report-section .sc-ctx {
  font-size: .78em;
  opacity: .95;
  line-height: 1.4;
}

.report-section .chart-wrap {
  margin-bottom: 26px;
  display: none;
}
.report-section canvas {
  width: 100%;
  border-radius: var(--radius-sm);
  background: rgba(255,255,255,.04);
}

.report-section .data-table-wrap {
  overflow-x: auto;
  margin-bottom: 26px;
  display: none;
}

/* ── data-table: DEFAULT light-background styling ── */
.report-section .data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: .82em;
  margin-bottom: 18px;
}
.report-section .data-table th {
  background: var(--gray-100);
  color: var(--navy);
  font-family: 'JetBrains Mono', monospace;
  font-size: .78em;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 10px 12px;
  text-align: left;
  border-bottom: 2px solid var(--gray-200);
}
.report-section .data-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--gray-100);
  color: var(--gray-700);
}
.report-section .data-table td:first-child {
  font-weight: 600;
  color: var(--rpt-text);
}
.report-section .data-table tr:hover td {
  background: var(--gray-50);
}

/* ── data-table inside .monte: dark-background overrides ── */
.report-section .monte .data-table th {
  background: rgba(255,255,255,.10);
  color: var(--gold);
  border-bottom: 1px solid rgba(255,255,255,.18);
}
.report-section .monte .data-table td {
  border-bottom: 1px solid rgba(255,255,255,.10);
  color: rgba(255,255,255,.95);
}
.report-section .monte .data-table td:first-child {
  color: var(--gold-light);
}
.report-section .monte .data-table tr:hover td {
  background: rgba(255,255,255,.07);
}

.report-section .insight-bar {
  background: rgba(201,168,76,.18);
  border: 1px solid rgba(201,168,76,.4);
  border-radius: var(--radius-sm);
  padding: 18px 24px;
  font-size: .88em;
  color: var(--gold-light);
  text-align: center;
  margin-bottom: 26px;
  display: none;
  line-height: 1.55;
}

.report-section .stats-row {
  display: none;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 26px;
}
@media(max-width: 720px) {
  .report-section .stats-row { grid-template-columns: 1fr 1fr; }
}
.report-section .stat-box {
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.15);
  border-radius: var(--radius-sm);
  padding: 14px;
  text-align: center;
}
.report-section .stat-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: .6em;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--gray-300);
  margin-bottom: 4px;
}
.report-section .stat-val {
  font-family: 'Playfair Display', serif;
  font-size: 1.3em;
  font-weight: 700;
  color: #fff;
}

.report-section .assumptions-table {
  width: 100%;
  border-collapse: collapse;
  font-size: .74em;
  margin-top: 18px;
  display: none;
}
.report-section .assumptions-table th {
  background: rgba(255,255,255,.10);
  color: var(--gold);
  font-family: 'JetBrains Mono', monospace;
  font-size: .82em;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid rgba(255,255,255,.18);
}
.report-section .assumptions-table td {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255,255,255,.10);
  color: rgba(255,255,255,.95);
}
.report-section .assumptions-table tr:hover td {
  background: rgba(255,255,255,.07);
}

.report-section .mc-disclosure {
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.15);
  border-radius: var(--radius-sm);
  padding: 18px 22px;
  font-size: .73em;
  color: rgba(255,255,255,.78);
  line-height: 1.6;
  margin-top: 22px;
  display: none;
}

/* ── SENSITIVITY ── */
.report-section .prcc-wrap {
  margin-bottom: 26px;
  display: none;
}

/* ── SCENARIO NARRATIVES ── */
.report-section .nar-card {
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.15);
  border-radius: var(--radius-sm);
  padding: 22px;
  margin-bottom: 16px;
  display: none;
}
.report-section .nar-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: .62em;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.report-section .nar-card.p10 .nar-label { color: var(--coral-light); }
.report-section .nar-card.p50 .nar-label { color: var(--gold-light); }
.report-section .nar-card.p90 .nar-label { color: var(--teal-light); }
.report-section .nar-val {
  font-family: 'Playfair Display', serif;
  font-size: 1.4em;
  font-weight: 700;
  margin-bottom: 8px;
}
.report-section .nar-text {
  font-size: .85em;
  color: rgba(255,255,255,.95);
  line-height: 1.6;
}

/* ── WHITE BACKGROUND SECTIONS ── */
.report-section .wos {
  background: #fff;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 30px;
  margin-bottom: 24px;
  box-shadow: var(--shadow);
}
.report-section .wos .sn { color: var(--teal); }
.report-section .wos .st { color: var(--navy); }

/* ── SUMMIT CARDS ── */
.report-section .sm-card {
  background: var(--gray-50);
  border-radius: var(--radius-sm);
  padding: 20px;
  margin-bottom: 14px;
}
.report-section .sm-role {
  font-family: 'JetBrains Mono', monospace;
  font-size: .6em;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: 5px;
}
.report-section .sm-name {
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 4px;
  font-size: 1.02em;
}
.report-section .sm-why {
  font-size: .84em;
  color: var(--gray-500);
  line-height: 1.55;
}

/* ── TIMELINE PHASES ── */
.report-section .tl-phase {
  background: var(--gray-50);
  border-radius: var(--radius-sm);
  padding: 22px;
  margin-bottom: 14px;
  border-left: 4px solid var(--teal);
}
.report-section .tl-phase.y2 { border-color: var(--gold); }
.report-section .tl-phase.y3 { border-color: var(--coral); }
.report-section .tl-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: .62em;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.report-section .tl-phase:nth-child(1) .tl-label { color: var(--teal); }
.report-section .tl-phase.y2 .tl-label { color: var(--gold); }
.report-section .tl-phase.y3 .tl-label { color: var(--coral); }
.report-section .tl-item {
  font-size: .84em;
  padding: 5px 0;
  color: var(--gray-700);
  border-bottom: 1px solid var(--gray-200);
}
.report-section .tl-item:last-child { border-bottom: none; }

/* ── VERIFICATION LOG ── */
.report-section .vlog {
  width: 100%;
  border-collapse: collapse;
  font-size: .73em;
  margin-bottom: 24px;
}
.report-section .vlog th {
  background: var(--gray-100);
  font-family: 'JetBrains Mono', monospace;
  font-size: .8em;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 8px 10px;
  text-align: left;
  color: var(--navy);
  border-bottom: 2px solid var(--gray-200);
}
.report-section .vlog td {
  padding: 7px 10px;
  border-bottom: 1px solid var(--gray-100);
  color: var(--gray-700);
}

/* ── SOURCE LEGEND ── */
.report-section .legend {
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-sm);
  padding: 22px;
  font-size: .8em;
  color: var(--gray-500);
  line-height: 1.65;
  margin-bottom: 28px;
}
.report-section .legend strong { color: var(--gray-700); }
.report-section .legend em { color: var(--coral); font-style: italic; }
.report-section .legend .leg-t3 { color: var(--gray-500); font-style: italic; }

/* ══════════════════════════════════════════════════════ */
/* PHASE 3: RISK & REGULATORY STYLES                      */
/* ══════════════════════════════════════════════════════ */

/* ── CARDS ── */
.report-section .card {
  background: #fff;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 26px;
  margin-bottom: 18px;
  box-shadow: var(--shadow);
}
.report-section .card-t {
  font-family: 'Playfair Display', serif;
  font-size: 1.08em;
  font-weight: 600;
  color: var(--navy);
  margin-bottom: 10px;
}
.report-section .card-body {
  font-size: .87em;
  color: var(--gray-700);
  line-height: 1.6;
}
.report-section .card-body p {
  margin-bottom: 10px;
}

/* ── TABLES ── */
.report-section .tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: .83em;
  margin-bottom: 18px;
}
.report-section .tbl th {
  background: var(--gray-100);
  font-family: 'JetBrains Mono', monospace;
  font-size: .76em;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 10px 12px;
  text-align: left;
  color: var(--navy);
  border-bottom: 2px solid var(--gray-200);
}
.report-section .tbl td {
  padding: 9px 12px;
  border-bottom: 1px solid var(--gray-100);
  color: var(--gray-700);
}
.report-section .tbl td:first-child {
  font-weight: 600;
  color: var(--rpt-text);
}
.report-section .tbl tr:hover td {
  background: var(--gray-50);
}

/* ── SWOT ── */
.report-section .swot {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-bottom: 24px;
}
@media(max-width: 720px) {
  .report-section .swot { grid-template-columns: 1fr; }
}
.report-section .swot-card {
  border-radius: var(--radius);
  padding: 22px;
}
.report-section .swot-card.s {
  background: rgba(42,157,143,.06);
  border: 1px solid rgba(42,157,143,.15);
}
.report-section .swot-card.w {
  background: rgba(224,122,95,.05);
  border: 1px solid rgba(224,122,95,.15);
}
.report-section .swot-card.o {
  background: rgba(201,168,76,.06);
  border: 1px solid rgba(201,168,76,.15);
}
.report-section .swot-card.t {
  background: rgba(11,29,58,.04);
  border: 1px solid rgba(11,29,58,.12);
}
.report-section .swot-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: .62em;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 10px;
}
.report-section .swot-card.s .swot-label { color: var(--teal); }
.report-section .swot-card.w .swot-label { color: var(--coral); }
.report-section .swot-card.o .swot-label { color: var(--gold-dark); }
.report-section .swot-card.t .swot-label { color: var(--navy); }
.report-section .swot-item {
  font-size: .84em;
  padding: 5px 0;
  color: var(--gray-700);
  border-bottom: 1px solid rgba(0,0,0,.04);
}
.report-section .swot-item:last-child { border-bottom: none; }
.report-section .swot-item strong { color: var(--rpt-text); }

/* ── RISK ROWS ── */
.report-section .risk-row {
  background: #fff;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-sm);
  padding: 20px;
  margin-bottom: 14px;
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 16px;
  box-shadow: var(--shadow);
}
@media(max-width: 720px) {
  .report-section .risk-row { grid-template-columns: 1fr; }
}
.report-section .risk-dim {
  font-family: 'JetBrains Mono', monospace;
  font-size: .72em;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--navy);
}
.report-section .risk-score {
  font-family: 'Playfair Display', serif;
  font-size: 1.2em;
  font-weight: 700;
  margin-top: 4px;
}
.report-section .risk-score.lo { color: var(--teal); }
.report-section .risk-score.md { color: var(--gold); }
.report-section .risk-score.hi { color: var(--coral); }
.report-section .risk-mit {
  font-size: .84em;
  color: var(--gray-700);
  line-height: 1.55;
}
.report-section .risk-mit strong { color: var(--rpt-text); }

/* ── REGULATORY ITEMS ── */
.report-section .reg-item {
  background: var(--gray-50);
  border-radius: var(--radius-sm);
  padding: 18px;
  margin-bottom: 12px;
  border-left: 3px solid var(--teal);
}
.report-section .reg-item.caution { border-left-color: var(--coral); }
.report-section .reg-item.pending { border-left-color: var(--gold); }
.report-section .reg-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: .6em;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 4px;
}

/* ── PHASE FOOTER ── */
.report-section .pf {
  text-align: center;
  padding: 28px;
  font-family: 'JetBrains Mono', monospace;
  font-size: .75em;
  color: var(--gray-500);
  border-top: 1px solid var(--gray-200);
  margin-top: 40px;
  letter-spacing: 1px;
}
.report-section .pf strong {
  color: var(--navy);
}

/* ══════════════════════════════════════════════════════ */
/* QUALITY STANDARDS & VERIDEX                            */
/* ══════════════════════════════════════════════════════ */
.report-section .qs-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: .68em;
  padding: 3px 10px;
  border-radius: 100px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.report-section .qs-badge.pass {
  background: rgba(42,157,143,.1);
  color: var(--teal);
  border: 1px solid var(--teal);
}
.report-section .qs-badge.warn {
  background: rgba(201,168,76,.1);
  color: var(--gold-dark);
  border: 1px solid var(--gold);
}
.report-section .qs-badge.fail {
  background: rgba(224,122,95,.1);
  color: var(--coral);
  border: 1px solid var(--coral);
}

.report-section .veridex-panel {
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 24px;
  margin-bottom: 24px;
}
.report-section .veridex-score-lg {
  font-family: 'Playfair Display', serif;
  font-size: 2.2em;
  font-weight: 800;
  color: var(--navy);
}
.report-section .veridex-meter {
  width: 100%;
  height: 8px;
  background: var(--gray-200);
  border-radius: 4px;
  overflow: hidden;
  margin: 12px 0;
}
.report-section .veridex-fill {
  height: 100%;
  border-radius: 4px;
  transition: width .6s ease;
}
.report-section .veridex-fill.high { background: var(--teal); }
.report-section .veridex-fill.medium { background: var(--gold); }
.report-section .veridex-fill.low { background: var(--coral); }

/* ── GENERIC HELPERS ── */
.report-section ul {
  list-style: disc;
  padding-left: 1.5em;
  margin-bottom: 14px;
}
.report-section ol {
  list-style: decimal;
  padding-left: 1.5em;
  margin-bottom: 14px;
}
.report-section li {
  margin-bottom: 6px;
  font-size: .9em;
  color: var(--gray-700);
  line-height: 1.6;
}
.report-section h3 {
  font-family: 'Playfair Display', serif;
  font-size: 1.15em;
  font-weight: 600;
  color: var(--navy);
  margin: 18px 0 10px;
}
.report-section h4 {
  font-family: 'Source Sans 3', sans-serif;
  font-size: .95em;
  font-weight: 700;
  color: var(--navy);
  margin: 14px 0 8px;
}
.report-section a {
  color: var(--teal);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.report-section a:hover {
  color: var(--teal-dark);
}
.report-section blockquote {
  border-left: 3px solid var(--gold);
  padding: 12px 18px;
  margin: 14px 0;
  background: var(--gray-50);
  font-style: italic;
  color: var(--gray-700);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

/* ── PRINT STYLES ── */
@media print {
  header, aside, .no-print { display: none !important; }
  .report-section { break-inside: avoid; }
  .report-section .monte { background: #333 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;
