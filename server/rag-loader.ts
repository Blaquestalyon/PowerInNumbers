/**
 * RAG Context Loader
 * 
 * Maps section ragScope tags from the generation manifest to verified
 * Ghana data files. Each agent receives only the relevant data context
 * for its section, keeping token counts manageable while ensuring
 * every claim can be traced to a sourced data file.
 * 
 * Data files (server/data/):
 *   01 - Macroeconomic data (GDP, inflation, exchange rates, FDI, debt, IMF program)
 *   02 - Sector-by-sector analysis (Technology, Agriculture, Energy, Healthcare, etc.)
 *   03 - Investment & regulatory framework (GIPC, tax, free zones, IP, land)
 *   04 - Development gaps & competency demand (skills shortages, workforce, infrastructure)
 *   05 - Market saturation & competitive landscape (players, saturation levels, white space)
 *   06 - Trade flows & economic complexity (exports, imports, partners, AfCFTA)
 *   07 - Governance, stability & business environment (democracy, rankings, rule of law)
 */

import { readFileSync } from "fs";
import { join } from "path";

const DATA_DIR = join(__dirname, "data");

// Cache loaded files to avoid repeated disk reads
const fileCache: Map<string, string> = new Map();

function loadDataFile(filename: string): string {
  if (fileCache.has(filename)) {
    return fileCache.get(filename)!;
  }
  try {
    const content = readFileSync(join(DATA_DIR, filename), "utf-8");
    fileCache.set(filename, content);
    return content;
  } catch (err) {
    console.error(`[RAG] Failed to load data file: ${filename}`, err);
    return "";
  }
}

/**
 * Mapping from ragScope tags (defined in generation-manifest.ts) to
 * the data files and section headers that are relevant.
 * 
 * Each scope tag maps to one or more { file, sections? } entries.
 * If `sections` is provided, only those heading-delimited sections
 * of the file are extracted. If omitted, the entire file is included.
 */
interface DataSlice {
  file: string;
  sections?: string[]; // H2 (##) section headers to extract; empty = full file
}

const SCOPE_MAP: Record<string, DataSlice[]> = {
  // Core analysis scopes
  core: [
    { file: "01-Ghana-macroeconomic-data.txt" },
    { file: "07_governance_stability_environment.txt", sections: ["Political Stability", "Governance Rankings"] },
  ],
  high_level: [
    { file: "01-Ghana-macroeconomic-data.txt", sections: ["GDP and growth", "Inflation", "cedi", "Credit ratings"] },
    { file: "07_governance_stability_environment.txt", sections: ["Political Stability"] },
  ],

  // Competency and gaps
  competencies: [
    { file: "04_development_gaps_competency_demand.txt", sections: ["Skills & Workforce Gaps", "Top Skills Shortages"] },
  ],
  gaps: [
    { file: "04_development_gaps_competency_demand.txt" },
  ],

  // Market and competition
  competition: [
    { file: "05_market_saturation_competitive.txt" },
  ],

  // Pathways and strategy
  pathways: [
    { file: "02_ghana_sector_analysis.txt" },
    { file: "03_ghana_investment_regulatory.txt", sections: ["GIPC Registration", "Foreign Ownership", "Free Zones"] },
    { file: "05_market_saturation_competitive.txt" },
  ],

  // Signal and friction
  signal_friction: [
    { file: "01-Ghana-macroeconomic-data.txt", sections: ["GDP and growth", "FDI data", "Current account"] },
    { file: "02_ghana_sector_analysis.txt" },
    { file: "05_market_saturation_competitive.txt" },
  ],

  // Regulatory
  regulatory: [
    { file: "03_ghana_investment_regulatory.txt" },
    { file: "07_governance_stability_environment.txt", sections: ["Governance Rankings", "Judicial System", "Anti-Corruption"] },
  ],

  // Timelines
  timelines: [
    { file: "03_ghana_investment_regulatory.txt", sections: ["GIPC Registration", "Registration Process", "Business Registration"] },
    { file: "01-Ghana-macroeconomic-data.txt", sections: ["IMF program"] },
  ],

  // Resources
  resources: [
    { file: "04_development_gaps_competency_demand.txt" },
    { file: "02_ghana_sector_analysis.txt" },
  ],

  // Capital
  capital: [
    { file: "03_ghana_investment_regulatory.txt", sections: ["GIPC Registration", "Foreign Ownership", "Free Zones", "Banking"] },
    { file: "01-Ghana-macroeconomic-data.txt", sections: ["Business environment", "FDI data"] },
  ],

  // Network (summit connections)
  network: [
    { file: "05_market_saturation_competitive.txt" },
    { file: "02_ghana_sector_analysis.txt" },
  ],

  // Risk
  risk: [
    { file: "01-Ghana-macroeconomic-data.txt", sections: ["Gold concentration risk", "cedi", "Public debt"] },
    { file: "07_governance_stability_environment.txt" },
    { file: "03_ghana_investment_regulatory.txt", sections: ["Dispute Resolution", "Intellectual Property", "Land"] },
  ],

  // Tax and incentives
  tax: [
    { file: "03_ghana_investment_regulatory.txt", sections: ["Tax", "Free Zones", "SEZ", "Incentives"] },
  ],
  incentives: [
    { file: "03_ghana_investment_regulatory.txt", sections: ["Tax", "Free Zones", "SEZ", "Incentives", "GIPC Registration"] },
    { file: "02_ghana_sector_analysis.txt" },
  ],

  // Monte Carlo / quantitative
  monte_carlo: [
    { file: "01-Ghana-macroeconomic-data.txt" },
    { file: "06_trade_flows_economic_complexity.txt" },
  ],

  // Verification
  verification: [
    { file: "01-Ghana-macroeconomic-data.txt" },
    { file: "07_governance_stability_environment.txt" },
  ],

  // CTA
  cta: [
    { file: "03_ghana_investment_regulatory.txt", sections: ["GIPC Registration", "Registration Process"] },
  ],
};

/**
 * Extract specific sections from a data file by matching H2 (##) headers.
 * Returns the content under matching headers, or empty string if no match.
 */
function extractSections(fullContent: string, sectionPatterns: string[]): string {
  const lines = fullContent.split("\n");
  const results: string[] = [];
  let capturing = false;
  let currentSection: string[] = [];

  for (const line of lines) {
    // Check if this is an H2 header
    if (line.startsWith("## ")) {
      // If we were capturing, save the previous section
      if (capturing && currentSection.length > 0) {
        results.push(currentSection.join("\n"));
      }
      // Check if this header matches any of the patterns
      const headerText = line.replace(/^##\s*\d*\.?\s*/, "").toLowerCase();
      capturing = sectionPatterns.some(
        (pattern) => headerText.includes(pattern.toLowerCase())
      );
      if (capturing) {
        currentSection = [line];
      } else {
        currentSection = [];
      }
    } else if (capturing) {
      currentSection.push(line);
    }
  }

  // Don't forget the last section
  if (capturing && currentSection.length > 0) {
    results.push(currentSection.join("\n"));
  }

  return results.join("\n\n---\n\n");
}

/**
 * Load RAG context for a given set of scope tags.
 * Returns a formatted string with source attributions.
 */
export function loadRagContext(scopes: string[]): string {
  const seen = new Set<string>();
  const contextParts: string[] = [];

  for (const scope of scopes) {
    const slices = SCOPE_MAP[scope];
    if (!slices) {
      console.warn(`[RAG] Unknown scope tag: ${scope}`);
      continue;
    }

    for (const slice of slices) {
      const fullContent = loadDataFile(slice.file);
      if (!fullContent) continue;

      let content: string;
      if (slice.sections && slice.sections.length > 0) {
        content = extractSections(fullContent, slice.sections);
      } else {
        content = fullContent;
      }

      if (!content.trim()) continue;

      // Deduplicate: use file+sections as key
      const key = `${slice.file}:${(slice.sections || []).join(",")}`;
      if (seen.has(key)) continue;
      seen.add(key);

      contextParts.push(
        `\n━━━ SOURCE: ${slice.file} ━━━\n${content.trim()}\n━━━ END SOURCE ━━━`
      );
    }
  }

  if (contextParts.length === 0) {
    return "[No RAG context available for the requested scopes]";
  }

  return [
    "╔══════════════════════════════════════════════════╗",
    "║  GHANA VERIFIED DATA CONTEXT (RAG)              ║",
    "║  Sources: Tier 1-3 verified data files           ║",
    "║  Use these data points with citations.           ║",
    "║  Flag any claims not supported by this context.  ║",
    "╚══════════════════════════════════════════════════╝",
    "",
    ...contextParts,
  ].join("\n");
}

/**
 * Get a summary of available data files and their coverage.
 */
export function getDataManifest(): { file: string; lines: number; topics: string }[] {
  const files = [
    { file: "01-Ghana-macroeconomic-data.txt", topics: "GDP, inflation, exchange rates, FDI, debt, IMF program, credit ratings, banking, demographics" },
    { file: "02_ghana_sector_analysis.txt", topics: "Technology, Agriculture, Energy, Healthcare, Financial Services, Manufacturing, Housing, Education, Tourism, Creative" },
    { file: "03_ghana_investment_regulatory.txt", topics: "GIPC requirements, tax, free zones, foreign ownership, IP, land, dispute resolution, AfCFTA" },
    { file: "04_development_gaps_competency_demand.txt", topics: "Skills shortages, workforce gaps, infrastructure deficit, healthcare, education, digital divide" },
    { file: "05_market_saturation_competitive.txt", topics: "Sector saturation levels, major players, white space, recent market entries, barriers" },
    { file: "06_trade_flows_economic_complexity.txt", topics: "Exports, imports, trade partners, AfCFTA, economic complexity, product space" },
    { file: "07_governance_stability_environment.txt", topics: "Democracy, elections, governance rankings, corruption, rule of law, stability" },
  ];
  return files.map((f) => {
    const content = loadDataFile(f.file);
    return { ...f, lines: content.split("\n").length };
  });
}
